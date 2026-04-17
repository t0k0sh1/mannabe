"use client";

import { useEffect, useRef } from "react";

export function CanvasDemo() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frame = 0;
    let raf = 0;

    const loop = (t: number) => {
      const { width, height } = canvas;
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, width, height);

      const x = width / 2 + Math.sin(t * 0.002) * (width / 3);
      const y = height / 2 + Math.cos(t * 0.0025) * (height / 4);

      ctx.beginPath();
      ctx.fillStyle = "#22c55e";
      ctx.arc(x, y, 10, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#a1a1aa";
      ctx.font = "12px system-ui";
      ctx.fillText(`frame ${frame++}`, 8, 16);

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={ref}
      width={320}
      height={200}
      className="rounded-md border border-zinc-300 dark:border-zinc-600"
    />
  );
}
