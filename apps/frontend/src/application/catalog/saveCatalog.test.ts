import { describe, expect, it, vi } from "vitest";
import { saveProduct, saveUser } from "./saveCatalog";

const user = {
  name: " Ana ",
  email: " ana@example.com ",
  role_id: "r1",
  avatar_url: "  ",
  password: "password-1234",
};
const product = {
  name: " Apple ",
  description: " ",
  stock: "3",
  supplier_id: "s1",
  unit: "kg" as const,
  images: [" url ", " "],
};

describe("catalog saves", () => {
  it("normalizes users and only sends a password on update when provided", async () => {
    const port = {
      create: vi.fn().mockResolvedValue({ id: "new" }),
      update: vi.fn().mockResolvedValue({ id: "u1" }),
    };
    await saveUser(user, undefined, port);
    expect(port.create).toHaveBeenCalledWith({
      name: "Ana",
      email: "ana@example.com",
      role_id: "r1",
      avatar_url: null,
      password: "password-1234",
    });
    await saveUser({ ...user, password: "" }, "u1", port);
    expect(port.update).toHaveBeenCalledWith("u1", {
      name: "Ana",
      email: "ana@example.com",
      role_id: "r1",
      avatar_url: null,
    });
    expect(() =>
      saveUser({ ...user, password: "short" }, undefined, port),
    ).toThrow("12 caracteres");
  });
  it("normalizes product prices and rejects duplicate or invalid rows before saving", async () => {
    const port = { save: vi.fn().mockResolvedValue({ id: "p1" }) };
    const row = { clientRowId: "c1", price_list_id: "l1", price: "4.5" };
    const existing = [{ id: "old", price_list_id: "l1", price: 4 }];
    await saveProduct(product, [row], existing, "p1", port);
    expect(port.save).toHaveBeenCalledWith({
      id: "p1",
      product: {
        name: "Apple",
        description: null,
        stock: 3,
        supplier_id: "s1",
        unit: "kg",
        images: ["url"],
      },
      prices: [{ price_list_id: "l1", price: 4.5 }],
      existingPrices: existing,
    });
    expect(() => saveProduct(product, [row, row], [], undefined, port)).toThrow(
      "solo puede asignarse una vez",
    );
    expect(() =>
      saveProduct({ ...product, stock: -1 }, [], [], undefined, port),
    ).toThrow("stock");
    expect(port.save).toHaveBeenCalledTimes(1);
  });
});
