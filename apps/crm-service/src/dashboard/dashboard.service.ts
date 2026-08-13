import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getMetricsSummary() {
    const [
      totalLeads,
      totalCustomers,
      totalOpportunities,
      wonOpportunities,
    ] = await Promise.all([
      this.prisma.lead.count({ where: { deletedAt: null } }),
      this.prisma.customer.count({ where: { deletedAt: null } }),
      this.prisma.opportunity.count({ where: { deletedAt: null } }),
      this.prisma.opportunity.count({ where: { deletedAt: null, stage: { isWon: true } } }),
    ]);

    const activePipelineValue = await this.prisma.opportunity.aggregate({
      where: { deletedAt: null, closedAt: null },
      _sum: { estimatedValue: true },
    });

    const wonPipelineValue = await this.prisma.opportunity.aggregate({
      where: { deletedAt: null, stage: { isWon: true } },
      _sum: { estimatedValue: true },
    });

    return {
      leads: { total: totalLeads },
      customers: { total: totalCustomers },
      opportunities: {
        total: totalOpportunities,
        won: wonOpportunities,
        winRate: totalOpportunities ? (wonOpportunities / totalOpportunities) * 100 : 0,
        activePipelineValue: activePipelineValue._sum.estimatedValue || 0,
        totalWonValue: wonPipelineValue._sum.estimatedValue || 0,
      },
    };
  }

  async getPipelineFunnel(pipelineId?: string) {
    const whereCondition = { deletedAt: null };
    if (pipelineId) {
      whereCondition['pipelineId'] = pipelineId;
    }

    const stages = await this.prisma.pipelineStage.findMany({
      where: pipelineId ? { pipelineId } : {},
      orderBy: { position: 'asc' },
    });

    const funnels = await Promise.all(
      stages.map(async (stage) => {
        const count = await this.prisma.opportunity.count({
          where: { stageId: stage.id, deletedAt: null },
        });
        const value = await this.prisma.opportunity.aggregate({
          where: { stageId: stage.id, deletedAt: null },
          _sum: { estimatedValue: true },
        });

        return {
          stageId: stage.id,
          stageName: stage.name,
          probability: stage.probability,
          opportunityCount: count,
          totalValue: value._sum.estimatedValue || 0,
        };
      })
    );

    return funnels;
  }

  async getRevenueBySource() {
    const opps = await this.prisma.opportunity.findMany({
      where: { deletedAt: null, stage: { isWon: true } },
      select: { source: true, estimatedValue: true },
    });

    const result = opps.reduce((acc, opp) => {
      const source = opp.source || 'UNKNOWN';
      if (!acc[source]) acc[source] = 0;
      acc[source] += Number(opp.estimatedValue || 0);
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(result).map(([source, revenue]) => ({
      source,
      revenue,
    })).sort((a, b) => b.revenue - a.revenue);
  }
}
