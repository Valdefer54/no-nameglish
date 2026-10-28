import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export const getCurrentUser = cache(async (requestHeaders?: Headers) => {
  const session = await auth.api.getSession({ headers: requestHeaders ?? await headers() });
  return session?.user ?? null;
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
