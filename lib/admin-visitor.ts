"use client";

/** Browser hint for excluding staff interactions, not an authorization check. */
export function hasAdminBrowserFlag(): boolean {
  if (typeof window === "undefined") return false;
  try { return localStorage.getItem("born2smile-admin") === "1"; }
  catch { return false; }
}
