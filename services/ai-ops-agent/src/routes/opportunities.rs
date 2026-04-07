use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::Response,
    Json,
};
use serde::Deserialize;

use crate::{
    app::AppState,
    models::OpportunityListResponse,
    routes::api_error,
};

#[derive(Debug, Deserialize)]
pub struct OpportunitiesQuery {
    pub period: Option<String>,
    pub limit: Option<u16>,
}

pub async fn list(
    State(state): State<AppState>,
    Query(query): Query<OpportunitiesQuery>,
) -> Result<Json<OpportunityListResponse>, Response> {
    let period = match query.period.as_deref() {
        Some("60d") => "60d",
        Some("14d") | Some("7d") => "14d",
        _ => "30d",
    };
    let limit = query.limit.unwrap_or(18).max(1);

    let args = vec![
        "opportunities".to_string(),
        "--period".to_string(),
        period.to_string(),
        "--limit".to_string(),
        limit.to_string(),
    ];

    let data = state
        .bridge
        .run::<OpportunityListResponse>(&args, None)
        .await
        .map_err(|error| api_error(StatusCode::from_u16(error.status).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR), "API_ERROR", error.message))?;

    Ok(Json(data))
}
