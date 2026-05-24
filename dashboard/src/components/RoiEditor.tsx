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

function getRenderBounds(img: HTMLImageElement) {
  const ir = img.naturalWidth / img.naturalHeight;
  const cr = img.clientWidth / img.clientHeight;
  let renderWidth: number, renderHeight: number, offsetX: number, offsetY: number;
  if (ir > cr) {
    renderWidth = img.clientWidth;
    renderHeight = img.clientWidth / ir;
    offsetX = 0;
    offsetY = (img.clientHeight - renderHeight) / 2;
  } else {
    renderHeight = img.clientHeight;
    renderWidth = img.clientHeight * ir;
    offsetX = (img.clientWidth - renderWidth) / 2;
    offsetY = 0;
  }
  return { renderWidth, renderHeight, offsetX, offsetY };
}

function displayFromNative(nx: number, ny: number, img: HTMLImageElement) {
  const { renderWidth, renderHeight, offsetX, offsetY } = getRenderBounds(img);
  return { x: offsetX + nx * (renderWidth / img.naturalWidth), y: offsetY + ny * (renderHeight / img.naturalHeight) };
}

function nativeFromDisplay(dx: number, dy: number, img: HTMLImageElement) {
  const { renderWidth, renderHeight, offsetX, offsetY } = getRenderBounds(img);
  return { x: (dx - offsetX) * (img.naturalWidth / renderWidth), y: (dy - offsetY) * (img.naturalHeight / renderHeight) };
}

function clampRoi(roi: { x: number; y: number; width: number; height: number }, img: HTMLImageElement) {
  return {
    x: Math.max(0, Math.min(roi.x, img.naturalWidth - 20)),
    y: Math.max(0, Math.min(roi.y, img.naturalHeight - 20)),
    width: Math.max(20, Math.min(roi.width, img.naturalWidth - roi.x)),
    height: Math.max(20, Math.min(roi.height, img.naturalHeight - roi.y)),
  };
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
    const { renderWidth, renderHeight } = getRenderBounds(img);
    dragRef.current = {
      startMx: e.clientX, startMy: e.clientY,
      startDx: d.x, startDy: d.y,
      startDw: roi.width * (renderWidth / img.naturalWidth),
      startDh: roi.height * (renderHeight / img.naturalHeight),
    };
    setDragMode(mode);
  }, [roi, imageRef]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragMode || !imageRef.current || !roi) return;
    const img = imageRef.current;
    const { renderWidth, renderHeight } = getRenderBounds(img);
    const d = dragRef.current;
    const sdx = e.clientX - d.startMx;
    const sdy = e.clientY - d.startMy;
    const scaleX = img.naturalWidth / renderWidth;
    const scaleY = img.naturalHeight / renderHeight;
    let nx = roi.x, ny = roi.y, nw = roi.width, nh = roi.height;

    switch (dragMode) {
      case "move":
        nx = roi.x + sdx * scaleX;
        ny = roi.y + sdy * scaleY;
        break;
      case "se":
        nw = Math.max(20, d.startDw + sdx) * scaleX;
        nh = Math.max(20, d.startDh + sdy) * scaleY;
        break;
      case "sw":
        nw = Math.max(20, d.startDw - sdx) * scaleX;
        nx = roi.x + (roi.width - nw);
        nh = Math.max(20, d.startDh + sdy) * scaleY;
        break;
      case "ne":
        nw = Math.max(20, d.startDw + sdx) * scaleX;
        nh = Math.max(20, d.startDh - sdy) * scaleY;
        ny = roi.y + (roi.height - nh);
        break;
      case "nw":
        nw = Math.max(20, d.startDw - sdx) * scaleX;
        nx = roi.x + (roi.width - nw);
        nh = Math.max(20, d.startDh - sdy) * scaleY;
        ny = roi.y + (roi.height - nh);
        break;
      case "n":
        nh = Math.max(20, d.startDh - sdy) * scaleY;
        ny = roi.y + (roi.height - nh);
        break;
      case "s":
        nh = Math.max(20, d.startDh + sdy) * scaleY;
        break;
      case "w":
        nw = Math.max(20, d.startDw - sdx) * scaleX;
        nx = roi.x + (roi.width - nw);
        break;
      case "e":
        nw = Math.max(20, d.startDw + sdx) * scaleX;
        break;
    }
    const clamped = clampRoi({ x: Math.round(nx), y: Math.round(ny), width: Math.round(nw), height: Math.round(nh) }, img);
    onChange(clamped);
  }, [dragMode, roi, onChange, imageRef]);

  const onPointerUp = useCallback(() => {
    setDragMode(null);
  }, []);

  if (!editing || !roi || !imageRef.current || roi.width === 0) return null;

  const img = imageRef.current;
  const { renderWidth, renderHeight, offsetX, offsetY } = getRenderBounds(img);
  const displayRoi = {
    x: offsetX + roi.x * (renderWidth / img.naturalWidth),
    y: offsetY + roi.y * (renderHeight / img.naturalHeight),
    width: roi.width * (renderWidth / img.naturalWidth),
    height: roi.height * (renderHeight / img.naturalHeight),
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
