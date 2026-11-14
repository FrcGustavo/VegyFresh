import { requestApi } from "../../api/httpClient";
import { createOrdersApi } from "./createOrdersApi";

export { toPortalOrder } from "./createOrdersApi";
export const ordersApi = createOrdersApi(requestApi);
