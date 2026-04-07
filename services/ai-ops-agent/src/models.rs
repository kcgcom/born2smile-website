use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HealthResponse {
    pub ok: bool,
    pub service: &'static str,
    pub version: &'static str,
    pub has_database: bool,
    pub has_llm: bool,
    pub llm_model: Option<String>,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MetricSnapshot {
    pub sessions: Option<i64>,
    pub sessions_change: Option<f64>,
    pub clicks: Option<i64>,
    pub clicks_change: Option<f64>,
    pub impressions: Option<i64>,
    pub impressions_change: Option<f64>,
    pub posts_needing_attention: i64,
    pub pages_needing_attention: i64,
    #[serde(default)]
    pub tasks_ready_today: i64,
    #[serde(default)]
    pub signals_pending_review: i64,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CandidateIssue {
    pub code: String,
    pub label: String,
    pub detail: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CandidateStats {
    pub impressions: Option<i64>,
    pub ctr: Option<f64>,
    pub position: Option<f64>,
    pub clicks: Option<i64>,
    #[serde(default)]
    pub sessions: Option<i64>,
    #[serde(default)]
    pub cta_clicks: Option<i64>,
    pub published_date: Option<String>,
    #[serde(default)]
    pub last_applied_at: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Candidate {
    pub id: String,
    pub target_type: String,
    pub target_id: String,
    pub title: String,
    pub subtitle: Option<String>,
    pub suggestion_types: Vec<String>,
    #[serde(default)]
    pub playbook_ids: Vec<String>,
    pub priority_score: i32,
    pub primary_issue: String,
    pub issues: Vec<CandidateIssue>,
    #[serde(default)]
    pub difficulty: Option<String>,
    #[serde(default)]
    pub signal_state: Option<String>,
    #[serde(default)]
    pub evidence: Value,
    pub stats: Option<CandidateStats>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecommendedAction {
    pub id: String,
    pub title: String,
    pub description: String,
    pub target_type: String,
    pub target_id: String,
    pub suggestion_type: Option<String>,
    #[serde(default)]
    pub playbook_id: Option<String>,
    pub priority_score: i32,
    #[serde(default)]
    pub difficulty: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BriefingResponse {
    pub period: String,
    pub period_type: String,
    pub generated_at: DateTime<Utc>,
    pub headline: String,
    pub summary: String,
    pub metrics: MetricSnapshot,
    pub recommended_actions: Vec<RecommendedAction>,
    pub top_candidates: Vec<Candidate>,
    #[serde(default)]
    pub today_tasks: Vec<RecommendedAction>,
    #[serde(default)]
    pub content_debt_queue: Vec<Candidate>,
    #[serde(default)]
    pub search_opportunity_queue: Vec<Candidate>,
    #[serde(default)]
    pub pending_observation: Vec<Value>,
    #[serde(default)]
    pub recent_signals: Vec<Value>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SuggestionRecord {
    pub id: i64,
    pub target_type: String,
    pub target_id: String,
    pub suggestion_type: String,
    #[serde(default)]
    pub playbook_id: Option<String>,
    pub title: String,
    pub before_json: Value,
    pub after_json: Value,
    pub reason: String,
    pub priority_score: i32,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub created_by: String,
    pub approved_at: Option<DateTime<Utc>>,
    pub approved_by: Option<String>,
    pub applied_at: Option<DateTime<Utc>>,
    pub applied_by: Option<String>,
    pub target_label: String,
    pub can_apply: bool,
    #[serde(default)]
    pub apply_mode: Option<String>,
    #[serde(default)]
    pub evidence: Value,
    #[serde(default)]
    pub observation_plan: Option<Value>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateSuggestionRequest {
    pub target_type: String,
    pub target_id: String,
    pub suggestion_type: String,
    #[serde(default)]
    #[serde(alias = "playbookId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub playbook_id: Option<String>,
    #[serde(default)]
    #[serde(alias = "actor_email")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub actor_email: Option<String>,
    #[serde(default)]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub context: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SuggestionActionRequest {
    #[serde(default)]
    #[serde(alias = "actor_email")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub actor_email: Option<String>,
    #[serde(default)]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub note: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SuggestionJob {
    pub id: i64,
    pub job_type: String,
    pub target_type: String,
    pub target_id: String,
    pub suggestion_type: String,
    pub actor_email: String,
    pub context: Option<String>,
    pub payload_json: Value,
    pub status: String,
    pub stage: String,
    pub message: String,
    pub result_suggestion_id: Option<i64>,
    pub last_error: Option<String>,
    pub created_at: DateTime<Utc>,
    pub started_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivityItem {
    pub id: i64,
    pub suggestion_id: Option<i64>,
    pub action: String,
    pub actor_email: String,
    pub note: Option<String>,
    pub created_at: DateTime<Utc>,
    pub suggestion_title: String,
    pub suggestion_type: Option<String>,
    pub target_type: String,
    pub target_id: String,
    pub target_label: String,
    #[serde(default)]
    pub signal_verdict: Option<String>,
    #[serde(default)]
    pub signal_window_days: Option<i64>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TargetOption {
    pub id: String,
    pub label: String,
    pub target_type: String,
    pub note: Option<String>,
    #[serde(default)]
    pub priority_score: Option<i32>,
    #[serde(default)]
    pub difficulty: Option<String>,
    #[serde(default)]
    pub signal_state: Option<String>,
    #[serde(default)]
    pub cooldown_until: Option<String>,
    #[serde(default)]
    pub last_applied_at: Option<String>,
    #[serde(default)]
    pub recommended_playbooks: Vec<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Playbook {
    pub id: String,
    pub label: String,
    pub summary: String,
    pub description: String,
    pub target_types: Vec<String>,
    pub default_suggestion_type: String,
    pub difficulty: String,
    pub apply_mode: String,
    pub recommended_for: Vec<String>,
    pub operator_prompt_hint: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OpportunityListResponse {
    pub opportunities: Vec<Candidate>,
    pub playbooks: Vec<Playbook>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OutcomesResponse {
    #[serde(default)]
    pub items: Vec<Value>,
    #[serde(default)]
    pub pending: Vec<Value>,
}
