import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OutboxService } from '../events/outbox.service';
import { AuditService } from '../audit/audit.service';
import { CreateOpportunityDto } from './dto/create-opportunity.dto';
import { UpdateOpportunityDto } from './dto/update-opportunity.dto';
import { OpportunityFilterDto } from './dto/opportunity-filter.dto';
import { AssignLeadDto as AssignOpportunityDto } from '../leads/dto/assign-lead.dto';
import { MoveStageDto, MarkOpportunityLostDto } from './dto/stage-actions.dto';
import {
  OpportunityNotFoundException,
  PipelineStageNotFoundException,
  InvalidOpportunityStageException,
} from '../common/exceptions/domain.exceptions';
import { CrmEventTypes } from '../events/event-publisher.interface';
import { Opportunity, Prisma, PipelineStage } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class OpportunitiesService {
  private readonly logger = new Logger(OpportunitiesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
    private readonly audit: AuditService,
  ) {}

  private generateOpportunityCode(): string {
    const num = Math.floor(Math.random() * 90000) + 10000;
    return `OPP-${num}`;
  }

  private calculateWeightedValue(value?: number | Prisma.Decimal | null, probability?: number): number {
    if (!value || probability === undefined) return 0;
    const numericValue = typeof value === 'number' ? value : Number(value);
    return (numericValue * probability) / 100;
  }

  private buildWhere(filter: OpportunityFilterDto): Prisma.OpportunityWhereInput {
    const where: Prisma.OpportunityWhereInput = { deletedAt: null };

    if (filter.search) {
      where.OR = [
        { title: { contains: filter.search, mode: 'insensitive' } },
        { opportunityCode: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    if (filter.pipelineId) where.pipelineId = filter.pipelineId;
    if (filter.stageId) where.stageId = filter.stageId;
    if (filter.assignedTo) where.assignedTo = filter.assignedTo;
    if (filter.customerId) where.customerId = filter.customerId;
    if (filter.companyId) where.companyId = filter.companyId;
    if (filter.leadId) where.leadId = filter.leadId;
    if (filter.priority) where.priority = filter.priority;

    if (filter.expectedCloseDateFrom || filter.expectedCloseDateTo) {
      where.expectedCloseDate = {
        ...(filter.expectedCloseDateFrom ? { gte: new Date(filter.expectedCloseDateFrom) } : {}),
        ...(filter.expectedCloseDateTo ? { lte: new Date(filter.expectedCloseDateTo) } : {}),
      };
    }

    if (filter.valueMin !== undefined || filter.valueMax !== undefined) {
      where.estimatedValue = {
        ...(filter.valueMin !== undefined ? { gte: filter.valueMin } : {}),
        ...(filter.valueMax !== undefined ? { lte: filter.valueMax } : {}),
      };
    }

    if (filter.isClosed !== undefined) {
      where.closedAt = filter.isClosed ? { not: null } : null;
    }

    return where;
  }

  // ============================================================
  // CRUD
  // ============================================================

  async create(dto: CreateOpportunityDto, userId?: string): Promise<Opportunity> {
    const stage = await this.prisma.pipelineStage.findFirst({
      where: { id: dto.stageId, pipelineId: dto.pipelineId },
    });
    if (!stage) throw new PipelineStageNotFoundException(dto.stageId);

    const opportunityCode = this.generateOpportunityCode();
    const probability = dto.probability ?? stage.probability;
    const weightedValue = this.calculateWeightedValue(dto.estimatedValue, probability);

    const opportunity = await this.prisma.$transaction(async (tx) => {
      const created = await tx.opportunity.create({
        data: {
          ...dto,
          id: uuidv4(),
          opportunityCode,
          probability,
          weightedValue,
          expectedCloseDate: dto.expectedCloseDate ? new Date(dto.expectedCloseDate) : undefined,
          closedAt: stage.isWon || stage.isLost ? new Date() : undefined,
          createdBy: userId,
          updatedBy: userId,
        },
      });

      await this.outbox.storeEvent(CrmEventTypes.OPPORTUNITY_CREATED, { opportunityId: created.id }, tx);
      return created;
    });

    await this.audit.log({
      entityType: 'Opportunity',
      entityId: opportunity.id,
      action: 'CREATE',
      performedBy: userId,
      newData: opportunity as unknown as Record<string, unknown>,
    });

    return opportunity;
  }

  async findAll(filter: OpportunityFilterDto) {
    const where = this.buildWhere(filter);
    const validSortFields = ['title', 'createdAt', 'updatedAt', 'expectedCloseDate', 'estimatedValue', 'probability'];
    const sortBy = filter.sortBy && validSortFields.includes(filter.sortBy) ? filter.sortBy : 'createdAt';
    const orderBy: Prisma.OpportunityOrderByWithRelationInput = { [sortBy]: filter.sortOrder ?? 'desc' };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.opportunity.findMany({
        where,
        orderBy,
        skip: filter.skip,
        take: filter.take,
        include: { stage: true },
      }),
      this.prisma.opportunity.count({ where }),
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

  async findOne(id: string): Promise<Opportunity> {
    const opportunity = await this.prisma.opportunity.findFirst({
      where: { id, deletedAt: null },
      include: { stage: true, pipeline: true, customer: true, company: true, contact: true, lead: true },
    });
    if (!opportunity) throw new OpportunityNotFoundException(id);
    return opportunity as unknown as Opportunity;
  }

  async update(id: string, dto: UpdateOpportunityDto, userId?: string): Promise<Opportunity> {
    const existing = await this.findOne(id);
    const probability = dto.probability ?? existing.probability;
    const value = dto.estimatedValue !== undefined ? dto.estimatedValue : existing.estimatedValue;
    const weightedValue = this.calculateWeightedValue(value, probability);

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.opportunity.update({
        where: { id },
        data: {
          ...dto,
          probability,
          weightedValue,
          expectedCloseDate: dto.expectedCloseDate ? new Date(dto.expectedCloseDate) : undefined,
          updatedBy: userId,
        },
      });
      await this.outbox.storeEvent(CrmEventTypes.OPPORTUNITY_UPDATED, { opportunityId: id }, tx);
      return result;
    });

    await this.audit.log({
      entityType: 'Opportunity',
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
    await this.prisma.opportunity.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: userId },
    });
    await this.audit.log({ entityType: 'Opportunity', entityId: id, action: 'DELETE', performedBy: userId });
  }

  // ============================================================
  // LIFECYCLE ACTIONS
  // ============================================================

  async assign(id: string, dto: AssignOpportunityDto, userId?: string): Promise<Opportunity> {
    const existing = await this.findOne(id);
    const updated = await this.prisma.opportunity.update({
      where: { id },
      data: { assignedTo: dto.assignedTo, updatedBy: userId },
    });
    await this.audit.log({
      entityType: 'Opportunity',
      entityId: id,
      action: 'ASSIGN',
      performedBy: userId,
      oldData: { assignedTo: existing.assignedTo } as Record<string, unknown>,
      newData: { assignedTo: dto.assignedTo } as Record<string, unknown>,
    });
    return updated;
  }

  async moveStage(id: string, dto: MoveStageDto, userId?: string): Promise<Opportunity> {
    const existing = await this.findOne(id);
    
    if (existing.stageId === dto.stageId) {
      return existing;
    }

    const newStage = await this.prisma.pipelineStage.findFirst({
      where: { id: dto.stageId, pipelineId: existing.pipelineId },
    });
    if (!newStage) throw new PipelineStageNotFoundException(dto.stageId);

    const probability = newStage.probability;
    const weightedValue = this.calculateWeightedValue(existing.estimatedValue, probability);
    const isClosed = newStage.isWon || newStage.isLost;

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.opportunity.update({
        where: { id },
        data: {
          stageId: dto.stageId,
          probability,
          weightedValue,
          closedAt: isClosed ? new Date() : null,
          lostReason: newStage.isLost ? existing.lostReason : null,
          updatedBy: userId,
        },
      });

      await this.outbox.storeEvent(CrmEventTypes.OPPORTUNITY_STAGE_CHANGED, {
        opportunityId: id,
        oldStageId: existing.stageId,
        newStageId: dto.stageId,
      }, tx);

      if (newStage.isWon) await this.outbox.storeEvent(CrmEventTypes.OPPORTUNITY_WON, { opportunityId: id }, tx);
      if (newStage.isLost) await this.outbox.storeEvent(CrmEventTypes.OPPORTUNITY_LOST, { opportunityId: id }, tx);

      return result;
    });

    await this.audit.log({
      entityType: 'Opportunity',
      entityId: id,
      action: 'STAGE_CHANGE',
      performedBy: userId,
      oldData: { stageId: existing.stageId } as Record<string, unknown>,
      newData: { stageId: dto.stageId } as Record<string, unknown>,
    });

    return updated;
  }

  async markWon(id: string, userId?: string): Promise<Opportunity> {
    const existing = await this.findOne(id);
    
    // Find a 'won' stage in the current pipeline
    const wonStage = await this.prisma.pipelineStage.findFirst({
      where: { pipelineId: existing.pipelineId, isWon: true },
    });
    
    if (!wonStage) {
      throw new InvalidOpportunityStageException('No won stage configured for this pipeline');
    }

    return this.moveStage(id, { stageId: wonStage.id }, userId);
  }

  async markLost(id: string, dto: MarkOpportunityLostDto, userId?: string): Promise<Opportunity> {
    const existing = await this.findOne(id);
    
    // Find a 'lost' stage in the current pipeline
    const lostStage = await this.prisma.pipelineStage.findFirst({
      where: { pipelineId: existing.pipelineId, isLost: true },
    });
    
    if (!lostStage) {
      throw new InvalidOpportunityStageException('No lost stage configured for this pipeline');
    }

    const probability = lostStage.probability;
    const weightedValue = this.calculateWeightedValue(existing.estimatedValue, probability);

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.opportunity.update({
        where: { id },
        data: {
          stageId: lostStage.id,
          probability,
          weightedValue,
          closedAt: new Date(),
          lostReason: dto.lostReason,
          updatedBy: userId,
        },
      });

      await this.outbox.storeEvent(CrmEventTypes.OPPORTUNITY_STAGE_CHANGED, {
        opportunityId: id,
        oldStageId: existing.stageId,
        newStageId: lostStage.id,
      }, tx);
      await this.outbox.storeEvent(CrmEventTypes.OPPORTUNITY_LOST, { opportunityId: id, lostReason: dto.lostReason }, tx);

      return result;
    });

    await this.audit.log({
      entityType: 'Opportunity',
      entityId: id,
      action: 'STAGE_CHANGE',
      performedBy: userId,
      oldData: { stageId: existing.stageId } as Record<string, unknown>,
      newData: { stageId: lostStage.id, lostReason: dto.lostReason } as Record<string, unknown>,
    });

    return updated;
  }
}
