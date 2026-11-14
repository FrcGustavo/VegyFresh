export interface OrderDraft {
  client_id: string;
  user_id: string;
  status: string;
  origin: string;
  delivery_date: string;
}

export interface OrderDraftItem {
  product_id: string;
  quantity: number | string;
  unit_price: number | string;
}

export interface OrderSaveInput {
  client_id: string;
  user_id: string;
  status: string;
  origin: string;
  delivery_date?: string;
  items: Array<{
    product_id: string;
    quantity: number;
    unit_price: number;
  }>;
}

export interface OrderWritePort<Order> {
  create(input: OrderSaveInput): Promise<Order>;
  update(id: string, input: OrderSaveInput): Promise<Order>;
}

export type SaveOrderResult<Order> =
  | { success: true; order: Order }
  | { success: false; error: string };

export function createSaveOrderUseCase<Order>(port: OrderWritePort<Order>) {
  return async (
    id: string | undefined,
    draft: OrderDraft,
    items: OrderDraftItem[],
  ): Promise<SaveOrderResult<Order>> => {
    if (!draft.client_id) {
      return {
        success: false,
        error: "Selecciona un cliente válido por folio o nombre.",
      };
    }

    if (!draft.user_id) {
      return {
        success: false,
        error: "Selecciona un usuario responsable del pedido.",
      };
    }

    const validItems = items.filter(
      (item) => String(item.product_id || "").trim() !== "",
    );
    if (validItems.length === 0) {
      return {
        success: false,
        error: "Agrega al menos un producto al pedido.",
      };
    }

    if (
      validItems.some(
        (item) =>
          !Number.isFinite(Number(item.quantity)) ||
          Number(item.quantity) <= 0 ||
          !Number.isFinite(Number(item.unit_price)) ||
          Number(item.unit_price) < 0,
      )
    ) {
      return {
        success: false,
        error:
          "Cada partida debe tener una cantidad mayor que cero y un precio válido.",
      };
    }

    const input: OrderSaveInput = {
      client_id: draft.client_id,
      user_id: draft.user_id,
      status: draft.status,
      origin: draft.origin,
      delivery_date: draft.delivery_date || undefined,
      items: validItems.map((item) => ({
        product_id: item.product_id,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
      })),
    };

    const order = id ? await port.update(id, input) : await port.create(input);

    return { success: true, order };
  };
}
