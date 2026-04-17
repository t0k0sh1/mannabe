"use client";

import { useRouter } from "next/navigation";

type AppHeaderProps = {
  /** When there is no usable history entry, navigate here instead. */
  fallbackHref?: string;
};

export function AppHeader({ fallbackHref = "/" }: AppHeaderProps) {
  const router = useRouter();

  return (
    <header className="flex h-9 shrink-0 items-center border-b border-[#c9bfb0]/45 bg-[#ebe3d6] px-1.5 shadow-[inset_0_-1px_0_rgba(255,255,255,0.35)]">
      <button
        type="button"
        onClick={() => {
          if (typeof window !== "undefined" && window.history.length > 1) {
            router.back();
          } else {
            router.push(fallbackHref);
          }
        }}
        className="flex size-8 items-center justify-center rounded-md text-stone-600/90 transition-colors hover:bg-stone-600/12"
        aria-label="Go back"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
    </header>
  );
}
