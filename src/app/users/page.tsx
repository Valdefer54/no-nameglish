import { CreateUserForm } from "@/components/AccountForms";
import { requireUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { asc } from "drizzle-orm";
import { notFound } from "next/navigation";

export default async function UsersPage() {
  const user = await requireUser();
  if (user.role !== "admin") notFound();
  const learners = await db.select({ id: users.id, name: users.name, username: users.username, studyLevel: users.studyLevel, role: users.role }).from(users).orderBy(asc(users.createdAt));
  return <div className="mx-auto max-w-4xl px-5 py-8 space-y-10">
    <div><h1 className="text-2xl font-semibold">Users</h1><p className="mt-2 text-muted-foreground">Create accounts for the people you invite. Each learner has private study progress.</p></div>
    <section aria-labelledby="new-account"><h2 id="new-account" className="text-lg font-semibold mb-5">New guest account</h2><CreateUserForm /></section>
    <section aria-labelledby="learners"><h2 id="learners" className="text-lg font-semibold mb-4">Accounts ({learners.length})</h2>
      <ul className="divide-y border-y">{learners.map((learner) => <li key={learner.id} className="py-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0"><p className="font-medium break-words">{learner.name}</p><p className="text-sm text-muted-foreground break-all">@{learner.username}</p></div>
        <p className="text-sm text-muted-foreground">{learner.role === "admin" ? "Administrator · " : ""}{learner.studyLevel === "beginner" ? "A1 → B1" : "B2–C1"}</p>
      </li>)}</ul>
    </section>
  </div>;
}
