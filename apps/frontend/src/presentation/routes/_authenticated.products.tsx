import { createFileRoute } from "@tanstack/react-router";
import ProductsList from "../products/pages/ProductsList";
export const Route = createFileRoute("/_authenticated/products")({ component: () => <ProductsList /> });
