import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { Customer360Service } from './customer-360.service';
import { successResponse } from '../common/response/api-response';

@ApiTags('Customer 360 View')
@ApiBearerAuth()
@Controller('360')
export class Customer360Controller {
  constructor(private readonly customer360Service: Customer360Service) {}

  @Get('customers/:id')
  @ApiOperation({ summary: 'Get comprehensive 360-degree view of a customer' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  async getCustomer360(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.customer360Service.getCustomer360View(id);
    return successResponse(data);
  }

  @Get('companies/:id')
  @ApiOperation({ summary: 'Get comprehensive 360-degree view of a company' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  async getCompany360(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.customer360Service.getCompany360View(id);
    return successResponse(data);
  }
}
