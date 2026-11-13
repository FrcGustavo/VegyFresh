import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppRoot } from "./App";

describe("AppRoot", () => {
  it("renders login screen for unauthenticated users", async () => {
    localStorage.clear();
    render(<AppRoot />);
    expect(await screen.findByText("Portal Login")).toBeInTheDocument();
  });
});
