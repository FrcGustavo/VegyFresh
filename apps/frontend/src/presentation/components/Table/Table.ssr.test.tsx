// @vitest-environment node
import { renderToString } from "react-dom/server";
import { expect, it } from "vitest";
import { useTableResizableColumns } from "./Table.hooks";

it("renders defaults without browser globals", () => {
  function Width() {
    const { getColumnWidth } = useTableResizableColumns("widths", [
      { key: "name", defaultWidth: 180 },
    ]);
    return <span>{getColumnWidth("name")}</span>;
  }

  expect(renderToString(<Width />)).toContain("180");
});
