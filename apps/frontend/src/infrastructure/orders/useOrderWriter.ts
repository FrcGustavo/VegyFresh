import { ordersMutationOptions } from "../query";
import { type CreateOrderInput, type Order, type UpdateOrderInput } from "../api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  OrderSaveInput,
  OrderWritePort,
} from "../../application/orders/saveOrder";

export function useOrderWriter(): OrderWritePort<Order> & {
  isPending: boolean;
} {
  const queryClient = useQueryClient();
  const createMutation = useMutation(ordersMutationOptions.create(queryClient));
  const updateMutation = useMutation(ordersMutationOptions.update(queryClient));

  return {
    create: (input: OrderSaveInput) =>
      createMutation.mutateAsync(input as CreateOrderInput),
    update: (id: string, input: OrderSaveInput) =>
      updateMutation.mutateAsync({ id, input: input as UpdateOrderInput }),
    isPending: createMutation.isPending || updateMutation.isPending,
  };
}
