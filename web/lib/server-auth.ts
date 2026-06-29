import { createHash } from "crypto";
import { cookies } from "next/headers";

export function hashStudent(studentId: string): string {
  const salt = process.env.HASH_SALT ?? "dev_salt_change_in_prod";
  return createHash("sha256").update(salt + studentId).digest("hex");
}

export async function getSession(): Promise<string | null> {
  const store = await cookies();
  return store.get("session")?.value ?? null;
}
