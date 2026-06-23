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
} from '../inventory/entities/inventory-movement.entity';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';
import { FoliosService } from '../folios/folios.service';

type PurchaseItemPayload = {
  product: Product;
  quantity: number;
  unitCost: number;
  subtotal: number;
};

@Injectable()
export class PurchaseService {
  constructor(
    @InjectRepository(Purchase)
    private readonly purchasesRepository: Repository<Purchase>,
    @InjectRepository(Supplier)
    private readonly suppliersRepository: Repository<Supplier>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly foliosService: FoliosService,
  ) {}

  async findAll(organizationId: string) {
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

  async create(
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
        const inventoryMovementsRepository =
          manager.getRepository(InventoryMovement);
        const supplier = await this.getSupplier(
          createPurchaseDto.supplier_id,
          organizationId,
          suppliersRepository,
        );
        const user = await this.getUser(
          userId,
          organizationId,
          usersRepository,
        );
        const purchaseFolio = await this.foliosService.generateFolio(
          'inventory_entries',
          organizationId,
        );
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
          notes: createPurchaseDto.notes ?? null,
        });
        const savedPurchase = await purchasesRepository.save(purchase);

        await this.replacePurchaseItems(
          savedPurchase,
          itemsPayload.items,
          purchaseItemsRepository,
        );
        await this.applyPurchaseItemsStock(
          savedPurchase,
          itemsPayload.items,
          organizationId,
          user,
          supplier,
          createPurchaseDto.notes ?? null,
          productsRepository,
          inventoryMovementsRepository,
        );

