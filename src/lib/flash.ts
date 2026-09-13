import "server-only";

import { cookies } from "next/headers";

import { FLASH_COOKIE } from "@/lib/flash-cookie";

/**
 * Leaves a one-shot "saved" message for the page a Server Action redirects to.
 *
 * Forms that stay on the page get their confirmation back as `FormState`;
 * forms that `redirect()` cannot, so the message travels in a short-lived,
 * client-readable cookie that `FlashPopup` shows and clears on arrival.
 */
export async function flash(message: string): Promise<void> {
  const store = await cookies();
  // `cookies().set` URL-encodes the value itself; the client decodes it once.
  store.set(FLASH_COOKIE, message, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 30,
  });
}
