"use client";

import { useRef, useCallback, useState, type RefObject } from "react";
import type { Roi } from "@/lib/api";

interface RoiEditorProps {
  roi: Roi | null;
  onChange: (r: Roi) => void;
  onSave: () => void;
  onReset: () => void;
  editing: boolean;
  imageRef: RefObject<HTMLImageElement | null>;
}

type DragMode = "move" | "nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w" | null;

const HANDLE_SIZE = 10;

function displayFromNative(nx: number, ny: number, img: HTMLImageElement) {
  return { x: nx * (img.clientWidth / img.naturalWidth), y: ny * (img.clientHeight / img.naturalHeight) };
}

function nativeFromDisplay(dx: number, dy: number, img: HTMLImageElement) {
  return { x: dx * (img.naturalWidth / img.clientWidth), y: dy * (img.naturalHeight / img.clientHeight) };
}

export function RoiEditor({ roi, onChange, onSave, onReset, editing, imageRef }: RoiEditorProps) {
  const [dragMode, setDragMode] = useState<DragMode>(null);
  const dragRef = useRef<{ startMx: number; startMy: number; startDx: number; startDy: number; startDw: number; startDh: number }>({ startMx: 0, startMy: 0, startDx: 0, startDy: 0, startDw: 0, startDh: 0 });

  const onPointerDown = useCallback((mode: DragMode, e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const img = imageRef.current;
    if (!img || !roi) return;
    const d = displayFromNative(roi.x, roi.y, img);
    dragRef.current = { startMx: e.clientX, startMy: e.clientY, startDx: d.x, startDy: d.y, startDw: roi.width * (img.clientWidth / img.naturalWidth), startDh: roi.height * (img.clientHeight / img.naturalHeight) };
    setDragMode(mode);
  }, [roi, imageRef]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragMode || !imageRef.current || !roi) return;
    const img = imageRef.current;
    const d = dragRef.current;
    const dx = (e.clientX - d.startMx) * (img.naturalWidth / img.clientWidth);
    const dy = (e.clientY - d.startMy) * (img.naturalHeight / img.clientHeight);
    const sdx = e.clientX - d.startMx;
    const sdy = e.clientY - d.startMy;
    let nx = roi.x, ny = roi.y, nw = roi.width, nh = roi.height;

    switch (dragMode) {
      case "move":
        nx = Math.max(0, roi.x + dx);
        ny = Math.max(0, roi.y + dy);
        break;
      case "se":
        nw = Math.max(20, d.startDw + sdx) * (img.naturalWidth / img.clientWidth);
        nh = Math.max(20, d.startDh + sdy) * (img.naturalHeight / img.clientHeight);
        break;
      case "sw":
        const swW = Math.max(20, d.startDw - sdx) * (img.naturalWidth / img.clientWidth);
        nx = roi.x + (d.startDw - swW * (img.clientWidth / img.naturalWidth)) * (img.naturalWidth / img.clientWidth);
        nw = swW;
        nh = Math.max(20, d.startDh + sdy) * (img.naturalHeight / img.clientHeight);
        break;
      case "ne":
        nw = Math.max(20, d.startDw + sdx) * (img.naturalWidth / img.clientWidth);
        const neH = Math.max(20, d.startDh - sdy) * (img.naturalHeight / img.clientHeight);
        ny = roi.y + (d.startDh - neH * (img.clientHeight / img.naturalHeight)) * (img.naturalHeight / img.clientHeight);
        nh = neH;
        break;
      case "nw":
        const nwW = Math.max(20, d.startDw - sdx) * (img.naturalWidth / img.clientWidth);
        nx = roi.x + (d.startDw - nwW * (img.clientWidth / img.naturalWidth)) * (img.naturalWidth / img.clientWidth);
        nw = nwW;
        const nwH = Math.max(20, d.startDh - sdy) * (img.naturalHeight / img.clientHeight);
        ny = roi.y + (d.startDh - nwH * (img.clientHeight / img.naturalHeight)) * (img.naturalHeight / img.clientHeight);
        nh = nwH;
        break;
      case "n":
        const nH = Math.max(20, d.startDh - sdy) * (img.naturalHeight / img.clientHeight);
        ny = roi.y + (d.startDh - nH * (img.clientHeight / img.naturalHeight)) * (img.naturalHeight / img.clientHeight);
        nh = nH;
        break;
      case "s":
        nh = Math.max(20, d.startDh + sdy) * (img.naturalHeight / img.clientHeight);
        break;
      case "w":
        const wW = Math.max(20, d.startDw - sdx) * (img.naturalWidth / img.clientWidth);
        nx = roi.x + (d.startDw - wW * (img.clientWidth / img.naturalWidth)) * (img.naturalWidth / img.clientWidth);
        nw = wW;
        break;
      case "e":
        nw = Math.max(20, d.startDw + sdx) * (img.naturalWidth / img.clientWidth);
        break;
    }
    onChange({ x: Math.round(nx), y: Math.round(ny), width: Math.round(nw), height: Math.round(nh) });
  }, [dragMode, roi, onChange, imageRef]);

  const onPointerUp = useCallback(() => {
    setDragMode(null);
  }, []);

  if (!editing || !roi || !imageRef.current || roi.width === 0) return null;

  const img = imageRef.current;
  const displayRoi = {
    x: roi.x * (img.clientWidth / img.naturalWidth),
    y: roi.y * (img.clientHeight / img.naturalHeight),
    width: roi.width * (img.clientWidth / img.naturalWidth),
    height: roi.height * (img.clientHeight / img.naturalHeight),
  };

  const h = (pos: string) => {
    const positions: Record<string, { left: number; top: number; cursor: string }> = {
      nw: { left: displayRoi.x - HANDLE_SIZE / 2, top: displayRoi.y - HANDLE_SIZE / 2, cursor: "nwse-resize" },
      n: { left: displayRoi.x + displayRoi.width / 2 - HANDLE_SIZE / 2, top: displayRoi.y - HANDLE_SIZE / 2, cursor: "ns-resize" },
      ne: { left: displayRoi.x + displayRoi.width - HANDLE_SIZE / 2, top: displayRoi.y - HANDLE_SIZE / 2, cursor: "nesw-resize" },
      e: { left: displayRoi.x + displayRoi.width - HANDLE_SIZE / 2, top: displayRoi.y + displayRoi.height / 2 - HANDLE_SIZE / 2, cursor: "ew-resize" },
      se: { left: displayRoi.x + displayRoi.width - HANDLE_SIZE / 2, top: displayRoi.y + displayRoi.height - HANDLE_SIZE / 2, cursor: "nwse-resize" },
      s: { left: displayRoi.x + displayRoi.width / 2 - HANDLE_SIZE / 2, top: displayRoi.y + displayRoi.height - HANDLE_SIZE / 2, cursor: "ns-resize" },
      sw: { left: displayRoi.x - HANDLE_SIZE / 2, top: displayRoi.y + displayRoi.height - HANDLE_SIZE / 2, cursor: "nesw-resize" },
      w: { left: displayRoi.x - HANDLE_SIZE / 2, top: displayRoi.y + displayRoi.height / 2 - HANDLE_SIZE / 2, cursor: "ew-resize" },
    };
    const p = positions[pos];
    return (
      <div
        key={pos}
        onPointerDown={(e) => onPointerDown(pos as DragMode, e)}
        className="absolute bg-green-400 border border-black rounded-sm z-10"
        style={{ width: HANDLE_SIZE, height: HANDLE_SIZE, left: p.left, top: p.top, cursor: p.cursor }}
      />
    );
  };

  return (
    <div className="absolute inset-0 z-10" onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} style={{ touchAction: "none" }}>
      <div
        onPointerDown={(e) => onPointerDown("move", e)}
        className="absolute border-2 border-green-400 opacity-40 cursor-move"
        style={{ left: displayRoi.x, top: displayRoi.y, width: displayRoi.width, height: displayRoi.height }}
      />
      <div
        className="absolute flex gap-2 -top-10 left-0 z-20"
      >
        <button onClick={onSave} className="px-2 py-1 text-[10px] bg-emerald-700 hover:bg-emerald-600 rounded font-medium transition-colors">Save</button>
        <button onClick={onReset} className="px-2 py-1 text-[10px] bg-red-800 hover:bg-red-700 rounded font-medium transition-colors">Reset</button>
      </div>
      {["nw", "n", "ne", "e", "se", "s", "sw", "w"].map(h)}
    </div>
  );
}
