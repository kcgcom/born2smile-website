"use client";

import { useEffect, useRef } from "react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { captureReadingEvent, getAnalyticsSessionId, registerArticleAnalytics, shouldSkipCapture } from "@/lib/posthog";
import { activeReadingDelta, DEPTH_STEPS, measureReadingRects, TIME_STEPS, type ReadingMetadata } from "@/lib/blog/reading";

interface ReadState {
  id: string;
  session: string;
  revision: string;
  started: boolean;
  qualified: boolean;
  sent: Set<string>;
  seconds: number;
  depth: number;
  anchor: boolean;
  active: boolean;
  lastTick: number;
  lastActivity: number;
}

export default function BlogReadTracker({ slug, category, metadata, disabled = false }: {
  slug: string;
  category: string;
  metadata: ReadingMetadata;
  disabled?: boolean;
}) {
  const admin = useAdminAuth();
  const stateRef = useRef<ReadState | null>(null);

  useEffect(() => {
    if (disabled || admin || process.env.NEXT_PUBLIC_BLOG_READING_ENABLED === "false"
      || !process.env.NEXT_PUBLIC_POSTHOG_TOKEN || !process.env.NEXT_PUBLIC_POSTHOG_HOST) return;
    const path = `/blog/${category}/${slug}`;
    const root = document.querySelector<HTMLElement>("[data-blog-reading-root]");
    if (!root) return;
    let paused = false;
    let dirty = true;
    let rects: Array<{ top: number; bottom: number; height: number }> = [];
    let scrolling = true;
    let frame = 0;
    let observing = false;
    const nodes = Array.from(root.querySelectorAll<HTMLElement>("[data-reading-block]"));
    const base = { ...metadata, blog_slug: slug, category, page_type: "blog_post", page_path: path };

    const ensureState = () => {
      if (shouldSkipCapture()) {
        stateRef.current = null;
        observer.disconnect();
        observing = false;
        return null;
      }
      if (paused || document.visibilityState !== "visible" || window.location.pathname.replace(/\/$/, "") !== path) return null;
      const session = getAnalyticsSessionId();
      if (!session) return null;
      let state = stateRef.current;
      if (!state || state.session !== session || state.revision !== metadata.content_revision) {
        const now = performance.now();
        state = {
          id: crypto.randomUUID(), session, revision: metadata.content_revision,
          started: false, qualified: false, sent: new Set(), seconds: 0, depth: 0,
          anchor: Boolean(location.hash), active: false, lastTick: now, lastActivity: now,
        };
        stateRef.current = state;
        dirty = true;
        if (!observing) {
          observer.observe(root);
          for (const node of nodes) observer.observe(node);
          observing = true;
        }
      }
      if (!state.started) {
        state.started = captureReadingEvent("blog_article_viewed", {
          ...base, article_view_id: state.id, article_session_id: state.session,
        });
      }
      return state.started ? state : null;
    };

    const sample = () => {
      const state = ensureState();
      if (!state) {
        if (stateRef.current) { stateRef.current.active = false; stateRef.current.lastTick = performance.now(); }
        return;
      }
      const now = performance.now();
      state.seconds += activeReadingDelta(state.lastTick, now, state.lastActivity, state.active) / 1000;
      state.lastTick = now;
      // Once all milestones are submitted, retain only the lifecycle/consent check.
      if (state.sent.size === 8 && (state.qualified || !metadata.reading_eligible)) {
        observer.disconnect();
        observing = false;
        return;
      }
      if (dirty || scrolling) {
        rects = nodes.map(node => node.getBoundingClientRect());
        dirty = false;
        scrolling = false;
      }
      const measured = measureReadingRects(rects, window.innerHeight);
      state.active = measured.visible;
      state.depth = Math.max(state.depth, measured.depth);
      const properties = {
        ...base, article_view_id: state.id, article_session_id: state.session,
        active_read_seconds: Math.floor(state.seconds), max_body_depth_pct: Math.round(state.depth * 100) / 100,
        anchor_navigation_used: state.anchor,
      };
      for (const [type, steps, value] of [
        ["depth", DEPTH_STEPS, state.depth], ["active_time", TIME_STEPS, state.seconds],
      ] as const) {
        for (const step of steps) {
          const key = `${type}:${step}`;
          if (value >= step && !state.sent.has(key) && captureReadingEvent("blog_read_progress", {
            ...properties, milestone_type: type, milestone_value: step,
          })) state.sent.add(key);
        }
      }
      if (!state.qualified && metadata.required_active_seconds !== null
        && state.depth >= 75 && state.seconds >= metadata.required_active_seconds) {
        state.qualified = captureReadingEvent("blog_read_qualified", properties);
      }
    };

    const unregister = registerArticleAnalytics(() => {
      const state = ensureState();
      return state ? { ...base, article_view_id: state.id, article_session_id: state.session, surface: "article" } : null;
    });
    const activity = () => {
      sample();
      if (stateRef.current) stateRef.current.lastActivity = performance.now();
    };
    const scroll = () => {
      scrolling = true;
      if (!frame) frame = requestAnimationFrame(() => { frame = 0; activity(); });
    };
    const resize = () => { dirty = true; };
    const visibility = () => {
      if (document.visibilityState === "visible") {
        if (stateRef.current) { stateRef.current.lastTick = performance.now(); stateRef.current.lastActivity = performance.now(); }
        dirty = true;
      }
      sample();
    };
    const pagehide = () => { sample(); paused = true; if (stateRef.current) stateRef.current.active = false; };
    const pageshow = () => { paused = false; visibility(); };
    const anchor = () => { if (stateRef.current && location.hash) stateRef.current.anchor = true; scrolling = true; };
    const observer = new ResizeObserver(resize);
    observer.observe(root);
    for (const node of nodes) observer.observe(node);
    observing = true;
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("resize", resize);
    window.addEventListener("hashchange", anchor);
    window.addEventListener("pagehide", pagehide);
    window.addEventListener("pageshow", pageshow);
    document.addEventListener("visibilitychange", visibility);
    for (const event of ["pointerdown", "pointermove", "keydown", "touchstart"]) document.addEventListener(event, activity, { passive: true });
    // Also notices opt-out and session rotation without recording activity itself.
    const timer = window.setInterval(sample, 1000);
    sample();
    return () => {
      if (stateRef.current) { stateRef.current.active = false; stateRef.current.lastTick = performance.now(); }
      unregister();
      observer.disconnect();
      clearInterval(timer);
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scroll);
      window.removeEventListener("resize", resize);
      window.removeEventListener("hashchange", anchor);
      window.removeEventListener("pagehide", pagehide);
      window.removeEventListener("pageshow", pageshow);
      document.removeEventListener("visibilitychange", visibility);
      for (const event of ["pointerdown", "pointermove", "keydown", "touchstart"]) document.removeEventListener(event, activity);
    };
  }, [slug, category, metadata, disabled, admin]);

  return null;
}
