import { desc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { learningEntry } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { AddEntryForm } from "./add-entry-form";
import { SignOutButton } from "./sign-out-button";

export default async function LearnPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  const entries = await db
    .select()
    .from(learningEntry)
    .where(eq(learningEntry.userId, session.user.id))
    .orderBy(desc(learningEntry.createdAt));

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-8 px-4 py-16">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Learning log</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Signed in as {session.user.email}
        </p>
        <SignOutButton />
      </div>

      <AddEntryForm />

      <ul className="flex flex-col gap-3 text-sm">
        {entries.length === 0 ? (
          <li className="text-zinc-500">No entries yet — add a note above.</li>
        ) : (
          entries.map((e) => (
            <li
              key={e.id}
              className="rounded-md border border-zinc-200 px-3 py-2 dark:border-zinc-700"
            >
              <p>{e.note}</p>
              <p className="mt-1 text-xs text-zinc-500">
                {e.createdAt?.toISOString?.() ?? String(e.createdAt)}
              </p>
            </li>
          ))
        )}
      </ul>
    </main>
  );
}
