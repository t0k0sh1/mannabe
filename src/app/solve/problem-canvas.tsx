"use client";

import { useCallback, useLayoutEffect, useRef } from "react";

/** Visual tuning — minor (1 cell) < mid (5) < major (10) */
const PAPER_COLOR = "#faf7ee";
const CELL_PX = 20;
const MINOR_LINE_RGBA = "rgba(95, 88, 78, 0.11)";
const MINOR_LINE_WIDTH_CSS = 1;
const MID_LINE_RGBA = "rgba(82, 75, 65, 0.155)";
const MID_LINE_WIDTH_CSS = 1;
const MAJOR_LINE_RGBA = "rgba(75, 68, 58, 0.24)";
const MAJOR_LINE_WIDTH_CSS = 1.25;
const MID_EVERY_CELLS = 5;
const MAJOR_EVERY_CELLS = 10;

function gridStrokeForCellIndex(cellIndex: number): {
  strokeStyle: string;
  lineWidth: number;
} {
  if (cellIndex % MAJOR_EVERY_CELLS === 0) {
    return { strokeStyle: MAJOR_LINE_RGBA, lineWidth: MAJOR_LINE_WIDTH_CSS };
  }
  if (cellIndex % MID_EVERY_CELLS === 0) {
    return { strokeStyle: MID_LINE_RGBA, lineWidth: MID_LINE_WIDTH_CSS };
  }
  return { strokeStyle: MINOR_LINE_RGBA, lineWidth: MINOR_LINE_WIDTH_CSS };
}

const INK_COLOR = "#1a1814";
const INK_LINE_WIDTH_CSS = 2;

function isDrawingPointer(pointerType: string): boolean {
  return pointerType === "pen" || pointerType === "mouse";
}

function resizeCanvases(
  gridCanvas: HTMLCanvasElement,
  inkCanvas: HTMLCanvasElement,
  container: HTMLElement,
) {
  const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  const w = container.clientWidth;
  const h = container.clientHeight;

  for (const c of [gridCanvas, inkCanvas]) {
    c.style.width = `${w}px`;
    c.style.height = `${h}px`;
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
  }

  const g = gridCanvas.getContext("2d");
  if (!g) return;

  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.fillStyle = PAPER_COLOR;
  g.fillRect(0, 0, w, h);

  for (let x = 0; x <= w; x += CELL_PX) {
    const cellIndex = Math.round(x / CELL_PX);
    const { strokeStyle, lineWidth } = gridStrokeForCellIndex(cellIndex);
    g.beginPath();
    g.strokeStyle = strokeStyle;
    g.lineWidth = lineWidth;
    g.moveTo(x + 0.5, 0);
    g.lineTo(x + 0.5, h);
    g.stroke();
  }

  for (let y = 0; y <= h; y += CELL_PX) {
    const cellIndex = Math.round(y / CELL_PX);
    const { strokeStyle, lineWidth } = gridStrokeForCellIndex(cellIndex);
    g.beginPath();
    g.strokeStyle = strokeStyle;
    g.lineWidth = lineWidth;
    g.moveTo(0, y + 0.5);
    g.lineTo(w, y + 0.5);
    g.stroke();
  }

  const ink = inkCanvas.getContext("2d");
  if (ink) {
    ink.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
}

export function ProblemCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLCanvasElement>(null);
  const inkRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const lastRef = useRef<{ x: number; y: number } | null>(null);

  const syncSize = useCallback(() => {
    const container = containerRef.current;
    const grid = gridRef.current;
    const ink = inkRef.current;
    if (!container || !grid || !ink) return;
    resizeCanvases(grid, ink, container);
  }, []);

  useLayoutEffect(() => {
    syncSize();
    const ro = new ResizeObserver(() => syncSize());
    const el = containerRef.current;
    if (el) ro.observe(el);
    window.addEventListener("resize", syncSize);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", syncSize);
    };
  }, [syncSize]);

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingPointer(e.pointerType)) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;

    e.preventDefault();
    const ink = inkRef.current;
    if (!ink) return;

    ink.setPointerCapture(e.pointerId);
    drawingRef.current = true;

    const rect = ink.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = ink.getContext("2d");
    if (!ctx) return;
    ctx.strokeStyle = INK_COLOR;
    ctx.lineWidth = INK_LINE_WIDTH_CSS;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    lastRef.current = { x, y };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || !isDrawingPointer(e.pointerType)) return;
    e.preventDefault();

    const ink = inkRef.current;
    const ctx = ink?.getContext("2d");
    if (!ink || !ctx) return;

    const rect = ink.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const last = lastRef.current;
    if (!last) return;
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    lastRef.current = { x, y };
  };

  const endStroke = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    if (!isDrawingPointer(e.pointerType)) return;
    drawingRef.current = false;
    lastRef.current = null;
    try {
      inkRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore if not captured */
    }
  };

  return (
    <div ref={containerRef} className="absolute inset-0">
      <canvas
        ref={gridRef}
        className="pointer-events-none absolute inset-0 block h-full w-full"
        aria-hidden
      />
      <canvas
        ref={inkRef}
        className="absolute inset-0 block h-full w-full touch-none"
        style={{ touchAction: "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endStroke}
        onPointerCancel={endStroke}
        onPointerLeave={(e) => {
          if (e.buttons === 0) endStroke(e);
        }}
      />
    </div>
  );
}
