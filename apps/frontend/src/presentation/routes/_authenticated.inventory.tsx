import { createFileRoute } from "@tanstack/react-router";
import InventoryPage from "../inventory/pages/InventoryPage";
export const Route = createFileRoute("/_authenticated/inventory")({ component: () => <InventoryPage /> });
