use axum::{extract::{Query, State}, Json};
use chrono::Utc;
use serde::Deserialize;

use crate::{app::AppState, models::ActivityItem};

#[derive(Debug, Deserialize)]
pub struct ActivityQuery {
    pub limit: Option<u16>,
}

pub async fn list(State(_state): State<AppState>, Query(query): Query<ActivityQuery>) -> Json<Vec<ActivityItem>> {
    let limit = query.limit.unwrap_or(10).max(1) as i64;
    let now = Utc::now();

    Json((0..limit.min(5)).map(|index| ActivityItem {
        id: index + 1,
        suggestion_id: index + 1,
        action: "approve".to_string(),
        actor_email: "scaffold@local".to_string(),
        note: Some("스캐폴드 활동 로그".to_string()),
        created_at: now,
        suggestion_title: format!("샘플 제안 {}", index + 1),
        suggestion_type: "title".to_string(),
        target_type: "post".to_string(),
        target_id: format!("target-{}", index + 1),
    }).collect())
}
