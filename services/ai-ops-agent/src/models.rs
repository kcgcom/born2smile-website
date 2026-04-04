use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Serialize)]
pub struct HealthResponse {
    pub ok: bool,
    pub service: &'static str,
    pub version: &'static str,
    pub has_database: bool,
    pub has_llm: bool,
    pub llm_model: Option<String>,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize)]
pub struct MetricSnapshot {
    pub sessions: Option<i64>,
    pub clicks: Option<i64>,
    pub impressions: Option<i64>,
    pub posts_needing_attention: i64,
    pub pages_needing_attention: i64,
}

#[derive(Debug, Clone, Serialize)]
pub struct RecommendedAction {
    pub id: String,
    pub title: String,
    pub description: String,
    pub target_type: String,
    pub target_id: String,
    pub suggestion_type: Option<String>,
    pub priority_score: i32,
}

#[derive(Debug, Clone, Serialize)]
pub struct BriefingResponse {
    pub period: String,
    pub generated_at: DateTime<Utc>,
    pub headline: String,
    pub summary: String,
    pub metrics: MetricSnapshot,
    pub recommended_actions: Vec<RecommendedAction>,
}

#[derive(Debug, Clone, Serialize)]
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
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateSuggestionRequest {
    pub target_type: String,
    pub target_id: String,
    pub suggestion_type: String,
    #[serde(default)]
    pub actor_email: Option<String>,
    #[serde(default)]
    pub context: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct SuggestionActionRequest {
    #[serde(default)]
    pub actor_email: Option<String>,
    #[serde(default)]
    pub note: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
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
}

#[derive(Debug, Clone, Serialize)]
pub struct TargetOption {
    pub id: String,
    pub label: String,
    pub target_type: String,
    pub note: Option<String>,
}
