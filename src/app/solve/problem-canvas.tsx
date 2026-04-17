"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";

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

/** Eight presets: soft black first; coral + blue; brighter, cleaner hues (not pure #000 / primaries) */
const PEN_PRESETS = [
  { id: "ink", label: "黒", hex: "#252320" },
  { id: "coral", label: "コーラル", hex: "#F2694F" },
  { id: "blue", label: "ブルー", hex: "#4F94F7" },
  { id: "mint", label: "ミント", hex: "#52D598" },
  { id: "amber", label: "アンバー", hex: "#F2C24E" },
  { id: "violet", label: "バイオレット", hex: "#A387FF" },
  { id: "aqua", label: "アクア", hex: "#3DDBCF" },
  { id: "peach", label: "ピーチ", hex: "#FA9E7A" },
] as const;

const PEN_WIDTH_MIN = 1;
const PEN_WIDTH_MAX = 8;
const DEFAULT_PEN_HEX = PEN_PRESETS[0].hex;
const DEFAULT_PEN_WIDTH = 2;

const ERASER_WIDTH_MIN = 12;
const ERASER_WIDTH_MAX = 64;
const DEFAULT_ERASER_WIDTH = 32;

type ToolMode = "pen" | "eraser";

function isDrawingPointer(pointerType: string): boolean {
  return pointerType === "pen" || pointerType === "mouse";
}

function clearInkCanvas(ink: HTMLCanvasElement) {
  const ctx = ink.getContext("2d");
  if (!ctx) return;
  const cw = ink.clientWidth;
  const dpr = cw > 0 ? ink.width / cw : 1;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ink.width, ink.height);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.globalCompositeOperation = "source-over";
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

