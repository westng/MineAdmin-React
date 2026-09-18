import { normalizeError } from '@/services/errors'
export interface TelemetryEvent {
  code: string
  module: string
  status?: number
}
export interface Telemetry {
  report: (event: TelemetryEvent) => void
}
export const silentTelemetry: Telemetry = { report: () => undefined }
export function reportError(telemetry: Telemetry, error: unknown, module: string) {
  const normalized = normalizeError(error, module)
  try {
    telemetry.report({ code: normalized.code, module: normalized.module, status: normalized.status })
  } catch {
    /* Telemetry cannot break application recovery. */
  }
}
