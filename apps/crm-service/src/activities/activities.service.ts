import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OutboxService } from '../events/outbox.service';
import { AuditService } from '../audit/audit.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { ActivityFilterDto } from './dto/activity-filter.dto';
import { ActivityNotFoundException, InvalidActivityException } from '../common/exceptions/domain.exceptions';
import { CrmEventTypes } from '../events/event-publisher.interface';
import { Activity, Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ActivitiesService {
  private readonly logger = new Logger(ActivitiesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
    private readonly audit: AuditService,
  ) {}

  private validateEntityLinks(dto: CreateActivityDto | UpdateActivityDto) {
    if (
      !dto.leadId &&
      !dto.companyId &&
      !dto.contactId &&
      !dto.customerId &&
      !dto.opportunityId
    ) {
      throw new InvalidActivityException('Activity must be linked to at least one entity (lead, company, contact, customer, or opportunity)');
    }
  }

  private buildWhere(filter: ActivityFilterDto): Prisma.ActivityWhereInput {
    const where: Prisma.ActivityWhereInput = { deletedAt: null };

    if (filter.search) {
      where.OR = [
        { subject: { contains: filter.search, mode: 'insensitive' } },
        { description: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    if (filter.type) where.type = filter.type;
    if (filter.leadId) where.leadId = filter.leadId;
    if (filter.companyId) where.companyId = filter.companyId;
    if (filter.contactId) where.contactId = filter.contactId;
    if (filter.customerId) where.customerId = filter.customerId;
    if (filter.opportunityId) where.opportunityId = filter.opportunityId;
    if (filter.assignedTo) where.assignedTo = filter.assignedTo;

    if (filter.dateFrom || filter.dateTo) {
      where.activityDate = {
        ...(filter.dateFrom ? { gte: new Date(filter.dateFrom) } : {}),
        ...(filter.dateTo ? { lte: new Date(filter.dateTo) } : {}),
      };
    }

    return where;
  }

  async create(dto: CreateActivityDto, userId?: string): Promise<Activity> {
    this.validateEntityLinks(dto);

    const activity = await this.prisma.$transaction(async (tx) => {
      const created = await tx.activity.create({
        data: {
          ...dto,
          id: uuidv4(),
          activityDate: new Date(dto.activityDate),
          createdBy: userId,
          updatedBy: userId,
        },
      });

      await this.outbox.storeEvent(CrmEventTypes.ACTIVITY_CREATED, { activityId: created.id }, tx);
      return created;
    });

    await this.audit.log({
      entityType: 'Activity',
      entityId: activity.id,
      action: 'CREATE',
      performedBy: userId,
      newData: activity as unknown as Record<string, unknown>,
    });

    return activity;
  }

  async findAll(filter: ActivityFilterDto) {
    const where = this.buildWhere(filter);
    const validSortFields = ['subject', 'createdAt', 'updatedAt', 'activityDate', 'type'];
    const sortBy = filter.sortBy && validSortFields.includes(filter.sortBy) ? filter.sortBy : 'activityDate';
    const orderBy: Prisma.ActivityOrderByWithRelationInput = { [sortBy]: filter.sortOrder ?? 'desc' };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.activity.findMany({ where, orderBy, skip: filter.skip, take: filter.take }),
      this.prisma.activity.count({ where }),
    ]);

    return {
      data,
      meta: {
        page: filter.page ?? 1,
        limit: filter.limit ?? 20,
        total,
        totalPages: Math.ceil(total / (filter.limit ?? 20)),
      },
    };
  }

  async findOne(id: string): Promise<Activity> {
    const activity = await this.prisma.activity.findFirst({
      where: { id, deletedAt: null },
      include: { lead: true, company: true, contact: true, customer: true, opportunity: true },
    });
    if (!activity) throw new ActivityNotFoundException(id);
    return activity as unknown as Activity;
  }

  async update(id: string, dto: UpdateActivityDto, userId?: string): Promise<Activity> {
    const existing = await this.findOne(id);
    
    // Create a merged payload to validate links
    const merged = { ...existing, ...dto } as any;
    this.validateEntityLinks(merged);

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.activity.update({
        where: { id },
        data: {
          ...dto,
          activityDate: dto.activityDate ? new Date(dto.activityDate) : undefined,
          updatedBy: userId,
        },
      });
      return result;
    });

    await this.audit.log({
      entityType: 'Activity',
      entityId: id,
      action: 'UPDATE',
      performedBy: userId,
      oldData: existing as unknown as Record<string, unknown>,
      newData: updated as unknown as Record<string, unknown>,
    });

    return updated;
  }

  async remove(id: string, userId?: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.activity.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: userId },
    });
    await this.audit.log({ entityType: 'Activity', entityId: id, action: 'DELETE', performedBy: userId });
  }
}
