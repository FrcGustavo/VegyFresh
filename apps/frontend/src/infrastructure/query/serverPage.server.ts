import { LIST_PAGE_SIZE, LIST_INITIAL_FIELD, LIST_INITIAL_ORDER, ORDERS_INITIAL_FIELD, ORDERS_INITIAL_ORDER, ORDERS_INITIAL_FILTER } from "@/application/query/listDefaults";
import { QueryClient, dehydrate } from "@tanstack/react-query";
import { canAccessOrganizationResource, canAccessUsersResource } from "@/domain/auth/authorization";
import { createApiProxy, getPublicOrigin } from "../server/apiProxyRuntime.server";
import type { ApiProxy } from "../server/apiProxy.mjs";
import type { AdminPage, ServerPage } from "./serverPage";

const defaultList = { limit: String(LIST_PAGE_SIZE), order_by: LIST_INITIAL_FIELD, order: LIST_INITIAL_ORDER } as const;
const orderList = { limit: LIST_PAGE_SIZE, order_by: ORDERS_INITIAL_FIELD, order: ORDERS_INITIAL_ORDER, created_filter: ORDERS_INITIAL_FILTER } as const;

// Only known page reads are permitted; the BFF and API still enforce access.
export async function loadServerPage(
  request: Request,
  page: AdminPage,
  appendCookie: (cookie: string) => void,
  proxy: ApiProxy = createApiProxy(),
  origin = getPublicOrigin(),
): Promise<ServerPage> {
  const cookie = request.headers.get("cookie") ?? undefined;
  try {
    const session = await proxy.getSession({ cookieHeader: cookie, origin });
    session.cookies.forEach(appendCookie);
    const { user, organization, role } = session.profile ?? {};
    if (session.authenticated !== true || !user?.id || !user.name || !user.email || !organization?.id) return null;
    const accessRole = role?.id && role.name ? { id: role.id, name: role.name, permissions: role.permissions ?? [] } : null;
    if (page === "users" && !canAccessUsersResource(accessRole)) return null;
    if (page === "organization" && !canAccessOrganizationResource(accessRole)) return null;

    const queryClient = new QueryClient();
    const read = async (path: string) => {
      const headers = new Headers({ accept: "application/json" });
      if (cookie) headers.set("cookie", cookie);
      const response = await proxy.handle(new Request(new URL(`/api/v1${path}`, origin), { headers }));
      response.headers.getSetCookie().forEach(appendCookie);
      if (!response.ok) throw new Error("Administrative data unavailable");
      return response.json() as Promise<unknown>;
    };
    if (page === "organization") {
      queryClient.setQueryData(["organizations", "detail", organization.id], await read(`/organizations/${encodeURIComponent(organization.id)}`));
    } else if (page === "inventory" || page === "purchases") {
      queryClient.setQueryData(page === "inventory" ? ["inventory", "stock"] : ["purchases", "list"], await read(`/${page}`));
    } else {
      const params = page === "orders" ? orderList : defaultList;
      const search = new URLSearchParams(Object.entries({ ...params, offset: 0 }).map(([key, value]) => [key, String(value)]));
      const data = await read(`/${page}?${search}`);
      queryClient.setQueryData([page, "infinite-list", params], { pages: [data], pageParams: [0] });
    }
    return { identity: JSON.stringify([user.id, organization.id, role?.id]), state: JSON.stringify(dehydrate(queryClient)) };
  } catch {
    // A failed preload falls back to the browser query and its existing error UI.
    return null;
  }
}
