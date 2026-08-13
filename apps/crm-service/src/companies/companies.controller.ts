import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { CompanyFilterDto } from './dto/company-filter.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { successResponse, paginatedResponse } from '../common/response/api-response';

@ApiTags('Companies')
@ApiBearerAuth()
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new company' })
  @ApiResponse({ status: 201, description: 'Company created successfully' })
  @ApiResponse({ status: 409, description: 'Duplicate company' })
  async create(@Body() dto: CreateCompanyDto, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.companiesService.create(dto, user.id);
    return successResponse(data, 'Company created successfully');
  }

  @Get()
  @ApiOperation({ summary: 'List companies with filtering and pagination' })
  async findAll(@Query() filter: CompanyFilterDto) {
    const result = await this.companiesService.findAll(filter);
    return paginatedResponse(result.data, result.meta);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a company by ID' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.companiesService.findOne(id);
    return successResponse(data);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a company' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCompanyDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const data = await this.companiesService.update(id, dto, user.id);
    return successResponse(data, 'Company updated successfully');
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a company' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: CurrentUserPayload) {
    await this.companiesService.remove(id, user.id);
    return successResponse(null, 'Company deleted successfully');
  }

  @Get(':id/contacts')
  @ApiOperation({ summary: 'Get company contacts' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  async findContacts(@Param('id', ParseUUIDPipe) id: string, @Query() pagination: PaginationDto) {
    const result = await this.companiesService.findContacts(id, pagination);
    return paginatedResponse(result.data, result.meta);
  }

  @Get(':id/customers')
  @ApiOperation({ summary: 'Get company customers' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  async findCustomers(@Param('id', ParseUUIDPipe) id: string, @Query() pagination: PaginationDto) {
    const result = await this.companiesService.findCustomers(id, pagination);
    return paginatedResponse(result.data, result.meta);
  }

  @Get(':id/leads')
  @ApiOperation({ summary: 'Get company leads' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  async findLeads(@Param('id', ParseUUIDPipe) id: string, @Query() pagination: PaginationDto) {
    const result = await this.companiesService.findLeads(id, pagination);
    return paginatedResponse(result.data, result.meta);
  }

  @Get(':id/opportunities')
  @ApiOperation({ summary: 'Get company opportunities' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  async findOpportunities(@Param('id', ParseUUIDPipe) id: string, @Query() pagination: PaginationDto) {
    const result = await this.companiesService.findOpportunities(id, pagination);
    return paginatedResponse(result.data, result.meta);
  }

  @Get(':id/activities')
  @ApiOperation({ summary: 'Get company activities' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  async findActivities(@Param('id', ParseUUIDPipe) id: string, @Query() pagination: PaginationDto) {
    const result = await this.companiesService.findActivities(id, pagination);
    return paginatedResponse(result.data, result.meta);
  }
}
