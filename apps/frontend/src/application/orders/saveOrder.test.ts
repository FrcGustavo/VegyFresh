import { describe, expect, it, vi } from "vitest";
import { createSaveOrderUseCase } from "./saveOrder";

const draft = {
  client_id: "client",
  user_id: "user",
  status: "PENDING_REVIEW",
  origin: "WHATSAPP",
  delivery_date: "",
};
const item = { product_id: "product", quantity: "2", unit_price: "15.5" };

function setup() {
  const port = {
    create: vi.fn().mockResolvedValue({ id: "new" }),
    update: vi.fn().mockResolvedValue({ id: "existing" }),
  };
  return { port, save: createSaveOrderUseCase(port) };
}

describe("save order", () => {
  it.each([
    [
      { ...draft, client_id: "" },
      [item],
      "Selecciona un cliente válido por folio o nombre.",
    ],
    [
      { ...draft, user_id: "" },
      [item],
      "Selecciona un usuario responsable del pedido.",
    ],
    [draft, [], "Agrega al menos un producto al pedido."],
    [
      draft,
      [{ ...item, quantity: "0" }],
      "Cada partida debe tener una cantidad mayor que cero y un precio válido.",
    ],
    [
      draft,
      [{ ...item, unit_price: "-1" }],
      "Cada partida debe tener una cantidad mayor que cero y un precio válido.",
    ],
  ])("rejects invalid inputs without writing", async (value, items, error) => {
    const { port, save } = setup();
    expect(await save(undefined, value, items)).toEqual({
      success: false,
      error,
    });
    expect(port.create).not.toHaveBeenCalled();
    expect(port.update).not.toHaveBeenCalled();
  });

  it("normalizes items and dispatches create or update", async () => {
    const { port, save } = setup();
    const blank = { ...item, product_id: "" };
    expect(await save(undefined, draft, [item, blank])).toEqual({
      success: true,
      order: { id: "new" },
    });
    expect(port.create).toHaveBeenCalledWith({
      ...draft,
      delivery_date: undefined,
      items: [{ product_id: "product", quantity: 2, unit_price: 15.5 }],
    });
    expect(await save("existing", draft, [item])).toEqual({
      success: true,
      order: { id: "existing" },
    });
    expect(port.update).toHaveBeenCalledWith(
      "existing",
      expect.objectContaining({
        items: [{ product_id: "product", quantity: 2, unit_price: 15.5 }],
      }),
    );
  });
});
