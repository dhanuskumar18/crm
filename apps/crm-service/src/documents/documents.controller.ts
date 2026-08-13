import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { DocumentFilterDto } from './dto/document-filter.dto';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { successResponse, paginatedResponse } from '../common/response/api-response';

@ApiTags('Documents')
@ApiBearerAuth()
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @ApiOperation({ summary: 'Upload a new document (metadata)' })
  async upload(@Body() dto: UploadDocumentDto, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.documentsService.upload(dto, user.id);
    return successResponse(data, 'Document uploaded successfully');
  }

  @Get()
  @ApiOperation({ summary: 'List documents with filtering and pagination' })
  async findAll(@Query() filter: DocumentFilterDto) {
    const result = await this.documentsService.findAll(filter);
    return paginatedResponse(result.data, result.meta);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a document by ID' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.documentsService.findOne(id);
    return successResponse(data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a document' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: CurrentUserPayload) {
    await this.documentsService.remove(id, user.id);
    return successResponse(null, 'Document deleted successfully');
  }
}
