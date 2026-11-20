import { useSyncExternalStore } from "react";

export const REPORT_PERIODS = [
  { value: "30d", label: "30일" },
  { value: "90d", label: "90일" },
  { value: "180d", label: "180일" },
] as const;

export type ReportPeriod = (typeof REPORT_PERIODS)[number]["value"];
const STORAGE_KEY = "admin-report-period";
const DEFAULT_PERIOD: ReportPeriod = "30d";
let selectedPeriod: ReportPeriod | undefined;

function subscribe(listener: () => void) {
  window.addEventListener(STORAGE_KEY, listener);
  return () => window.removeEventListener(STORAGE_KEY, listener);
}

function isReportPeriod(value: string | null): value is ReportPeriod {
  return REPORT_PERIODS.some(period => period.value === value);
}

function getPeriod(): ReportPeriod {
  if (selectedPeriod) return selectedPeriod;
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    return isReportPeriod(stored) ? stored : DEFAULT_PERIOD;
  } catch {
    return DEFAULT_PERIOD;
  }
}

function setPeriod(value: string) {
  if (!isReportPeriod(value)) return;
  selectedPeriod = value;
  try {
    sessionStorage.setItem(STORAGE_KEY, value);
  } catch {
    // The in-memory selection still works when storage is unavailable.
  }
  window.dispatchEvent(new Event(STORAGE_KEY));
}

export function useReportPeriod() {
  return [useSyncExternalStore(subscribe, getPeriod, () => DEFAULT_PERIOD), setPeriod] as const;
}
