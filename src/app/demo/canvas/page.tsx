import Link from "next/link";
import { CanvasDemo } from "./canvas-demo";

export default function CanvasDemoPage() {
  return (
    <main className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-16">
      <Link
        href="/"
        className="text-sm font-medium text-zinc-600 underline dark:text-zinc-400"
      >
        ← Home
      </Link>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Canvas demo</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          A minimal rAF loop drawing a moving dot — placeholder for game-like
          UI.
        </p>
      </div>
      <CanvasDemo />
    </main>
  );
}
