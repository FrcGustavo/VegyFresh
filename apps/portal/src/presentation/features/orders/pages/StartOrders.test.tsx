import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ordersApi } from "../../../../infrastructure/orders/api/ordersApi";
import { OrderDetailView } from "./OrderDetailView";
import { OrdersView } from "./OrdersView";

const order = { id: "one", folio: "A-123", status: "APPROVED", origin: "PORTAL", description: null,
  delivery_date: null, created_at: "2026-01-01", total_amount: "12.50", items: [
    { id: "line", product_id: "carrot", quantity: "2", unit_price: "6.25", subtotal: "12.50" },
  ] };

afterEach(() => vi.unstubAllGlobals());

describe("Start orders views", () => {
  it("loads list and detail through the BFF and exposes the order link", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => Promise.resolve(new Response(
      JSON.stringify(url.includes("/orders/one") ? order : [order]), { status: 200 },
    )));
    vi.stubGlobal("fetch", fetchMock);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const view = render(<QueryClientProvider client={client}><OrdersView ordersApi={ordersApi} orderLink={(id) => <a href={`/portal/orders/${id}`}>View</a>} /></QueryClientProvider>);
    expect(await screen.findByText("A-123")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View" })).toHaveAttribute("href", "/portal/orders/one");
    view.rerender(<QueryClientProvider client={client}><OrderDetailView ordersApi={ordersApi} orderId="one" /></QueryClientProvider>);
    expect(await screen.findByText("Order A-123")).toBeInTheDocument();
    expect(screen.getByText("carrot")).toBeInTheDocument();
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(["/api/v1/portal/orders?page=1&pageSize=50", "/api/v1/portal/orders/one"]);
    view.unmount(); client.clear();
  });

  it("shows an API denial without displaying another client's order", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: "Forbidden" }), { status: 403 })));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const view = render(<QueryClientProvider client={client}><OrderDetailView ordersApi={ordersApi} orderId="other-client" /></QueryClientProvider>);
    expect(await screen.findByRole("alert")).toHaveTextContent("Forbidden");
    expect(screen.queryByText("Order A-123")).not.toBeInTheDocument();
    view.unmount(); client.clear();
  });
});
