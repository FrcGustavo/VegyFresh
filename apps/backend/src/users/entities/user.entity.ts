import {
  Column,
  CreateDateColumn,
  Entity,
  Generated,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  Unique,
} from 'typeorm';
import { Order } from '../../orders/entities/order.entity';
import { Role } from '../../roles/entities/role.entity';
import { AuthSession } from '../../auth/entities/auth-session.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { Purchase } from '../../purchase/entities/purchase.entity';
import { InventoryMovement } from '../../inventory/entities/inventory-movement.entity';

@Entity('users')
@Unique('UQ_users_org_id', ['organization_id', 'id'])
export class User {
  @PrimaryColumn({ type: 'uuid' })
  @Generated('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 40, unique: true })
  folio: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'text' })
  password_hash: string;

  @Column({ type: 'uuid' })
  role_id: string;

  @ManyToOne(() => Role, (role) => role.users, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @Column({ type: 'text', nullable: true })
  avatar_url: string | null;

  @Column({ type: 'uuid' })
  organization_id: string;

  @ManyToOne(() => Organization, (organization) => organization.users, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @OneToMany(() => Order, (order) => order.user)
  orders: Order[];

  @OneToMany(() => AuthSession, (authSession) => authSession.user)
  authSessions: AuthSession[];

  @OneToMany(() => Purchase, (purchase) => purchase.user)
  purchases: Purchase[];

  @OneToMany(
    () => InventoryMovement,
    (inventoryMovement) => inventoryMovement.user,
  )
  inventoryMovements: InventoryMovement[];

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
