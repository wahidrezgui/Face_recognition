"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { enrollWithWebcam, enrollFromSystemCamera, detectPose } from "@/lib/api";
import { ZONES, FRAMES_PER_ZONE, CAPTURE_MS, POSE_POLL_MS } from "@/components/CaptureRing";

type Phase = "idle" | "scanning" | "processing" | "done" | "error";

interface EnrollResult {
  accepted: number;
  rejected: { attempt: number; reason: string }[];
}

export function usePoseDetection(personId: string, onComplete?: () => void) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const captureRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const poseRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const framesRef = useRef<string[]>([]);
  const zoneIdxRef = useRef(0);
  const zoneFrmRef = useRef(0);
  const inZoneRef = useRef(false);
  const pendingPose = useRef(false);

  const [phase, setPhase] = useState<Phase>("idle");
  const [zoneIdx, setZoneIdx] = useState(0);
  const [zoneFrames, setZoneFrames] = useState(0);
  const [inZone, setInZone] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enrollResult, setEnrollResult] = useState<EnrollResult | null>(null);

  const stopAll = useCallback(() => {
    if (captureRef.current) { clearInterval(captureRef.current); captureRef.current = null; }
    if (poseRef.current) { clearInterval(poseRef.current); poseRef.current = null; }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return null;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    ctx.restore();
    return canvas.toDataURL("image/jpeg", 0.85);
  }, []);

  const submit = useCallback(async (frames: string[]) => {
    setPhase("processing");
    stopAll();
    try {
      const result = await enrollWithWebcam(personId, frames);
      setEnrollResult(result);
      setPhase("done");
      onComplete?.();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Enrollment failed");
      setPhase("error");
    }
  }, [personId, stopAll, onComplete]);

  const reset = useCallback(() => {
    stopAll();
    framesRef.current = [];
    zoneIdxRef.current = 0;
    zoneFrmRef.current = 0;
    setZoneIdx(0);
    setZoneFrames(0);
    setInZone(false);
    setFaceDetected(false);
    setError(null);
    setEnrollResult(null);
    setPhase("idle");
  }, [stopAll]);

  const startEnrollment = useCallback(async () => {
    framesRef.current = [];
    zoneIdxRef.current = 0;
    zoneFrmRef.current = 0;
    inZoneRef.current = false;
    setZoneIdx(0);
    setZoneFrames(0);
    setInZone(false);
    setError(null);
    setEnrollResult(null);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
      });
    } catch (err: unknown) {
      const msg = err instanceof DOMException
        ? err.name === "NotFoundError"
          ? "No camera detected. Connect a webcam or use the system camera option below."
          : err.name === "NotAllowedError"
            ? "Camera access denied. Allow camera permission in your browser and try again."
            : err.name === "NotReadableError"
              ? "Camera is in use by another application. Close it and try again."
              : err.name === "OverconstrainedError"
                ? "Camera does not support the required resolution."
                : `Camera error: ${err.message}`
        : "Camera access denied. Allow camera permission and try again.";
      setError(msg);
      setPhase("error");
      return;
    }
    streamRef.current = stream;
    setPhase("scanning");
    await new Promise((r) => setTimeout(r, 200));

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      try { await videoRef.current.play(); } catch { /* autoplay blocked — proceed */ }
    }
    await new Promise((r) => setTimeout(r, 300));

    poseRef.current = setInterval(async () => {
      if (pendingPose.current) return;
      if (zoneIdxRef.current >= ZONES.length) return;
      const frame = captureFrame();
      if (!frame) return;
      pendingPose.current = true;
      try {
        const pose = await detectPose(frame);
        if (!pose.detected) {
          inZoneRef.current = false;
          setInZone(false);
          setFaceDetected(false);
          return;
        }
        setFaceDetected(true);
        if (zoneIdxRef.current >= ZONES.length) return;
        const zone = ZONES[zoneIdxRef.current];
        const inside = pose.yaw >= zone.yawMin && pose.yaw <= zone.yawMax && pose.pitch >= zone.pitchMin && pose.pitch <= zone.pitchMax;
        inZoneRef.current = inside;
        setInZone(inside);
      } finally {
        pendingPose.current = false;
      }
    }, POSE_POLL_MS);

    captureRef.current = setInterval(() => {
      if (!inZoneRef.current) return;
      const frame = captureFrame();
      if (!frame) return;
      framesRef.current.push(frame);
      const newZFrm = zoneFrmRef.current + 1;
      if (newZFrm >= FRAMES_PER_ZONE) {
        zoneFrmRef.current = 0;
        const newZIdx = zoneIdxRef.current + 1;
        zoneIdxRef.current = newZIdx;
        setZoneFrames(0);
        if (newZIdx >= ZONES.length) {
          clearInterval(captureRef.current!);
          clearInterval(poseRef.current!);
          captureRef.current = null;
          poseRef.current = null;
          setZoneIdx(newZIdx);
          submit(framesRef.current);
        } else {
          setZoneIdx(newZIdx);
          inZoneRef.current = false;
          setInZone(false);
        }
      } else {
        zoneFrmRef.current = newZFrm;
        setZoneFrames(newZFrm);
      }
    }, CAPTURE_MS);
  }, [captureFrame, submit]);

  const startSystemEnrollment = useCallback(async () => {
    setPhase("processing");
    setError(null);
    try {
      const result = await enrollFromSystemCamera(personId);
      setEnrollResult({ accepted: result.accepted, rejected: result.rejected });
      setPhase("done");
      onComplete?.();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "System camera enrollment failed");
      setPhase("error");
    }
  }, [personId, onComplete]);

  useEffect(() => () => stopAll(), [stopAll]);

  return {
    phase,
    zoneIdx,
    zoneFrames,
    inZone,
    faceDetected,
    error,
    enrollResult,
    videoRef,
    canvasRef,
    startEnrollment,
    startSystemEnrollment,
    reset,
    currentZone: ZONES[Math.min(zoneIdx, ZONES.length - 1)],
  };
}
