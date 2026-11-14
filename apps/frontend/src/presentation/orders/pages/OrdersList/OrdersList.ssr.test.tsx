import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useFormatters } from "./OrdersList.hooks";
import { usePurchaseFormatters } from "@/presentation/purchases/pages/PurchasesList/PurchasesList.hooks";

describe("SSR date formatting", () => {
  it("renders the same UTC calendar date in orders and purchases", () => {
    const { result } = renderHook(() => ({ order: useFormatters(), purchase: usePurchaseFormatters() }));
    const expected = new Intl.DateTimeFormat("es-MX", { timeZone: "UTC" }).format(new Date("2025-01-01T01:00:00Z"));
    expect(result.current.order.formatDate("2025-01-01T01:00:00Z")).toBe(expected);
    expect(result.current.purchase.formatDate("2025-01-01T01:00:00Z")).toBe(expected);
  });
});
