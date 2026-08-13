import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { OutboxService } from '../events/outbox.service';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { DocumentFilterDto } from './dto/document-filter.dto';
import { DocumentNotFoundException } from '../common/exceptions/domain.exceptions';
import { CrmEventTypes } from '../events/event-publisher.interface';
import { Document, Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
    private readonly audit: AuditService,
  ) {}

  private validateEntityLinks(dto: UploadDocumentDto) {
    if (!dto.leadId && !dto.companyId && !dto.customerId && !dto.opportunityId) {
      throw new BadRequestException('Document must be linked to at least one entity (lead, company, customer, or opportunity)');
    }
  }

  private buildWhere(filter: DocumentFilterDto): Prisma.DocumentWhereInput {
    const where: Prisma.DocumentWhereInput = { deletedAt: null };

    if (filter.search) {
      where.name = { contains: filter.search, mode: 'insensitive' };
    }

    if (filter.documentType) where.documentType = filter.documentType;
    if (filter.companyId) where.companyId = filter.companyId;
    if (filter.customerId) where.customerId = filter.customerId;
    if (filter.opportunityId) where.opportunityId = filter.opportunityId;

    return where;
  }

  async upload(dto: UploadDocumentDto, userId?: string): Promise<Document> {
    this.validateEntityLinks(dto);

    const document = await this.prisma.$transaction(async (tx) => {
      const created = await tx.document.create({
        data: {
          id: uuidv4(),
          name: dto.fileName,
          documentType: dto.documentType,
          storageKey: dto.fileUrl,
          mimeType: dto.mimeType,
          size: dto.fileSize,
          companyId: dto.companyId,
          customerId: dto.customerId,
          opportunityId: dto.opportunityId,
          uploadedBy: userId,
          createdBy: userId,
        },
      });

      await this.outbox.storeEvent(CrmEventTypes.DOCUMENT_UPLOADED, { documentId: created.id }, tx);
      return created;
    });

    await this.audit.log({
      entityType: 'Document',
      entityId: document.id,
      action: 'CREATE',
      performedBy: userId,
      newData: document as unknown as Record<string, unknown>,
    });

    return document;
  }

  async findAll(filter: DocumentFilterDto) {
    const where = this.buildWhere(filter);
    const validSortFields = ['name', 'createdAt', 'size'];
    const sortBy = filter.sortBy && validSortFields.includes(filter.sortBy) ? filter.sortBy : 'createdAt';
    const orderBy: Prisma.DocumentOrderByWithRelationInput = { [sortBy]: filter.sortOrder ?? 'desc' };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.document.findMany({ where, orderBy, skip: filter.skip, take: filter.take }),
      this.prisma.document.count({ where }),
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

  async findOne(id: string): Promise<Document> {
    const document = await this.prisma.document.findFirst({
      where: { id, deletedAt: null },
    });
    if (!document) throw new DocumentNotFoundException(id);
    return document;
  }

  async remove(id: string, userId?: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.$transaction(async (tx) => {
      await tx.document.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      await this.outbox.storeEvent(CrmEventTypes.DOCUMENT_DELETED, { documentId: id }, tx);
    });
    await this.audit.log({ entityType: 'Document', entityId: id, action: 'DELETE', performedBy: userId });
  }
}
