import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MicrosipImportReceipt } from './microsip-import-receipt.entity';
import { FoliosModule } from '../../folios/folios.module';
import { MicrosipImportController } from './microsip-import.controller';
import { MicrosipImportService } from './microsip-import.service';

@Module({
  imports: [FoliosModule, TypeOrmModule.forFeature([MicrosipImportReceipt])],
  controllers: [MicrosipImportController],
  providers: [MicrosipImportService],
})
export class MicrosipImportModule {}
