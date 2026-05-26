import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../catalog/products/entities/product.entity';
import { User } from '../users/entities/user.entity';
import {
  InventoryMovement,
  InventoryMovementType,
} from './entities/inventory-movement.entity';
import { CreateInventoryAdjustmentDto } from './dto/create-inventory-adjustment.dto';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(InventoryMovement)
    private readonly inventoryMovementsRepository: Repository<InventoryMovement>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async findInventory(organizationId: string) {
    return this.productsRepository.find({
      where: { organization_id: organizationId },
      relations: { supplier: true },
      order: { name: 'ASC' },
    });
  }

  async findInventoryMovements(organizationId: string) {
    return this.inventoryMovementsRepository.find({
      where: { organization_id: organizationId },
      relations: {
        product: true,
        supplier: true,
        purchase: true,
        user: true,
      },
      order: { created_at: 'DESC' },
    });
  }

  async createAdjustment(
    dto: CreateInventoryAdjustmentDto,
    organizationId: string,
    userId: string,
  ) {
    const movementId =
      await this.inventoryMovementsRepository.manager.transaction(
        async (manager) => {
          const productsRepository = manager.getRepository(Product);
          const usersRepository = manager.getRepository(User);
          const movementsRepository = manager.getRepository(InventoryMovement);

          const user = await this.findUserOrFail(
            userId,
            organizationId,
            usersRepository,
          );
          const product = await this.findProductOrFail(
            dto.product_id,
            organizationId,
            productsRepository,
          );
          const delta = this.roundQuantity(Number(dto.quantity));
          if (delta === 0) {
            throw new BadRequestException(
              'Adjustment quantity must be different from zero',
            );
          }

          const previousStock = this.toQuantity(product.stock);
          const newStock = this.roundQuantity(previousStock + delta);
          if (newStock < 0) {
            throw new BadRequestException(
              'Adjustment results in negative stock',
            );
          }

          product.stock = newStock;
          await productsRepository.save(product);

          const movement = movementsRepository.create({
            organization_id: organizationId,
            product_id: product.id,
            product,
            user_id: user.id,
            user,
            supplier_id: null,
            purchase_id: null,
            movement_type: InventoryMovementType.ADJUSTMENT,
            quantity: delta,
            previous_stock: previousStock,
            new_stock: newStock,
            reason: dto.reason ?? null,
          });
          const savedMovement = await movementsRepository.save(movement);
          return savedMovement.id;
        },
      );

    const movement = await this.inventoryMovementsRepository.findOne({
      where: { id: movementId, organization_id: organizationId },
      relations: { product: true, user: true, supplier: true, purchase: true },
    });
    if (!movement) {
      throw new NotFoundException('Inventory movement was not found');
    }
    return movement;
  }

  private async findProductOrFail(
    id: string,
    organizationId: string,
    productsRepository: Repository<Product> = this.productsRepository,
  ) {
    const product = await productsRepository.findOneBy({
      id,
      organization_id: organizationId,
    });
    if (!product) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }

    return product;
  }

  private async findUserOrFail(
    id: string,
    organizationId: string,
    usersRepository: Repository<User> = this.usersRepository,
  ) {
    const user = await usersRepository.findOneBy({
      id,
      organization_id: organizationId,
    });
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    return user;
  }

  private toQuantity(value: number | string | null | undefined): number {
    const numericValue = Number(value ?? 0);
    if (!Number.isFinite(numericValue)) {
      return 0;
    }
    return this.roundQuantity(numericValue);
  }

  private roundQuantity(value: number): number {
    return Number(value.toFixed(3));
  }
}
