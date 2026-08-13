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
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { ContactFilterDto } from './dto/contact-filter.dto';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { successResponse, paginatedResponse } from '../common/response/api-response';

@ApiTags('Contacts')
@ApiBearerAuth()
@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a contact' })
  async create(@Body() dto: CreateContactDto, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.contactsService.create(dto, user.id);
    return successResponse(data, 'Contact created successfully');
  }

  @Get()
  @ApiOperation({ summary: 'List contacts with filtering and pagination' })
  async findAll(@Query() filter: ContactFilterDto) {
    const result = await this.contactsService.findAll(filter);
    return paginatedResponse(result.data, result.meta);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a contact by ID' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.contactsService.findOne(id);
    return successResponse(data);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a contact' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContactDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const data = await this.contactsService.update(id, dto, user.id);
    return successResponse(data, 'Contact updated successfully');
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a contact' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: CurrentUserPayload) {
    await this.contactsService.remove(id, user.id);
    return successResponse(null, 'Contact deleted successfully');
  }
}
