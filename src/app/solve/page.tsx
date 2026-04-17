import { AppHeader } from "@/components/app-header";
import { ProblemCanvas } from "./problem-canvas";

export default function SolvePage() {
  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden overscroll-none bg-[#faf7ee]">
      <AppHeader fallbackHref="/" />
      <div className="relative min-h-0 flex-1">
        <ProblemCanvas />
      </div>
    </div>
  );
}
