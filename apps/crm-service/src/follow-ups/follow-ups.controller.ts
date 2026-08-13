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
import { FollowUpsService } from './follow-ups.service';
import { CreateFollowUpDto } from './dto/create-follow-up.dto';
import { UpdateFollowUpDto } from './dto/update-follow-up.dto';
import { FollowUpFilterDto } from './dto/follow-up-filter.dto';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { successResponse, paginatedResponse } from '../common/response/api-response';

@ApiTags('Follow-ups')
@ApiBearerAuth()
@Controller('follow-ups')
export class FollowUpsController {
  constructor(private readonly followUpsService: FollowUpsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new follow-up' })
  async create(@Body() dto: CreateFollowUpDto, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.followUpsService.create(dto, user.id);
    return successResponse(data, 'Follow-up created successfully');
  }

  @Get()
  @ApiOperation({ summary: 'List follow-ups with filtering and pagination' })
  async findAll(@Query() filter: FollowUpFilterDto) {
    const result = await this.followUpsService.findAll(filter);
    return paginatedResponse(result.data, result.meta);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a follow-up by ID' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.followUpsService.findOne(id);
    return successResponse(data);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a follow-up' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFollowUpDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const data = await this.followUpsService.update(id, dto, user.id);
    return successResponse(data, 'Follow-up updated successfully');
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a follow-up' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: CurrentUserPayload) {
    await this.followUpsService.remove(id, user.id);
    return successResponse(null, 'Follow-up deleted successfully');
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a follow-up as completed' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  async complete(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.followUpsService.complete(id, user.id);
    return successResponse(data, 'Follow-up marked as completed');
  }
}
