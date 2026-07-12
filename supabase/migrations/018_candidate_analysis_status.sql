alter table public.searchad_sync_jobs
  add column if not exists candidate_analysis_status text
    check (candidate_analysis_status in ('pending', 'running', 'completed', 'failed')),
  add column if not exists candidate_analysis_error text,
  add column if not exists candidate_analyzed_at timestamptz;
