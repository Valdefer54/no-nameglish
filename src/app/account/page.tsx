import { PasswordForm } from "@/components/AccountForms";
import { requireUser } from "@/lib/current-user";

export default async function AccountPage() {
  const user = await requireUser();
  return <div className="mx-auto max-w-4xl px-5 py-8 space-y-8">
    <div><h1 className="text-2xl font-semibold">Account</h1><p className="mt-2 break-all text-muted-foreground">{user.name} · @{user.username}</p><p className="mt-2 text-sm">Vocabulary: {user.studyLevel === "beginner" ? "Beginner · A1 → B1" : "Advanced · B2–C1"}</p></div>
    <section aria-labelledby="change-password"><h2 id="change-password" className="text-lg font-semibold mb-5">Change password</h2><PasswordForm /></section>
  </div>;
}
