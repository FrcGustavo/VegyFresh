import type { FormEvent } from "react";

export interface LoginFormState {
  email: string;
  password: string;
}

export type LoginSubmitHandler = (event: FormEvent) => Promise<void>;
