import type { FormEvent } from "react";

export interface SignupFormState {
  name: string;
  email: string;
  password: string;
}

export type SignupSubmitHandler = (event: FormEvent) => Promise<void>;
