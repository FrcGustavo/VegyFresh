import { useParams } from "react-router";
import { ordersApi } from "../../../../infrastructure/orders/api/ordersApi";
import { OrderDetailView } from "./OrderDetailView";

export function OrderDetailPage() {
  const { orderId = "" } = useParams();
  return <OrderDetailView ordersApi={ordersApi} orderId={orderId} />;
}
