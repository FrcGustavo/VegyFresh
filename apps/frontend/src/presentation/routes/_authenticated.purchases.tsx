import { createFileRoute } from "@tanstack/react-router";
import PurchasesList from "../purchases/pages/PurchasesList";
export const Route = createFileRoute("/_authenticated/purchases")({ component: () => <PurchasesList /> });
