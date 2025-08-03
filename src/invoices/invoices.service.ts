import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Invoice, InvoiceDocument } from './schemas/invoice.schema';
import { CreateInvoiceDto, UpdateInvoiceDto, PayInvoiceDto } from './dto/invoice.dto';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
  ) {}

  /**
   * Generate unique invoice number
   */
  private async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
    
    // Find the last invoice for this month
    const lastInvoice = await this.invoiceModel
      .findOne({ 
        invoiceNumber: { $regex: `^INV-${year}${month}-` } 
      })
      .sort({ createdAt: -1 });

    let nextNumber = 1;
    if (lastInvoice) {
      const lastNumber = parseInt(lastInvoice.invoiceNumber.split('-')[2]);
      nextNumber = lastNumber + 1;
    }

    return `INV-${year}${month}-${nextNumber.toString().padStart(4, '0')}`;
  }

  /**
   * Create a new invoice
   */
  async create(createInvoiceDto: CreateInvoiceDto): Promise<InvoiceDocument> {
    const invoiceNumber = await this.generateInvoiceNumber();
    
    // Calculate totals if line items are provided
    let calculatedAmount = createInvoiceDto.amount;
    let subtotal = createInvoiceDto.subtotal;
    
    if (createInvoiceDto.lineItems && createInvoiceDto.lineItems.length > 0) {
      subtotal = createInvoiceDto.lineItems.reduce(
        (sum, item) => sum + (item.amount * item.quantity), 0
      );
      calculatedAmount = subtotal + (createInvoiceDto.tax || 0) - (createInvoiceDto.discount || 0);
    }

    const invoice = new this.invoiceModel({
      ...createInvoiceDto,
      invoiceNumber,
      clientId: new Types.ObjectId(createInvoiceDto.clientId),
      bookingId: createInvoiceDto.bookingId ? new Types.ObjectId(createInvoiceDto.bookingId) : undefined,
      amount: calculatedAmount,
      subtotal,
      dueDate: new Date(createInvoiceDto.dueDate),
    });

    return invoice.save();
  }

  /**
   * Get client's invoices with pagination
   */
  async getClientInvoices(
    clientId: string,
    currentUserId: string,
    currentUserRole: string,
    page: number = 1,
    limit: number = 20,
    status?: string
  ): Promise<{ invoices: InvoiceDocument[]; total: number }> {
    // Clients can only view their own invoices, admins can view any
    if (clientId !== currentUserId && currentUserRole !== 'admin') {
      throw new ForbiddenException('You can only view your own invoices');
    }

    const filter: any = { clientId: new Types.ObjectId(clientId) };
    if (status) {
      filter.status = status;
    }

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

  /**
   * Get invoice by ID
   */
  async getById(
    id: string,
    currentUserId: string,
    currentUserRole: string
  ): Promise<InvoiceDocument> {
    const invoice = await this.invoiceModel
      .findById(id)
      .populate('clientId', 'firstName lastName email address phoneNumber')
      .populate('bookingId', 'serviceType dates');

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // Check permissions
    if (invoice.clientId.toString() !== currentUserId && currentUserRole !== 'admin') {
      throw new ForbiddenException('You can only view your own invoices');
    }

    return invoice;
  }

  /**
   * Update invoice
   */
  async update(
    id: string,
    updateInvoiceDto: UpdateInvoiceDto,
    currentUserRole: string
  ): Promise<InvoiceDocument> {
    // Only admins can update invoices
    if (currentUserRole !== 'admin') {
      throw new ForbiddenException('Only administrators can update invoices');
    }

    const invoice = await this.invoiceModel.findById(id);
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // Recalculate amount if line items are updated
    let updates = { ...updateInvoiceDto };
    if (updateInvoiceDto.lineItems) {
      const subtotal = updateInvoiceDto.lineItems.reduce(
        (sum, item) => sum + (item.amount * item.quantity), 0
      );
      updates.subtotal = subtotal;
      updates.amount = subtotal + (updateInvoiceDto.tax || invoice.tax) - (updateInvoiceDto.discount || invoice.discount);
    }

    // Convert date strings to Date objects
    if (updates.dueDate) {
      updates.dueDate = new Date(updates.dueDate) as any;
    }
    if (updates.paidDate) {
      updates.paidDate = new Date(updates.paidDate) as any;
    }

    return this.invoiceModel.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: new Date() },
      { new: true }
    ).populate('clientId', 'firstName lastName email');
  }

  /**
   * Mark invoice as paid
   */
  async markAsPaid(
    id: string,
    payInvoiceDto: PayInvoiceDto,
    currentUserId: string,
    currentUserRole: string
  ): Promise<InvoiceDocument> {
    const invoice = await this.invoiceModel.findById(id);
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // Clients can mark their own invoices as paid, admins can mark any
    if (invoice.clientId.toString() !== currentUserId && currentUserRole !== 'admin') {
      throw new ForbiddenException('You can only pay your own invoices');
    }

    return this.invoiceModel.findByIdAndUpdate(
      id,
      {
        status: 'paid',
        paidDate: payInvoiceDto.paidDate ? new Date(payInvoiceDto.paidDate) : new Date(),
        paymentMethod: payInvoiceDto.paymentMethod,
        paymentReference: payInvoiceDto.paymentReference,
        updatedAt: new Date(),
      },
      { new: true }
    ).populate('clientId', 'firstName lastName email');
  }

  /**
   * Get all invoices (admin only)
   */
  async getAllForAdmin(
    page: number = 1,
    limit: number = 20,
    status?: string
  ): Promise<{ invoices: InvoiceDocument[]; total: number }> {
    const filter: any = {};
    if (status) {
      filter.status = status;
    }

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

  /**
   * Get invoice statistics
   */
  async getInvoiceStats(clientId?: string): Promise<any> {
    const filter = clientId ? { clientId: new Types.ObjectId(clientId) } : {};

    const stats = await this.invoiceModel.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
        },
      },
    ]);

    const result = {
      pending: { count: 0, totalAmount: 0 },
      paid: { count: 0, totalAmount: 0 },
      overdue: { count: 0, totalAmount: 0 },
      cancelled: { count: 0, totalAmount: 0 },
    };

    stats.forEach(stat => {
      if (result[stat._id]) {
        result[stat._id] = {
          count: stat.count,
          totalAmount: stat.totalAmount,
        };
      }
    });

    return result;
  }

  /**
   * Delete invoice (admin only)
   */
  async delete(id: string, currentUserRole: string): Promise<void> {
    if (currentUserRole !== 'admin') {
      throw new ForbiddenException('Only administrators can delete invoices');
    }

    const invoice = await this.invoiceModel.findById(id);
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    await this.invoiceModel.findByIdAndDelete(id);
  }

  /**
   * Mark overdue invoices
   */
  async markOverdueInvoices(): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await this.invoiceModel.updateMany(
      {
        status: 'pending',
        dueDate: { $lt: today },
      },
      {
        status: 'overdue',
        updatedAt: new Date(),
      }
    );
  }
}
