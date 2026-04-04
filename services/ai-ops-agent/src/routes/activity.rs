use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::Response,
    Json,
};
use serde::Deserialize;

use crate::{
    app::AppState,
    models::ActivityItem,
    routes::api_error,
};

#[derive(Debug, Deserialize)]
pub struct ActivityQuery {
    pub limit: Option<u16>,
}

pub async fn list(
    State(state): State<AppState>,
    Query(query): Query<ActivityQuery>,
) -> Result<Json<Vec<ActivityItem>>, Response> {
    let limit = query.limit.unwrap_or(30).max(1);
    let args = vec!["activity".to_string(), "--limit".to_string(), limit.to_string()];

    let data = state
        .bridge
        .run::<Vec<ActivityItem>>(&args, None)
        .await
        .map_err(|error| api_error(StatusCode::from_u16(error.status).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR), "API_ERROR", error.message))?;

    Ok(Json(data))
}
