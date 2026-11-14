import { createFileRoute } from "@tanstack/react-router";
import PriceListsList from "../products/pages/PriceListsList";
export const Route = createFileRoute("/_authenticated/price-lists")({ component: () => <PriceListsList /> });
