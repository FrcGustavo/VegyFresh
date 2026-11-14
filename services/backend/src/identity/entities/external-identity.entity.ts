import { Check, Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type ExternalIdentityType = 'user' | 'portal-client';

@Entity('external_identities')
@Check(
  'CHK_external_identities_mapping',
  `("identity_type" = 'user' AND "user_id" IS NOT NULL AND "client_id" IS NULL) OR ("identity_type" = 'portal-client' AND "user_id" IS NULL AND "client_id" IS NOT NULL)`,
)
@Index(
  'UQ_external_identities_issuer_subject_type',
  ['issuer', 'subject', 'identity_type'],
  { unique: true },
)
@Index('UQ_external_identities_user', ['issuer', 'user_id'], {
  unique: true,
  where: 'user_id IS NOT NULL',
})
@Index('UQ_external_identities_client', ['issuer', 'client_id'], {
  unique: true,
  where: 'client_id IS NOT NULL',
})
export class ExternalIdentity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 512 })
  issuer!: string;

  @Column({ type: 'varchar', length: 255 })
  subject!: string;

  @Column({ type: 'varchar', length: 32 })
  identity_type!: ExternalIdentityType;

  @Column({ type: 'uuid', nullable: true })
  user_id!: string | null;

  @Column({ type: 'uuid', nullable: true })
  client_id!: string | null;
}
