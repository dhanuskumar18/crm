import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreatePipelineDto } from './dto/create-pipeline.dto';
import { UpdatePipelineDto } from './dto/update-pipeline.dto';
import { CreatePipelineStageDto } from './dto/create-pipeline-stage.dto';
import { UpdatePipelineStageDto } from './dto/update-pipeline-stage.dto';
import { ReorderStagesDto } from './dto/reorder-stages.dto';
import { PipelineNotFoundException, PipelineStageNotFoundException, InvalidPipelineStateException } from '../common/exceptions/domain.exceptions';
import { Pipeline, PipelineStage } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PipelinesService {
  private readonly logger = new Logger(PipelinesService.name);

  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  // ============================================================
  // PIPELINES
  // ============================================================

  async create(dto: CreatePipelineDto, userId?: string): Promise<Pipeline> {
    const pipeline = await this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.pipeline.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
      }

      return tx.pipeline.create({
        data: { ...dto, id: uuidv4(), createdBy: userId, updatedBy: userId },
      });
    });

    await this.audit.log({ entityType: 'Pipeline', entityId: pipeline.id, action: 'CREATE', performedBy: userId, newData: pipeline as unknown as Record<string, unknown> });
    return pipeline;
  }

  async findAll() {
    return this.prisma.pipeline.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        stages: { where: { isActive: true }, orderBy: { position: 'asc' } },
      },
    });
  }

  async findOne(id: string): Promise<Pipeline> {
    const pipeline = await this.prisma.pipeline.findFirst({
      where: { id, deletedAt: null },
      include: { stages: { orderBy: { position: 'asc' } } },
    });
    if (!pipeline) throw new PipelineNotFoundException(id);
    return pipeline;
  }

  async update(id: string, dto: UpdatePipelineDto, userId?: string): Promise<Pipeline> {
    await this.findOne(id);
    
    const pipeline = await this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.pipeline.updateMany({ where: { isDefault: true, id: { not: id } }, data: { isDefault: false } });
      }

      return tx.pipeline.update({
        where: { id },
        data: { ...dto, updatedBy: userId },
      });
    });

    await this.audit.log({ entityType: 'Pipeline', entityId: id, action: 'UPDATE', performedBy: userId, newData: pipeline as unknown as Record<string, unknown> });
    return pipeline;
  }

  async remove(id: string, userId?: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.pipeline.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    await this.audit.log({ entityType: 'Pipeline', entityId: id, action: 'DELETE', performedBy: userId });
  }

  // ============================================================
  // STAGES
  // ============================================================

  async addStage(pipelineId: string, dto: CreatePipelineStageDto, userId?: string): Promise<PipelineStage> {
    await this.findOne(pipelineId);

    // Get max position
    const maxStage = await this.prisma.pipelineStage.findFirst({
      where: { pipelineId },
      orderBy: { position: 'desc' },
    });
    const position = (maxStage?.position ?? -1) + 1;

    const stage = await this.prisma.pipelineStage.create({
      data: {
        ...dto,
        id: uuidv4(),
        pipelineId,
        position,
      },
    });

    await this.audit.log({ entityType: 'PipelineStage', entityId: stage.id, action: 'CREATE', performedBy: userId, metadata: { pipelineId } });
    return stage;
  }

  async updateStage(pipelineId: string, stageId: string, dto: UpdatePipelineStageDto, userId?: string): Promise<PipelineStage> {
    const existing = await this.prisma.pipelineStage.findFirst({ where: { id: stageId, pipelineId } });
    if (!existing) throw new PipelineStageNotFoundException(stageId);

    const stage = await this.prisma.pipelineStage.update({
      where: { id: stageId },
      data: dto,
    });

    await this.audit.log({ entityType: 'PipelineStage', entityId: stageId, action: 'UPDATE', performedBy: userId, metadata: { pipelineId } });
    return stage;
  }

  async removeStage(pipelineId: string, stageId: string, userId?: string): Promise<void> {
    const existing = await this.prisma.pipelineStage.findFirst({ where: { id: stageId, pipelineId } });
    if (!existing) throw new PipelineStageNotFoundException(stageId);

    const hasOpportunities = await this.prisma.opportunity.count({ where: { stageId, deletedAt: null } });
    if (hasOpportunities > 0) {
      throw new InvalidPipelineStateException('Cannot delete a stage that contains active opportunities');
    }

    await this.prisma.pipelineStage.delete({ where: { id: stageId } });
    await this.audit.log({ entityType: 'PipelineStage', entityId: stageId, action: 'DELETE', performedBy: userId, metadata: { pipelineId } });
  }

  async reorderStages(pipelineId: string, dto: ReorderStagesDto, userId?: string): Promise<void> {
    await this.findOne(pipelineId);

    const existingStages = await this.prisma.pipelineStage.findMany({ where: { pipelineId } });
    const existingIds = new Set(existingStages.map(s => s.id));

    // Validate all provided IDs belong to this pipeline
    for (const id of dto.stageIds) {
      if (!existingIds.has(id)) {
        throw new PipelineStageNotFoundException(id);
      }
    }

    await this.prisma.$transaction(
      dto.stageIds.map((id, index) =>
        this.prisma.pipelineStage.update({
          where: { id },
          data: { position: index },
        })
      )
    );

    await this.audit.log({ entityType: 'Pipeline', entityId: pipelineId, action: 'UPDATE', performedBy: userId, metadata: { action: 'reorder_stages' } });
  }
}
