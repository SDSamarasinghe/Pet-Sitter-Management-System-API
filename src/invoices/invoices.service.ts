import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Invoice, InvoiceDocument } from './schemas/invoice.schema';
import { Booking, BookingDocument } from '../bookings/schemas/booking.schema';
import { CreateInvoiceDto, UpdateInvoiceDto, PayInvoiceDto } from './dto/invoice.dto';
import { ActivityLogService } from '../activity-log/activity-log.service';

export type DerivedInvoiceStatus = 'paid' | 'partial' | 'refunded' | 'overdue' | 'due' | 'cancelled';

export interface DerivedInvoice {
  _id: string;
  invoiceNumber: string;
  bookingGroupId: string | null;
  isGrouped: boolean;
  clientId: any;
  sitterId: any;
  serviceType: string;
  amount: number;
  status: DerivedInvoiceStatus;
  paymentStatus: string;
  bookingStatus: string;
  startDate: Date;
  endDate: Date;
  dueDate: Date;
  paidDate?: Date;
  dayCount: number;
  numberOfPets?: number;
  petTypes?: string[];
  notes?: string;
  serviceAddress?: string;
  createdAt: Date;
  bookings: Array<{
    _id: string;
    startDate: Date;
    endDate: Date;
    totalAmount: number;
    status: string;
    paymentStatus: string;
  }>;
}

/**
 * Map a booking group's aggregated payment + booking statuses (plus its end date) to
 * the derived invoice status shown in the invoices UI.
 *
 * Priority:
 *   cancelled (every day cancelled)
 * → paid (every day paid)
 * → refunded (every day refunded)
 * → partial (any paid mixed with anything else, or any partial)
 * → overdue (still pending and the booking's end date is in the past)
 * → due  (still pending and the booking hasn't ended yet)
 */
function deriveStatus(
  bookings: Array<{ status: string; paymentStatus: string; endDate: Date }>,
  groupEnd: Date,
): DerivedInvoiceStatus {
  if (bookings.length === 0) return 'due';
  const allCancelled = bookings.every((b) => b.status === 'cancelled');
  if (allCancelled) return 'cancelled';

  const payments = bookings.map((b) => b.paymentStatus || 'pending');
  const allPaid = payments.every((p) => p === 'paid');
  if (allPaid) return 'paid';
  const allRefunded = payments.every((p) => p === 'refunded');
  if (allRefunded) return 'refunded';
  if (payments.some((p) => p === 'paid') || payments.some((p) => p === 'partial')) {
    return 'partial';
  }
  // All pending → overdue if the booking has ended; otherwise due
  return new Date(groupEnd).getTime() < Date.now() ? 'overdue' : 'due';
}

