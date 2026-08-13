import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OutboxService } from '../events/outbox.service';
import { AuditService } from '../audit/audit.service';
import { ConvertLeadDto } from './dto/convert-lead.dto';
import {
  LeadNotFoundException,
  LeadAlreadyConvertedException,
  InvalidLeadConversionException,
} from '../common/exceptions/domain.exceptions';
import { CrmEventTypes } from '../events/event-publisher.interface';
import { Lead, LeadStatus, CustomerType, ContactType } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

export interface LeadConversionResult {
  lead: Lead;
  companyId: string;
  contactId: string;
  customerId: string;
}

@Injectable()
export class LeadConversionService {
  private readonly logger = new Logger(LeadConversionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Convert a lead into a Customer (Company + Contact + Customer).
   *
   * This is IDEMPOTENT: if the lead is already converted, returns the
   * existing conversion references without creating duplicates.
   *
   * The entire operation is wrapped in a database transaction.
   * If any step fails, the entire conversion rolls back.
   */
  async convert(
    leadId: string,
    dto: ConvertLeadDto,
    userId?: string,
  ): Promise<LeadConversionResult> {
    // ---- Pre-flight check outside transaction ----
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, deletedAt: null },
    });

    if (!lead) throw new LeadNotFoundException(leadId);

    // IDEMPOTENCY: Return existing result if already converted
    if (lead.status === LeadStatus.CONVERTED) {
      if (lead.convertedCustomerId && lead.convertedCompanyId && lead.convertedContactId) {
        this.logger.warn(`Lead ${leadId} already converted, returning existing references.`);
        return {
          lead,
          companyId: lead.convertedCompanyId,
          contactId: lead.convertedContactId,
          customerId: lead.convertedCustomerId,
        };
      }
      throw new LeadAlreadyConvertedException(leadId);
    }

    // Validate: must have company info
    const hasExistingCompany = !!dto.companyId;
    const hasNewCompany = dto.createCompany && !!dto.company?.name;
    const hasLeadCompanyName = !!lead.companyName;

    if (!hasExistingCompany && !hasNewCompany && !hasLeadCompanyName) {
      throw new InvalidLeadConversionException(
        'Company information is required for conversion. Provide companyId, createCompany with company data, or ensure lead has a companyName.',
      );
    }

    // ---- Transactional conversion ----
    const result = await this.prisma.$transaction(async (tx) => {
      // ---- STEP 1: Resolve or Create Company ----
      let companyId: string;

      if (hasExistingCompany) {
        // Use provided company
        const existingCompany = await tx.company.findFirst({
          where: { id: dto.companyId!, deletedAt: null },
        });
        if (!existingCompany) {
          throw new InvalidLeadConversionException(`Company with ID "${dto.companyId}" not found.`);
        }
        companyId = existingCompany.id;
      } else {
        // Find or create company from lead/dto data
        const companyName = dto.company?.name ?? lead.companyName!;
        const existingByName = await tx.company.findFirst({
          where: {
            name: { equals: companyName, mode: 'insensitive' },
            deletedAt: null,
          },
        });

        if (existingByName) {
          companyId = existingByName.id;
          this.logger.log(`Reusing existing company "${companyName}" (${companyId})`);
        } else {
          const companyCode = `COMP-${Math.floor(Math.random() * 90000) + 10000}`;
          const newCompany = await tx.company.create({
            data: {
              id: uuidv4(),
              companyCode,
              name: companyName,
              industry: dto.company?.industry ?? lead.industry ?? undefined,
              email: dto.company?.email ?? undefined,
              phone: dto.company?.phone ?? lead.phone ?? undefined,
              createdBy: userId,
              updatedBy: userId,
            },
          });
          companyId = newCompany.id;
          this.logger.log(`Created new company "${companyName}" (${companyId})`);

          await this.outbox.storeEvent(CrmEventTypes.COMPANY_CREATED, { companyId, source: 'lead_conversion' }, tx);
        }
      }

      // ---- STEP 2: Resolve or Create Contact ----
      let contactId: string;

      if (dto.contactId) {
        // Use existing contact
        const existingContact = await tx.contact.findFirst({
          where: { id: dto.contactId, deletedAt: null },
        });
        if (!existingContact) {
          throw new InvalidLeadConversionException(`Contact with ID "${dto.contactId}" not found.`);
        }
        contactId = existingContact.id;
      } else {
        // Find by email or create
        const contactEmail = dto.contact?.email ?? lead.email;
        const existingByEmail = await tx.contact.findFirst({
          where: {
            email: { equals: contactEmail.toLowerCase(), mode: 'insensitive' },
            deletedAt: null,
          },
        });

        if (existingByEmail) {
          contactId = existingByEmail.id;
          this.logger.log(`Reusing existing contact ${contactEmail} (${contactId})`);
        } else {
          const newContact = await tx.contact.create({
            data: {
              id: uuidv4(),
              companyId,
              firstName: dto.contact?.firstName ?? lead.firstName,
              lastName: dto.contact?.lastName ?? lead.lastName,
              email: contactEmail.toLowerCase(),
              phone: dto.contact?.phone ?? lead.phone ?? undefined,
              designation: dto.contact?.designation ?? undefined,
              contactType: dto.contact?.contactType ?? ContactType.GENERAL,
              isPrimary: true,
              createdBy: userId,
              updatedBy: userId,
            },
          });
          contactId = newContact.id;
          this.logger.log(`Created new contact ${contactEmail} (${contactId})`);

          await this.outbox.storeEvent(CrmEventTypes.CONTACT_CREATED, { contactId, source: 'lead_conversion' }, tx);
        }
      }

      // ---- STEP 3: Create Customer (always new) ----
      // Check if a customer already exists for this company (prevent duplicate on retry)
      const existingCustomer = await tx.customer.findFirst({
        where: { companyId, deletedAt: null },
      });

      let customerId: string;

      if (existingCustomer) {
        customerId = existingCustomer.id;
        this.logger.warn(`Customer already exists for company ${companyId}, reusing ${customerId}`);
      } else {
        const customerCode = `CUST-${Math.floor(Math.random() * 90000) + 10000}`;
        const newCustomer = await tx.customer.create({
          data: {
            id: uuidv4(),
            customerCode,
            companyId,
            primaryContactId: contactId,
            accountManagerId: dto.customer?.accountManagerId ?? undefined,
            customerType: dto.customer?.customerType ?? CustomerType.BUSINESS,
            notes: dto.customer?.notes ?? undefined,
            createdBy: userId,
            updatedBy: userId,
          },
        });
        customerId = newCustomer.id;
        this.logger.log(`Created customer ${customerCode} (${customerId})`);

        await this.outbox.storeEvent(CrmEventTypes.CUSTOMER_CREATED, {
          customerId,
          companyId,
          source: 'lead_conversion',
          leadId,
        }, tx);
      }

      // ---- STEP 4: Mark Lead as CONVERTED ----
      const convertedLead = await tx.lead.update({
        where: { id: leadId },
        data: {
          status: LeadStatus.CONVERTED,
          convertedAt: new Date(),
          convertedCustomerId: customerId,
          convertedCompanyId: companyId,
          convertedContactId: contactId,
          companyId,
          contactId,
          updatedBy: userId,
        },
      });

      // ---- STEP 5: Publish LEAD_CONVERTED event ----
      await this.outbox.storeEvent(CrmEventTypes.LEAD_CONVERTED, {
        leadId,
        companyId,
        contactId,
        customerId,
        convertedBy: userId,
        convertedAt: new Date().toISOString(),
      }, tx);

      return {
        lead: convertedLead as unknown as Lead,
        companyId,
        contactId,
        customerId,
      };
    });

    // ---- Post-transaction audit ----
    await this.audit.log({
      entityType: 'Lead',
      entityId: leadId,
      action: 'CONVERT',
      performedBy: userId,
      newData: {
        convertedCompanyId: result.companyId,
        convertedContactId: result.contactId,
        convertedCustomerId: result.customerId,
      } as Record<string, unknown>,
    });

    this.logger.log(
      `Lead ${leadId} converted → Company:${result.companyId} Contact:${result.contactId} Customer:${result.customerId}`,
    );

    return result;
  }
}
