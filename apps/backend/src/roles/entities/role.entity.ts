import { Column, Entity, Generated, OneToMany, PrimaryColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('roles')
export class Role {
  @PrimaryColumn({ type: 'uuid' })
  @Generated('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  name: string;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  permissions: Record<string, unknown>[];

  @OneToMany(() => User, (user) => user.role)
  users: User[];
}
