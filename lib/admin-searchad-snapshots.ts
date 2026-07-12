import type { CategoryKeywords } from "@/lib/admin-naver-datalab-keywords";
import {
  getActiveKeywordTaxonomy,
  getKeywordTaxonomyByVersion,
  getKeywordTaxonomyState,
  refreshKeywordTaxonomyCandidates,
} from "@/lib/admin-keyword-taxonomy";
import { fetchNaverDatalabByCategory } from "@/lib/admin-naver-datalab";
import {
  fetchKeywordSearchVolume,
  isSearchAdConfigured,
  type SearchAdKeywordData,
} from "@/lib/admin-naver-searchad";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export type SearchAdSyncStatus = "idle" | "queued" | "running" | "completed" | "failed";

export interface SearchAdSyncState {
  jobId: string | null;
  status: SearchAdSyncStatus;
  totalKeywords: number;
  processedKeywords: number;
  error: string | null;
  snapshotCreatedAt: string | null;
  snapshotKeywordCount: number | null;
  snapshotResultCount: number | null;
  taxonomyVersion: number | null;
  snapshotTaxonomyVersion: number | null;
  candidateAnalysisStatus: "pending" | "running" | "completed" | "failed" | null;
  candidateAnalysisError: string | null;
  candidateAnalyzedAt: string | null;
}

export interface ActiveSearchAdSnapshot {
  id: string;
  createdAt: string;
  data: SearchAdKeywordData[];
  taxonomyVersion: number | null;
}

interface SyncJobRow {
  id: string;
  status: Exclude<SearchAdSyncStatus, "idle">;
  total_keywords: number;
  processed_keywords: number;
  error_message: string | null;
  created_at?: string;
  taxonomy_version: number | null;
  candidate_analysis_status?: "pending" | "running" | "completed" | "failed" | null;
  candidate_analysis_error?: string | null;
  candidate_analyzed_at?: string | null;
}

export function getAllSearchAdKeywords(taxonomy: CategoryKeywords[]): string[] {
  return [...new Set(
    taxonomy.flatMap((category) =>
      category.subGroups.flatMap((subGroup) => subGroup.keywords),
    ),
  )];
}

export async function getActiveSearchAdSnapshot(): Promise<SearchAdKeywordData[] | null> {
  return (await getActiveSearchAdSnapshotRecord())?.data ?? null;
}

