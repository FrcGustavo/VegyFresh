import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';
import type { MicrosipCatalogImportResultDto } from './dto/microsip-import.dto';

@Entity('microsip_catalog_import_receipts')
export class MicrosipImportReceipt {
  @PrimaryColumn({ type: 'uuid' })
  organization_id: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @PrimaryColumn({ type: 'uuid' })
  idempotency_key: string;

  @Column({ type: 'varchar', length: 64 })
  request_hash: string;

  @Column({ type: 'jsonb' })
  result: MicrosipCatalogImportResultDto;
}
