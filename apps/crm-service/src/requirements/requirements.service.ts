import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OutboxService } from '../events/outbox.service';
import { AuditService } from '../audit/audit.service';
import { CreateRequirementDto } from './dto/create-requirement.dto';
import { UpdateRequirementDto } from './dto/update-requirement.dto';
import { RequirementFilterDto } from './dto/requirement-filter.dto';
import { AssignLeadDto as AssignRequirementDto } from '../leads/dto/assign-lead.dto';
import {
  RequirementNotFoundException,
  InvalidRequirementTransitionException,
} from '../common/exceptions/domain.exceptions';
import { CrmEventTypes } from '../events/event-publisher.interface';
import { Requirement, RequirementStatus, Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RequirementsService {
  private readonly logger = new Logger(RequirementsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
    private readonly audit: AuditService,
  ) {}

  private generateRequirementCode(): string {
    const num = Math.floor(Math.random() * 90000) + 10000;
    return `REQ-${num}`;
  }

  private buildWhere(filter: RequirementFilterDto): Prisma.RequirementWhereInput {
    const where: Prisma.RequirementWhereInput = { deletedAt: null };

    if (filter.search) {
      where.OR = [
        { title: { contains: filter.search, mode: 'insensitive' } },
        { requirementCode: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    if (filter.opportunityId) where.opportunityId = filter.opportunityId;
    if (filter.leadId) where.leadId = filter.leadId;
    if (filter.customerId) where.customerId = filter.customerId;
    if (filter.companyId) where.companyId = filter.companyId;
    if (filter.assignedTo) where.assignedTo = filter.assignedTo;
    if (filter.status) where.status = filter.status;
    if (filter.priority) where.priority = filter.priority;

    if (filter.createdFrom || filter.createdTo) {
      where.createdAt = {
        ...(filter.createdFrom ? { gte: new Date(filter.createdFrom) } : {}),
        ...(filter.createdTo ? { lte: new Date(filter.createdTo) } : {}),
      };
    }

    return where;
  }

  // ============================================================
  // CRUD
  // ============================================================

  async create(dto: CreateRequirementDto, userId?: string): Promise<Requirement> {
    const requirementCode = this.generateRequirementCode();

    const requirement = await this.prisma.$transaction(async (tx) => {
      const created = await tx.requirement.create({
        data: {
          ...dto,
          id: uuidv4(),
          requirementCode,
          expectedDeliveryDate: dto.expectedDeliveryDate ? new Date(dto.expectedDeliveryDate) : undefined,
          createdBy: userId,
          updatedBy: userId,
        },
      });

      await this.outbox.storeEvent(CrmEventTypes.REQUIREMENT_CREATED, { requirementId: created.id }, tx);
      return created;
    });

    await this.audit.log({
      entityType: 'Requirement',
      entityId: requirement.id,
      action: 'CREATE',
      performedBy: userId,
      newData: requirement as unknown as Record<string, unknown>,
    });

    return requirement;
  }

  async findAll(filter: RequirementFilterDto) {
    const where = this.buildWhere(filter);
    const validSortFields = ['title', 'createdAt', 'updatedAt', 'status', 'priority', 'expectedDeliveryDate'];
    const sortBy = filter.sortBy && validSortFields.includes(filter.sortBy) ? filter.sortBy : 'createdAt';
    const orderBy: Prisma.RequirementOrderByWithRelationInput = { [sortBy]: filter.sortOrder ?? 'desc' };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.requirement.findMany({ where, orderBy, skip: filter.skip, take: filter.take }),
      this.prisma.requirement.count({ where }),
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

  async findOne(id: string): Promise<Requirement> {
    const requirement = await this.prisma.requirement.findFirst({
      where: { id, deletedAt: null },
      include: { opportunity: true, lead: true, customer: true, company: true, contact: true },
    });
    if (!requirement) throw new RequirementNotFoundException(id);
    return requirement as unknown as Requirement;
  }

  async update(id: string, dto: UpdateRequirementDto, userId?: string): Promise<Requirement> {
    const existing = await this.findOne(id);
    
    // Rule 4: A READY_FOR_QUOTATION requirement cannot be modified
    // without explicitly changing its status back.
    if (existing.status === RequirementStatus.READY_FOR_QUOTATION && dto.status === undefined) {
      throw new InvalidRequirementTransitionException(
        'Cannot modify a requirement that is ready for quotation. Change its status back to CONFIRMED or ANALYSIS first.'
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.requirement.update({
        where: { id },
        data: {
          ...dto,
          expectedDeliveryDate: dto.expectedDeliveryDate ? new Date(dto.expectedDeliveryDate) : undefined,
          updatedBy: userId,
        },
      });

      await this.outbox.storeEvent(CrmEventTypes.REQUIREMENT_UPDATED, { requirementId: id }, tx);
      return result;
    });

    await this.audit.log({
      entityType: 'Requirement',
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
    await this.prisma.requirement.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: userId },
    });
    await this.audit.log({ entityType: 'Requirement', entityId: id, action: 'DELETE', performedBy: userId });
  }

  // ============================================================
  // LIFECYCLE ACTIONS
  // ============================================================

  async assign(id: string, dto: AssignRequirementDto, userId?: string): Promise<Requirement> {
    const existing = await this.findOne(id);
    const updated = await this.prisma.requirement.update({
      where: { id },
      data: { assignedTo: dto.assignedTo, updatedBy: userId },
    });
    await this.audit.log({
      entityType: 'Requirement',
      entityId: id,
      action: 'ASSIGN',
      performedBy: userId,
      oldData: { assignedTo: existing.assignedTo } as Record<string, unknown>,
      newData: { assignedTo: dto.assignedTo } as Record<string, unknown>,
    });
    return updated;
  }

  async confirm(id: string, userId?: string): Promise<Requirement> {
    const existing = await this.findOne(id);
    
    if (existing.status === RequirementStatus.CANCELLED) {
      throw new InvalidRequirementTransitionException('Cannot confirm a cancelled requirement');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.requirement.update({
        where: { id },
        data: { status: RequirementStatus.CONFIRMED, confirmedAt: new Date(), updatedBy: userId },
      });
      await this.outbox.storeEvent(CrmEventTypes.REQUIREMENT_CONFIRMED, { requirementId: id }, tx);
      return result;
    });

    await this.audit.log({
      entityType: 'Requirement',
      entityId: id,
      action: 'STATUS_CHANGE',
      performedBy: userId,
      oldData: { status: existing.status } as Record<string, unknown>,
      newData: { status: RequirementStatus.CONFIRMED } as Record<string, unknown>,
    });

    return updated;
  }

  async markReady(id: string, userId?: string): Promise<Requirement> {
    const existing = await this.findOne(id);
    
    // Rule 3: A cancelled requirement cannot be marked ready
    if (existing.status === RequirementStatus.CANCELLED) {
      throw new InvalidRequirementTransitionException('Cannot mark a cancelled requirement as ready for quotation');
    }

    // Rule 2: A requirement must have business/technical information complete
    if (!existing.businessRequirement || !existing.estimatedValue) {
      throw new InvalidRequirementTransitionException(
        'Requirement must have a businessRequirement and estimatedValue before marking as ready for quotation'
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.requirement.update({
        where: { id },
        data: { status: RequirementStatus.READY_FOR_QUOTATION, updatedBy: userId },
      });
      // The Sales service will listen for this event to generate a quotation
      await this.outbox.storeEvent(CrmEventTypes.REQUIREMENT_READY_FOR_QUOTATION, { requirementId: id }, tx);
      return result;
    });

    await this.audit.log({
      entityType: 'Requirement',
      entityId: id,
      action: 'STATUS_CHANGE',
      performedBy: userId,
      oldData: { status: existing.status } as Record<string, unknown>,
      newData: { status: RequirementStatus.READY_FOR_QUOTATION } as Record<string, unknown>,
    });

    return updated;
  }

  async cancel(id: string, userId?: string): Promise<Requirement> {
    const existing = await this.findOne(id);
    
    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.requirement.update({
        where: { id },
        data: { status: RequirementStatus.CANCELLED, updatedBy: userId },
      });
      await this.outbox.storeEvent(CrmEventTypes.REQUIREMENT_CANCELLED, { requirementId: id }, tx);
      return result;
    });

    await this.audit.log({
      entityType: 'Requirement',
      entityId: id,
      action: 'STATUS_CHANGE',
      performedBy: userId,
      oldData: { status: existing.status } as Record<string, unknown>,
      newData: { status: RequirementStatus.CANCELLED } as Record<string, unknown>,
    });

    return updated;
  }
}
