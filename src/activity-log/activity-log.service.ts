import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ActivityLog, ActivityLogDocument } from './schemas/activity-log.schema';
import { CreateActivityLogDto } from './dto/activity-log.dto';

@Injectable()
export class ActivityLogService {
  constructor(
    @InjectModel(ActivityLog.name) private activityLogModel: Model<ActivityLogDocument>,
  ) {}

  async create(dto: CreateActivityLogDto): Promise<ActivityLog> {
    const log = new this.activityLogModel({
      ...dto,
      userId: new Types.ObjectId(dto.userId),
      targetId: dto.targetId ? new Types.ObjectId(dto.targetId) : undefined,
    });
    return log.save();
  }

  async log(userId: string, action: string, category: string, description: string, metadata?: Record<string, any>, targetId?: string, targetType?: string): Promise<ActivityLog> {
    return this.create({ userId, action, category, description, metadata, targetId, targetType });
  }

  async findAll(page = 1, limit = 50): Promise<{ logs: ActivityLog[]; total: number }> {
    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      this.activityLogModel
        .find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'firstName lastName email role')
        .lean(),
      this.activityLogModel.countDocuments(),
    ]);
    return { logs, total };
  }

  async findByUser(userId: string, page = 1, limit = 50): Promise<{ logs: ActivityLog[]; total: number }> {
    const skip = (page - 1) * limit;
    const filter = { userId: new Types.ObjectId(userId) };
    const [logs, total] = await Promise.all([
      this.activityLogModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'firstName lastName email role')
        .lean(),
      this.activityLogModel.countDocuments(filter),
    ]);
    return { logs, total };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.activityLogModel.countDocuments({
      userId: new Types.ObjectId(userId),
      isRead: false,
    });
  }

  async getRecentNotifications(userId: string, limit = 20): Promise<ActivityLog[]> {
    return this.activityLogModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  async markAsRead(userId: string, logIds?: string[]): Promise<void> {
    const filter: any = { userId: new Types.ObjectId(userId) };
    if (logIds && logIds.length > 0) {
      filter._id = { $in: logIds.map((id) => new Types.ObjectId(id)) };
    }
    await this.activityLogModel.updateMany(filter, { isRead: true });
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.activityLogModel.updateMany(
      { userId: new Types.ObjectId(userId), isRead: false },
      { isRead: true },
    );
  }
}
