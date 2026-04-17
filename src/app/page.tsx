import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex max-w-lg flex-col gap-8 px-4 py-20">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Mannabe</h1>
        <p className="text-muted-foreground mt-2 text-zinc-600 dark:text-zinc-400">
          Game-like learning with per-user progress stored in Postgres.
        </p>
      </div>
      <ul className="flex flex-col gap-3 text-sm">
        <li>
          <Link className="font-medium text-zinc-900 underline dark:text-zinc-100" href="/sign-up">
            Sign up
          </Link>
        </li>
        <li>
          <Link className="font-medium text-zinc-900 underline dark:text-zinc-100" href="/sign-in">
            Sign in
          </Link>
        </li>
        <li>
          <Link className="font-medium text-zinc-900 underline dark:text-zinc-100" href="/learn">
            Learning demo (protected)
          </Link>
        </li>
        <li>
          <Link className="font-medium text-zinc-900 underline dark:text-zinc-100" href="/demo/canvas">
            Canvas demo
          </Link>
        </li>
      </ul>
    </main>
  );
}
