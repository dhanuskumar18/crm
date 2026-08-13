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
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerFilterDto } from './dto/customer-filter.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { successResponse, paginatedResponse } from '../common/response/api-response';

@ApiTags('Customers')
@ApiBearerAuth()
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a customer' })
  async create(@Body() dto: CreateCustomerDto, @CurrentUser() user: CurrentUserPayload) {
    const data = await this.customersService.create(dto, user.id);
    return successResponse(data, 'Customer created successfully');
  }

  @Get()
  @ApiOperation({ summary: 'List customers' })
  async findAll(@Query() filter: CustomerFilterDto) {
    const result = await this.customersService.findAll(filter);
    return paginatedResponse(result.data, result.meta);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a customer by ID' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.customersService.findOne(id);
    return successResponse(data);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a customer' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomerDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const data = await this.customersService.update(id, dto, user.id);
    return successResponse(data, 'Customer updated successfully');
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a customer' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: CurrentUserPayload) {
    await this.customersService.remove(id, user.id);
    return successResponse(null, 'Customer deleted successfully');
  }

  @Get(':id/activities')
  @ApiOperation({ summary: 'Get customer activities' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  async findActivities(@Param('id', ParseUUIDPipe) id: string, @Query() pagination: PaginationDto) {
    const result = await this.customersService.findActivities(id, pagination);
    return paginatedResponse(result.data, result.meta);
  }

  @Get(':id/follow-ups')
  @ApiOperation({ summary: 'Get customer follow-ups' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  async findFollowUps(@Param('id', ParseUUIDPipe) id: string, @Query() pagination: PaginationDto) {
    const result = await this.customersService.findFollowUps(id, pagination);
    return paginatedResponse(result.data, result.meta);
  }
}
