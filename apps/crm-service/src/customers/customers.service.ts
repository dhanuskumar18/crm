import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OutboxService } from '../events/outbox.service';
import { AuditService } from '../audit/audit.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerFilterDto } from './dto/customer-filter.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { CustomerNotFoundException } from '../common/exceptions/domain.exceptions';
import { CrmEventTypes } from '../events/event-publisher.interface';
import { Customer, Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
    private readonly audit: AuditService,
  ) {}

  private generateCustomerCode(): string {
    const num = Math.floor(Math.random() * 90000) + 10000;
    return `CUST-${num}`;
  }

  private buildWhere(filter: CustomerFilterDto): Prisma.CustomerWhereInput {
    const where: Prisma.CustomerWhereInput = { deletedAt: null };
    if (filter.search) {
      where.OR = [
        { customerCode: { contains: filter.search, mode: 'insensitive' } },
        { company: { name: { contains: filter.search, mode: 'insensitive' } } },
      ];
    }
    if (filter.status) where.status = filter.status;
    if (filter.customerType) where.customerType = filter.customerType;
    if (filter.accountManagerId) where.accountManagerId = filter.accountManagerId;
    if (filter.companyId) where.companyId = filter.companyId;
    return where;
  }

  async create(dto: CreateCustomerDto, userId?: string): Promise<Customer> {
    let customerCode: string;
    let attempts = 0;
    do {
      customerCode = this.generateCustomerCode();
      const exists = await this.prisma.customer.findUnique({ where: { customerCode } });
      if (!exists) break;
      attempts++;
    } while (attempts < 10);

    const customer = await this.prisma.$transaction(async (tx) => {
      const created = await tx.customer.create({
        data: {
          ...dto,
          id: uuidv4(),
          customerCode: customerCode!,
          customerSince: dto.customerSince ? new Date(dto.customerSince) : new Date(),
          createdBy: userId,
          updatedBy: userId,
        },
        include: { company: true, primaryContact: true },
      });

      await this.outbox.storeEvent(CrmEventTypes.CUSTOMER_CREATED, { customerId: created.id, companyId: created.companyId }, tx);
      return created;
    });

    await this.audit.log({
      entityType: 'Customer',
      entityId: customer.id,
      action: 'CREATE',
      performedBy: userId,
      newData: customer as unknown as Record<string, unknown>,
    });

    this.logger.log(`Customer created: ${customer.id} (${customer.customerCode})`);
    return customer as unknown as Customer;
  }

  async findAll(filter: CustomerFilterDto) {
    const where = this.buildWhere(filter);
    const validSortFields = ['createdAt', 'updatedAt', 'status', 'customerCode', 'customerSince'];
    const sortBy = filter.sortBy && validSortFields.includes(filter.sortBy) ? filter.sortBy : 'createdAt';
    const orderBy: Prisma.CustomerOrderByWithRelationInput = { [sortBy]: filter.sortOrder ?? 'desc' };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        where, orderBy, skip: filter.skip, take: filter.take,
        include: { company: { select: { id: true, name: true, companyCode: true } }, primaryContact: { select: { id: true, firstName: true, lastName: true, email: true } } },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      data,
      meta: { page: filter.page ?? 1, limit: filter.limit ?? 20, total, totalPages: Math.ceil(total / (filter.limit ?? 20)) },
    };
  }

  async findOne(id: string): Promise<Customer> {
    const customer = await this.prisma.customer.findFirst({
      where: { id, deletedAt: null },
      include: {
        company: true,
        primaryContact: true,
      },
    });
    if (!customer) throw new CustomerNotFoundException(id);
    return customer as unknown as Customer;
  }

  async update(id: string, dto: UpdateCustomerDto, userId?: string): Promise<Customer> {
    const existing = await this.findOne(id);
    const prevStatus = existing.status;

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.customer.update({
        where: { id },
        data: {
          ...dto,
          customerSince: dto.customerSince ? new Date(dto.customerSince) : undefined,
          updatedBy: userId,
        },
        include: { company: true },
      });

      const eventType = dto.status && dto.status !== prevStatus
        ? CrmEventTypes.CUSTOMER_STATUS_CHANGED
        : CrmEventTypes.CUSTOMER_UPDATED;

      await this.outbox.storeEvent(eventType, { customerId: id, oldStatus: prevStatus, newStatus: dto.status }, tx);
      return result;
    });

    await this.audit.log({
      entityType: 'Customer',
      entityId: id,
      action: dto.status && dto.status !== prevStatus ? 'STATUS_CHANGE' : 'UPDATE',
      performedBy: userId,
      oldData: existing as unknown as Record<string, unknown>,
      newData: updated as unknown as Record<string, unknown>,
    });

    return updated as unknown as Customer;
  }

  async remove(id: string, userId?: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.customer.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: userId },
    });
    await this.audit.log({ entityType: 'Customer', entityId: id, action: 'DELETE', performedBy: userId });
  }

  async findActivities(id: string, pagination: PaginationDto) {
    await this.findOne(id);
    const where = { customerId: id, deletedAt: null };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.activity.findMany({ where, skip: pagination.skip, take: pagination.take, orderBy: { activityDate: 'desc' } }),
      this.prisma.activity.count({ where }),
    ]);
    return { data, meta: { page: pagination.page ?? 1, limit: pagination.limit ?? 20, total, totalPages: Math.ceil(total / (pagination.limit ?? 20)) } };
  }

  async findFollowUps(id: string, pagination: PaginationDto) {
    await this.findOne(id);
    const where = { customerId: id, deletedAt: null };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.followUp.findMany({ where, skip: pagination.skip, take: pagination.take, orderBy: { dueDate: 'asc' } }),
      this.prisma.followUp.count({ where }),
    ]);
    return { data, meta: { page: pagination.page ?? 1, limit: pagination.limit ?? 20, total, totalPages: Math.ceil(total / (pagination.limit ?? 20)) } };
  }
}
