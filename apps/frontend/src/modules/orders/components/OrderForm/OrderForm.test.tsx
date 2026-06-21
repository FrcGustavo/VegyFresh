import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import OrderForm from "./OrderForm";
import type { OrderFormProps } from "./OrderForm.types";

const createProps = (
  overrides: Partial<OrderFormProps> = {},
): OrderFormProps => ({
  formData: {
    client_id: "client-1",
    user_id: "user-1",
    status: "PENDING_REVIEW",
    origin: "WHATSAPP",
    delivery_date: "",
    order_folio: "",
    created_at: "",
  },
  clientLookup: { folio: "CLI-001", name: "Cliente" },
  items: [
    {
      clientRowId: "row-1",
      product_id: "product-1",
      quantity: 2,
      unit_price: 15,
      folio: "PROD-001",
      name: "Manzana",
      unit: "kg",
    },
  ],
  totalGeneral: 30,
  handleChange: vi.fn(),
  updateClientLookup: vi.fn(),
  addItemField: vi.fn(),
  removeItemField: vi.fn(),
  updateItemField: vi.fn(),
  handleSubmit: vi.fn(),
  ...overrides,
});

describe("OrderForm", () => {
  it("agrega una fila con Tab después de una partida válida", () => {
    const addItemField = vi.fn();
    render(<OrderForm {...createProps({ addItemField })} />);

    const priceInput = screen.getAllByRole("spinbutton")[1];
    fireEvent.keyDown(priceInput, { key: "Tab" });

    expect(addItemField).toHaveBeenCalledOnce();
    expect(screen.getByText("1 Articulos")).toBeInTheDocument();
  });

  it("permite eliminar una partida en modo edición", () => {
    const removeItemField = vi.fn();
    render(<OrderForm {...createProps({ removeItemField })} />);

    fireEvent.click(screen.getByLabelText("Eliminar partida 1"));

    expect(removeItemField).toHaveBeenCalledWith(0);
  });
});
