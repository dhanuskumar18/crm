import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OutboxService } from '../events/outbox.service';
import { AuditService } from '../audit/audit.service';
import { CreateFollowUpDto } from './dto/create-follow-up.dto';
import { UpdateFollowUpDto } from './dto/update-follow-up.dto';
import { FollowUpFilterDto } from './dto/follow-up-filter.dto';
import { FollowUpNotFoundException } from '../common/exceptions/domain.exceptions';
import { CrmEventTypes } from '../events/event-publisher.interface';
import { FollowUp, FollowUpStatus, Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FollowUpsService {
  private readonly logger = new Logger(FollowUpsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
    private readonly audit: AuditService,
  ) {}

  private validateEntityLinks(dto: CreateFollowUpDto | UpdateFollowUpDto) {
    if (
      !dto.leadId &&
      !dto.companyId &&
      !dto.contactId &&
      !dto.customerId &&
      !dto.opportunityId
    ) {
      throw new BadRequestException('Follow-up must be linked to at least one entity (lead, company, contact, customer, or opportunity)');
    }
  }

  private buildWhere(filter: FollowUpFilterDto): Prisma.FollowUpWhereInput {
    const where: Prisma.FollowUpWhereInput = { deletedAt: null };

    if (filter.search) {
      where.notes = { contains: filter.search, mode: 'insensitive' };
    }

    if (filter.status) where.status = filter.status;
    if (filter.leadId) where.leadId = filter.leadId;
    if (filter.companyId) where.companyId = filter.companyId;
    if (filter.contactId) where.contactId = filter.contactId;
    if (filter.customerId) where.customerId = filter.customerId;
    if (filter.opportunityId) where.opportunityId = filter.opportunityId;
    if (filter.assignedTo) where.assignedTo = filter.assignedTo;

    if (filter.dueDateFrom || filter.dueDateTo) {
      where.dueDate = {
        ...(filter.dueDateFrom ? { gte: new Date(filter.dueDateFrom) } : {}),
        ...(filter.dueDateTo ? { lte: new Date(filter.dueDateTo) } : {}),
      };
    }

    return where;
  }

  async create(dto: CreateFollowUpDto, userId?: string): Promise<FollowUp> {
    this.validateEntityLinks(dto);

    const followUp = await this.prisma.$transaction(async (tx) => {
      const created = await tx.followUp.create({
        data: {
          ...dto,
          id: uuidv4(),
          dueDate: new Date(dto.dueDate),
          createdBy: userId,
          updatedBy: userId,
        },
      });

      await this.outbox.storeEvent(CrmEventTypes.FOLLOW_UP_CREATED, { followUpId: created.id }, tx);
      return created;
    });

    await this.audit.log({
      entityType: 'FollowUp',
      entityId: followUp.id,
      action: 'CREATE',
      performedBy: userId,
      newData: followUp as unknown as Record<string, unknown>,
    });

    return followUp;
  }

  async findAll(filter: FollowUpFilterDto) {
    const where = this.buildWhere(filter);
    const validSortFields = ['dueDate', 'createdAt', 'updatedAt', 'status'];
    const sortBy = filter.sortBy && validSortFields.includes(filter.sortBy) ? filter.sortBy : 'dueDate';
    const orderBy: Prisma.FollowUpOrderByWithRelationInput = { [sortBy]: filter.sortOrder ?? 'asc' };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.followUp.findMany({ where, orderBy, skip: filter.skip, take: filter.take }),
      this.prisma.followUp.count({ where }),
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

  async findOne(id: string): Promise<FollowUp> {
    const followUp = await this.prisma.followUp.findFirst({
      where: { id, deletedAt: null },
      include: { lead: true, company: true, contact: true, customer: true, opportunity: true },
    });
    if (!followUp) throw new FollowUpNotFoundException(id);
    return followUp as unknown as FollowUp;
  }

  async update(id: string, dto: UpdateFollowUpDto, userId?: string): Promise<FollowUp> {
    const existing = await this.findOne(id);
    
    // Create a merged payload to validate links
    const merged = { ...existing, ...dto } as any;
    this.validateEntityLinks(merged);

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.followUp.update({
        where: { id },
        data: {
          ...dto,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
          completedAt: dto.status === FollowUpStatus.COMPLETED && existing.status !== FollowUpStatus.COMPLETED ? new Date() : undefined,
          updatedBy: userId,
        },
      });

      if (dto.status === FollowUpStatus.COMPLETED && existing.status !== FollowUpStatus.COMPLETED) {
        await this.outbox.storeEvent(CrmEventTypes.FOLLOW_UP_COMPLETED, { followUpId: id }, tx);
      }

      return result;
    });

    await this.audit.log({
      entityType: 'FollowUp',
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
    await this.prisma.followUp.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: userId },
    });
    await this.audit.log({ entityType: 'FollowUp', entityId: id, action: 'DELETE', performedBy: userId });
  }

  async complete(id: string, userId?: string): Promise<FollowUp> {
    const existing = await this.findOne(id);
    
    if (existing.status === FollowUpStatus.COMPLETED) {
      return existing;
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.followUp.update({
        where: { id },
        data: {
          status: FollowUpStatus.COMPLETED,
          completedAt: new Date(),
          updatedBy: userId,
        },
      });

      await this.outbox.storeEvent(CrmEventTypes.FOLLOW_UP_COMPLETED, { followUpId: id }, tx);
      return result;
    });

    await this.audit.log({
      entityType: 'FollowUp',
      entityId: id,
      action: 'STATUS_CHANGE',
      performedBy: userId,
      oldData: { status: existing.status } as Record<string, unknown>,
      newData: { status: FollowUpStatus.COMPLETED } as Record<string, unknown>,
    });

    return updated;
  }
}
