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
    pub published_date: Option<String>,
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
    pub priority_score: i32,
    pub primary_issue: String,
    pub issues: Vec<CandidateIssue>,
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
    pub priority_score: i32,
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
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SuggestionRecord {
    pub id: i64,
    pub target_type: String,
    pub target_id: String,
    pub suggestion_type: String,
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
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateSuggestionRequest {
    pub target_type: String,
    pub target_id: String,
    pub suggestion_type: String,
    #[serde(default)]
    #[serde(alias = "actor_email")]
    pub actor_email: Option<String>,
    #[serde(default)]
    pub context: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SuggestionActionRequest {
    #[serde(default)]
    #[serde(alias = "actor_email")]
    pub actor_email: Option<String>,
    #[serde(default)]
    pub note: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivityItem {
    pub id: i64,
    pub suggestion_id: i64,
    pub action: String,
    pub actor_email: String,
    pub note: Option<String>,
    pub created_at: DateTime<Utc>,
    pub suggestion_title: String,
    pub suggestion_type: String,
    pub target_type: String,
    pub target_id: String,
    pub target_label: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TargetOption {
    pub id: String,
    pub label: String,
    pub target_type: String,
    pub note: Option<String>,
}
