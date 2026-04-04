use axum::{extract::State, Json};
use chrono::Utc;

use crate::{app::AppState, models::HealthResponse};

pub async fn get(State(state): State<AppState>) -> Json<HealthResponse> {
    Json(HealthResponse {
        ok: true,
        service: "ai-ops-agent",
        version: env!("CARGO_PKG_VERSION"),
        has_database: state.db.is_some(),
        has_llm: state.config.llm_base_url.is_some(),
        llm_model: state.config.llm_model.clone(),
        timestamp: Utc::now(),
    })
}
