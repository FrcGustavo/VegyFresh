import { mutationOptions } from "@tanstack/react-query";
import { aiApi, whatsappApi } from "../api/resources";
import type { CreateAiInput, CreateWhatsappInput } from "../api/types";

export const aiMutationOptions = {
  interpret: () =>
    mutationOptions({
      mutationKey: ["ai", "interpret"],
      mutationFn: (input: CreateAiInput) => aiApi.interpret(input),
    }),
};

export const whatsappMutationOptions = {
  send: () =>
    mutationOptions({
      mutationKey: ["whatsapp", "send"],
      mutationFn: (input: CreateWhatsappInput) => whatsappApi.send(input),
    }),
};
