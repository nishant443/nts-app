import "server-only";

import { cookies } from "next/headers";

import { FLASH_COOKIE } from "@/lib/flash-cookie";

export async function flash(message: string): Promise<void> {
  const store = await cookies();
  store.set(FLASH_COOKIE, message, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 30,
  });
}
