import { createFileRoute } from "@tanstack/react-router";
import SuppliersList from "../suppliers/pages/SuppliersList";
export const Route = createFileRoute("/_authenticated/suppliers")({ component: () => <SuppliersList /> });
