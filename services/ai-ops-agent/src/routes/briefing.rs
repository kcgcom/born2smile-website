use axum::{extract::{Query, State}, Json};
use chrono::Utc;
use serde::Deserialize;

use crate::{app::AppState, models::{BriefingResponse, MetricSnapshot, RecommendedAction}};

#[derive(Debug, Deserialize)]
pub struct BriefingQuery {
    pub period: Option<String>,
}

pub async fn get(State(_state): State<AppState>, Query(query): Query<BriefingQuery>) -> Json<BriefingResponse> {
    let period = query.period.unwrap_or_else(|| "7d".to_string());

    Json(BriefingResponse {
        period,
        generated_at: Utc::now(),
        headline: "AI 운영 브리핑 스캐폴드".to_string(),
        summary: "실제 분석 엔진 연결 전까지는 라우트/응답 계약만 고정합니다.".to_string(),
        metrics: MetricSnapshot {
            sessions: None,
            clicks: None,
            impressions: None,
            posts_needing_attention: 0,
            pages_needing_attention: 0,
        },
        recommended_actions: vec![RecommendedAction {
            id: "scaffold-1".to_string(),
            title: "실제 Supabase/LLM 연결".to_string(),
            description: "다음 단계에서 DB 및 내부 LLM 엔드포인트를 연결합니다.".to_string(),
            target_type: "site".to_string(),
            target_id: "site".to_string(),
            suggestion_type: Some("title".to_string()),
            priority_score: 10,
        }],
    })
}
