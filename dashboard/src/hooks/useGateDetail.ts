"use client";

import { useState, useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchGates,
  fetchAdminGates,
  fetchGateKioskSettings,
  setGateKioskSettings,
  fetchGateDbConfig,
  fetchGateCameras,
  updateGate,
  deleteGate,
  stopGate,
  startGate,
  setGateProcessingFps,
  setGateRecognitionConfig,
  setGateWelcomeConfig,
  setGateVideoSource,
  type GateStatus,
} from "@/lib/api";
import { inferSourceType, type SourceType } from "@/components/gates/gate-form-styles";

export function useGateDetail(gateId: string) {
  const queryClient = useQueryClient();

  const [hasStartCommand, setHasStartCommand] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [serviceAction, setServiceAction] = useState<"stopping" | "starting" | null>(null);

  const [editName, setEditName] = useState("");
  const [editPythonUrl, setEditPythonUrl] = useState("");
  const [editApiKey, setEditApiKey] = useState("");
  const [editStartCommand, setEditStartCommand] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [editInitialized, setEditInitialized] = useState(false);

  const [sourceType, setSourceType] = useState<SourceType>("webcam");
  const [selectedCam, setSelectedCam] = useState("0");
  const [customIndex, setCustomIndex] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [rtspUrl, setRtspUrl] = useState("");
  const [configSaving, setConfigSaving] = useState(false);
  const [configApplied, setConfigApplied] = useState(false);

  const [speechBuffered, setSpeechBuffered] = useState(false);
  const [trainingMode, setTrainingModeState] = useState(false);
  const [logUnknown, setLogUnknownState] = useState(false);
  const [processingFps, setProcessingFpsState] = useState(3);
  const [identifyThreshold, setIdentifyThreshold] = useState(0.8);
  const [minMatchScore, setMinMatchScore] = useState(0.35);
  const [autoValidateConfidence, setAutoValidateConfidence] = useState(0.85);
  const [minFaceConfidence, setMinFaceConfidence] = useState(0.5);

  const [welcomeCooldown, setWelcomeCooldown] = useState(7);
  const [bufferTrackExpiry, setBufferTrackExpiry] = useState(3);
  const [bufferPersonDedup, setBufferPersonDedup] = useState(2);
  const [refireScoreDelta, setRefireScoreDelta] = useState(0.03);
  const [minTrackHits, setMinTrackHits] = useState(2);
  const [deskDisplaySeconds, setDeskDisplaySeconds] = useState(10);
  const [deskLookbackSeconds, setDeskLookbackSeconds] = useState(30);
  const [showNeedsReviewOnDesk, setShowNeedsReviewOnDesk] = useState(false);

  const { data: gate, refetch: refetchGate } = useQuery({
    queryKey: ["gate-detail-status", gateId],
    queryFn: async () => {
      const [gateList, adminList] = await Promise.all([fetchGates(), fetchAdminGates()]);
      const g = gateList.find((x) => x.id === gateId);
      if (!g) {
        setNotFound(true);
        return null;
      }
      setNotFound(false);
      const ag = adminList.find((x) => x.id === gateId);
      setHasStartCommand(!!ag?.startCommand);
      if (!editInitialized) {
        setEditName(g.name);
        setEditPythonUrl(g.pythonUrl ?? "");
        setEditStartCommand(ag?.startCommand ?? "");
        setEditInitialized(true);
      }
      return g;
    },
    refetchInterval: 5_000,
  });

  const { data: configBundle, isSuccess: configLoaded } = useQuery({
    queryKey: ["gate-detail-config", gateId],
    queryFn: async () => {
      const [kiosk, cfg, cameras] = await Promise.all([
        fetchGateKioskSettings(gateId).catch(() => ({ speechBuffered: false })),
        fetchGateDbConfig(gateId),
        fetchGateCameras(gateId).catch(() => [] as { index: number; name: string }[]),
      ]);
      return { kiosk, cfg, cameras };
    },
  });

  useEffect(() => {
    if (!configBundle || configApplied) return;
    setSpeechBuffered(configBundle.kiosk.speechBuffered);
    const cfg = configBundle.cfg;
    if (cfg) {
      const src = cfg.camera_source || "";
      if (src) {
        const kind = inferSourceType(src);
        setSourceType(kind);
        if (kind === "webcam") {
          setSelectedCam(src);
          setCustomIndex(src);
          setUseCustom(false);
        } else {
          setRtspUrl(src);
        }
      }
      if (cfg.processing_fps) setProcessingFpsState(cfg.processing_fps);
      if (cfg.identify_confidence_threshold) setIdentifyThreshold(cfg.identify_confidence_threshold);
      if (cfg.min_match_score) setMinMatchScore(cfg.min_match_score);
      if (cfg.auto_validate_confidence) setAutoValidateConfidence(cfg.auto_validate_confidence);
      if (cfg.min_face_confidence) setMinFaceConfidence(cfg.min_face_confidence);
      if (typeof cfg.log_unknown === "boolean") setLogUnknownState(cfg.log_unknown);
      if (typeof cfg.training_mode === "boolean") setTrainingModeState(cfg.training_mode);
      if (cfg.welcome_cooldown_seconds) setWelcomeCooldown(cfg.welcome_cooldown_seconds);
      if (cfg.buffer_track_expiry_seconds) setBufferTrackExpiry(cfg.buffer_track_expiry_seconds);
      if (cfg.buffer_person_dedup_seconds !== undefined) setBufferPersonDedup(cfg.buffer_person_dedup_seconds);
      if (cfg.refire_score_delta) setRefireScoreDelta(cfg.refire_score_delta);
      if (cfg.min_track_hits) setMinTrackHits(cfg.min_track_hits);
      if (cfg.desk_display_seconds) setDeskDisplaySeconds(cfg.desk_display_seconds);
      if (cfg.desk_event_lookback_seconds) setDeskLookbackSeconds(cfg.desk_event_lookback_seconds);
      if (typeof cfg.show_needs_review_on_desk === "boolean") setShowNeedsReviewOnDesk(cfg.show_needs_review_on_desk);
    }
    setConfigApplied(true);
  }, [configBundle, configApplied]);

  const cameras = configBundle?.cameras ?? [];
  const camLoading = !configLoaded;

  const getCameraSource = useCallback((): string => {
    switch (sourceType) {
      case "webcam":
        return useCustom ? customIndex : selectedCam;
      case "rtsp":
        return rtspUrl;
    }
  }, [sourceType, useCustom, customIndex, selectedCam, rtspUrl]);

  const handleSpeechBuffered = async (val: boolean) => {
    setSpeechBuffered(val);
    try {
      await setGateKioskSettings(gateId, { speechBuffered: val });
    } catch {
      toast.error("Failed to save kiosk settings");
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditSaving(true);
    setEditError("");
    try {
      const payload: {
        name?: string;
        pythonUrl?: string;
        apiKey?: string | null;
        startCommand?: string | null;
      } = {};
      if (editName.trim()) payload.name = editName.trim();
      if (editPythonUrl.trim()) payload.pythonUrl = editPythonUrl.trim();
      if (editApiKey.trim()) payload.apiKey = editApiKey.trim();
      payload.startCommand = editStartCommand.trim() || null;
      await updateGate(gateId, payload);
      setEditApiKey("");
      toast.success("Gate settings saved");
      setEditInitialized(false);
      queryClient.invalidateQueries({ queryKey: ["gate-detail-status", gateId] });
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setEditSaving(false);
    }
  };

  const handleApplyRestart = async () => {
    setConfigSaving(true);
    try {
      await setGateProcessingFps(gateId, processingFps);
      await setGateRecognitionConfig(gateId, {
        identify_confidence_threshold: identifyThreshold,
        min_match_score: minMatchScore,
        auto_validate_confidence: autoValidateConfidence,
        min_face_confidence: minFaceConfidence,
        log_unknown: logUnknown,
        training_mode: trainingMode,
      });
      await setGateWelcomeConfig(gateId, {
        welcome_cooldown_seconds: welcomeCooldown,
        buffer_track_expiry_seconds: bufferTrackExpiry,
        buffer_person_dedup_seconds: bufferPersonDedup,
        refire_score_delta: refireScoreDelta,
        min_track_hits: minTrackHits,
        desk_display_seconds: deskDisplaySeconds,
        desk_event_lookback_seconds: deskLookbackSeconds,
        show_needs_review_on_desk: showNeedsReviewOnDesk,
      });
      await setGateVideoSource(gateId, getCameraSource());
      toast.success("Configuration applied — AI service restarting");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to apply configuration");
    } finally {
      setConfigSaving(false);
    }
  };

  const handleStop = async () => {
    setServiceAction("stopping");
    try {
      await stopGate(gateId);
      toast.success("Stop signal sent — AI service shutting down");
      setTimeout(() => refetchGate(), 1_500);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to stop service");
    } finally {
      setServiceAction(null);
    }
  };

  const handleStart = async () => {
    setServiceAction("starting");
    try {
      const res = await startGate(gateId);
      toast.info(res.message || "Start command sent — service is starting up");
      setTimeout(() => refetchGate(), 2_000);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to start service");
    } finally {
      setServiceAction(null);
    }
  };

  const handleDelete = async (routerPush: (path: string) => void) => {
    if (!window.confirm(`Delete gate "${gateId}"? This cannot be undone.`)) return;
    try {
      await deleteGate(gateId);
      routerPush("/gates");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete gate");
    }
  };

  return {
    gate: gate as GateStatus | null | undefined,
    notFound,
    hasStartCommand,
    serviceAction,
    editName,
    setEditName,
    editPythonUrl,
    setEditPythonUrl,
    editApiKey,
    setEditApiKey,
    editStartCommand,
    setEditStartCommand,
    editSaving,
    editError,
    sourceType,
    setSourceType,
    cameras,
    camLoading,
    selectedCam,
    setSelectedCam,
    customIndex,
    setCustomIndex,
    useCustom,
    setUseCustom,
    rtspUrl,
    setRtspUrl,
    configSaving,
    speechBuffered,
    speechBufferedLoaded: configLoaded,
    trainingMode,
    trainingLoaded: configLoaded,
    logUnknown,
    logUnknownLoaded: configLoaded,
    processingFps,
    processingFpsLoaded: configLoaded,
    identifyThreshold,
    setIdentifyThreshold,
    minMatchScore,
    setMinMatchScore,
    autoValidateConfidence,
    setAutoValidateConfidence,
    minFaceConfidence,
    setMinFaceConfidence,
    recognitionLoaded: configLoaded,
    welcomeCooldown,
    setWelcomeCooldown,
    bufferTrackExpiry,
    setBufferTrackExpiry,
    bufferPersonDedup,
    setBufferPersonDedup,
    refireScoreDelta,
    setRefireScoreDelta,
    minTrackHits,
    setMinTrackHits,
    deskDisplaySeconds,
    setDeskDisplaySeconds,
    deskLookbackSeconds,
    setDeskLookbackSeconds,
    showNeedsReviewOnDesk,
    setShowNeedsReviewOnDesk,
    welcomeWorkflowLoaded: configLoaded,
    getCameraSource,
    handleSpeechBuffered,
    handleSaveSettings,
    handleApplyRestart,
    handleStop,
    handleStart,
    handleDelete,
    setTrainingModeState,
    setLogUnknownState,
    setProcessingFpsState,
  };
}
