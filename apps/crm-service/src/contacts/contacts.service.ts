import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OutboxService } from '../events/outbox.service';
import { AuditService } from '../audit/audit.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { ContactFilterDto } from './dto/contact-filter.dto';
import {
  ContactNotFoundException,
  DuplicateContactException,
} from '../common/exceptions/domain.exceptions';
import { CrmEventTypes } from '../events/event-publisher.interface';
import { Contact, Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ContactsService {
  private readonly logger = new Logger(ContactsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
    private readonly audit: AuditService,
  ) {}

  private buildWhere(filter: ContactFilterDto): Prisma.ContactWhereInput {
    const where: Prisma.ContactWhereInput = { deletedAt: null };

    if (filter.search) {
      where.OR = [
        { firstName: { contains: filter.search, mode: 'insensitive' } },
        { lastName: { contains: filter.search, mode: 'insensitive' } },
        { email: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    if (filter.companyId) where.companyId = filter.companyId;
    if (filter.contactType) where.contactType = filter.contactType;
    if (filter.status) where.status = filter.status;

    return where;
  }

  async create(dto: CreateContactDto, userId?: string): Promise<Contact> {
    // Check for duplicate email (within active contacts of same company)
    const existingEmail = await this.prisma.contact.findFirst({
      where: {
        email: { equals: dto.email.toLowerCase().trim(), mode: 'insensitive' },
        deletedAt: null,
        ...(dto.companyId ? { companyId: dto.companyId } : {}),
      },
    });

    if (existingEmail) {
      throw new DuplicateContactException(dto.email);
    }

    // If setting as primary, demote other primary contacts for the same company
    if (dto.isPrimary && dto.companyId) {
      await this.prisma.contact.updateMany({
        where: { companyId: dto.companyId, isPrimary: true, deletedAt: null },
        data: { isPrimary: false },
      });
    }

    const contact = await this.prisma.$transaction(async (tx) => {
      const created = await tx.contact.create({
        data: {
          ...dto,
          id: uuidv4(),
          email: dto.email.toLowerCase().trim(),
          createdBy: userId,
          updatedBy: userId,
        },
      });
      await this.outbox.storeEvent(CrmEventTypes.CONTACT_CREATED, { contactId: created.id }, tx);
      return created;
    });

    await this.audit.log({
      entityType: 'Contact',
      entityId: contact.id,
      action: 'CREATE',
      performedBy: userId,
      newData: contact as unknown as Record<string, unknown>,
    });

    return contact;
  }

  async findAll(filter: ContactFilterDto) {
    const where = this.buildWhere(filter);
    const validSortFields = ['firstName', 'lastName', 'email', 'createdAt', 'updatedAt'];
    const sortBy = filter.sortBy && validSortFields.includes(filter.sortBy) ? filter.sortBy : 'createdAt';
    const orderBy: Prisma.ContactOrderByWithRelationInput = { [sortBy]: filter.sortOrder ?? 'desc' };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.contact.findMany({ where, orderBy, skip: filter.skip, take: filter.take }),
      this.prisma.contact.count({ where }),
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

  async findOne(id: string): Promise<Contact> {
    const contact = await this.prisma.contact.findFirst({
      where: { id, deletedAt: null },
      include: { company: true },
    });
    if (!contact) throw new ContactNotFoundException(id);
    return contact as unknown as Contact;
  }

  async update(id: string, dto: UpdateContactDto, userId?: string): Promise<Contact> {
    const existing = await this.findOne(id);

    if (dto.email && dto.email.toLowerCase() !== existing.email) {
      const duplicate = await this.prisma.contact.findFirst({
        where: {
          email: { equals: dto.email.toLowerCase(), mode: 'insensitive' },
          deletedAt: null,
          id: { not: id },
        },
      });
      if (duplicate) throw new DuplicateContactException(dto.email);
    }

    // Handle primary contact switching
    if (dto.isPrimary && dto.companyId) {
      await this.prisma.contact.updateMany({
        where: { companyId: dto.companyId, isPrimary: true, deletedAt: null, id: { not: id } },
        data: { isPrimary: false },
      });
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.contact.update({
        where: { id },
        data: {
          ...dto,
          email: dto.email?.toLowerCase().trim(),
          updatedBy: userId,
        },
      });
      await this.outbox.storeEvent(CrmEventTypes.CONTACT_UPDATED, { contactId: id }, tx);
      return result;
    });

    await this.audit.log({
      entityType: 'Contact',
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
    await this.prisma.contact.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: userId },
    });
    await this.audit.log({ entityType: 'Contact', entityId: id, action: 'DELETE', performedBy: userId });
  }
}
