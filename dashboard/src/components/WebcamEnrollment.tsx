"use client";

import { usePoseDetection } from "@/hooks/usePoseDetection";
import { ProgressRing, ZONES, FRAMES_PER_ZONE, TOTAL_FRAMES, WRAP_SIZE, VIDEO_SIZE, PADDING, zoneArrow } from "@/components/CaptureRing";

type Phase = "idle" | "scanning" | "processing" | "done" | "error";

interface EnrollResult {
  accepted: number;
  rejected: { attempt: number; reason: string }[];
}

export default function WebcamEnrollment({ personId, onComplete }: { personId: string; onComplete?: () => void }) {
  const { phase, zoneIdx, zoneFrames, inZone, faceDetected, error, enrollResult, videoRef, canvasRef, startEnrollment, startSystemEnrollment, reset, currentZone } = usePoseDetection(personId, onComplete);

  const isActive = phase === "scanning";
  const isProcessing = phase === "processing";
  const isDone = phase === "done";
  const isError = phase === "error";

  return (
    <div className="rounded-xl border border-gv-border bg-gv-panel p-4 sm:p-6">
      <h2 className="mb-5 font-display text-xs font-semibold uppercase tracking-widest text-gray-300">
        Face enrollment
      </h2>
      <canvas ref={canvasRef} className="hidden" />

      {phase === "idle" && (
        <div className="flex flex-col items-center gap-5 py-4">
          <div className="rounded-full border-2 border-dashed border-gray-700 flex items-center justify-center text-gray-600"
            style={{ width: WRAP_SIZE, height: WRAP_SIZE }}>
            <svg className="w-16 h-16 opacity-25" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
          <p className="text-sm text-gray-400 text-center max-w-xs">
            You will be guided through 5 positions — center, right, down, left, up. Hold each pose briefly.
          </p>
          <button onClick={startEnrollment}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-sm font-medium transition-colors">
            Start Enrollment
          </button>
        </div>
      )}

      {isActive && (
        <div className="flex flex-col items-center gap-3">
          <div className="relative" style={{ width: WRAP_SIZE, height: WRAP_SIZE }}>
            <div className="absolute rounded-full overflow-hidden"
              style={{ width: VIDEO_SIZE, height: VIDEO_SIZE, top: PADDING, left: PADDING }}>
              <video ref={videoRef} autoPlay playsInline muted
                className="absolute inset-0 object-cover w-full h-full"
                style={{ transform: "scaleX(-1)" }}
              />
              <div className="absolute inset-0 pointer-events-none rounded-full"
                style={{ boxShadow: "inset 0 0 36px 16px rgba(0,0,0,0.55)" }} />
              <div className="absolute inset-0 rounded-full pointer-events-none transition-all duration-300"
                style={{ boxShadow: inZone ? "inset 0 0 0 4px rgba(34,197,94,0.9), 0 0 20px rgba(34,197,94,0.4)" : "none" }} />
            </div>
            <ProgressRing zoneIdx={zoneIdx} zoneFrames={zoneFrames} isProcessing={false} />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-1.5">
              {ZONES.map((z, zi) => (
                <div key={z.id}
                  className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${zi < zoneIdx ? "bg-emerald-500" :
                      zi === zoneIdx ? (inZone ? "bg-emerald-400 animate-pulse" : "bg-gray-500") :
                        "bg-gray-700"
                    }`}
                />
              ))}
            </div>
          </div>

          {/* Face detection status */}
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${faceDetected
              ? inZone ? "bg-emerald-900/60 text-emerald-300 border border-emerald-700" : "bg-gray-800 text-gray-300 border border-gray-700"
              : "bg-amber-900/40 text-amber-400 border border-amber-800"
            }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${faceDetected ? (inZone ? "bg-emerald-400" : "bg-gray-400") : "bg-amber-400 animate-pulse"}`} />
            {faceDetected ? (inZone ? "Hold position" : "Face detected") : "Looking for face\u2026"}
          </div>

          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-2">
              {currentZone.id !== "center" && <Arrow dir={zoneArrow(currentZone.id)} inZone={inZone} />}
              <p className={`text-sm font-medium transition-colors ${inZone ? "text-emerald-300" : "text-gray-300"}`}>
                {currentZone.label}
              </p>
              {currentZone.id !== "center" && <Arrow dir={zoneArrow(currentZone.id)} inZone={inZone} />}
            </div>
            <p className="text-xs text-gray-600">
              {inZone ? `Holding\u2026 ${zoneFrames}/${FRAMES_PER_ZONE}` : faceDetected ? "Move to the indicated position" : "Ensure good lighting and face the camera"}
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-600">
            {ZONES.map((z, zi) => (
              <span key={z.id} className={zi === zoneIdx ? "text-emerald-400 font-semibold" : zi < zoneIdx ? "text-emerald-600" : ""}>
                {zi < zoneIdx ? "\u2713" : zi === zoneIdx ? z.label : "\u00B7"}
                {zi < ZONES.length - 1 && <span className="mx-0.5 text-gray-700">\u203A</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      {isProcessing && (
        <div className="flex flex-col items-center gap-5 py-4">
          <div className="rounded-full border-2 border-gray-700 flex items-center justify-center bg-gray-900"
            style={{ width: WRAP_SIZE, height: WRAP_SIZE }}>
            <svg className="animate-spin w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor"
                d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
            </svg>
          </div>
          <p className="text-sm text-gray-400">Processing enrollment\u2026</p>
        </div>
      )}

      {isDone && enrollResult && <DoneView enrollResult={enrollResult} onReset={reset} />}
      {isError && <ErrorView error={error} onReset={reset} onSystemCamera={startSystemEnrollment} />}
    </div>
  );
}

function Arrow({ dir, inZone }: { dir: string; inZone: boolean }) {
  return (
    <span className={`text-2xl font-bold transition-colors ${inZone ? "text-emerald-400" : "text-gray-500"}`}>{dir}</span>
  );
}

function DoneView({ enrollResult, onReset }: { enrollResult: EnrollResult; onReset: () => void }) {
  return (
    <div className="flex flex-col items-center gap-5 py-4">
      <div className="rounded-full border-2 border-emerald-500 flex items-center justify-center"
        style={{ width: WRAP_SIZE, height: WRAP_SIZE, boxShadow: "0 0 32px rgba(34,197,94,0.25)" }}>
        <svg className="w-20 h-20 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <div className="text-center">
        <p className="text-emerald-400 font-semibold text-base">Enrollment complete</p>
        <p className="text-sm text-gray-400 mt-1">
          {enrollResult.accepted} frames accepted
          {enrollResult.rejected.length > 0 && `, ${enrollResult.rejected.length} rejected`}
        </p>
      </div>
      <button onClick={onReset} className="px-5 py-2 text-sm bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors">
        Re-enroll
      </button>
    </div>
  );
}

function ErrorView({ error, onReset, onSystemCamera }: { error: string | null; onReset: () => void; onSystemCamera?: () => void }) {
  const isNoCamera = error?.includes("No camera detected");
  return (
    <div className="flex flex-col items-center gap-5 py-4">
      <div className="rounded-full border-2 border-red-500 flex items-center justify-center" style={{ width: WRAP_SIZE, height: WRAP_SIZE }}>
        <svg className="w-20 h-20 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      </div>
      <div className="text-center">
        <p className="text-red-400 font-semibold">Enrollment failed</p>
        <p className="text-sm text-gray-400 mt-1 max-w-xs">{error}</p>
      </div>
      <div className="flex gap-2">
        <button onClick={onReset} className="px-5 py-2 text-sm bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors">
          Try again
        </button>
        {isNoCamera && onSystemCamera && (
          <button onClick={onSystemCamera} className="px-5 py-2 text-sm bg-emerald-700 hover:bg-emerald-600 rounded-xl transition-colors">
            Use System Camera
          </button>
        )}
      </div>
    </div>
  );
}

// Export constants and types for consumers
export type { Phase, EnrollResult };
