import { describe, expect, it } from "vitest";
import { purchaseTotal, validPurchaseItems } from "./purchaseDraft";

describe("purchase draft", () => {
  it("ignores blank and invalid rows while normalizing valid numbers", () => {
    expect(
      validPurchaseItems([
        { product_id: "", quantity: "1", unit_cost: "2" },
        { product_id: "p1", quantity: "0", unit_cost: "2" },
        { product_id: "p2", quantity: "2.5", unit_cost: "3.25" },
        { product_id: "p3", quantity: "1", unit_cost: "NaN" },
      ]),
    ).toEqual([{ product_id: "p2", quantity: 2.5, unit_cost: 3.25 }]);
  });
  it("rounds each line before summing", () => {
    expect(
      purchaseTotal([
        { product_id: "p1", quantity: 3, unit_cost: 0.333 },
        { product_id: "p2", quantity: 2, unit_cost: 1.25 },
      ]),
    ).toBe(3.5);
  });
});