function ToolPanel(props: {
  toolMode: ToolMode;
  onToolMode: (m: ToolMode) => void;
  onClearAllInk: () => void;
  penHex: string;
  onPenHex: (hex: string) => void;
  penWidth: number;
  onPenWidth: (w: number) => void;
  eraserWidth: number;
  onEraserWidth: (w: number) => void;
}) {
  const {
    toolMode,
    onToolMode,
    onClearAllInk,
    penHex,
    onPenHex,
    penWidth,
    onPenWidth,
    eraserWidth,
    onEraserWidth,
  } = props;

  return (
    <div
      className="pointer-events-auto absolute left-3 top-1/2 z-20 w-[10.5rem] -translate-y-1/2 overflow-hidden rounded-xl border border-zinc-200/90 bg-[#faf7ee]/95 shadow-md ring-1 ring-black/5 backdrop-blur-sm"
      role="toolbar"
      aria-label="描画ツール"
    >
      <p className="border-b border-zinc-200/80 px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
        ツール
      </p>

      <div
        className="flex flex-col gap-px bg-zinc-200/70 p-px"
        role="group"
        aria-label="ツールの種類"
      >
        <button
          type="button"
          aria-pressed={toolMode === "pen"}
          onClick={() => onToolMode("pen")}
          className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[0.8rem] font-medium transition ${
            toolMode === "pen"
              ? "bg-[#faf7ee] text-zinc-900 shadow-[inset_3px_0_0_0] shadow-zinc-700"
              : "bg-zinc-100/90 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-800"
          }`}
        >
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-zinc-300/80 bg-[#faf7ee] shadow-sm"
            aria-hidden
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              className="text-zinc-800"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M4 20h4l10.5-10.5a2.121 2.121 0 0 0-3-3L5 17v3z" />
              <path d="m13.5 6.5 4 4" />
            </svg>
          </span>
          ペン
        </button>
        <button
          type="button"
          aria-pressed={toolMode === "eraser"}
          onClick={() => onToolMode("eraser")}
          className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[0.8rem] font-medium transition ${
            toolMode === "eraser"
              ? "bg-[#faf7ee] text-zinc-900 shadow-[inset_3px_0_0_0] shadow-zinc-700"
              : "bg-zinc-100/90 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-800"
          }`}
        >
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-zinc-300/80 bg-[#faf7ee] shadow-sm"
            aria-hidden
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              className="text-zinc-700"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" />
              <path d="M22 21H7" />
              <path d="m5 11 9 9" />
            </svg>
          </span>
          消しゴム
        </button>
        <button
          type="button"
          aria-label="すべてのインクを消去"
          onClick={() => onClearAllInk()}
          className="flex w-full items-center gap-2.5 bg-zinc-100/90 px-3 py-2.5 text-left text-[0.8rem] font-medium text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-800"
        >
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-zinc-300/80 bg-[#faf7ee] shadow-sm"
            aria-hidden
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              className="text-zinc-600"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              <line x1="10" x2="10" y1="11" y2="17" />
              <line x1="14" x2="14" y1="11" y2="17" />
            </svg>
          </span>
          全消し
        </button>
      </div>

      <div
        className="border-t border-zinc-200/90 bg-zinc-50/70 px-3 py-3"
        role="region"
        aria-label={
          toolMode === "pen" ? "ペンのオプション" : "消しゴムのオプション"
        }
      >
        <p className="mb-2 text-[0.6rem] font-semibold tracking-wide text-zinc-500">
          {toolMode === "pen" ? "ペンのオプション" : "消しゴムのオプション"}
        </p>

        {toolMode === "pen" ? (
          <>
            <label className="mb-3 flex flex-col gap-1">
              <span className="text-[0.65rem] font-medium text-zinc-600">
                太さ
              </span>
              <input
                type="range"
                min={PEN_WIDTH_MIN}
                max={PEN_WIDTH_MAX}
                step={1}
                value={penWidth}
                onChange={(e) => onPenWidth(Number(e.target.value))}
                className="h-2 w-full cursor-pointer accent-zinc-700"
              />
              <span className="text-center text-[0.65rem] tabular-nums text-zinc-500">
                {penWidth}px
              </span>
            </label>

            <p className="mb-1.5 text-[0.65rem] font-medium text-zinc-600">色</p>
            <div
              className="grid grid-cols-4 gap-2"
              role="group"
              aria-label="ペンの色"
            >
              {PEN_PRESETS.map((p) => {
                const selected = penHex === p.hex;
                return (
                  <button
                    key={p.id}
                    type="button"
                    title={p.label}
                    aria-label={p.label}
                    aria-pressed={selected}
                    onClick={() => onPenHex(p.hex)}
                    className={`relative h-7 w-7 rounded-full ring-2 ring-offset-2 ring-offset-zinc-50 transition ${
                      selected
                        ? "ring-zinc-700"
                        : "ring-transparent hover:ring-zinc-300"
                    } `}
                    style={{ backgroundColor: p.hex }}
                  />
                );
              })}
            </div>
          </>
        ) : (
          <label className="flex flex-col gap-1">
            <span className="text-[0.65rem] font-medium text-zinc-600">
              太さ
            </span>
            <input
              type="range"
              min={ERASER_WIDTH_MIN}
              max={ERASER_WIDTH_MAX}
              step={1}
              value={eraserWidth}
              onChange={(e) => onEraserWidth(Number(e.target.value))}
              className="h-2 w-full cursor-pointer accent-zinc-700"
            />
            <span className="text-center text-[0.65rem] tabular-nums text-zinc-500">
              {eraserWidth}px
            </span>
          </label>
        )}
      </div>
    </div>
  );
}

const DEFAULT_PROBLEM_TEXT =
  "次の式を因数分解してください：x² − 5x + 6";

function ProblemHud(props: { text: string }) {
  return (
    <div
      className="pointer-events-none absolute left-1/2 top-20 z-20 w-[min(90vw,28rem)] -translate-x-1/2"
      role="status"
      aria-live="polite"
    >
      <div className="overflow-hidden rounded-xl border-2 border-zinc-800/70 bg-[#faf7ee]/95 shadow-md ring-1 ring-black/5 backdrop-blur-sm">
        <p className="px-5 py-4 text-center text-lg font-medium leading-snug text-zinc-900">
          {props.text}
        </p>
      </div>
    </div>
  );
}

export type ProblemCanvasProps = {
  problemText?: string;
};

export function ProblemCanvas({
  problemText = DEFAULT_PROBLEM_TEXT,
}: ProblemCanvasProps = {}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLCanvasElement>(null);
  const inkRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const lastRef = useRef<{ x: number; y: number } | null>(null);

  const [penHex, setPenHex] = useState<string>(DEFAULT_PEN_HEX);
  const [penWidth, setPenWidth] = useState(DEFAULT_PEN_WIDTH);
  const [toolMode, setToolMode] = useState<ToolMode>("pen");
  const [eraserWidth, setEraserWidth] = useState(DEFAULT_ERASER_WIDTH);
  const [eraserCursor, setEraserCursor] = useState<{
    x: number;
    y: number;
  } | null>(null);

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

  const clearAllInk = useCallback(() => {
    const ink = inkRef.current;
    if (!ink) return;
    drawingRef.current = false;
    lastRef.current = null;
    setEraserCursor(null);
    clearInkCanvas(ink);
    setToolMode("pen");
  }, []);

  const updateEraserCursorFromEvent = (
    e: React.PointerEvent<HTMLCanvasElement>,
  ) => {
    if (toolMode !== "eraser" || !isDrawingPointer(e.pointerType)) return;
    const ink = inkRef.current;
    if (!ink) return;
    const rect = ink.getBoundingClientRect();
    setEraserCursor({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

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

    if (toolMode === "pen") {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = penHex;
      ctx.lineWidth = penWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      lastRef.current = { x, y };
    } else {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
      ctx.fillStyle = "rgba(0,0,0,1)";
      ctx.lineWidth = eraserWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.arc(x, y, eraserWidth / 2, 0, Math.PI * 2);
      ctx.fill();
      lastRef.current = { x, y };
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    updateEraserCursorFromEvent(e);

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

    if (toolMode === "pen") {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = penHex;
      ctx.lineWidth = penWidth;
    } else {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
      ctx.lineWidth = eraserWidth;
    }
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
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
    const ctx = inkRef.current?.getContext("2d");
    if (ctx) ctx.globalCompositeOperation = "source-over";
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
        onPointerEnter={(e) => updateEraserCursorFromEvent(e)}
        onPointerMove={onPointerMove}
        onPointerUp={endStroke}
        onPointerCancel={endStroke}
        onPointerLeave={(e) => {
          if (e.buttons === 0) endStroke(e);
          if (toolMode === "eraser" && e.buttons === 0) {
            setEraserCursor(null);
          }
        }}
      />
      <ProblemHud text={problemText} />
      {toolMode === "eraser" && eraserCursor != null ? (
        <div
          className="pointer-events-none absolute z-[15] rounded-full border border-zinc-500/30 bg-transparent"
          style={{
            left: eraserCursor.x - eraserWidth / 2,
            top: eraserCursor.y - eraserWidth / 2,
            width: eraserWidth,
            height: eraserWidth,
            boxSizing: "border-box",
          }}
          aria-hidden
        />
      ) : null}
      <ToolPanel
        toolMode={toolMode}
        onToolMode={(m) => {
          setToolMode(m);
          if (m === "pen") setEraserCursor(null);
        }}
        onClearAllInk={clearAllInk}
        penHex={penHex}
        onPenHex={setPenHex}
        penWidth={penWidth}
        onPenWidth={setPenWidth}
        eraserWidth={eraserWidth}
        onEraserWidth={setEraserWidth}
      />
    </div>
  );
}
