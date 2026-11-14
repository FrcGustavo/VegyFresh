import { describe, expect, it } from "vitest";
import { preparePriceList } from "./priceListDraft";

describe("price list draft", () => {
  it("requires a name and complete, unique product rows", () => {
    expect(preparePriceList(" ", [])).toEqual({
      success: false,
      error: "Completa el nombre de la lista de precios.",
    });
    expect(preparePriceList("Lista", [{ product_id: "p", price: "" }])).toEqual(
      {
        success: false,
        error: "Completa el producto y un precio válido en cada fila.",
      },
    );
    expect(
      preparePriceList("Lista", [
        { product_id: "p", price: 2 },
        { product_id: "p", price: 3 },
      ]),
    ).toEqual({
      success: false,
      error: "Cada producto solo puede asignarse una vez.",
    });
  });
  it("omits empty rows and normalizes zero and numeric prices", () => {
    expect(
      preparePriceList(" Lista ", [
        { product_id: "", price: "" },
        { product_id: "p", price: "0" },
      ]),
    ).toEqual({
      success: true,
      value: { name: "Lista", products: [{ product_id: "p", price: 0 }] },
    });
  });
});
