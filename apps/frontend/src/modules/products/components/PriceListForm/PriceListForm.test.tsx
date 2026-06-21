import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PriceListForm from "./PriceListForm";
import type { PriceListFormProps } from "./PriceListForm.types";

const createProps = (
  overrides: Partial<PriceListFormProps> = {},
): PriceListFormProps => ({
  name: "Menudeo",
  setName: vi.fn(),
  products: [{ id: "product-1", name: "Manzana" }],
  productsList: [
    {
      clientRowId: "row-1",
      product_id: "product-1",
      name: "Manzana",
      price: "25",
    },
  ],
  addProductField: vi.fn(),
  updateProductField: vi.fn(),
  selectProduct: vi.fn(),
  removeProductField: vi.fn(),
  handleSubmit: vi.fn(),
  ...overrides,
});

describe("PriceListForm", () => {
  it("agrega una fila con Tab después de completar la última", () => {
    const addProductField = vi.fn();
    render(<PriceListForm {...createProps({ addProductField })} />);

    fireEvent.keyDown(screen.getByRole("spinbutton"), { key: "Tab" });

    expect(addProductField).toHaveBeenCalledOnce();
  });

  it("no agrega una fila con Tab si el precio está vacío", () => {
    const addProductField = vi.fn();
    render(
      <PriceListForm
        {...createProps({
          addProductField,
          productsList: [
            {
              clientRowId: "row-1",
              product_id: "product-1",
              name: "Manzana",
              price: "",
            },
          ],
        })}
      />,
    );

    fireEvent.keyDown(screen.getByRole("spinbutton"), { key: "Tab" });

    expect(addProductField).not.toHaveBeenCalled();
  });
});
