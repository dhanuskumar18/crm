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
import { RequirementsService } from './requirements.service';
import { CreateRequirementDto } from './dto/create-requirement.dto';
import { UpdateRequirementDto } from './dto/update-requirement.dto';
import { RequirementFilterDto } from './dto/requirement-filter.dto';
import { AssignLeadDto as AssignRequirementDto } from '../leads/dto/assign-lead.dto';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { successResponse, paginatedResponse } from '../common/response/api-response';

@ApiTags('Requirements')
@ApiBearerAuth()
@Controller('requirements')
export class RequirementsController {
  constructor(private readonly requirementsService: RequirementsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new requirement' })
  async create(@Body() dto: CreateRequirementDto, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.requirementsService.create(dto, user.id);
    return successResponse(data, 'Requirement created successfully');
  }

  @Get()
  @ApiOperation({ summary: 'List requirements with filtering and pagination' })
  async findAll(@Query() filter: RequirementFilterDto) {
    const result = await this.requirementsService.findAll(filter);
    return paginatedResponse(result.data, result.meta);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a requirement by ID' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.requirementsService.findOne(id);
    return successResponse(data);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a requirement' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRequirementDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const data = await this.requirementsService.update(id, dto, user.id);
    return successResponse(data, 'Requirement updated successfully');
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a requirement' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: CurrentUserPayload) {
    await this.requirementsService.remove(id, user.id);
    return successResponse(null, 'Requirement deleted successfully');
  }

  @Post(':id/assign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign a requirement to a user' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  async assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignRequirementDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const data = await this.requirementsService.assign(id, dto, user.id);
    return successResponse(data, 'Requirement assigned successfully');
  }

  @Post(':id/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm a requirement' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  async confirm(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.requirementsService.confirm(id, user.id);
    return successResponse(data, 'Requirement confirmed successfully');
  }

  @Post(':id/mark-ready')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a requirement as ready for quotation' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  async markReady(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.requirementsService.markReady(id, user.id);
    return successResponse(data, 'Requirement marked as ready for quotation');
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a requirement' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  async cancel(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.requirementsService.cancel(id, user.id);
    return successResponse(data, 'Requirement cancelled');
  }
}
