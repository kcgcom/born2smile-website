use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::Response,
    Json,
};
use serde::Deserialize;

use crate::{
    app::AppState,
    models::OutcomesResponse,
    routes::api_error,
};

#[derive(Debug, Deserialize)]
pub struct OutcomesQuery {
    pub limit: Option<u16>,
}

pub async fn list(
    State(state): State<AppState>,
    Query(query): Query<OutcomesQuery>,
) -> Result<Json<OutcomesResponse>, Response> {
    let limit = query.limit.unwrap_or(20).max(1);
    let args = vec!["outcomes".to_string(), "--limit".to_string(), limit.to_string()];
    let data = state
        .bridge
        .run::<OutcomesResponse>(&args, None)
        .await
        .map_err(|error| api_error(StatusCode::from_u16(error.status).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR), "API_ERROR", error.message))?;

    Ok(Json(data))
}
