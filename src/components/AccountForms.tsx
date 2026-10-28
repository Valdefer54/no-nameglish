"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const inputClass = "mt-2 h-11 w-full rounded-lg border bg-background px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function LoginForm() {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const router = useRouter();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setError(""); setPending(true);
    try {
      const result = await authClient.signIn.username({ username: String(data.get("username")).trim(), password: String(data.get("password")) });
      if (result.error) { setError("Could not sign in. Check your username and password, or try again later."); return; }
      router.replace("/"); router.refresh();
    } catch { setError("Could not connect. Try again."); }
    finally { setPending(false); }
  }
  return <form onSubmit={submit} className="space-y-5">
    <div><Label htmlFor="username">Username</Label><input id="username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={30} className={inputClass} /></div>
    <div><Label htmlFor="password">Password</Label><input id="password" name="password" type="password" autoComplete="current-password" required maxLength={128} className={inputClass} /></div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <Button type="submit" disabled={pending} className="h-11 w-full">{pending ? "Signing in…" : "Sign in"}</Button>
  </form>;
}

export function CreateUserForm() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const router = useRouter();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    setError(""); setMessage(""); setPending(true);
    try {
      const response = await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const result = await response.json();
      if (!response.ok) { setError(result.error ?? "Could not create the account."); return; }
      setMessage(`Account created for ${result.user.username}. Share the username and initial password privately.`);
      form.reset(); router.refresh();
    } catch { setError("Could not connect. Try again."); }
    finally { setPending(false); }
  }
  return <form onSubmit={submit} className="space-y-5 max-w-md">
    <div><Label htmlFor="guest-name">Name</Label><input id="guest-name" name="name" autoComplete="off" required maxLength={100} className={inputClass} /></div>
    <div><Label htmlFor="guest-username">Username</Label><input id="guest-username" name="username" autoComplete="off" autoCapitalize="none" spellCheck={false} required minLength={3} maxLength={30} pattern="[a-zA-Z0-9_.]+" aria-describedby="username-help" className={inputClass} /><p id="username-help" className="mt-2 text-sm text-muted-foreground">3–30 letters, numbers, dots or underscores.</p></div>
    <div><Label htmlFor="study-level">Vocabulary</Label><select id="study-level" name="studyLevel" defaultValue="beginner" className={inputClass}>
      <option value="beginner">Beginner · A1 → B1</option><option value="advanced">Advanced · B2–C1</option>
    </select></div>
    <div><Label htmlFor="guest-password">Initial password</Label><input id="guest-password" name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={128} aria-describedby="guest-password-help" className={inputClass} />
      <p id="guest-password-help" className="mt-2 text-sm text-muted-foreground">12–128 characters. The learner can change it in Account.</p></div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {message && <p role="status" className="text-sm">{message}</p>}
    <Button type="submit" disabled={pending} className="h-11">{pending ? "Creating account…" : "Create guest account"}</Button>
  </form>;
}

export function PasswordForm() {
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setError(""); setMessage(""); setPending(true);
    try {
      const result = await authClient.changePassword({ currentPassword: String(data.get("current")), newPassword: String(data.get("new")), revokeOtherSessions: true });
      if (result.error) { setError("Could not change the password. Check your current password and try again."); return; }
      form.reset(); setMessage("Password changed. Other sessions have been signed out.");
    } catch { setError("Could not connect. Try again."); }
    finally { setPending(false); }
  }
  return <form onSubmit={submit} className="space-y-5 max-w-md">
    <div><Label htmlFor="current-password">Current password</Label><input id="current-password" name="current" type="password" autoComplete="current-password" required maxLength={128} className={inputClass} /></div>
    <div><Label htmlFor="new-password">New password</Label><input id="new-password" name="new" type="password" autoComplete="new-password" required minLength={12} maxLength={128} aria-describedby="new-password-help" className={inputClass} />
      <p id="new-password-help" className="mt-2 text-sm text-muted-foreground">Use 12–128 characters.</p></div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {message && <p role="status" className="text-sm">{message}</p>}
    <Button type="submit" disabled={pending} className="h-11">{pending ? "Saving…" : "Change password"}</Button>
  </form>;
}

export function SignOutButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const router = useRouter();
  return <div>
    <Button variant="ghost" className="min-h-11" disabled={pending} onClick={async () => {
      setPending(true); setError(false);
      try {
        const result = await authClient.signOut();
        if (result.error) { setError(true); return; }
        router.replace("/login"); router.refresh();
      } catch { setError(true); }
      finally { setPending(false); }
    }}>{pending ? "Signing out…" : "Sign out"}</Button>
    {error && <p role="alert" className="text-xs text-destructive">Could not sign out. Try again.</p>}
  </div>;
}
