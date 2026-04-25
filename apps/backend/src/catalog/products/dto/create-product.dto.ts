export class CreateProductDto {
  sku!: string;
  name!: string;
  description?: string | null;
  supplier_id!: number;
  stock?: number;
  images?: string[];
}
