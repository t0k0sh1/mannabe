import Link from "next/link";
import { SignInForm } from "./sign-in-form";

export default function SignInPage() {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
      <SignInForm />
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        No account?{" "}
        <Link className="font-medium underline" href="/sign-up">
          Sign up
        </Link>
      </p>
    </main>
  );
}
