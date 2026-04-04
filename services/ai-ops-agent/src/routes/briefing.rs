use axum::{
    extract::{Query, State},
    response::Response,
    Json,
};
use serde::Deserialize;

use crate::{
    app::AppState,
    models::BriefingResponse,
    routes::api_error,
};

#[derive(Debug, Deserialize)]
pub struct BriefingQuery {
    pub period: Option<String>,
}

pub async fn get(
    State(state): State<AppState>,
    Query(query): Query<BriefingQuery>,
) -> Result<Json<BriefingResponse>, Response> {
    let period = if query.period.as_deref() == Some("28d") {
        "28d"
    } else {
        "7d"
    };

    let args = vec!["briefing".to_string(), "--period".to_string(), period.to_string()];
    let data = state
        .bridge
        .run::<BriefingResponse>(&args, None)
        .await
        .map_err(|error| api_error(axum::http::StatusCode::from_u16(error.status).unwrap_or(axum::http::StatusCode::INTERNAL_SERVER_ERROR), "API_ERROR", error.message))?;

    Ok(Json(data))
}
