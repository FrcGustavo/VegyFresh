import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class CreateRolePermissionDto {
  [key: string]: unknown;

  @ApiProperty({ example: 'read' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  action!: string;

  @ApiProperty({ example: 'catalog' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  resource!: string;
}

export class CreateRoleDto {
  @ApiProperty({ example: 'operativo' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[a-z][a-z0-9_-]*$/)
  name!: string;

  @ApiProperty({ type: [CreateRolePermissionDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateRolePermissionDto)
  permissions!: CreateRolePermissionDto[];
}
