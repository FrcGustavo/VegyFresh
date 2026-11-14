import { Global, Module } from '@nestjs/common';
import { FoliosService } from './folios.service';

@Global()
@Module({
  providers: [FoliosService],
  exports: [FoliosService],
})
export class FoliosModule {}