export async function getActiveSearchAdSnapshotRecord(): Promise<ActiveSearchAdSnapshot | null> {
  const admin = getSupabaseAdmin();
  const { data: pointer, error: pointerError } = await admin
    .from("searchad_snapshot_pointer")
    .select("snapshot_id")
    .eq("singleton", true)
    .maybeSingle();

  if (pointerError) {
    if (pointerError.code === "42P01") return null;
    throw pointerError;
  }
  if (!pointer?.snapshot_id) return null;

  const { data: snapshot, error } = await admin
    .from("searchad_snapshots")
    .select("id,data,created_at,taxonomy_version")
    .eq("id", pointer.snapshot_id)
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

export async function createSearchAdSyncJob(createdBy: string): Promise<SearchAdSyncState> {
  if (!isSearchAdConfigured()) throw new Error("네이버 SearchAd API 설정이 없습니다.");

  const admin = getSupabaseAdmin();
  const taxonomyState = await getKeywordTaxonomyState();
  const targetTaxonomy = taxonomyState.pending ?? taxonomyState.active;
  const { taxonomy } = targetTaxonomy;
  const keywords = getAllSearchAdKeywords(taxonomy);
  const { data: active } = await admin
    .from("searchad_sync_jobs")
    .select("id,status,total_keywords,processed_keywords,error_message,created_at,taxonomy_version")
    .in("status", ["queued", "running"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (active) {
    const ageMs = Date.now() - new Date(active.created_at).getTime();
    if (ageMs < 20 * 60 * 1000) return mapJobState(active as SyncJobRow, null);
    await admin
      .from("searchad_sync_jobs")
      .update({
        status: "failed",
        error_message: "동기화 작업 제한 시간을 초과했습니다.",
        completed_at: new Date().toISOString(),
      })
      .eq("id", active.id);
  }

  const { data, error } = await admin
    .from("searchad_sync_jobs")
    .insert({
      created_by: createdBy,
      total_keywords: keywords.length,
      taxonomy_version: targetTaxonomy.version,
    })
    .select("id,status,total_keywords,processed_keywords,error_message,taxonomy_version")
    .single();
  if (error) {
    if (error.code === "23505") return getSearchAdSyncState();
    throw error;
  }
  return mapJobState(data as SyncJobRow, null);
}

export async function runSearchAdSyncJob(jobId: string): Promise<void> {
  const admin = getSupabaseAdmin();

  try {
    const { data: claimedJob, error: startError } = await admin
      .from("searchad_sync_jobs")
      .update({ status: "running", started_at: new Date().toISOString(), error_message: null })
      .eq("id", jobId)
      .eq("status", "queued")
      .select("id,taxonomy_version")
      .maybeSingle();
    if (startError) throw startError;
    if (!claimedJob) return;
    if (claimedJob.taxonomy_version == null) throw new Error("수집 작업에 택소노미 버전이 없습니다.");

    const targetTaxonomy = await getKeywordTaxonomyByVersion(claimedJob.taxonomy_version);
    const keywords = getAllSearchAdKeywords(targetTaxonomy.taxonomy);

    const [results, datalab] = await Promise.all([
      fetchKeywordSearchVolume(keywords),
      collectDatalabSnapshot(targetTaxonomy.taxonomy),
    ]);
    if (!results?.length) throw new Error("SearchAd API가 검색량 데이터를 반환하지 않았습니다.");

    const { data: snapshot, error: snapshotError } = await admin
      .from("searchad_snapshots")
      .insert({
        job_id: jobId,
        keyword_count: keywords.length,
        result_count: results.length,
        data: results,
        taxonomy_version: targetTaxonomy.version,
      })
      .select("id")
      .single();
    if (snapshotError) throw snapshotError;

    const { data: datalabSnapshot, error: datalabError } = await admin
      .from("datalab_snapshots")
      .insert({
        job_id: jobId,
        taxonomy_version: targetTaxonomy.version,
        short_term_data: datalab.shortTerm,
        long_term_data: datalab.longTerm,
      })
      .select("id")
      .single();
    if (datalabError) throw datalabError;

    const { error: publishError } = await admin.rpc("publish_keyword_analysis", {
      p_taxonomy_version: targetTaxonomy.version,
      p_searchad_snapshot_id: snapshot.id,
      p_datalab_snapshot_id: datalabSnapshot.id,
      p_job_id: jobId,
    });
    if (publishError) throw publishError;
    await admin.from("searchad_sync_jobs").update({ candidate_analysis_status: "running", candidate_analysis_error: null }).eq("id", jobId);
    try {
      await refreshKeywordTaxonomyCandidates();
      await admin.from("searchad_sync_jobs").update({ candidate_analysis_status: "completed", candidate_analyzed_at: new Date().toISOString() }).eq("id", jobId);
    } catch (error) {
      await admin.from("searchad_sync_jobs").update({
        candidate_analysis_status: "failed",
        candidate_analysis_error: error instanceof Error ? error.message : "후보 분석에 실패했습니다.",
      }).eq("id", jobId);
    }
    await cleanupOldAnalysisData();
  } catch (error) {
    await admin
      .from("searchad_sync_jobs")
      .update({
        status: "failed",
        error_message: error instanceof Error ? error.message : "통합 데이터 수집에 실패했습니다.",
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);
    throw error;
  }
}

async function cleanupOldAnalysisData(): Promise<void> {
  try {
    const admin = getSupabaseAdmin();
    const { data: oldJobs, error } = await admin
      .from("searchad_sync_jobs")
      .select("id")
      .in("status", ["completed", "failed"])
      .order("created_at", { ascending: false })
      .range(30, 999);
    if (error || !oldJobs?.length) return;
    await admin.from("searchad_sync_jobs").delete().in("id", oldJobs.map((job) => job.id));
  } catch {
    // 보존 정리는 게시 성공 여부에 영향을 주지 않는다.
  }
}

export async function getSearchAdSyncState(): Promise<SearchAdSyncState> {
  const admin = getSupabaseAdmin();
  const [{ data: job, error: jobError }, { data: pointer, error: pointerError }] = await Promise.all([
    admin
      .from("searchad_sync_jobs")
      .select("id,status,total_keywords,processed_keywords,error_message,taxonomy_version,candidate_analysis_status,candidate_analysis_error,candidate_analyzed_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from("searchad_snapshot_pointer")
      .select("searchad_snapshots(created_at,keyword_count,result_count,taxonomy_version)")
      .eq("singleton", true)
      .maybeSingle(),
  ]);

  if (jobError && jobError.code !== "42P01") throw jobError;
  if (pointerError && pointerError.code !== "42P01") throw pointerError;

  const joined = pointer?.searchad_snapshots as unknown as {
    created_at: string;
    keyword_count: number;
    result_count: number;
    taxonomy_version: number | null;
  } | null;
  return job
    ? mapJobState(job as SyncJobRow, joined)
    : {
        jobId: null,
        status: "idle",
        totalKeywords: getAllSearchAdKeywords((await getActiveKeywordTaxonomy()).taxonomy).length,
        processedKeywords: 0,
        error: null,
        snapshotCreatedAt: joined?.created_at ?? null,
        snapshotKeywordCount: joined?.keyword_count ?? null,
        snapshotResultCount: joined?.result_count ?? null,
        taxonomyVersion: null,
        snapshotTaxonomyVersion: joined?.taxonomy_version ?? null,
        candidateAnalysisStatus: null,
        candidateAnalysisError: null,
        candidateAnalyzedAt: null,
      };
}

function mapJobState(
  job: SyncJobRow,
  snapshot: { created_at: string; keyword_count: number; result_count: number } | null,
): SearchAdSyncState {
  return {
    jobId: job.id,
    status: job.status,
    totalKeywords: job.total_keywords,
    processedKeywords: job.processed_keywords,
    error: job.error_message,
    snapshotCreatedAt: snapshot?.created_at ?? null,
    snapshotKeywordCount: snapshot?.keyword_count ?? null,
    snapshotResultCount: snapshot?.result_count ?? null,
    taxonomyVersion: job.taxonomy_version,
    snapshotTaxonomyVersion: (snapshot as { taxonomy_version?: number | null } | null)?.taxonomy_version ?? null,
    candidateAnalysisStatus: job.candidate_analysis_status ?? null,
    candidateAnalysisError: job.candidate_analysis_error ?? null,
    candidateAnalyzedAt: job.candidate_analyzed_at ?? null,
  };
}

async function collectDatalabSnapshot(taxonomy: CategoryKeywords[]) {
  const collect = async (period: "6m" | "3y") => {
    const rows = [];
    for (let index = 0; index < taxonomy.length; index++) {
      if (index > 0) await new Promise((resolve) => setTimeout(resolve, 500));
      const category = taxonomy[index];
      const raw = await fetchNaverDatalabByCategory(category.subGroups, period);
      rows.push({ category: category.category, slug: category.slug, raw });
    }
    return rows;
  };

  const shortTerm = await collect("6m");
  const longTerm = await collect("3y");
  return { shortTerm, longTerm };
}
