import { eq, desc } from "drizzle-orm";
import { learningEntry } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const entries = await db
    .select()
    .from(learningEntry)
    .where(eq(learningEntry.userId, session.user.id))
    .orderBy(desc(learningEntry.createdAt));

  return Response.json({ entries });
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await request.json().catch(() => null);
  const note =
    body &&
    typeof body === "object" &&
    "note" in body &&
    typeof (body as { note: unknown }).note === "string"
      ? (body as { note: string }).note.trim()
      : "";

  if (!note) {
    return Response.json({ error: "note is required" }, { status: 400 });
  }

  const [entry] = await db
    .insert(learningEntry)
    .values({ userId: session.user.id, note })
    .returning();

  return Response.json({ entry });
}
