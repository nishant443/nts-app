import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/dal";

/** The app has no marketing surface — land people where they belong. */
export default async function RootPage() {
  const user = await getSessionUser();
  redirect(user ? "/dashboard" : "/login");
}
