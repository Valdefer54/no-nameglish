import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { syncStudyProgress } from "@/lib/db/study-progress";

export const getCurrentSession = cache(async (requestHeaders?: Headers) => {
  // Always check the database so a cached JWT cannot bypass session revocation.
  return auth.api.getSession({ headers: requestHeaders ?? await headers(), query: { disableCookieCache: true } });
});

export const getCurrentUser = cache(async (requestHeaders?: Headers) => {
  const session = await getCurrentSession(requestHeaders);
  if (!session) return null;
  const user = session.user;
  if (user.studyLevel === "beginner") return { ...user, ...await syncStudyProgress(user.id) };
  return user;
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
