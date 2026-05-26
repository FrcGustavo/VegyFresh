import {
  Column,
  CreateDateColumn,
  Entity,
  Generated,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  Unique,
} from 'typeorm';
import { Client } from '../../clients/entities/client.entity';

@Entity('client_portal_accounts')
@Unique('UQ_client_portal_accounts_client', ['client_id'])
export class PortalAccount {
  @PrimaryColumn({ type: 'uuid' })
  @Generated('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  client_id!: string;

  @OneToOne(() => Client, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  client!: Client;

  @Column({ type: 'text', nullable: true })
  password_hash!: string | null;

  @Column({ type: 'text', nullable: true })
  password_setup_token_hash!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  password_setup_expires_at!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  last_portal_login_at!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  portal_access_activated_at!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date;
}
