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
import { OpportunitiesService } from './opportunities.service';
import { CreateOpportunityDto } from './dto/create-opportunity.dto';
import { UpdateOpportunityDto } from './dto/update-opportunity.dto';
import { OpportunityFilterDto } from './dto/opportunity-filter.dto';
import { AssignLeadDto as AssignOpportunityDto } from '../leads/dto/assign-lead.dto';
import { MoveStageDto, MarkOpportunityLostDto } from './dto/stage-actions.dto';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { successResponse, paginatedResponse } from '../common/response/api-response';

@ApiTags('Opportunities')
@ApiBearerAuth()
@Controller('opportunities')
export class OpportunitiesController {
  constructor(private readonly opportunitiesService: OpportunitiesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new opportunity' })
  async create(@Body() dto: CreateOpportunityDto, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.opportunitiesService.create(dto, user.id);
    return successResponse(data, 'Opportunity created successfully');
  }

  @Get()
  @ApiOperation({ summary: 'List opportunities with filtering and pagination' })
  async findAll(@Query() filter: OpportunityFilterDto) {
    const result = await this.opportunitiesService.findAll(filter);
    return paginatedResponse(result.data, result.meta);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an opportunity by ID' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.opportunitiesService.findOne(id);
    return successResponse(data);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an opportunity' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOpportunityDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const data = await this.opportunitiesService.update(id, dto, user.id);
    return successResponse(data, 'Opportunity updated successfully');
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete an opportunity' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: CurrentUserPayload) {
    await this.opportunitiesService.remove(id, user.id);
    return successResponse(null, 'Opportunity deleted successfully');
  }

  @Post(':id/assign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign an opportunity to a user' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  async assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignOpportunityDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const data = await this.opportunitiesService.assign(id, dto, user.id);
    return successResponse(data, 'Opportunity assigned successfully');
  }

  @Post(':id/move-stage')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Move an opportunity to a different stage' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  async moveStage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MoveStageDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const data = await this.opportunitiesService.moveStage(id, dto, user.id);
    return successResponse(data, 'Opportunity stage updated successfully');
  }

  @Post(':id/mark-won')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark an opportunity as won' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  async markWon(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.opportunitiesService.markWon(id, user.id);
    return successResponse(data, 'Opportunity marked as won');
  }

  @Post(':id/mark-lost')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark an opportunity as lost' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  async markLost(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MarkOpportunityLostDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const data = await this.opportunitiesService.markLost(id, dto, user.id);
    return successResponse(data, 'Opportunity marked as lost');
  }
}
