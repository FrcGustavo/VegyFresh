import { describe, expect, it, vi } from "vitest";
import { saveClient, saveSupplier, type ClientFormData } from "./saveContact";

const client: ClientFormData = {
  name: "  Maria ", phone_number: " 555 ", email: " ", country: " MX ",
  state: "", city: "", postal_code: "", address: "", suburb: "",
  external_number: "", internal_number: "", avatar_url: "", price_list_id: "",
};

describe("contact saves", () => {
  it("validates before calling the port and normalizes client updates", async () => {
    const port = { create: vi.fn(), update: vi.fn().mockResolvedValue("saved") };
    expect(() => saveClient({ ...client, phone_number: " " }, undefined, port)).toThrow("teléfono");
    expect(port.create).not.toHaveBeenCalled();
    await expect(saveClient(client, "c-1", port)).resolves.toBe("saved");
    expect(port.update).toHaveBeenCalledWith("c-1", expect.objectContaining({
      name: "Maria", phone_number: "555", email: null, country: "MX",
    }));
  });

  it("creates normalized suppliers and propagates port failures", async () => {
    const error = new Error("duplicate");
    const port = { create: vi.fn().mockRejectedValue(error), update: vi.fn() };
    await expect(saveSupplier({ name: "  Farm ", email: " ", phone_number: " 5 ", logo_url: "" }, undefined, port)).rejects.toBe(error);
    expect(port.create).toHaveBeenCalledWith({ name: "Farm", email: null, phone_number: "5", logo_url: null });
    expect(port.update).not.toHaveBeenCalled();
  });
});
