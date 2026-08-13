import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OutboxService } from '../events/outbox.service';
import { AuditService } from '../audit/audit.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { CompanyFilterDto } from './dto/company-filter.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import {
  CompanyNotFoundException,
  DuplicateCompanyException,
} from '../common/exceptions/domain.exceptions';
import { CrmEventTypes } from '../events/event-publisher.interface';
import { Company, Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CompaniesService {
  private readonly logger = new Logger(CompaniesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
    private readonly audit: AuditService,
  ) {}

  // ============================================================
  // HELPERS
  // ============================================================

  private generateCompanyCode(): string {
    const num = Math.floor(Math.random() * 90000) + 10000;
    return `COMP-${num}`;
  }

  private buildWhereClause(filter: CompanyFilterDto): Prisma.CompanyWhereInput {
    const where: Prisma.CompanyWhereInput = { deletedAt: null };

    if (filter.search) {
      where.OR = [
        { name: { contains: filter.search, mode: 'insensitive' } },
        { legalName: { contains: filter.search, mode: 'insensitive' } },
        { email: { contains: filter.search, mode: 'insensitive' } },
        { companyCode: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    if (filter.status) where.status = filter.status;
    if (filter.industry) where.industry = { contains: filter.industry, mode: 'insensitive' };
    if (filter.country) where.country = { contains: filter.country, mode: 'insensitive' };

    return where;
  }

  private buildOrderBy(filter: CompanyFilterDto): Prisma.CompanyOrderByWithRelationInput {
    const validSortFields = ['name', 'createdAt', 'updatedAt', 'status', 'companyCode'];
    const sortBy = filter.sortBy && validSortFields.includes(filter.sortBy) ? filter.sortBy : 'createdAt';
    return { [sortBy]: filter.sortOrder ?? 'desc' };
  }

  // ============================================================
  // CREATE
  // ============================================================

  async create(dto: CreateCompanyDto, userId?: string): Promise<Company> {
    // Check for duplicate name+country combination (active companies)
    if (dto.name) {
      const existing = await this.prisma.company.findFirst({
        where: {
          name: { equals: dto.name, mode: 'insensitive' },
          deletedAt: null,
          ...(dto.country ? { country: { equals: dto.country, mode: 'insensitive' } } : {}),
        },
      });

      if (existing) {
        throw new DuplicateCompanyException(dto.name);
      }
    }

    let companyCode: string;
    let attempts = 0;
    do {
      companyCode = this.generateCompanyCode();
      const exists = await this.prisma.company.findUnique({ where: { companyCode } });
      if (!exists) break;
      attempts++;
    } while (attempts < 10);

    const company = await this.prisma.$transaction(async (tx) => {
      const created = await tx.company.create({
        data: {
          ...dto,
          id: uuidv4(),
          companyCode: companyCode!,
          email: dto.email?.toLowerCase().trim(),
          createdBy: userId,
          updatedBy: userId,
        },
      });

      await this.outbox.storeEvent(CrmEventTypes.COMPANY_CREATED, { companyId: created.id, ...dto }, tx);

      return created;
    });

    await this.audit.log({
      entityType: 'Company',
      entityId: company.id,
      action: 'CREATE',
      performedBy: userId,
      newData: company as unknown as Record<string, unknown>,
    });

    this.logger.log(`Company created: ${company.id} (${company.companyCode})`);
    return company;
  }

  // ============================================================
  // FIND ALL
  // ============================================================

  async findAll(filter: CompanyFilterDto) {
    const where = this.buildWhereClause(filter);
    const orderBy = this.buildOrderBy(filter);
    const skip = filter.skip;
    const take = filter.take;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.company.findMany({ where, orderBy, skip, take }),
      this.prisma.company.count({ where }),
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

  // ============================================================
  // FIND ONE
  // ============================================================

  async findOne(id: string): Promise<Company> {
    const company = await this.prisma.company.findFirst({
      where: { id, deletedAt: null },
    });
    if (!company) throw new CompanyNotFoundException(id);
    return company;
  }

  // ============================================================
  // UPDATE
  // ============================================================

  async update(id: string, dto: UpdateCompanyDto, userId?: string): Promise<Company> {
    const existing = await this.findOne(id);

    if (dto.name && dto.name !== existing.name) {
      const duplicate = await this.prisma.company.findFirst({
        where: {
          name: { equals: dto.name, mode: 'insensitive' },
          deletedAt: null,
          id: { not: id },
        },
      });
      if (duplicate) throw new DuplicateCompanyException(dto.name);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.company.update({
        where: { id },
        data: { ...dto, email: dto.email?.toLowerCase().trim(), updatedBy: userId },
      });

      await this.outbox.storeEvent(CrmEventTypes.COMPANY_UPDATED, { companyId: id }, tx);
      return result;
    });

    await this.audit.log({
      entityType: 'Company',
      entityId: id,
      action: 'UPDATE',
      performedBy: userId,
      oldData: existing as unknown as Record<string, unknown>,
      newData: updated as unknown as Record<string, unknown>,
    });

    return updated;
  }

  // ============================================================
  // SOFT DELETE
  // ============================================================

  async remove(id: string, userId?: string): Promise<void> {
    await this.findOne(id);

    await this.prisma.$transaction(async (tx) => {
      await tx.company.update({
        where: { id },
        data: { deletedAt: new Date(), deletedBy: userId },
      });
      await this.outbox.storeEvent(CrmEventTypes.COMPANY_DELETED, { companyId: id }, tx);
    });

    await this.audit.log({
      entityType: 'Company',
      entityId: id,
      action: 'DELETE',
      performedBy: userId,
    });
  }

  // ============================================================
  // COMPANY CONTACTS
  // ============================================================

  async findContacts(id: string, pagination: PaginationDto) {
    await this.findOne(id);
    const where = { companyId: id, deletedAt: null };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.contact.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.contact.count({ where }),
    ]);
    return { data, meta: { page: pagination.page ?? 1, limit: pagination.limit ?? 20, total, totalPages: Math.ceil(total / (pagination.limit ?? 20)) } };
  }

  // ============================================================
  // COMPANY CUSTOMERS
  // ============================================================

  async findCustomers(id: string, pagination: PaginationDto) {
    await this.findOne(id);
    const where = { companyId: id, deletedAt: null };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({ where, skip: pagination.skip, take: pagination.take, orderBy: { createdAt: 'desc' } }),
      this.prisma.customer.count({ where }),
    ]);
    return { data, meta: { page: pagination.page ?? 1, limit: pagination.limit ?? 20, total, totalPages: Math.ceil(total / (pagination.limit ?? 20)) } };
  }

  // ============================================================
  // COMPANY LEADS
  // ============================================================

  async findLeads(id: string, pagination: PaginationDto) {
    await this.findOne(id);
    const where = { companyId: id, deletedAt: null };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.lead.findMany({ where, skip: pagination.skip, take: pagination.take, orderBy: { createdAt: 'desc' } }),
      this.prisma.lead.count({ where }),
    ]);
    return { data, meta: { page: pagination.page ?? 1, limit: pagination.limit ?? 20, total, totalPages: Math.ceil(total / (pagination.limit ?? 20)) } };
  }

  // ============================================================
  // COMPANY OPPORTUNITIES
  // ============================================================

  async findOpportunities(id: string, pagination: PaginationDto) {
    await this.findOne(id);
    const where = { companyId: id, deletedAt: null };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.opportunity.findMany({ where, skip: pagination.skip, take: pagination.take, orderBy: { createdAt: 'desc' } }),
      this.prisma.opportunity.count({ where }),
    ]);
    return { data, meta: { page: pagination.page ?? 1, limit: pagination.limit ?? 20, total, totalPages: Math.ceil(total / (pagination.limit ?? 20)) } };
  }

  // ============================================================
  // COMPANY ACTIVITIES
  // ============================================================

  async findActivities(id: string, pagination: PaginationDto) {
    await this.findOne(id);
    const where = { companyId: id, deletedAt: null };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.activity.findMany({ where, skip: pagination.skip, take: pagination.take, orderBy: { activityDate: 'desc' } }),
      this.prisma.activity.count({ where }),
    ]);
    return { data, meta: { page: pagination.page ?? 1, limit: pagination.limit ?? 20, total, totalPages: Math.ceil(total / (pagination.limit ?? 20)) } };
  }
}
