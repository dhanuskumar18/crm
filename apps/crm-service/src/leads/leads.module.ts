import { Module } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { LeadConversionService } from './lead-conversion.service';
import { LeadsController } from './leads.controller';

@Module({
  controllers: [LeadsController],
  providers: [LeadsService, LeadConversionService],
  exports: [LeadsService, LeadConversionService],
})
export class LeadsModule {}
