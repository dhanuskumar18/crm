import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OutboxService } from '../events/outbox.service';
import { AuditService } from '../audit/audit.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { LeadFilterDto } from './dto/lead-filter.dto';
import { AssignLeadDto } from './dto/assign-lead.dto';
import { MarkLostDto } from './dto/mark-lost.dto';
import {
  LeadNotFoundException,
  LeadAlreadyConvertedException,
  LeadAlreadyLostException,
} from '../common/exceptions/domain.exceptions';
import { CrmEventTypes } from '../events/event-publisher.interface';
import { Lead, LeadStatus, Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
    private readonly audit: AuditService,
  ) {}

  private generateLeadCode(): string {
    const num = Math.floor(Math.random() * 90000) + 10000;
    return `LEAD-${num}`;
  }

  private buildWhere(filter: LeadFilterDto): Prisma.LeadWhereInput {
    const where: Prisma.LeadWhereInput = { deletedAt: null };

    if (filter.search) {
      where.OR = [
        { firstName: { contains: filter.search, mode: 'insensitive' } },
        { lastName: { contains: filter.search, mode: 'insensitive' } },
        { email: { contains: filter.search, mode: 'insensitive' } },
        { companyName: { contains: filter.search, mode: 'insensitive' } },
        { leadCode: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    if (filter.status) where.status = filter.status;
    if (filter.priority) where.priority = filter.priority;
    if (filter.source) where.source = filter.source;
    if (filter.assignedTo) where.assignedTo = filter.assignedTo;
    if (filter.companyId) where.companyId = filter.companyId;

    if (filter.createdFrom || filter.createdTo) {
      where.createdAt = {
        ...(filter.createdFrom ? { gte: new Date(filter.createdFrom) } : {}),
        ...(filter.createdTo ? { lte: new Date(filter.createdTo) } : {}),
      };
    }

    if (filter.estimatedValueMin !== undefined || filter.estimatedValueMax !== undefined) {
      where.estimatedValue = {
        ...(filter.estimatedValueMin !== undefined ? { gte: filter.estimatedValueMin } : {}),
        ...(filter.estimatedValueMax !== undefined ? { lte: filter.estimatedValueMax } : {}),
      };
    }

    return where;
  }

  async create(dto: CreateLeadDto, userId?: string): Promise<Lead> {
    let leadCode: string;
    let attempts = 0;
    do {
      leadCode = this.generateLeadCode();
      const exists = await this.prisma.lead.findUnique({ where: { leadCode } });
      if (!exists) break;
      attempts++;
    } while (attempts < 10);

    const lead = await this.prisma.$transaction(async (tx) => {
      const created = await tx.lead.create({
        data: {
          ...dto,
          id: uuidv4(),
          leadCode: leadCode!,
          email: dto.email.toLowerCase().trim(),
          estimatedValue: dto.estimatedValue !== undefined ? dto.estimatedValue : undefined,
          expectedCloseDate: dto.expectedCloseDate ? new Date(dto.expectedCloseDate) : undefined,
          createdBy: userId,
          updatedBy: userId,
        },
      });
      await this.outbox.storeEvent(CrmEventTypes.LEAD_CREATED, { leadId: created.id }, tx);
      return created;
    });

    await this.audit.log({
      entityType: 'Lead',
      entityId: lead.id,
      action: 'CREATE',
      performedBy: userId,
      newData: lead as unknown as Record<string, unknown>,
    });

    this.logger.log(`Lead created: ${lead.id} (${lead.leadCode})`);
    return lead;
  }

  async findAll(filter: LeadFilterDto) {
    const where = this.buildWhere(filter);
    const validSortFields = ['firstName', 'lastName', 'createdAt', 'updatedAt', 'status', 'priority', 'estimatedValue', 'expectedCloseDate'];
    const sortBy = filter.sortBy && validSortFields.includes(filter.sortBy) ? filter.sortBy : 'createdAt';
    const orderBy: Prisma.LeadOrderByWithRelationInput = { [sortBy]: filter.sortOrder ?? 'desc' };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.lead.findMany({ where, orderBy, skip: filter.skip, take: filter.take }),
      this.prisma.lead.count({ where }),
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

  async findOne(id: string): Promise<Lead> {
    const lead = await this.prisma.lead.findFirst({
      where: { id, deletedAt: null },
      include: { company: true, contact: true },
    });
    if (!lead) throw new LeadNotFoundException(id);
    return lead as unknown as Lead;
  }

  async update(id: string, dto: UpdateLeadDto, userId?: string): Promise<Lead> {
    const existing = await this.findOne(id);

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.lead.update({
        where: { id },
        data: {
          ...dto,
          email: dto.email?.toLowerCase().trim(),
          estimatedValue: dto.estimatedValue !== undefined ? dto.estimatedValue : undefined,
          expectedCloseDate: dto.expectedCloseDate ? new Date(dto.expectedCloseDate) : undefined,
          updatedBy: userId,
        },
      });
      await this.outbox.storeEvent(CrmEventTypes.LEAD_UPDATED, { leadId: id }, tx);
      return result;
    });

    await this.audit.log({
      entityType: 'Lead',
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
    await this.prisma.lead.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: userId },
    });
    await this.audit.log({ entityType: 'Lead', entityId: id, action: 'DELETE', performedBy: userId });
  }

  async assign(id: string, dto: AssignLeadDto, userId?: string): Promise<Lead> {
    const existing = await this.findOne(id);

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.lead.update({
        where: { id },
        data: { assignedTo: dto.assignedTo, updatedBy: userId },
      });
      await this.outbox.storeEvent(CrmEventTypes.LEAD_ASSIGNED, {
        leadId: id,
        previousAssignee: existing.assignedTo,
        newAssignee: dto.assignedTo,
      }, tx);
      return result;
    });

    await this.audit.log({
      entityType: 'Lead',
      entityId: id,
      action: 'ASSIGN',
      performedBy: userId,
      oldData: { assignedTo: existing.assignedTo } as Record<string, unknown>,
      newData: { assignedTo: dto.assignedTo } as Record<string, unknown>,
    });

    return updated;
  }

  async qualify(id: string, userId?: string): Promise<Lead> {
    const existing = await this.findOne(id);

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.lead.update({
        where: { id },
        data: { status: LeadStatus.QUALIFIED, updatedBy: userId },
      });
      await this.outbox.storeEvent(CrmEventTypes.LEAD_QUALIFIED, { leadId: id }, tx);
      return result;
    });

    await this.audit.log({
      entityType: 'Lead',
      entityId: id,
      action: 'STATUS_CHANGE',
      performedBy: userId,
      oldData: { status: existing.status } as Record<string, unknown>,
      newData: { status: LeadStatus.QUALIFIED } as Record<string, unknown>,
    });

    return updated;
  }

  async markLost(id: string, dto: MarkLostDto, userId?: string): Promise<Lead> {
    const existing = await this.findOne(id);

    if (existing.status === LeadStatus.CONVERTED) {
      throw new LeadAlreadyConvertedException(id);
    }

    if (existing.status === LeadStatus.LOST) {
      throw new LeadAlreadyLostException(id);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.lead.update({
        where: { id },
        data: {
          status: LeadStatus.LOST,
          lostReason: dto.lostReason,
          notes: dto.notes ?? existing.notes,
          updatedBy: userId,
        },
      });
      await this.outbox.storeEvent(CrmEventTypes.LEAD_LOST, {
        leadId: id,
        lostReason: dto.lostReason,
      }, tx);
      return result;
    });

    await this.audit.log({
      entityType: 'Lead',
      entityId: id,
      action: 'STATUS_CHANGE',
      performedBy: userId,
      oldData: { status: existing.status } as Record<string, unknown>,
      newData: { status: LeadStatus.LOST, lostReason: dto.lostReason } as Record<string, unknown>,
    });

    return updated;
  }
}
