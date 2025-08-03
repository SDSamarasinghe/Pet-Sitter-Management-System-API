import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Report, ReportDocument } from './schemas/report.schema';
import { CreateReportDto } from './dto/create-report.dto';

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Report.name) private reportModel: Model<ReportDocument>,
  ) {}

  /**
   * Create a new report (sitter only)
   */
  async create(createReportDto: CreateReportDto, sitterId: string): Promise<Report> {
    const newReport = new this.reportModel({
      ...createReportDto,
      sitterId,
      date: new Date(createReportDto.date),
    });
    
    return newReport.save();
  }

  /**
   * Get all reports for a specific user (client)
   */
  async findByUserId(userId: string): Promise<Report[]> {
    return this.reportModel
      .find({ userId })
      .populate('userId', 'email')
      .populate('sitterId', 'email')
      .populate('bookingId', 'date serviceType')
      .sort({ date: -1 })
      .exec();
  }

  /**
   * Get all reports submitted by a sitter
   */
  async findBySitterId(sitterId: string): Promise<Report[]> {
    return this.reportModel
      .find({ sitterId })
      .populate('userId', 'email address')
      .populate('sitterId', 'email')
      .populate('bookingId', 'date serviceType')
      .sort({ date: -1 })
      .exec();
  }

  /**
   * Get all reports (admin only)
   */
  async findAll(): Promise<Report[]> {
    return this.reportModel
      .find()
      .populate('userId', 'email address')
      .populate('sitterId', 'email')
      .populate('bookingId', 'date serviceType')
      .sort({ date: -1 })
      .exec();
  }

  /**
   * Get report by ID with access control
   */
  async findById(
    reportId: string, 
    currentUserId: string, 
    currentUserRole: string
  ): Promise<Report> {
    const report = await this.reportModel
      .findById(reportId)
      .populate('userId', 'email address')
      .populate('sitterId', 'email')
      .populate('bookingId', 'date serviceType')
      .exec();
      
    if (!report) {
      throw new NotFoundException('Report not found');
    }

    // Access control: users can view reports about them or reports they created
    const canAccess = 
      currentUserRole === 'admin' ||
      report.userId.toString() === currentUserId ||
      report.sitterId.toString() === currentUserId;

    if (!canAccess) {
      throw new ForbiddenException('You can only view your own reports');
    }

    return report;
  }

  /**
   * Update report (sitter can update their own reports)
   */
  async update(
    reportId: string,
    updateData: Partial<CreateReportDto>,
    currentUserId: string,
    currentUserRole: string
  ): Promise<Report> {
    const report = await this.reportModel.findById(reportId).exec();
    
    if (!report) {
      throw new NotFoundException('Report not found');
    }

    // Access control: only the sitter who created the report or admin can update
    const canUpdate = 
      currentUserRole === 'admin' ||
      report.sitterId.toString() === currentUserId;

    if (!canUpdate) {
      throw new ForbiddenException('You can only update your own reports');
    }

    // Convert date string to Date object if provided
    const updateFields: any = { ...updateData };
    if (updateFields.date) {
      updateFields.date = new Date(updateFields.date);
    }

    const updatedReport = await this.reportModel
      .findByIdAndUpdate(reportId, updateFields, { new: true })
      .populate('userId', 'email address')
      .populate('sitterId', 'email')
      .populate('bookingId', 'date serviceType')
      .exec();

    return updatedReport;
  }

  /**
   * Delete report
   */
  async delete(
    reportId: string,
    currentUserId: string,
    currentUserRole: string
  ): Promise<void> {
    const report = await this.reportModel.findById(reportId).exec();
    
    if (!report) {
      throw new NotFoundException('Report not found');
    }

    // Access control: only the sitter who created the report or admin can delete
    const canDelete = 
      currentUserRole === 'admin' ||
      report.sitterId.toString() === currentUserId;

    if (!canDelete) {
      throw new ForbiddenException('You can only delete your own reports');
    }

    await this.reportModel.findByIdAndDelete(reportId).exec();
  }
}
