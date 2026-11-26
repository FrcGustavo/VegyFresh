import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsObject,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ProductUnit } from '../../products/entities/product.entity';

const KEY_LENGTH = 100;
const MAX_ROWS = 2500;
// PostgreSQL rejects NUL in text values; catch it during request validation.
// eslint-disable-next-line no-control-regex
const TEXT_PATTERN = /^(?![\s\S]*\x00)(?=\S)(?:[\s\S]*\S)?$/;
const PRICE_PATTERN = /^(?:0|[1-9][0-9]{0,7})(?:\.[0-9]{1,2})?$/;

class MicrosipCatalogRowDto {
  @ApiProperty({ maxLength: KEY_LENGTH, minLength: 1 })
  @IsString()
  @Matches(TEXT_PATTERN)
  @MaxLength(KEY_LENGTH)
  externalId: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsUUID()
  vegyfreshId?: string;
}

export class MicrosipProductDto extends MicrosipCatalogRowDto {
  @ApiProperty({ minLength: 1, maxLength: 255 })
  @IsString()
  @Matches(TEXT_PATTERN)
  @MaxLength(255)
  name: string;

  @ApiProperty({ enum: ProductUnit })
  @IsEnum(ProductUnit)
  unit: ProductUnit;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  supplierId: string;
}

export class MicrosipPriceListDto extends MicrosipCatalogRowDto {
  @ApiProperty({ minLength: 1, maxLength: 100 })
  @IsString()
  @Matches(TEXT_PATTERN)
  @MaxLength(100)
  name: string;
}

export class MicrosipPriceDto {
  @ApiProperty({ maxLength: KEY_LENGTH, minLength: 1 })
  @IsString()
  @Matches(TEXT_PATTERN)
  @MaxLength(KEY_LENGTH)
  productExternalId: string;

  @ApiProperty({ maxLength: KEY_LENGTH, minLength: 1 })
  @IsString()
  @Matches(TEXT_PATTERN)
  @MaxLength(KEY_LENGTH)
  priceListExternalId: string;

  @ApiProperty({ pattern: PRICE_PATTERN.source, example: '139.90' })
  @IsString()
  @Matches(PRICE_PATTERN)
  price: string;
}

export class MicrosipClientDto extends MicrosipCatalogRowDto {
  @ApiProperty({ minLength: 1, maxLength: 255 })
  @IsString()
  @Matches(TEXT_PATTERN)
  @MaxLength(255)
  name: string;

  @ApiProperty({ minLength: 1, maxLength: 30 })
  @IsString()
  @Matches(TEXT_PATTERN)
  @MaxLength(30)
  phoneNumber: string;

  @ApiPropertyOptional({
    type: String,
    format: 'email',
    maxLength: 255,
    nullable: true,
  })
  @ValidateIf((_, value: unknown) => value !== undefined && value !== null)
  @IsEmail()
  @MaxLength(255)
  email?: string | null;

  @ApiProperty({ maxLength: KEY_LENGTH, minLength: 1 })
  @IsString()
  @Matches(TEXT_PATTERN)
  @MaxLength(KEY_LENGTH)
  priceListExternalId: string;
}

export class MicrosipCatalogImportDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  organizationId: string;

  @ApiProperty({ maxLength: KEY_LENGTH, minLength: 1 })
  @IsString()
  @Matches(TEXT_PATTERN)
  @MaxLength(KEY_LENGTH)
  company: string;

  @ApiProperty({ type: [MicrosipProductDto], maxItems: MAX_ROWS })
  @IsArray()
  @ArrayMaxSize(MAX_ROWS)
  @IsObject({ each: true })
  @ValidateNested({ each: true })
  @Type(() => MicrosipProductDto)
  products: MicrosipProductDto[];

  @ApiProperty({ type: [MicrosipPriceListDto], maxItems: MAX_ROWS })
  @IsArray()
  @ArrayMaxSize(MAX_ROWS)
  @IsObject({ each: true })
  @ValidateNested({ each: true })
  @Type(() => MicrosipPriceListDto)
  priceLists: MicrosipPriceListDto[];

  @ApiProperty({ type: [MicrosipPriceDto], maxItems: MAX_ROWS })
  @IsArray()
  @ArrayMaxSize(MAX_ROWS)
  @IsObject({ each: true })
  @ValidateNested({ each: true })
  @Type(() => MicrosipPriceDto)
  prices: MicrosipPriceDto[];

  @ApiProperty({ type: [MicrosipClientDto], maxItems: MAX_ROWS })
  @IsArray()
  @ArrayMaxSize(MAX_ROWS)
  @IsObject({ each: true })
  @ValidateNested({ each: true })
  @Type(() => MicrosipClientDto)
  clients: MicrosipClientDto[];
}

export class MicrosipImportCountsDto {
  @ApiProperty({ type: 'integer', minimum: 0 })
  created: number;

  @ApiProperty({ type: 'integer', minimum: 0 })
  updated: number;

  @ApiProperty({ type: 'integer', minimum: 0 })
  unchanged: number;
}

export class MicrosipCatalogImportResultDto {
  @ApiProperty({ enum: ['preview', 'apply'] })
  mode: 'preview' | 'apply';

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  appliedAt: string | null;

  @ApiProperty({ type: MicrosipImportCountsDto })
  products: MicrosipImportCountsDto;

  @ApiProperty({ type: MicrosipImportCountsDto })
  priceLists: MicrosipImportCountsDto;

  @ApiProperty({ type: MicrosipImportCountsDto })
  prices: MicrosipImportCountsDto;

  @ApiProperty({ type: MicrosipImportCountsDto })
  clients: MicrosipImportCountsDto;
}
