import { APIError } from "better-auth/api";
import { db } from "@/lib/db";
import { createAuth } from "@/lib/auth";
import { getCurrentUser } from "@/lib/current-user";
import { seedUserCards } from "@/lib/db/vocabulary";

export async function POST(request: Request) {
  const user = await getCurrentUser(request.headers);
  if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });
  if (user.role !== "admin") return Response.json({ error: "Administrator access required" }, { status: 403 });
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return Response.json({ error: "Invalid request origin" }, { status: 403 });
  }

  let body;
  try { body = await request.json(); } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body || typeof body.name !== "string" || !body.name.trim() || body.name.length > 100 ||
      typeof body.username !== "string" || !/^[a-z0-9_.]{3,30}$/.test(body.username.trim().toLowerCase()) ||
      typeof body.password !== "string" || body.password.length < 12 || body.password.length > 128) {
    return Response.json({ error: "Enter a name, a username of 3–30 letters/numbers/dots/underscores, and a password of 12–128 characters." }, { status: 400 });
  }
  const username = body.username.trim().toLowerCase();
  const studyLevel = body.studyLevel ?? "beginner";
  if (studyLevel !== "beginner" && studyLevel !== "advanced") {
    return Response.json({ error: "Choose beginner or advanced vocabulary." }, { status: 400 });
  }

  try {
    const invited = await db.transaction(async (tx) => {
      const { user: invited } = await createAuth(tx).api.createUser({
        headers: request.headers,
        body: { name: body.name.trim(), email: `${Buffer.from(username).toString("hex")}@accounts.no-nameglish.invalid`, password: body.password, role: "user", data: { studyLevel, username } },
      });
      await seedUserCards(tx, invited.id, studyLevel);
      return invited;
    });
    return Response.json({ user: { id: invited.id, name: invited.name, username } }, { status: 201 });
  } catch (error) {
    if (error instanceof APIError && ["USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL", "USERNAME_IS_ALREADY_TAKEN"].includes(error.body?.code ?? "")) {
      return Response.json({ error: "An account with this username already exists." }, { status: 409 });
    }
    console.error("Could not create invited account", error instanceof Error ? error.message : "Unknown error");
    return Response.json({ error: "Could not create the account. Try again." }, { status: 500 });
  }
}
