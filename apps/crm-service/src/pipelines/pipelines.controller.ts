import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { PipelinesService } from './pipelines.service';
import { CreatePipelineDto } from './dto/create-pipeline.dto';
import { UpdatePipelineDto } from './dto/update-pipeline.dto';
import { CreatePipelineStageDto } from './dto/create-pipeline-stage.dto';
import { UpdatePipelineStageDto } from './dto/update-pipeline-stage.dto';
import { ReorderStagesDto } from './dto/reorder-stages.dto';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { successResponse } from '../common/response/api-response';

@ApiTags('Pipelines')
@ApiBearerAuth()
@Controller('pipelines')
export class PipelinesController {
  constructor(private readonly pipelinesService: PipelinesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new pipeline' })
  async create(@Body() dto: CreatePipelineDto, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.pipelinesService.create(dto, user.id);
    return successResponse(data, 'Pipeline created successfully');
  }

  @Get()
  @ApiOperation({ summary: 'List pipelines with stages' })
  async findAll() {
    const data = await this.pipelinesService.findAll();
    return successResponse(data);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a pipeline by ID' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.pipelinesService.findOne(id);
    return successResponse(data);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a pipeline' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePipelineDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const data = await this.pipelinesService.update(id, dto, user.id);
    return successResponse(data, 'Pipeline updated successfully');
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a pipeline' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: CurrentUserPayload) {
    await this.pipelinesService.remove(id, user.id);
    return successResponse(null, 'Pipeline deleted successfully');
  }

  // ============================================================
  // STAGES
  // ============================================================

  @Post(':id/stages')
  @ApiOperation({ summary: 'Add a stage to a pipeline' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  async addStage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreatePipelineStageDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const data = await this.pipelinesService.addStage(id, dto, user.id);
    return successResponse(data, 'Stage added successfully');
  }

  @Patch(':id/stages/:stageId')
  @ApiOperation({ summary: 'Update a pipeline stage' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiParam({ name: 'stageId', type: String, format: 'uuid' })
  async updateStage(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('stageId', ParseUUIDPipe) stageId: string,
    @Body() dto: UpdatePipelineStageDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const data = await this.pipelinesService.updateStage(id, stageId, dto, user.id);
    return successResponse(data, 'Stage updated successfully');
  }

  @Delete(':id/stages/:stageId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a pipeline stage' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiParam({ name: 'stageId', type: String, format: 'uuid' })
  async removeStage(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('stageId', ParseUUIDPipe) stageId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.pipelinesService.removeStage(id, stageId, user.id);
    return successResponse(null, 'Stage deleted successfully');
  }

  @Post(':id/stages/reorder')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reorder pipeline stages' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  async reorderStages(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReorderStagesDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.pipelinesService.reorderStages(id, dto, user.id);
    return successResponse(null, 'Stages reordered successfully');
  }
}
