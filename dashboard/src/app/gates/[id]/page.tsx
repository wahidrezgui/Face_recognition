"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { useGateDetail } from "@/hooks/useGateDetail";
import { GateServiceControls } from "@/components/gates/GateServiceControls";
import { GateLiveFeedPanel } from "@/components/gates/GateLiveFeedPanel";
import { HikvisionEventsPanel } from "@/components/gates/HikvisionEventsPanel";
import { GateSettingsForm } from "@/components/gates/GateSettingsForm";
import { KioskSettingsSection } from "@/components/gates/KioskSettingsSection";
import { WelcomeWorkflowConfig } from "@/components/gates/WelcomeWorkflowConfig";
import { VideoSourcePicker } from "@/components/gates/VideoSourcePicker";

export default function GateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const gateId = params.id as string;
  const d = useGateDetail(gateId);

  if (d.notFound) {
    return (
      <div className="flex min-h-[calc(100vh-44px)] items-center justify-center bg-gv-bg text-gv-text">
        <div className="text-center">
          <p className="mb-4 text-sm text-gray-400">Gate &ldquo;{gateId}&rdquo; not found.</p>
          <Link href="/gates" className="text-xs text-blue-400 hover:text-blue-300">
            ← Back to Gates
          </Link>
        </div>
      </div>
    );
  }

  const gateOnline = d.gate?.online ?? null;
  const dotColor = gateOnline === null ? "bg-gray-500" : gateOnline ? "bg-emerald-400" : "bg-red-500";
  const statusLabel = gateOnline === null ? "Checking…" : gateOnline ? "Online" : "Offline";

  return (
    <div className="flex min-h-[calc(100vh-44px)] flex-col overflow-y-auto bg-gv-bg text-gv-text">
      <div className="border-b border-[#1a2640] bg-[#060f1e] px-6 py-4">
        <Link href="/gates" className="text-[11px] text-gray-600 transition-colors hover:text-gray-400">
          ← Gates
        </Link>
        <div className="mt-1 flex items-center gap-2">
          <span className={`inline-block h-2 w-2 rounded-full ${dotColor}`} />
          <h1 className="text-base font-bold text-gray-100">{d.gate?.name ?? gateId}</h1>
          <span className="text-[10px] text-gray-600">{gateId}</span>
        </div>
      </div>

      <div className="mx-auto w-full max-w-2xl flex-1 space-y-8 p-6">
        <GateServiceControls
          gateOnline={gateOnline}
          hasStartCommand={d.hasStartCommand}
          serviceAction={d.serviceAction}
          statusLabel={statusLabel}
          onStop={d.handleStop}
          onStart={d.handleStart}
        />

        {d.gate?.online && d.gate.status && (
          <GateLiveFeedPanel
            gateId={gateId}
            gate={d.gate}
            processingFps={d.processingFps}
            processingFpsLoaded={d.processingFpsLoaded}
            getCameraSource={d.getCameraSource}
          />
        )}

        <HikvisionEventsPanel gateId={gateId} gateOnline={!!d.gate?.online} />

        <GateSettingsForm
          editName={d.editName}
          editPythonUrl={d.editPythonUrl}
          editApiKey={d.editApiKey}
          editStartCommand={d.editStartCommand}
          editSaving={d.editSaving}
          editError={d.editError}
          onNameChange={d.setEditName}
          onPythonUrlChange={d.setEditPythonUrl}
          onApiKeyChange={d.setEditApiKey}
          onStartCommandChange={d.setEditStartCommand}
          onSubmit={d.handleSaveSettings}
        />

        <Separator className="bg-gv-border" />

        <KioskSettingsSection
          speechBuffered={d.speechBuffered}
          speechBufferedLoaded={d.speechBufferedLoaded}
          onSpeechBufferedChange={d.handleSpeechBuffered}
        />

        <Separator className="bg-gv-border" />

        <WelcomeWorkflowConfig
          welcomeCooldown={d.welcomeCooldown}
          bufferTrackExpiry={d.bufferTrackExpiry}
          bufferPersonDedup={d.bufferPersonDedup}
          refireScoreDelta={d.refireScoreDelta}
          minTrackHits={d.minTrackHits}
          deskDisplaySeconds={d.deskDisplaySeconds}
          deskLookbackSeconds={d.deskLookbackSeconds}
          showNeedsReviewOnDesk={d.showNeedsReviewOnDesk}
          loaded={d.welcomeWorkflowLoaded}
          onWelcomeCooldownChange={d.setWelcomeCooldown}
          onBufferTrackExpiryChange={d.setBufferTrackExpiry}
          onBufferPersonDedupChange={d.setBufferPersonDedup}
          onRefireScoreDeltaChange={d.setRefireScoreDelta}
          onMinTrackHitsChange={d.setMinTrackHits}
          onDeskDisplaySecondsChange={d.setDeskDisplaySeconds}
          onDeskLookbackSecondsChange={d.setDeskLookbackSeconds}
          onShowNeedsReviewChange={d.setShowNeedsReviewOnDesk}
        />

        <Separator className="bg-gv-border" />

        <VideoSourcePicker
          sourceType={d.sourceType}
          cameras={d.cameras}
          camLoading={d.camLoading}
          selectedCam={d.selectedCam}
          customIndex={d.customIndex}
          useCustom={d.useCustom}
          rtspUrl={d.rtspUrl}
          processingFps={d.processingFps}
          processingFpsLoaded={d.processingFpsLoaded}
          identifyThreshold={d.identifyThreshold}
          minMatchScore={d.minMatchScore}
          autoValidateConfidence={d.autoValidateConfidence}
          minFaceConfidence={d.minFaceConfidence}
          recognitionLoaded={d.recognitionLoaded}
          logUnknown={d.logUnknown}
          logUnknownLoaded={d.logUnknownLoaded}
          trainingMode={d.trainingMode}
          trainingLoaded={d.trainingLoaded}
          configSaving={d.configSaving}
          onSourceTypeChange={d.setSourceType}
          onSelectedCamChange={d.setSelectedCam}
          onCustomIndexChange={d.setCustomIndex}
          onUseCustomChange={d.setUseCustom}
          onRtspUrlChange={d.setRtspUrl}
          onProcessingFpsChange={d.setProcessingFpsState}
          onIdentifyThresholdChange={d.setIdentifyThreshold}
          onMinMatchScoreChange={d.setMinMatchScore}
          onAutoValidateConfidenceChange={d.setAutoValidateConfidence}
          onMinFaceConfidenceChange={d.setMinFaceConfidence}
          onLogUnknownChange={d.setLogUnknownState}
          onTrainingModeChange={d.setTrainingModeState}
          onApplyRestart={d.handleApplyRestart}
        />

        <Separator className="bg-gv-border" />

        <section className="pb-8">
          <h2 className="mb-3 text-sm font-bold tracking-wide text-red-400">Danger Zone</h2>
          <div className="rounded border border-red-600/20 bg-red-950/10 p-4">
            <p className="mb-3 text-xs text-gray-500">Permanently delete this gate. This cannot be undone.</p>
            <button
              type="button"
              onClick={() => d.handleDelete(router.push)}
              className="rounded border border-red-600/40 bg-red-900/20 px-4 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-900/30"
            >
              Delete Gate
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
