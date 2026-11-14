"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { captureReadingEvent, getAnalyticsSessionId, shouldSkipCapture } from "@/lib/posthog";
import { CARD_MEASUREMENT_VERSION, visibleCardRatio } from "@/lib/blog/card-tracking";

interface CardState {
  context: string;
  id: string;
  session: string;
  impressions: Set<string>;
  clicks: Set<string>;
}

export default function BlogCardTracker({ contextKey = "default", hasSearch = false, categoryFilter = "all", tagFilter = "all" }: {
  contextKey?: string;
  hasSearch?: boolean;
  categoryFilter?: string;
  tagFilter?: string;
}) {
  const pathname = usePathname();
  const state = useRef<CardState | null>(null);
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_TOKEN || !process.env.NEXT_PUBLIC_POSTHOG_HOST
      || process.env.NEXT_PUBLIC_BLOG_CARD_TRACKING_ENABLED === "false") return;
    const context = `${pathname}:${contextKey}`;
    const records = new Map<HTMLElement, ReturnType<typeof setTimeout> | null>();
    let frame = 0;
    const allowed = () => {
      const blocked = shouldSkipCapture();
      if (blocked) state.current = null;
      return document.visibilityState === "visible" && !blocked;
    };
    const current = () => {
      if (!allowed()) { if (shouldSkipCapture()) state.current = null; return null; }
      const session = getAnalyticsSessionId();
      if (!session) return null;
      if (!state.current || state.current.context !== context || state.current.session !== session) {
        state.current = { context, id: crypto.randomUUID(), session, impressions: new Set(), clicks: new Set() };
      }
      return state.current;
    };
    const cardKey = (node: HTMLElement) => [node.dataset.cardSurface, node.dataset.cardGroup, node.dataset.cardPosition, node.dataset.blogCard].join(":");
    const properties = (node: HTMLElement, value: CardState) => ({
      card_measurement_version: CARD_MEASUREMENT_VERSION,
      card_view_id: value.id, card_session_id: value.session, card_key: cardKey(node),
      target_slug: node.dataset.blogCard, target_category: node.dataset.cardCategory,
      source_path: pathname, page_path: pathname, surface: node.dataset.cardSurface,
      card_group: node.dataset.cardGroup, position: Number(node.dataset.cardPosition),
      has_search: hasSearch, category_filter: categoryFilter, tag_filter: tagFilter,
      // Search text stays in memory. Do not attach the current query string to new events.
      $current_url: `${location.origin}${pathname}`, $pathname: pathname,
      $referrer: document.referrer ? new URL(document.referrer).origin + new URL(document.referrer).pathname : "",
      $session_entry_url: null, $session_entry_referrer: null,
      $initial_current_url: null, $initial_referrer: null,
    });
    const cancel = (node: HTMLElement) => {
      const timer = records.get(node);
      if (timer) clearTimeout(timer);
      records.set(node, null);
    };
    const ratio = (node: HTMLElement) => visibleCardRatio(node.getBoundingClientRect(), innerWidth, innerHeight);
    const schedule = (node: HTMLElement) => {
      if (!allowed() || ratio(node) < 0.5) { cancel(node); return; }
      const value = current();
      if (!value || value.impressions.has(cardKey(node)) || records.get(node)) return;
      const key = cardKey(node);
      records.set(node, setTimeout(() => {
        records.set(node, null);
        if (!node.isConnected || !allowed() || ratio(node) < 0.5 || key !== cardKey(node)) return;
        const latest = current();
        if (!latest || latest.id !== value.id || latest.impressions.has(key)) { schedule(node); return; }
        if (captureReadingEvent("blog_card_impression", { ...properties(node, latest), visible_ms: 1000, visibility_threshold: 0.5 })) {
          latest.impressions.add(key);
        }
      }, 1000));
    };
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        const node = entry.target as HTMLElement;
        if (entry.intersectionRatio < 0.5) cancel(node);
        else schedule(node);
      }
    }, { threshold: [0, 0.5, 1] });
    const refresh = () => {
      const nodes = new Set(document.querySelectorAll<HTMLElement>("[data-blog-card]"));
      for (const node of records.keys()) if (!nodes.has(node)) {
        cancel(node); records.delete(node); observer.unobserve(node);
      }
      for (const node of nodes) {
        if (!records.has(node)) { records.set(node, null); observer.observe(node); }
        schedule(node);
      }
    };
    const queueRefresh = () => {
      if (!frame) frame = requestAnimationFrame(() => { frame = 0; refresh(); });
    };
    const click = (event: MouseEvent) => {
      if (event.type === "auxclick" && event.button !== 1) return;
      const target = event.target instanceof Element ? event.target : null;
      const link = target?.closest<HTMLAnchorElement>("a[href]");
      const node = link?.closest<HTMLElement>("[data-blog-card]");
      if (!link || !node || link.origin !== location.origin || link.pathname !== node.dataset.cardHref) return;
      const value = current();
      if (!value) return;
      const key = cardKey(node);
      if (value.clicks.has(key)) return;
      if (captureReadingEvent("blog_card_clicked", {
        ...properties(node, value), qualified_impression: value.impressions.has(key),
      })) value.clicks.add(key);
    };
    const visibility = () => {
      for (const node of records.keys()) cancel(node);
      if (allowed()) refresh();
    };
    const pagehide = () => { for (const node of records.keys()) cancel(node); };
    const mutation = new MutationObserver(changes => {
      for (const change of changes) if (change.type === "attributes" && change.target instanceof HTMLElement && records.has(change.target)) cancel(change.target);
      queueRefresh();
    });
    mutation.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-blog-card", "data-card-position", "data-card-group"] });
    document.addEventListener("click", click, true);
    document.addEventListener("auxclick", click, true);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pageshow", visibility);
    window.addEventListener("pagehide", pagehide);
    refresh();
    return () => {
      for (const node of records.keys()) cancel(node);
      observer.disconnect(); mutation.disconnect(); cancelAnimationFrame(frame);
      document.removeEventListener("click", click, true);
      document.removeEventListener("auxclick", click, true);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pageshow", visibility);
      window.removeEventListener("pagehide", pagehide);
    };
  }, [pathname, contextKey, hasSearch, categoryFilter, tagFilter]);
  return null;
}