@Injectable()
export class InvoicesService {
  constructor(
    @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
    private activityLogService: ActivityLogService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────
  // Derived invoices (from bookings)
  // ─────────────────────────────────────────────────────────────────────

  /**
   * Build a derived invoice from a list of booking day records that share a
   * bookingGroupId (or one standalone booking with no group).
   */
  private buildDerivedInvoice(days: BookingDocument[]): DerivedInvoice {
    const sorted = [...days].sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
    );
    const first = sorted[0] as any;
    const groupId = first.bookingGroupId || null;

    let earliestStart = new Date(sorted[0].startDate);
    let latestEnd = new Date(sorted[0].endDate);
    let amount = 0;
    const lineItems: DerivedInvoice['bookings'] = [];

    for (const d of sorted) {
      const s = new Date(d.startDate);
      const e = new Date(d.endDate);
      if (s < earliestStart) earliestStart = s;
      if (e > latestEnd) latestEnd = e;
      amount += d.totalAmount || 0;
      lineItems.push({
        _id: (d as any)._id.toString(),
        startDate: s,
        endDate: e,
        totalAmount: d.totalAmount || 0,
        status: d.status,
        paymentStatus: d.paymentStatus,
      });
    }

    const status = deriveStatus(lineItems as any, latestEnd);

    const MS_PER_DAY = 1000 * 60 * 60 * 24;
    const span = Math.max(
      1,
      Math.round(
        (latestEnd.setHours(0, 0, 0, 0) - new Date(earliestStart).setHours(0, 0, 0, 0)) /
          MS_PER_DAY,
      ) + 1,
    );
    const dayCount = Math.max(lineItems.length, span);

    // Anchor id = group id if available, otherwise the single booking id. This is what
    // gets used in URLs (/invoices/:id) and is the canonical identifier here.
    const anchorId = groupId || lineItems[0]._id;

    // Paid date = newest updatedAt across days if everything is paid
    let paidDate: Date | undefined;
    if (status === 'paid') {
      const latest = days.reduce<Date>((acc, d) => {
        const u = (d as any).updatedAt || (d as any).createdAt;
        const dt = u ? new Date(u) : null;
        return dt && dt > acc ? dt : acc;
      }, new Date(0));
      if (latest.getTime() > 0) paidDate = latest;
    }

    // Aggregate raw statuses for the UI to show alongside the derived one
    const uniqueBookingStatuses = Array.from(new Set(lineItems.map((b) => b.status)));
    const uniquePayments = Array.from(new Set(lineItems.map((b) => b.paymentStatus)));

    return {
      _id: anchorId,
      invoiceNumber: `INV-${anchorId.slice(-8).toUpperCase()}`,
      bookingGroupId: groupId,
      isGrouped: Boolean(groupId),
      clientId: first.userId,
      sitterId: first.sitterId,
      serviceType: first.serviceType,
      amount,
      status,
      paymentStatus: uniquePayments.length === 1 ? uniquePayments[0] : 'mixed',
      bookingStatus: uniqueBookingStatuses.length === 1 ? uniqueBookingStatuses[0] : 'mixed',
      startDate: new Date(earliestStart),
      endDate: latestEnd,
      dueDate: new Date(earliestStart),
      paidDate,
      dayCount,
      numberOfPets: first.numberOfPets,
      petTypes: first.petTypes,
      notes: first.notes,
      serviceAddress: first.serviceAddress,
      createdAt: (first as any).createdAt || new Date(earliestStart),
      bookings: lineItems,
    };
  }

