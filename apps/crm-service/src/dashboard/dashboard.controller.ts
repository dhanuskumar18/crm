import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { successResponse } from '../common/response/api-response';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get key CRM metrics summary' })
  async getSummary() {
    const data = await this.dashboardService.getMetricsSummary();
    return successResponse(data);
  }

  @Get('funnel')
  @ApiOperation({ summary: 'Get pipeline funnel breakdown' })
  @ApiQuery({ name: 'pipelineId', required: false, type: String })
  async getFunnel(@Query('pipelineId') pipelineId?: string) {
    const data = await this.dashboardService.getPipelineFunnel(pipelineId);
    return successResponse(data);
  }

  @Get('revenue-by-source')
  @ApiOperation({ summary: 'Get revenue grouped by lead source' })
  async getRevenueBySource() {
    const data = await this.dashboardService.getRevenueBySource();
    return successResponse(data);
  }
}
