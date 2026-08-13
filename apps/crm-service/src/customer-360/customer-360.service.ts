import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CustomerNotFoundException } from '../common/exceptions/domain.exceptions';

@Injectable()
export class Customer360Service {
  constructor(private readonly prisma: PrismaService) {}

  async getCustomer360View(customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, deletedAt: null },
      include: {
        company: true,
        primaryContact: true,
      },
    });

    if (!customer) throw new CustomerNotFoundException(customerId);

    // Parallel fetch related data
    const [
      contacts,
      opportunities,
      requirements,
      activities,
      followUps,
      documents,
      tags,
    ] = await Promise.all([
      this.prisma.contact.findMany({
        where: { companyId: customer.companyId, deletedAt: null },
        orderBy: { isPrimary: 'desc' },
      }),
      this.prisma.opportunity.findMany({
        where: { customerId, deletedAt: null },
        include: { stage: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.requirement.findMany({
        where: { customerId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.activity.findMany({
        where: { customerId, deletedAt: null },
        orderBy: { activityDate: 'desc' },
        take: 50,
      }),
      this.prisma.followUp.findMany({
        where: { customerId, deletedAt: null },
        orderBy: { dueDate: 'asc' },
        take: 20,
      }),
      this.prisma.document.findMany({
        where: { customerId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.entityTag.findMany({
        where: { customerId, entityType: 'CUSTOMER' },
        include: { tag: true },
      }),
    ]);

    // Calculate aggregations
    const totalOpportunities = opportunities.length;
    const wonOpportunities = opportunities.filter(o => o.stage?.isWon).length;
    const lostOpportunities = opportunities.filter(o => o.stage?.isLost).length;
    const openOpportunities = totalOpportunities - wonOpportunities - lostOpportunities;

    const pipelineValue = opportunities
      .filter(o => !o.stage?.isWon && !o.stage?.isLost)
      .reduce((sum, o) => sum + Number(o.estimatedValue || 0), 0);

    const totalValueWon = opportunities
      .filter(o => o.stage?.isWon)
      .reduce((sum, o) => sum + Number(o.estimatedValue || 0), 0);

    const metrics = {
      totalOpportunities,
      openOpportunities,
      wonOpportunities,
      lostOpportunities,
      pipelineValue,
      totalValueWon,
      winRate: totalOpportunities > 0 ? (wonOpportunities / (wonOpportunities + lostOpportunities || 1)) * 100 : 0,
      lastActivityDate: activities.length > 0 ? activities[0].activityDate : null,
      nextFollowUpDate: followUps.find(f => f.status === 'PENDING')?.dueDate || null,
    };

    return {
      customer: {
        ...customer,
        tags: tags.map(t => t.tag),
      },
      contacts,
      opportunities,
      requirements,
      recentActivities: activities,
      upcomingFollowUps: followUps,
      documents,
      metrics,
    };
  }

  async getCompany360View(companyId: string) {
    const company = await this.prisma.company.findFirst({
      where: { id: companyId, deletedAt: null },
    });

    if (!company) {
      throw new Error(`Company with ID ${companyId} not found`);
    }

    const [
      customers,
      leads,
      contacts,
      opportunities,
      activities,
    ] = await Promise.all([
      this.prisma.customer.findMany({ where: { companyId, deletedAt: null } }),
      this.prisma.lead.findMany({ where: { companyId, deletedAt: null } }),
      this.prisma.contact.findMany({ where: { companyId, deletedAt: null } }),
      this.prisma.opportunity.findMany({ where: { companyId, deletedAt: null }, include: { stage: true } }),
      this.prisma.activity.findMany({ where: { companyId, deletedAt: null }, orderBy: { activityDate: 'desc' }, take: 20 }),
    ]);

    return {
      company,
      customers,
      leads,
      contacts,
      opportunities,
      recentActivities: activities,
    };
  }
}
