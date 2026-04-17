"use client";

import {
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

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

const DEFAULT_PROBLEM_TEXT = "15 + 28";

/** First line only; if it contains `=`, use the part before `=` (legacy-friendly). */
function problemStemFromProp(text: string): string {
  const first = text.split(/\r?\n/)[0] ?? "";
  const eq = first.indexOf("=");
  const stem = (eq >= 0 ? first.slice(0, eq) : first).trim();
  return stem;
}

/**
 * Character columns for the answer (true result digits + 1).
 * Actual input width is `calc(Nch + gutter)` so padding/border don’t eat glyph space.
 */
function answerInputWidthCh(stem: string): number {
  const t = stem.trim();
  const add = /^(\d+)\s*\+\s*(\d+)$/.exec(t);
  if (add) {
    const n = Number(add[1]) + Number(add[2]);
    return Math.min(16, Math.max(2, String(n).length + 1));
  }
  const sub = /^(\d+)\s*-\s*(\d+)$/.exec(t);
  if (sub) {
    const n = Math.abs(Number(sub[1]) - Number(sub[2]));
    return Math.min(16, Math.max(2, String(n).length + 1));
  }
  const mul = /^(\d+)\s*[×*]\s*(\d+)$/.exec(t);
  if (mul) {
    const n = Number(mul[1]) * Number(mul[2]);
    return Math.min(16, Math.max(2, String(n).length + 1));
  }
  const nums = t.match(/\d+/g);
  if (nums?.length) {
    const maxLen = Math.max(...nums.map((x) => x.length));
    return Math.min(16, Math.max(2, maxLen + 2));
  }
  return 4;
}

/** Horizontal space outside the `ch` track (padding + border) so 2+ digits fit. */
const ANSWER_INPUT_WIDTH_GUTTER = "2.25rem";

/** Use in `keypadRows` for a backspace key (label shown as ⌫). */
export const KEYPAD_BACKSPACE = "__backspace__";
/** Use in `keypadRows` to clear the whole answer (label shown as C). */
export const KEYPAD_CLEAR = "__clear__";

const DEFAULT_KEYPAD_ROWS: string[][] = [
  ["7", "8", "9"],
  ["4", "5", "6"],
  ["1", "2", "3"],
  ["0", KEYPAD_BACKSPACE],
];

function keypadButtonLabel(cell: string): string {
  if (cell === KEYPAD_BACKSPACE) return "⌫";
  if (cell === KEYPAD_CLEAR) return "C";
  return cell;
}

function ProblemTenkey(props: {
  rows: string[][];
  onKey: (cell: string) => void;
}) {
  return (
    <div
      role="group"
      aria-label="テンキー"
      className="mt-2 rounded-xl border border-zinc-300/80 bg-zinc-100/70 p-2 shadow-inner"
    >
      {props.rows.map((row, ri) => (
        <div
          key={ri}
          className="mb-2 flex flex-wrap justify-center gap-2 last:mb-0"
        >
          {row.map((cell, ci) => (
            <button
              key={`${ri}-${ci}-${cell}`}
              type="button"
              className="min-h-[3.25rem] min-w-[4.25rem] touch-manipulation rounded-xl border border-zinc-400/80 bg-[#faf7ee] px-3 text-2xl font-semibold tabular-nums text-zinc-900 shadow-sm active:scale-[0.97] active:bg-zinc-200/90 sm:min-w-[4.5rem] sm:text-[1.65rem]"
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => props.onKey(cell)}
            >
              {keypadButtonLabel(cell)}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

function ProblemHud(props: {
  text: string;
  answer: string;
  onAnswerChange: (value: string) => void;
  onSubmitAnswer?: (answer: string) => void;
  keypadRows: string[][];
  digitOnlyAnswer: boolean;
}) {
  const answerId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [tenkeyVisible, setTenkeyVisible] = useState(false);
  const stem = problemStemFromProp(props.text);
  const answerWidthCh = answerInputWidthCh(stem);

  const normalize = useCallback(
    (v: string) => {
      if (!props.digitOnlyAnswer) return v;
      return v.normalize("NFKC").replace(/\D/g, "");
    },
    [props.digitOnlyAnswer],
  );

  const insertAtCursor = (raw: string) => {
    const chunk = normalize(raw);
    if (!chunk) return;
    const el = inputRef.current;
    if (!el) {
      props.onAnswerChange(normalize(props.answer + chunk));
      return;
    }
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const merged = props.answer.slice(0, start) + chunk + props.answer.slice(end);
    const next = normalize(merged);
    props.onAnswerChange(next);
    const newPos = start + chunk.length;
    requestAnimationFrame(() => {
      el.focus();
      const pos = Math.min(newPos, next.length);
      el.setSelectionRange(pos, pos);
    });
  };

  const backspaceAtCursor = () => {
    const el = inputRef.current;
    if (!el) {
      props.onAnswerChange(normalize(props.answer.slice(0, -1)));
      return;
    }
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    if (start !== end) {
      const next = normalize(
        props.answer.slice(0, start) + props.answer.slice(end),
      );
      props.onAnswerChange(next);
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(start, start);
      });
    } else if (start > 0) {
      const next = normalize(
        props.answer.slice(0, start - 1) + props.answer.slice(end),
      );
      props.onAnswerChange(next);
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(start - 1, start - 1);
      });
    }
  };

  const clearAnswer = () => {
    props.onAnswerChange("");
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const onKeypadKey = (cell: string) => {
    if (cell === KEYPAD_BACKSPACE) backspaceAtCursor();
    else if (cell === KEYPAD_CLEAR) clearAnswer();
    else insertAtCursor(cell);
  };

  const normalizedAnswer = normalize(props.answer);
  const canSubmit = props.digitOnlyAnswer
    ? normalizedAnswer.length > 0
    : props.answer.trim().length > 0;

  const submitAnswer = () => {
    if (!canSubmit) return;
    props.onSubmitAnswer?.(
      props.digitOnlyAnswer ? normalizedAnswer : props.answer.trim(),
    );
  };

  return (
    <div className="pointer-events-auto absolute left-1/2 top-12 z-30 w-[min(90vw,28rem)] -translate-x-1/2">
      <div className="overflow-hidden rounded-xl border-2 border-zinc-800/70 bg-[#faf7ee]/95 px-4 py-4 shadow-md ring-1 ring-black/5 backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-center gap-x-2 text-center text-zinc-900">
          <span className="text-4xl font-medium leading-snug tabular-nums">
            {stem}
          </span>
          <span className="text-4xl font-medium leading-snug" aria-hidden>
            {"="}
          </span>
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              id={answerId}
              type="text"
              inputMode={props.digitOnlyAnswer ? "numeric" : "text"}
              value={props.answer}
              onChange={(e) => props.onAnswerChange(normalize(e.target.value))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submitAnswer();
                }
              }}
              onFocus={() => setTenkeyVisible(true)}
              onBlur={() => setTenkeyVisible(false)}
              autoComplete="off"
              spellCheck={false}
              aria-label="答え"
              style={{
                width: `calc(${answerWidthCh}ch + ${ANSWER_INPUT_WIDTH_GUTTER})`,
              }}
              className="box-border h-12 shrink-0 rounded-md border border-zinc-300/90 bg-[#faf7ee]/80 px-2 text-right text-4xl font-medium tabular-nums leading-none text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-400"
            />
            <button
              type="button"
              disabled={!canSubmit}
              onClick={submitAnswer}
              className="inline-flex h-12 shrink-0 items-center justify-center rounded-md border border-zinc-700 bg-zinc-800 px-5 text-lg font-semibold text-[#faf7ee] shadow-sm transition hover:bg-zinc-700 disabled:pointer-events-none disabled:border-zinc-300 disabled:bg-zinc-200 disabled:text-zinc-400"
            >
              回答
            </button>
          </div>
        </div>
        {tenkeyVisible ? (
          <ProblemTenkey rows={props.keypadRows} onKey={onKeypadKey} />
        ) : null}
      </div>
    </div>
  );
}

export type ProblemCanvasProps = {
  problemText?: string;
  /** Keypad layout per problem: each row is a list of key labels, or KEYPAD_* tokens. */
  keypadRows?: string[][];
  /** When true, only ASCII digits are kept (handwriting / paste included). */
  digitOnlyAnswer?: boolean;
  /** Called when the user submits an answer (button or Enter). */
  onSubmitAnswer?: (answer: string) => void;
};

export function ProblemCanvas({
  problemText = DEFAULT_PROBLEM_TEXT,
  keypadRows = DEFAULT_KEYPAD_ROWS,
  digitOnlyAnswer = true,
  onSubmitAnswer,
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
  const [answer, setAnswer] = useState("");

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
    if (e.pointerType === "mouse" && e.button !== 0) return;

    if (!isDrawingPointer(e.pointerType)) return;

    const active = document.activeElement;
    if (active instanceof HTMLElement) {
      active.blur();
    }

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
        className="absolute inset-0 z-10 block h-full w-full touch-none"
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
      <ProblemHud
        text={problemText}
        answer={answer}
        onAnswerChange={setAnswer}
        onSubmitAnswer={onSubmitAnswer}
        keypadRows={keypadRows}
        digitOnlyAnswer={digitOnlyAnswer}
      />
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