  /**
   * List derived invoices, with optional scoping and pagination.
   */
  async listDerived(query: {
    userId?: string;
    sitterId?: string;
    status?: string;
    search?: string;
    page?: string | number;
    limit?: string | number;
  }): Promise<{
    data: DerivedInvoice[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const filter: any = {};
    if (query.userId) filter.userId = new Types.ObjectId(query.userId);
    if (query.sitterId) filter.sitterId = new Types.ObjectId(query.sitterId);

    const allBookings = await this.bookingModel
      .find(filter)
      .populate('userId', 'email address firstName lastName phoneNumber')
      .populate('sitterId', 'email firstName lastName')
      .sort({ startDate: 1 })
      .exec();

    // Group by bookingGroupId; standalone bookings become single-item groups.
    const groups = new Map<string, BookingDocument[]>();
    for (const b of allBookings) {
      const key = (b as any).bookingGroupId
        ? `group:${(b as any).bookingGroupId}`
        : `single:${(b as any)._id.toString()}`;
      const arr = groups.get(key) || [];
      arr.push(b);
      groups.set(key, arr);
    }

    let invoices = Array.from(groups.values()).map((days) => this.buildDerivedInvoice(days));

    // Newest first
    invoices.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

    // Status filter
    if (query.status && query.status !== 'all') {
      invoices = invoices.filter((i) => i.status === query.status);
    }

    // Free-text search across invoice number, service, client name/email
    const q = (query.search ?? '').toString().trim().toLowerCase();
    if (q) {
      invoices = invoices.filter((i) => {
        const c = i.clientId as any;
        const clientText = c
          ? `${c.firstName ?? ''} ${c.lastName ?? ''} ${c.email ?? ''}`.toLowerCase()
          : '';
        return (
          i.invoiceNumber.toLowerCase().includes(q) ||
          (i.serviceType ?? '').toLowerCase().includes(q) ||
          clientText.includes(q) ||
          i.status.toLowerCase().includes(q)
        );
      });
    }

    const page = Math.max(1, parseInt(String(query.page ?? '1'), 10) || 1);
    const limitRaw = parseInt(String(query.limit ?? '10'), 10) || 10;
    const limit = Math.min(100, Math.max(1, limitRaw));
    const skip = (page - 1) * limit;
    const total = invoices.length;
    const data = invoices.slice(skip, skip + limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  /**
   * Look up a single derived invoice by its anchor id (either a bookingGroupId or
   * a single-booking _id). Enforces access control for the calling user.
   */
  async getDerivedById(
    anchorId: string,
    currentUserId: string,
    currentUserRole: string,
  ): Promise<DerivedInvoice> {
    // Try as group first
    let days = await this.bookingModel
      .find({ bookingGroupId: anchorId })
      .populate('userId', 'email address firstName lastName phoneNumber')
      .populate('sitterId', 'email firstName lastName')
      .exec();

    if (days.length === 0) {
      // Fall back: anchorId is a single booking _id
      if (!Types.ObjectId.isValid(anchorId)) {
        throw new NotFoundException('Invoice not found');
      }
      const single = await this.bookingModel
        .findById(anchorId)
        .populate('userId', 'email address firstName lastName phoneNumber')
        .populate('sitterId', 'email firstName lastName')
        .exec();
      if (!single) {
        throw new NotFoundException('Invoice not found');
      }
      days = [single];
    }

    // Access control: admin always; otherwise the requesting user must be the client
    // or sitter on at least one day in this group.
    const isAdmin = currentUserRole === 'admin';
    const canAccess =
      isAdmin ||
      days.some(
        (d) =>
          (d.userId as any)?._id?.toString() === currentUserId ||
          (d.sitterId as any)?._id?.toString() === currentUserId,
      );
    if (!canAccess) {
      throw new ForbiddenException('You can only view your own invoices');
    }

    return this.buildDerivedInvoice(days);
  }

  // ─────────────────────────────────────────────────────────────────────
  // Legacy CRUD (preserved — used by manual invoice flows / activity log)
  // ─────────────────────────────────────────────────────────────────────

  private async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
    const lastInvoice = await this.invoiceModel
      .findOne({ invoiceNumber: { $regex: `^INV-${year}${month}-` } })
      .sort({ createdAt: -1 });
    let nextNumber = 1;
    if (lastInvoice) {
      const lastNumber = parseInt(lastInvoice.invoiceNumber.split('-')[2]);
      nextNumber = lastNumber + 1;
    }
    return `INV-${year}${month}-${nextNumber.toString().padStart(4, '0')}`;
  }

  async create(createInvoiceDto: CreateInvoiceDto): Promise<InvoiceDocument> {
    const invoiceNumber = await this.generateInvoiceNumber();
    let calculatedAmount = createInvoiceDto.amount;
    let subtotal = createInvoiceDto.subtotal;
    if (createInvoiceDto.lineItems && createInvoiceDto.lineItems.length > 0) {
      subtotal = createInvoiceDto.lineItems.reduce(
        (sum, item) => sum + item.amount * item.quantity,
        0,
      );
      calculatedAmount = subtotal + (createInvoiceDto.tax || 0) - (createInvoiceDto.discount || 0);
    }
    const invoice = new this.invoiceModel({
      ...createInvoiceDto,
      invoiceNumber,
      clientId: new Types.ObjectId(createInvoiceDto.clientId),
      bookingId: createInvoiceDto.bookingId
        ? new Types.ObjectId(createInvoiceDto.bookingId)
        : undefined,
      amount: calculatedAmount,
      subtotal,
      dueDate: new Date(createInvoiceDto.dueDate),
    });
    const savedInvoice = await invoice.save();

    try {
      await this.activityLogService.log(
        '000000000000000000000000',
        'Invoice created',
        'invoice',
        `Created invoice ${savedInvoice.invoiceNumber} for amount $${savedInvoice.amount}`,
        { invoiceNumber: savedInvoice.invoiceNumber, amount: savedInvoice.amount },
        savedInvoice._id.toString(),
        'invoice',
      );
    } catch (error) {
      console.error('Failed to write invoice creation activity log:', error?.message || error);
    }

    return savedInvoice;
  }

  async getClientInvoices(
    clientId: string,
    currentUserId: string,
    currentUserRole: string,
    page: number = 1,
    limit: number = 20,
    status?: string,
  ): Promise<{ invoices: InvoiceDocument[]; total: number }> {
    if (clientId !== currentUserId && currentUserRole !== 'admin') {
      throw new ForbiddenException('You can only view your own invoices');
    }
    const filter: any = { clientId: new Types.ObjectId(clientId) };
    if (status) filter.status = status;
    const skip = (page - 1) * limit;
    const [invoices, total] = await Promise.all([
      this.invoiceModel
        .find(filter)
        .populate('clientId', 'firstName lastName email')
        .populate('bookingId', 'serviceType dates')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.invoiceModel.countDocuments(filter),
    ]);
    return { invoices, total };
  }

  async getById(
    id: string,
    currentUserId: string,
    currentUserRole: string,
  ): Promise<InvoiceDocument> {
    const invoice = await this.invoiceModel
      .findById(id)
      .populate('clientId', 'firstName lastName email address phoneNumber')
      .populate('bookingId', 'serviceType dates');
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.clientId.toString() !== currentUserId && currentUserRole !== 'admin') {
      throw new ForbiddenException('You can only view your own invoices');
    }
    return invoice;
  }

  async update(
    id: string,
    updateInvoiceDto: UpdateInvoiceDto,
    currentUserRole: string,
  ): Promise<InvoiceDocument> {
    if (currentUserRole !== 'admin') {
      throw new ForbiddenException('Only administrators can update invoices');
    }
    const invoice = await this.invoiceModel.findById(id);
    if (!invoice) throw new NotFoundException('Invoice not found');
    const updates = { ...updateInvoiceDto };
    if (updateInvoiceDto.lineItems) {
      const subtotal = updateInvoiceDto.lineItems.reduce(
        (sum, item) => sum + item.amount * item.quantity,
        0,
      );
      updates.subtotal = subtotal;
      updates.amount =
        subtotal + (updateInvoiceDto.tax || invoice.tax) - (updateInvoiceDto.discount || invoice.discount);
    }
    if (updates.dueDate) updates.dueDate = new Date(updates.dueDate) as any;
    if (updates.paidDate) updates.paidDate = new Date(updates.paidDate) as any;
    const updatedInvoice = await this.invoiceModel
      .findByIdAndUpdate(id, { ...updates, updatedAt: new Date() }, { new: true })
      .populate('clientId', 'firstName lastName email');
    return updatedInvoice;
  }

  async markAsPaid(
    id: string,
    payInvoiceDto: PayInvoiceDto,
    currentUserId: string,
    currentUserRole: string,
  ): Promise<InvoiceDocument> {
    const invoice = await this.invoiceModel.findById(id);
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.clientId.toString() !== currentUserId && currentUserRole !== 'admin') {
      throw new ForbiddenException('You can only pay your own invoices');
    }
    const paidInvoice = await this.invoiceModel
      .findByIdAndUpdate(
        id,
        {
          status: 'paid',
          paidDate: payInvoiceDto.paidDate ? new Date(payInvoiceDto.paidDate) : new Date(),
          paymentMethod: payInvoiceDto.paymentMethod,
          paymentReference: payInvoiceDto.paymentReference,
          updatedAt: new Date(),
        },
        { new: true },
      )
      .populate('clientId', 'firstName lastName email');
    return paidInvoice;
  }