        return savedPurchase.id;
      },
    );

    return this.findOne(purchaseId, organizationId);
  }

  async update(
    id: string,
    updatePurchaseDto: UpdatePurchaseDto,
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
        const inventoryMovementsRepository =
          manager.getRepository(InventoryMovement);

        const purchase = await this.findPurchaseOrFail(
          id,
          organizationId,
          purchasesRepository,
        );
        const user = await this.getUser(
          userId,
          organizationId,
          usersRepository,
        );
        const supplier =
          updatePurchaseDto.supplier_id !== undefined
            ? await this.getSupplier(
                updatePurchaseDto.supplier_id,
                organizationId,
                suppliersRepository,
              )
            : purchase.supplier;

        if (updatePurchaseDto.items !== undefined) {
          await this.reversePurchaseItemsStock(
            purchase,
            organizationId,
            user,
            `Compra actualizada: ${purchase.folio}`,
            productsRepository,
            inventoryMovementsRepository,
          );
          await purchaseItemsRepository.delete({ purchase_id: purchase.id });

          const itemsPayload = await this.buildPurchaseItems(
            updatePurchaseDto.items,
            organizationId,
            productsRepository,
          );
          await this.replacePurchaseItems(
            purchase,
            itemsPayload.items,
            purchaseItemsRepository,
          );
          await this.applyPurchaseItemsStock(
            purchase,
            itemsPayload.items,
            organizationId,
            user,
            supplier,
            updatePurchaseDto.notes ?? purchase.notes ?? null,
            productsRepository,
            inventoryMovementsRepository,
          );
        }

        purchasesRepository.merge(purchase, {
          supplier_id: supplier.id,
          supplier,
          purchase_date:
            updatePurchaseDto.purchase_date !== undefined
              ? new Date(updatePurchaseDto.purchase_date)
              : purchase.purchase_date,
          notes:
            updatePurchaseDto.notes !== undefined
              ? updatePurchaseDto.notes
              : purchase.notes,
        });
        await purchasesRepository.save(purchase);

        return purchase.id;
      },
    );

    return this.findOne(purchaseId, organizationId);
  }

  async remove(id: string, organizationId: string, userId: string) {
    await this.purchasesRepository.manager.transaction(async (manager) => {
      const purchasesRepository = manager.getRepository(Purchase);
      const productsRepository = manager.getRepository(Product);
      const usersRepository = manager.getRepository(User);
      const inventoryMovementsRepository =
        manager.getRepository(InventoryMovement);

      const purchase = await this.findPurchaseOrFail(
        id,
        organizationId,
        purchasesRepository,
      );
      const user = await this.getUser(userId, organizationId, usersRepository);

      await this.reversePurchaseItemsStock(
        purchase,
        organizationId,
        user,
        `Compra eliminada: ${purchase.folio}`,
        productsRepository,
        inventoryMovementsRepository,
      );
      await purchasesRepository.remove(purchase);
    });

    return { id, deleted: true };
  }

  async findOne(id: string, organizationId: string) {
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

  private async findPurchaseOrFail(
    id: string,
    organizationId: string,
    purchasesRepository: Repository<Purchase> = this.purchasesRepository,
  ) {
    const purchase = await purchasesRepository.findOne({
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

  private async getSupplier(
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

  private async getUser(
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
  ): Promise<{ items: PurchaseItemPayload[] }> {
    if (items.length === 0) {
      throw new BadRequestException('Purchase must include at least one item');
    }

    const productIds = [...new Set(items.map((item) => item.product_id))];
    const products = await productsRepository.findBy({
      id: In(productIds),
      organization_id: organizationId,
    });
    const productMap = new Map(
      products.map((product) => [product.id, product]),
    );

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
        throw new BadRequestException(
          'Item quantity must be greater than zero',
        );
      }
      if (unitCost <= 0) {
        throw new BadRequestException(
          'Item unit_cost must be greater than zero',
        );
      }

      const subtotal = this.roundCurrency(quantity * unitCost);
      return {
        product,
        quantity,
        unitCost,
        subtotal,
      };
    });

    return { items: normalizedItems };
  }

  private async replacePurchaseItems(
    purchase: Purchase,
    items: PurchaseItemPayload[],
    purchaseItemsRepository: Repository<PurchaseItem>,
  ) {
    const purchaseItems = items.map((item) =>
      purchaseItemsRepository.create({
        purchase_id: purchase.id,
        purchase,
        product_id: item.product.id,
        product: item.product,
        quantity: item.quantity,
        unit_cost: item.unitCost,
        subtotal: item.subtotal,
      }),
    );

    await purchaseItemsRepository.save(purchaseItems);
  }

  private async reversePurchaseItemsStock(
    purchase: Purchase,
    organizationId: string,
    user: User,
    reason: string,
    productsRepository: Repository<Product>,
    inventoryMovementsRepository: Repository<InventoryMovement>,
  ) {
    for (const item of purchase.items ?? []) {
      await this.applyStockDelta({
        organizationId,
        product: item.product,
        quantity: this.toQuantity(item.quantity),
        multiplier: -1,
        movementType: InventoryMovementType.OUT,
        purchase,
        supplier: purchase.supplier,
        user,
        reason,
        productsRepository,
        inventoryMovementsRepository,
      });
    }
  }

  private async applyPurchaseItemsStock(
    purchase: Purchase,
    items: PurchaseItemPayload[],
    organizationId: string,
    user: User,
    supplier: Supplier,
    reason: string | null,
    productsRepository: Repository<Product>,
    inventoryMovementsRepository: Repository<InventoryMovement>,
  ) {
    for (const item of items) {
      await this.applyStockDelta({
        organizationId,
        product: item.product,
        quantity: item.quantity,
        multiplier: 1,
        movementType: InventoryMovementType.IN,
        purchase,
        supplier,
        user,
        reason,
        productsRepository,
        inventoryMovementsRepository,
      });
    }
  }

  private async applyStockDelta({
    organizationId,
    product,
    quantity,
    multiplier,
    movementType,
    purchase,
    supplier,
    user,
    reason,
    productsRepository,
    inventoryMovementsRepository,
  }: {
    organizationId: string;
    product: Product;
    quantity: number;
    multiplier: 1 | -1;
    movementType: InventoryMovementType;
    purchase: Purchase;
    supplier: Supplier;
    user: User;
    reason: string | null;
    productsRepository: Repository<Product>;
    inventoryMovementsRepository: Repository<InventoryMovement>;
  }) {
    const previousStock = this.toQuantity(product.stock);
    const newStock = this.roundQuantity(previousStock + quantity * multiplier);
    if (newStock < 0) {
      throw new BadRequestException(
        'Purchase change results in negative stock',
      );
    }

    product.stock = newStock;
    await productsRepository.save(product);

    const movement = inventoryMovementsRepository.create({
      organization_id: organizationId,
      product_id: product.id,
      product,
      user_id: user.id,
      user,
      supplier_id: supplier.id,
      supplier,
      purchase_id: purchase.id,
      purchase,
      movement_type: movementType,
      quantity,
      previous_stock: previousStock,
      new_stock: newStock,
      reason,
    });
    await inventoryMovementsRepository.save(movement);
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
