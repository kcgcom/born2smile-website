use axum::{extract::{Path, Query, State}, http::StatusCode, Extension, Json};
use chrono::Utc;
use serde::Deserialize;
use serde_json::json;

use crate::{app::AppState, models::{CreateSuggestionRequest, SuggestionActionRequest, SuggestionRecord}};

#[derive(Debug, Deserialize)]
pub struct SuggestionsQuery {
    pub status: Option<String>,
    #[serde(alias = "targetType")]
    pub target_type: Option<String>,
    pub limit: Option<u16>,
}

pub async fn list(State(_state): State<AppState>, Query(query): Query<SuggestionsQuery>) -> Json<Vec<SuggestionRecord>> {
    let limit = query.limit.unwrap_or(10).max(1) as i64;
    let now = Utc::now();
    let target_type = query.target_type.unwrap_or_else(|| "post".to_string());

    Json((0..limit.min(3)).map(|index| SuggestionRecord {
        id: index + 1,
        target_type: target_type.clone(),
        target_id: format!("target-{}", index + 1),
        suggestion_type: "title".to_string(),
        title: format!("샘플 제안 {}", index + 1),
        before_json: json!({ "title": "before" }),
        after_json: json!({ "title": "after" }),
        reason: format!("스캐폴드 응답 (status={})", query.status.clone().unwrap_or_else(|| "all".to_string())),
        priority_score: 25,
        status: query.status.clone().unwrap_or_else(|| "draft".to_string()),
        created_at: now,
    }).collect())
}

pub async fn create(
    State(_state): State<AppState>,
    Extension(admin_email): Extension<String>,
    Json(payload): Json<CreateSuggestionRequest>,
) -> (StatusCode, Json<SuggestionRecord>) {
    let now = Utc::now();
    let actor_email = payload.actor_email.unwrap_or(admin_email);
    let record = SuggestionRecord {
        id: now.timestamp_millis(),
        target_type: payload.target_type,
        target_id: payload.target_id,
        suggestion_type: payload.suggestion_type,
        title: format!("{} 대상 스캐폴드 제안", actor_email),
        before_json: json!({}),
        after_json: json!({}),
        reason: payload.context.map(|value| format!("스캐폴드 컨텍스트: {}", value)).unwrap_or_else(|| "실제 제안 생성 엔진은 이후 단계에서 연결됩니다.".to_string()),
        priority_score: 20,
        status: "draft".to_string(),
        created_at: now,
    };
    (StatusCode::CREATED, Json(record))
}

async fn transition(id: i64, action: &str, payload: SuggestionActionRequest, admin_email: String) -> Json<SuggestionRecord> {
    let now = Utc::now();
    Json(SuggestionRecord {
        id,
        target_type: "post".to_string(),
        target_id: "target-1".to_string(),
        suggestion_type: "title".to_string(),
        title: format!("{} 처리됨", action),
        before_json: json!({ "note": payload.note }),
        after_json: json!({ "actor": payload.actor_email.unwrap_or(admin_email) }),
        reason: format!("{} 액션 스캐폴드 응답", action),
        priority_score: 20,
        status: if action == "apply" { "applied".to_string() } else if action == "approve" { "approved".to_string() } else { "rejected".to_string() },
        created_at: now,
    })
}

pub async fn approve(Path(id): Path<i64>, Extension(admin_email): Extension<String>, Json(payload): Json<SuggestionActionRequest>) -> Json<SuggestionRecord> {
    transition(id, "approve", payload, admin_email).await
}

pub async fn reject(Path(id): Path<i64>, Extension(admin_email): Extension<String>, Json(payload): Json<SuggestionActionRequest>) -> Json<SuggestionRecord> {
    transition(id, "reject", payload, admin_email).await
}

pub async fn apply(Path(id): Path<i64>, Extension(admin_email): Extension<String>, Json(payload): Json<SuggestionActionRequest>) -> Json<SuggestionRecord> {
    transition(id, "apply", payload, admin_email).await
}
