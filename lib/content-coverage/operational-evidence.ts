import { createHash } from "node:crypto";
import { getAllPublishedPostsUncached } from "../blog-supabase";
import { TREATMENT_DETAILS } from "../treatments";
import { buildEvidenceSnapshot } from "./evidence";
import type { EvidenceSnapshot } from "./types";

export function calculateTargetEvidenceRevision(snapshot: EvidenceSnapshot, targetPath: string): string | null {
  const isBlogCollection = targetPath === "/blog" || /^\/blog\/[^/]+$/.test(targetPath);
  const revisions = snapshot.documents.flatMap((document) => document.units.flatMap((unit) => {
    const matchesTarget = unit.placements.some((placement) => placement.visible && placement.indexable
      && (placement.path === targetPath || (isBlogCollection && placement.path.startsWith(`${targetPath}/`))));
    return matchesTarget ? [{ documentId: document.id, unitId: unit.id, contentHash: unit.contentHash }] : [];
  })).sort((left, right) => left.documentId.localeCompare(right.documentId) || left.unitId.localeCompare(right.unitId));
  if (revisions.length === 0) return null;
  return createHash("sha256").update(JSON.stringify(revisions)).digest("hex");
}

export async function getCurrentTargetEvidenceRevision(targetPath: string): Promise<string | null> {
  const posts = await getAllPublishedPostsUncached();
  const snapshot = buildEvidenceSnapshot(posts, TREATMENT_DETAILS, new Date().toISOString());
  return calculateTargetEvidenceRevision(snapshot, targetPath);
}
