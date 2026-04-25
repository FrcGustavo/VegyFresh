export class CreateUserDto {
  name!: string;
  email!: string;
  password_hash!: string;
  role_id!: number;
  avatar_url?: string | null;
}
