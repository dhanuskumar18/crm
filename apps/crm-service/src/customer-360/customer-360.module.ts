import { Module } from '@nestjs/common';
import { Customer360Service } from './customer-360.service';
import { Customer360Controller } from './customer-360.controller';

@Module({
  controllers: [Customer360Controller],
  providers: [Customer360Service],
  exports: [Customer360Service],
})
export class Customer360Module {}
