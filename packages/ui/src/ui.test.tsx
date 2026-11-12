import * as React from "react";
import assert from "node:assert/strict";
import test from "node:test";
import { renderToString } from "react-dom/server";
import { ErrorState, LoadingState, PageHeader, createVegyTheme } from "./index.js";

test("shared states render on the server with accessible status and escaped content", () => {
  assert.match(renderToString(<LoadingState label="Consultando pedidos" />), /role="status"/);
  assert.match(renderToString(<PageHeader title="<script>" />), /&lt;script&gt;/);
  assert.match(renderToString(<ErrorState message="Error de conexión" />), /role="alert"/);
});

test("both theme modes share brand tokens", () => {
  const light = createVegyTheme();
  const dark = createVegyTheme("dark");
  assert.equal(dark.palette.mode, "dark");
  assert.equal(light.palette.primary.main, dark.palette.primary.main);
});
