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
import { ApiTags, ApiOperation, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { LeadsService } from './leads.service';
import { LeadConversionService } from './lead-conversion.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { LeadFilterDto } from './dto/lead-filter.dto';
import { AssignLeadDto } from './dto/assign-lead.dto';
import { MarkLostDto } from './dto/mark-lost.dto';
import { ConvertLeadDto } from './dto/convert-lead.dto';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { successResponse, paginatedResponse } from '../common/response/api-response';

@ApiTags('Leads')
@ApiBearerAuth()
@Controller('leads')
export class LeadsController {
  constructor(
    private readonly leadsService: LeadsService,
    private readonly leadConversionService: LeadConversionService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new lead' })
  async create(@Body() dto: CreateLeadDto, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.leadsService.create(dto, user.id);
    return successResponse(data, 'Lead created successfully');
  }

  @Get()
  @ApiOperation({ summary: 'List leads with filtering and pagination' })
  async findAll(@Query() filter: LeadFilterDto) {
    const result = await this.leadsService.findAll(filter);
    return paginatedResponse(result.data, result.meta);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a lead by ID' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.leadsService.findOne(id);
    return successResponse(data);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a lead' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLeadDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const data = await this.leadsService.update(id, dto, user.id);
    return successResponse(data, 'Lead updated successfully');
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a lead' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: CurrentUserPayload) {
    await this.leadsService.remove(id, user.id);
    return successResponse(null, 'Lead deleted successfully');
  }

  @Post(':id/assign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign a lead to a user' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  async assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignLeadDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const data = await this.leadsService.assign(id, dto, user.id);
    return successResponse(data, 'Lead assigned successfully');
  }

  @Post(':id/qualify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a lead as qualified' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  async qualify(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.leadsService.qualify(id, user.id);
    return successResponse(data, 'Lead qualified successfully');
  }

  @Post(':id/mark-lost')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a lead as lost' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  async markLost(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MarkLostDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const data = await this.leadsService.markLost(id, dto, user.id);
    return successResponse(data, 'Lead marked as lost');
  }

  @Post(':id/convert')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Convert a lead into Company, Contact, and Customer' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  async convert(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConvertLeadDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const data = await this.leadConversionService.convert(id, dto, user.id);
    return successResponse(data, 'Lead converted successfully');
  }
}
