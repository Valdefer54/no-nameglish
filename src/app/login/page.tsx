import { LoginForm } from "@/components/AccountForms";
import { getCurrentUser } from "@/lib/current-user";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");
  return <div className="mx-auto max-w-md px-5 py-16 sm:py-24">
    <h1 className="text-2xl font-semibold tracking-tight">Sign in to no-nameglish</h1>
    <p className="mt-3 mb-8 text-muted-foreground">Study your vocabulary and keep your own progress. Use the account shared with you by the administrator.</p>
    <LoginForm />
    <p className="mt-6 text-sm text-muted-foreground">Access is by invitation. If you need an account or forgot your password, contact the administrator.</p>
  </div>;
}
