export class CreateClientDto {
  name!: string;
  phone_number!: string;
  email?: string | null;
  address?: string | null;
  avatar_url?: string | null;
  price_list_id?: number | null;
}
