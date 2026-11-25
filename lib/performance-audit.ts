export const PERFORMANCE_AUDIT_PARAM = "b2s_performance_audit";

export function isPerformanceAudit(search: string) {
  return new URLSearchParams(search).get(PERFORMANCE_AUDIT_PARAM) === "1";
}
