import { act, renderHook } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useTableResizableColumns } from "./Table.hooks";

const columns = [
  { key: "name", defaultWidth: 180 },
  { key: "price", defaultWidth: 120 },
];
const storageKey = "test-table-widths";

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("table column widths", () => {
  it("hydrates with defaults before restoring saved widths", async () => {
    localStorage.setItem(storageKey, JSON.stringify({ name: 240, price: 120 }));
    const getItem = vi.spyOn(Storage.prototype, "getItem");
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    function Width() {
      const { getColumnWidth } = useTableResizableColumns(storageKey, columns);
      return <span>{getColumnWidth("name")}</span>;
    }

    const html = renderToString(<Width />);
    expect(html).toContain("180");
    expect(getItem).not.toHaveBeenCalled();
    const container = document.createElement("div");
    container.innerHTML = html;
    document.body.appendChild(container);
    let root: ReturnType<typeof hydrateRoot>;
    await act(async () => {
      root = hydrateRoot(container, <Width />);
    });
    expect(container.textContent).toBe("240");
    expect(errors).not.toHaveBeenCalled();
    await act(async () => root.unmount());
    container.remove();
  });

  it("persists updates and resets, and restores them on remount", () => {
    const { result, unmount } = renderHook(() =>
      useTableResizableColumns(storageKey, columns),
    );
    expect(result.current.getColumnWidth("missing")).toBe(160);
    act(() => result.current.updateColumnWidth("name", 260));
    expect(JSON.parse(localStorage.getItem(storageKey)!)).toEqual({ name: 260, price: 120 });
    act(() => result.current.resetColumnWidth("name", 180));
    expect(JSON.parse(localStorage.getItem(storageKey)!)).toEqual({ name: 180, price: 120 });
    act(() => result.current.updateColumnWidth("price", 200));
    unmount();
    const restored = renderHook(() => useTableResizableColumns(storageKey, columns));
    expect(restored.result.current.columnWidths).toEqual({ name: 180, price: 200 });
  });

  it.each(["{", "null", "[]", '{"name":"wide"}']) (
    "falls back to defaults for invalid saved data: %s",
    (stored) => {
      localStorage.setItem(storageKey, stored);
      const { result } = renderHook(() => useTableResizableColumns(storageKey, columns));
      expect(result.current.columnWidths).toEqual({ name: 180, price: 120 });
    },
  );

  it("keeps resizing usable when storage reads and writes throw", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("denied"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("full"); });
    const { result } = renderHook(() => useTableResizableColumns(storageKey, columns));
    act(() => result.current.updateColumnWidth("name", 220));
    expect(result.current.getColumnWidth("name")).toBe(220);
    act(() => result.current.resetColumnWidth("name", 180));
    expect(result.current.getColumnWidth("name")).toBe(180);
  });
});
