import type { User } from "@/shared/types";
import { login as apiLogin } from "@/shared/api";

export async function login(username: string, password: string): Promise<User | null> {
  return apiLogin(username, password);
}
