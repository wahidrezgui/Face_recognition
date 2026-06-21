import {
  fetchGates,
  fetchGateDbConfig,
  type GateEvent,
  type ValidatedEvent,
} from "@/lib/api";

/** Mirrors GateRecognitionSettings.Default (GateVision.Api). Used only when gate cannot be resolved. */
export const GATE_RECOGNITION_DEFAULTS = {
  autoValidateConfidence: 0.85,
} as const;

export type GateAutoValidateThresholds = {
  thresholds: Map<string, number>;
  gateIds: string[];
};

export async function fetchGateAutoValidateThresholds(): Promise<GateAutoValidateThresholds> {
  const gates = await fetchGates();
  const gateIds = gates.map((g) => g.id.toLowerCase());
  const pairs = await Promise.all(
    gates.map(async (g) => {
      const id = g.id.toLowerCase();
      const cfg = await fetchGateDbConfig(g.id);
      const threshold =
        cfg?.auto_validate_confidence ?? GATE_RECOGNITION_DEFAULTS.autoValidateConfidence;
      return [id, threshold] as const;
    }),
  );
  return { thresholds: new Map(pairs), gateIds };
}

/** Mirrors GateService.GetRecognitionSettingsAsync gate-id resolution. */
export function resolveAutoValidateThreshold(
  gateId: string | undefined,
  thresholds: Map<string, number>,
  gateIds: string[],
): number {
  const normalized = gateId?.trim().toLowerCase() || "default";
  const direct = thresholds.get(normalized);
  if (direct !== undefined) return direct;

  if (gateIds.length === 1) {
    const only = gateIds[0];
    return thresholds.get(only) ?? GATE_RECOGNITION_DEFAULTS.autoValidateConfidence;
  }

  return GATE_RECOGNITION_DEFAULTS.autoValidateConfidence;
}

/** Mirrors EventBufferService auto-validate check (strict greater-than). */
export function shouldAutoValidate(evt: GateEvent, threshold: number): boolean {
  return !!evt.personId && evt.confidence > threshold;
}

export function gateEventToValidatedPreview(evt: GateEvent): ValidatedEvent {
  const now = new Date().toISOString();
  return {
    eventId: evt.eventId,
    gateEventId: evt.eventId,
    gateId: evt.gateId ?? "default",
    personId: evt.personId,
    personName: evt.personName,
    department: evt.department ?? null,
    confidence: evt.confidence,
    timestamp: evt.timestamp,
    validatedBy: "auto",
    validatedAt: now,
    faceImageBase64: evt.faceImageBase64,
    emotion: evt.emotion ?? null,
    age: evt.age ?? null,
    gender: evt.gender ?? null,
  };
}
