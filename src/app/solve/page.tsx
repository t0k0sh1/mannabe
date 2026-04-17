import Link from "next/link";
import { ProblemCanvas } from "./problem-canvas";

export default function SolvePage() {
  return (
    <div className="fixed inset-0 overflow-hidden overscroll-none bg-[#faf7ee]">
      <ProblemCanvas />
      <Link
        href="/"
        className="absolute left-3 top-3 z-10 rounded-md bg-[#faf7ee]/90 px-2 py-1 text-sm font-medium text-zinc-700 shadow-sm ring-1 ring-zinc-200/80 backdrop-blur-sm hover:bg-[#f4f1e8]"
      >
        ← Home
      </Link>
    </div>
  );
}
