import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { Product } from '../catalog/products/entities/product.entity';
import { User } from '../users/entities/user.entity';
import { Purchase } from './entities/purchase.entity';
import { PurchaseItem } from './entities/purchase-item.entity';
import {
  InventoryMovement,
  InventoryMovementType,
} from './entities/inventory-movement.entity';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { CreateInventoryAdjustmentDto } from './dto/create-inventory-adjustment.dto';

@Injectable()
export class WarehouseService {
  constructor(
    @InjectRepository(Purchase)
    private readonly purchasesRepository: Repository<Purchase>,
    @InjectRepository(PurchaseItem)
    private readonly purchaseItemsRepository: Repository<PurchaseItem>,
    @InjectRepository(InventoryMovement)
    private readonly inventoryMovementsRepository: Repository<InventoryMovement>,
    @InjectRepository(Supplier)
    private readonly suppliersRepository: Repository<Supplier>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async findPurchases(organizationId: string) {
    return this.purchasesRepository.find({
      where: { organization_id: organizationId },
      relations: {
        supplier: true,
        user: true,
        items: { product: true },
      },
      order: { purchase_date: 'DESC', created_at: 'DESC' },
    });
  }

  async createPurchase(
    createPurchaseDto: CreatePurchaseDto,
    organizationId: string,
    userId: string,
  ) {
    const purchaseId = await this.purchasesRepository.manager.transaction(
      async (manager) => {
        const purchasesRepository = manager.getRepository(Purchase);
        const purchaseItemsRepository = manager.getRepository(PurchaseItem);
        const suppliersRepository = manager.getRepository(Supplier);
        const productsRepository = manager.getRepository(Product);
        const usersRepository = manager.getRepository(User);
        const inventoryMovementsRepository = manager.getRepository(InventoryMovement);

        const supplier = await this.findSupplierOrFail(
          createPurchaseDto.supplier_id,
          organizationId,
          suppliersRepository,
        );
        const user = await this.findUserOrFail(
          userId,
          organizationId,
          usersRepository,
        );
        const purchaseFolio = await this.buildPurchaseFolio(manager);
        const itemsPayload = await this.buildPurchaseItems(
          createPurchaseDto.items,
          organizationId,
          productsRepository,
        );

        const purchase = purchasesRepository.create({
          organization_id: organizationId,
          supplier_id: supplier.id,
          supplier,
          user_id: user.id,
          user,
          folio: purchaseFolio,
          purchase_date: createPurchaseDto.purchase_date
            ? new Date(createPurchaseDto.purchase_date)
            : new Date(),
          total_amount: itemsPayload.totalAmount,
          notes: createPurchaseDto.notes ?? null,
        });
        const savedPurchase = await purchasesRepository.save(purchase);

        const purchaseItems = itemsPayload.items.map((item) =>
          purchaseItemsRepository.create({
            purchase_id: savedPurchase.id,
            purchase: savedPurchase,
            product_id: item.product.id,
            product: item.product,
            quantity: item.quantity,
            unit_cost: item.unitCost,
            subtotal: item.subtotal,
          }),
        );
        await purchaseItemsRepository.save(purchaseItems);

        for (const item of itemsPayload.items) {
          const currentStock = this.toQuantity(item.product.stock);
          const newStock = this.roundQuantity(currentStock + item.quantity);
          item.product.stock = newStock;
          await productsRepository.save(item.product);

          const movement = inventoryMovementsRepository.create({
            organization_id: organizationId,
            product_id: item.product.id,
            product: item.product,
            user_id: user.id,
            user,
            supplier_id: supplier.id,
            supplier,
            purchase_id: savedPurchase.id,
            purchase: savedPurchase,
            movement_type: InventoryMovementType.IN,
            quantity: item.quantity,
            previous_stock: currentStock,
            new_stock: newStock,
            reason: createPurchaseDto.notes ?? null,
          });
          await inventoryMovementsRepository.save(movement);
        }

        return savedPurchase.id;
      },
    );

    return this.findPurchaseById(purchaseId, organizationId);
  }

  async findPurchaseById(id: string, organizationId: string) {
    const purchase = await this.purchasesRepository.findOne({
      where: { id, organization_id: organizationId },
      relations: {
        supplier: true,
        user: true,
        items: { product: true },
      },
    });
    if (!purchase) {
      throw new NotFoundException(`Purchase with id ${id} not found`);
    }

    return purchase;
  }

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
    const movementId = await this.purchasesRepository.manager.transaction(
      async (manager) => {
        const productsRepository = manager.getRepository(Product);
        const usersRepository = manager.getRepository(User);
        const movementsRepository = manager.getRepository(InventoryMovement);

        const user = await this.findUserOrFail(userId, organizationId, usersRepository);
        const product = await this.findProductOrFail(
          dto.product_id,
          organizationId,
          productsRepository,
        );
        const delta = this.roundQuantity(Number(dto.quantity));
        if (delta === 0) {
          throw new BadRequestException('Adjustment quantity must be different from zero');
        }

        const previousStock = this.toQuantity(product.stock);
        const newStock = this.roundQuantity(previousStock + delta);
        if (newStock < 0) {
          throw new BadRequestException('Adjustment results in negative stock');
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

  private async findSupplierOrFail(
    id: string,
    organizationId: string,
    suppliersRepository: Repository<Supplier> = this.suppliersRepository,
  ) {
    const supplier = await suppliersRepository.findOneBy({
      id,
      organization_id: organizationId,
    });
    if (!supplier) {
      throw new NotFoundException(`Supplier with id ${id} not found`);
    }

    return supplier;
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

  private async buildPurchaseItems(
    items: CreatePurchaseDto['items'],
    organizationId: string,
    productsRepository: Repository<Product> = this.productsRepository,
  ) {
    if (items.length === 0) {
      throw new BadRequestException('Purchase must include at least one item');
    }

    const productIds = [...new Set(items.map((item) => item.product_id))];
    const products = await productsRepository.findBy({
      id: In(productIds),
      organization_id: organizationId,
    });
    const productMap = new Map(products.map((product) => [product.id, product]));

    const normalizedItems = items.map((item) => {
      const product = productMap.get(item.product_id);
      if (!product) {
        throw new NotFoundException(
          `Product with id ${item.product_id} not found`,
        );
      }

      const quantity = this.roundQuantity(Number(item.quantity));
      const unitCost = this.roundCurrency(Number(item.unit_cost));
      if (quantity <= 0) {
        throw new BadRequestException('Item quantity must be greater than zero');
      }
      if (unitCost <= 0) {
        throw new BadRequestException('Item unit_cost must be greater than zero');
      }

      const subtotal = this.roundCurrency(quantity * unitCost);
      return {
        product,
        quantity,
        unitCost,
        subtotal,
      };
    });

    return {
      items: normalizedItems,
      totalAmount: this.roundCurrency(
        normalizedItems.reduce((sum, item) => sum + item.subtotal, 0),
      ),
    };
  }

  private async buildPurchaseFolio(manager: {
    query: (query: string) => Promise<Array<{ folio: string | number }>>;
  }) {
    const [result] = await manager.query(
      `SELECT nextval('purchases_folio_seq') AS folio`,
    );
    const folioNumber = Number(result?.folio ?? 0);
    return `C${String(folioNumber).padStart(5, '0')}`;
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

  private roundCurrency(value: number): number {
    return Number(value.toFixed(2));
  }
}
