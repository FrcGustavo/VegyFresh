import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import { PortalOrdersController } from 'src/portal/portal-orders.controller';
import { PortalOrdersService } from 'src/portal/portal-orders.service';

describe('PortalOrdersController', () => {
  const serviceMock = {
    findAll: jest.fn(),
    findOne: jest.fn(),
  };

  let controller: PortalOrdersController;

  beforeEach(() => {
    controller = new PortalOrdersController(
      serviceMock as unknown as PortalOrdersService,
    );
    jest.clearAllMocks();
  });

  it('delegates findAll', async () => {
    const user = { sub: 'client-1', organization_id: 'org-1' };
    const query = { page: '1', pageSize: '10' };
    serviceMock.findAll.mockResolvedValue([{ id: 'order-1' }]);

    const result = await controller.findAll(user as never, query);

    expect(serviceMock.findAll).toHaveBeenCalledWith(user, query);
    expect(result).toEqual([{ id: 'order-1' }]);
  });

  it('delegates findOne', async () => {
    const user = { sub: 'client-1', organization_id: 'org-1' };
    serviceMock.findOne.mockResolvedValue({ id: 'order-1' });

    const result = await controller.findOne(user as never, 'order-1');

    expect(serviceMock.findOne).toHaveBeenCalledWith(user, 'order-1');
    expect(result).toEqual({ id: 'order-1' });
  });
});

describe('portal order Swagger contract', () => {
  it('documents the serialized responses returned by the real service', async () => {
    const date = new Date('2025-01-01T00:00:00.000Z');
    const product = {
      id: 'product-1',
      folio: 'P1',
      name: 'Tomato',
      description: null,
      supplier_id: 'supplier-1',
      organization_id: 'org-1',
      stock: '2.000',
      unit: 'kg',
      images: [],
      createdAt: date,
      updatedAt: date,
    };
    const item = {
      id: 'item-1',
      order_id: 'order-1',
      product_id: 'product-1',
      quantity: '2.000',
      unit_price: '5.00',
      subtotal: '10.00',
      product,
    };
    const order = {
      id: 'order-1',
      client_id: 'client-1',
      user_id: 'user-1',
      organization_id: 'org-1',
      total_amount: '10.00',
      folio: 'O1',
      description: null,
      status: 'APPROVED',
      origin: 'PORTAL',
      items: [item],
      delivery_date: null,
      created_at: date,
    };
    const qb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([order]),
    };
    const repository = {
      createQueryBuilder: jest.fn().mockReturnValue(qb),
      findOne: jest.fn().mockResolvedValue(order),
    };
    const service = new PortalOrdersService(repository as never);
    const module = await Test.createTestingModule({
      controllers: [PortalOrdersController],
      providers: [{ provide: PortalOrdersService, useValue: service }],
    }).compile();
    const app = module.createNestApplication();
    try {
      const document = SwaggerModule.createDocument(
        app,
        new DocumentBuilder().build(),
      );
      const list = document.paths['/portal/orders'].get;
      const detail = document.paths['/portal/orders/{id}'].get;
      expect(list?.parameters).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'status', required: false }),
          expect.objectContaining({ name: 'includeCanceled', required: false }),
          expect.objectContaining({ name: 'page', required: false }),
          expect.objectContaining({ name: 'pageSize', required: false }),
        ]),
      );
      expect(list?.responses?.['200']).toEqual(
        expect.objectContaining({
          content: {
            'application/json': {
              schema: {
                type: 'array',
                items: { $ref: '#/components/schemas/PortalOrderResponseDto' },
              },
            },
          },
        }),
      );
      expect(detail?.responses?.['200']).toEqual(
        expect.objectContaining({
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/PortalOrderResponseDto',
              },
            },
          },
        }),
      );

      const user = { sub: 'client-1', organization_id: 'org-1' } as never;
      const listResult = await service.findAll(user, {});
      const detailResult = await service.findOne(user, 'order-1');
      expect(detailResult).toEqual(listResult[0]);
      const serialized = JSON.parse(
        JSON.stringify(detailResult),
      ) as typeof order;
      const schemas = document.components?.schemas ?? {};
      for (const [name, value] of [
        ['PortalOrderResponseDto', serialized],
        ['PortalOrderItemResponseDto', serialized.items[0]],
        ['PortalProductResponseDto', serialized.items[0].product],
      ] as const) {
        const schema = schemas[name] as SchemaObject;
        expect(Object.keys(schema.properties ?? {}).sort()).toEqual(
          Object.keys(value).sort(),
        );
        expect(schema.required?.slice().sort()).toEqual(
          Object.keys(value).sort(),
        );
      }
      const orderSchema = schemas.PortalOrderResponseDto as SchemaObject;
      expect(orderSchema.properties?.delivery_date).toEqual(
        expect.objectContaining({
          type: 'string',
          format: 'date-time',
          nullable: true,
        }),
      );
      expect(orderSchema.properties?.total_amount).toEqual(
        expect.objectContaining({
          oneOf: [{ type: 'number' }, { type: 'string' }],
        }),
      );
    } finally {
      await app.close();
    }
  });
});
