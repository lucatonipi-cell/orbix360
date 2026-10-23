import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

export interface Viewer360Frame {
  thumbnailUrl: string;
  mediumUrl: string;
  largeUrl: string;
}

/** One horizontal ring of frames, captured at a given vertical angle. */
export interface Viewer360Row {
  id: string;
  label: string;
  frames: Viewer360Frame[];
}

export interface Viewer360Settings {
  autoRotate: boolean;
  rotateSpeed: "slow" | "normal" | "fast";
  zoomEnabled: boolean;
  fullscreenEnabled: boolean;
  controlsEnabled: boolean;
  background: string;
}

export interface Viewer360Props {
  /** Rows ordered top-to-bottom (or however the product defines its angles). */
  rows: Viewer360Row[];
  settings: Viewer360Settings;
  onInteraction?: (kind: "rotate" | "zoom" | "fullscreen" | "row-change") => void;
}

const SPEED_MS: Record<Viewer360Settings["rotateSpeed"], number> = {
  slow: 140,
  normal: 80,
  fast: 40,
};

const DRAG_PX_PER_FRAME = 6;
const DRAG_PX_PER_ROW = 55;
const AXIS_LOCK_PX = 6;

/** Picks the appropriate resolution for the current container width. */
function pickResolution(frame: Viewer360Frame, containerWidth: number): string {
  if (containerWidth <= 340) return frame.thumbnailUrl;
  if (containerWidth <= 1024) return frame.mediumUrl;
  return frame.largeUrl;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function Viewer360({ rows, settings, onInteraction }: Viewer360Props) {
  const nonEmptyRows = useMemo(() => rows.filter((r) => r.frames.length > 0), [rows]);
  const multiRow = nonEmptyRows.length > 1;

  const [rowIndex, setRowIndex] = useState(0);
  const [frameIndex, setFrameIndex] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [autoRotating, setAutoRotating] = useState(settings.autoRotate);
  const [zoom, setZoom] = useState(1);
  const [containerWidth, setContainerWidth] = useState(800);
  const [loadedCount, setLoadedCount] = useState(0);
  const [showHint, setShowHint] = useState(true);

  const stageRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{
    startX: number;
    startY: number;
    startFrameIndex: number;
    startRowIndex: number;
    axis: "x" | "y" | null;
    moved: boolean;
  } | null>(null);
  const autoRotateTimer = useRef<number | null>(null);

  const safeRowIndex = clamp(rowIndex, 0, Math.max(0, nonEmptyRows.length - 1));
  const currentRow = nonEmptyRows[safeRowIndex];
  const frames = currentRow?.frames ?? [];
  const frameCount = frames.length;
  const safeFrameIndex = frameCount > 0 ? ((frameIndex % frameCount) + frameCount) % frameCount : 0;

  // Measure container to choose the right resolution.
  useEffect(() => {
    if (!rootRef.current) return;
    const el = rootRef.current;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) setContainerWidth(width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Preload frames in a window around the current index, for the active row.
  useEffect(() => {
    const windowSize = 6;
    for (let d = -windowSize; d <= windowSize; d++) {
      const i = ((safeFrameIndex + d) % frameCount + frameCount) % frameCount;
      const frame = frames[i];
      if (!frame) continue;
      const img = new Image();
      img.src = pickResolution(frame, containerWidth);
    }
  }, [safeFrameIndex, frames, frameCount, containerWidth]);

  // Reset the "first frame loaded" flag whenever frames go from empty to
  // populated (e.g. right after the first image finishes uploading), or
  // when switching rows, so the loading indicator never gets stuck.
  useEffect(() => {
    setLoadedCount(0);
  }, [frameCount, safeRowIndex]);

  const stopAutoRotate = useCallback(() => {
    if (autoRotateTimer.current) {
      window.clearInterval(autoRotateTimer.current);
      autoRotateTimer.current = null;
    }
  }, []);

  const startAutoRotate = useCallback(() => {
    stopAutoRotate();
    const ms = SPEED_MS[settings.rotateSpeed];
    autoRotateTimer.current = window.setInterval(() => {
      setFrameIndex((i) => (i + 1) % frameCount);
    }, ms);
  }, [frameCount, settings.rotateSpeed, stopAutoRotate]);

  useEffect(() => {
    if (autoRotating && frameCount > 1) startAutoRotate();
    else stopAutoRotate();
    return stopAutoRotate;
  }, [autoRotating, startAutoRotate, stopAutoRotate, frameCount]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (frameCount <= 1 && !multiRow) return;
    setAutoRotating(false);
    setShowHint(false);
    setDragging(true);
    (e.target as Element).setPointerCapture(e.pointerId);
    dragState.current = {
      startX: e.clientX,
      startY: e.clientY,
      startFrameIndex: safeFrameIndex,
      startRowIndex: safeRowIndex,
      axis: null,
      moved: false,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const state = dragState.current;
    if (!state) return;
    const dx = e.clientX - state.startX;
    const dy = e.clientY - state.startY;

    if (!state.axis) {
      if (Math.abs(dx) < AXIS_LOCK_PX && Math.abs(dy) < AXIS_LOCK_PX) return;
      // Decide once which gesture this is: horizontal spin, or (only when
      // there's more than one row) vertical switch between angles.
      state.axis = multiRow && Math.abs(dy) > Math.abs(dx) ? "y" : "x";
      state.moved = true;
    }

    if (state.axis === "x") {
      const framesMoved = Math.trunc(dx / DRAG_PX_PER_FRAME);
      // Drag right -> decreasing order; drag left -> increasing order.
      let next = (state.startFrameIndex - framesMoved) % frameCount;
      if (next < 0) next += frameCount;
      if (next !== safeFrameIndex) {
        setFrameIndex(next);
        onInteraction?.("rotate");
      }
    } else {
      const rowsMoved = Math.trunc(dy / DRAG_PX_PER_ROW);
      const nextRow = clamp(state.startRowIndex + rowsMoved, 0, nonEmptyRows.length - 1);
      if (nextRow !== safeRowIndex) {
        // Keep the same angle-of-rotation proportionally when switching to a
        // ring with a different frame count, so the product doesn't appear
        // to jump to an unrelated angle.
        const startRowFrameCount = nonEmptyRows[state.startRowIndex]?.frames.length || 1;
        const fraction = state.startFrameIndex / startRowFrameCount;
        const nextRowFrameCount = nonEmptyRows[nextRow]?.frames.length || 1;
        const mappedFrame = Math.round(fraction * nextRowFrameCount) % nextRowFrameCount;
        setRowIndex(nextRow);
        setFrameIndex(mappedFrame);
        onInteraction?.("row-change");
      }
    }
  };

  const endDrag = () => {
    setDragging(false);
    dragState.current = null;
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!settings.zoomEnabled) return;
    e.preventDefault();
    setZoom((z) => {
      const next = Math.min(3, Math.max(1, z - e.deltaY * 0.0015));
      return next;
    });
    onInteraction?.("zoom");
  };

  const toggleFullscreen = () => {
    if (!settings.fullscreenEnabled || !rootRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      rootRef.current.requestFullscreen?.();
      onInteraction?.("fullscreen");
    }
  };

  const goToRow = (index: number) => {
    const clamped = clamp(index, 0, nonEmptyRows.length - 1);
    if (clamped === safeRowIndex) return;
    const startRowFrameCount = frameCount || 1;
    const fraction = safeFrameIndex / startRowFrameCount;
    const nextRowFrameCount = nonEmptyRows[clamped]?.frames.length || 1;
    setRowIndex(clamped);
    setFrameIndex(Math.round(fraction * nextRowFrameCount) % nextRowFrameCount);
    onInteraction?.("row-change");
  };

  const currentFrame = frames[safeFrameIndex];
  const src = currentFrame ? pickResolution(currentFrame, containerWidth) : undefined;

  if (nonEmptyRows.length === 0) {
    return (
      <div className="viewer360" style={{ ["--viewer-bg" as any]: settings.background }}>
        <div className="viewer360-loading">Sem frames 360º ainda.</div>
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className="viewer360"
      style={{ ["--viewer-bg" as any]: settings.background }}
    >
      <div
        ref={stageRef}
        className={`viewer360-stage${dragging ? " dragging" : ""}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onWheel={handleWheel}
      >
        {src && (
          <img
            src={src}
            draggable={false}
            alt="Produto em rotação 360º"
            style={{ transform: `scale(${zoom})` }}
            onLoad={() => setLoadedCount((c) => (c === 0 ? 1 : c))}
          />
        )}
      </div>

      {loadedCount === 0 && <div className="viewer360-loading">A carregar…</div>}

      {showHint && (frameCount > 1 || multiRow) && (
        <div className="viewer360-hint">
          {multiRow ? "Arrasta para rodar · desliza para mudar de ângulo" : "Arrasta para rodar"}
        </div>
      )}

      {multiRow && (
        <div className="viewer360-rows" title="Mudar de ângulo">
          {nonEmptyRows.map((row, i) => (
            <button
              key={row.id}
              type="button"
              className={`viewer360-row-dot${i === safeRowIndex ? " active" : ""}`}
              title={row.label}
              onClick={() => goToRow(i)}
            >
              <span className="viewer360-row-dot-inner" />
            </button>
          ))}
        </div>
      )}

      {settings.controlsEnabled && (
        <div className="viewer360-controls">
          <button
            type="button"
            title={autoRotating ? "Pausar" : "Rodar automaticamente"}
            onClick={() => setAutoRotating((v) => !v)}
          >
            {autoRotating ? "⏸" : "▶"}
          </button>
          {settings.zoomEnabled && (
            <>
              <button type="button" title="Reduzir zoom" onClick={() => setZoom((z) => Math.max(1, z - 0.3))}>
                −
              </button>
              <button type="button" title="Aumentar zoom" onClick={() => setZoom((z) => Math.min(3, z + 0.3))}>
                +
              </button>
            </>
          )}
          {settings.fullscreenEnabled && (
            <button type="button" title="Fullscreen" onClick={toggleFullscreen}>
              ⛶
            </button>
          )}
        </div>
      )}
    </div>
  );
}