  async getAllForAdmin(
    page: number = 1,
    limit: number = 20,
    status?: string,
  ): Promise<{ invoices: InvoiceDocument[]; total: number }> {
    const filter: any = {};
    if (status) filter.status = status;
    const skip = (page - 1) * limit;
    const [invoices, total] = await Promise.all([
      this.invoiceModel
        .find(filter)
        .populate('clientId', 'firstName lastName email address')
        .populate('bookingId', 'serviceType dates')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.invoiceModel.countDocuments(filter),
    ]);
    return { invoices, total };
  }

  async getInvoiceStats(clientId?: string): Promise<any> {
    const filter = clientId ? { clientId: new Types.ObjectId(clientId) } : {};
    const stats = await this.invoiceModel.aggregate([
      { $match: filter },
      { $group: { _id: '$status', count: { $sum: 1 }, totalAmount: { $sum: '$amount' } } },
    ]);
    const result = {
      pending: { count: 0, totalAmount: 0 },
      paid: { count: 0, totalAmount: 0 },
      overdue: { count: 0, totalAmount: 0 },
      cancelled: { count: 0, totalAmount: 0 },
    };
    stats.forEach((stat) => {
      if (result[stat._id]) {
        result[stat._id] = { count: stat.count, totalAmount: stat.totalAmount };
      }
    });
    return result;
  }

  async delete(id: string, currentUserRole: string): Promise<void> {
    if (currentUserRole !== 'admin') {
      throw new ForbiddenException('Only administrators can delete invoices');
    }
    const invoice = await this.invoiceModel.findById(id);
    if (!invoice) throw new NotFoundException('Invoice not found');
    await this.invoiceModel.findByIdAndDelete(id);
  }

  async markOverdueInvoices(): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await this.invoiceModel.updateMany(
      { status: 'pending', dueDate: { $lt: today } },
      { status: 'overdue', updatedAt: new Date() },
    );
  }
}
