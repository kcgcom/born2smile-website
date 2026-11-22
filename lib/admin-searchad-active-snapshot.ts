import type { SearchAdKeywordData } from "@/lib/admin-naver-searchad";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export interface ActiveSearchAdSnapshot {
  id: string;
  createdAt: string;
  data: SearchAdKeywordData[];
  taxonomyVersion: number | null;
}

// Published snapshots are immutable. Keep only one payload per process and
// check the live pointer on every call so a new publication is visible immediately.
let cachedActiveSnapshot: {
  id: string;
  result: Promise<ActiveSearchAdSnapshot | null>;
} | undefined;

export async function getActiveSearchAdSnapshotRecord({ allowMissingPointerTable = true } = {}): Promise<ActiveSearchAdSnapshot | null> {
  const admin = getSupabaseAdmin();
  const { data: pointer, error: pointerError } = await admin
    .from("searchad_snapshot_pointer")
    .select("snapshot_id")
    .eq("singleton", true)
    .maybeSingle();

  if (pointerError) {
    if (allowMissingPointerTable && pointerError.code === "42P01") return null;
    throw pointerError;
  }
  const id: string | undefined = pointer?.snapshot_id;
  if (!id) return null;
  if (cachedActiveSnapshot?.id === id) return cachedActiveSnapshot.result;

  const entry = {
    id,
    result: readSearchAdSnapshot(id),
  };
  cachedActiveSnapshot = entry;
  try {
    const snapshot = await entry.result;
    if (!snapshot && cachedActiveSnapshot === entry) cachedActiveSnapshot = undefined;
    return snapshot;
  } catch (error) {
    if (cachedActiveSnapshot === entry) cachedActiveSnapshot = undefined;
    throw error;
  }
}

async function readSearchAdSnapshot(id: string): Promise<ActiveSearchAdSnapshot | null> {
  const { data: snapshot, error } = await getSupabaseAdmin()
    .from("searchad_snapshots")
    .select("id,data,created_at,taxonomy_version")
    .eq("id", id)
    .single();
  if (error) throw error;
  return Array.isArray(snapshot.data)
    ? {
        id: snapshot.id,
        createdAt: snapshot.created_at,
        data: snapshot.data as SearchAdKeywordData[],
        taxonomyVersion: snapshot.taxonomy_version,
      }
    : null;
}
