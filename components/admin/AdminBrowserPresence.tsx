"use client";

import { useEffect } from "react";
import { getAccessToken } from "@/lib/supabase";

const BROWSER_ID = "born2smile-browser-id";
const DEVICE_NAME = "born2smile-device-name";

function getBrowserId() {
  let id = localStorage.getItem(BROWSER_ID);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(BROWSER_ID, id);
  }
  return id;
}

function getDeviceName() {
  return localStorage.getItem(DEVICE_NAME) ?? "";
}

export function readBrowserId() {
  try { return localStorage.getItem(BROWSER_ID); } catch { return null; }
}

export function setDeviceName(name: string) {
  localStorage.setItem(DEVICE_NAME, name);
  void reportPresence();
}

async function reportPresence() {
  if (document.visibilityState !== "visible") return;
  try {
    const token = await getAccessToken();
    if (!token) return;
    await fetch("/api/admin-presence", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ browserId: getBrowserId(), deviceName: getDeviceName() }),
    });
  } catch {
    // Presence reporting is independent of the administrator's current work.
  }
}

export function AdminBrowserPresence() {
  useEffect(() => {
    void reportPresence();
    const interval = window.setInterval(reportPresence, 60_000);
    document.addEventListener("visibilitychange", reportPresence);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", reportPresence);
    };
  }, []);
  return null;
}
