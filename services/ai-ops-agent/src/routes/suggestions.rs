use axum::{
    extract::{Extension, Path, Query, State},
    http::StatusCode,
    response::Response,
    Json,
};
use serde::Deserialize;
use serde_json::to_value;

use crate::{
    app::AppState,
    models::{CreateSuggestionRequest, SuggestionActionRequest, SuggestionRecord},
    routes::api_error,
};

#[derive(Debug, Deserialize)]
pub struct SuggestionsQuery {
    pub status: Option<String>,
    #[serde(alias = "targetType")]
    pub target_type: Option<String>,
    pub limit: Option<u16>,
}

pub async fn list(
    State(state): State<AppState>,
    Query(query): Query<SuggestionsQuery>,
) -> Result<Json<Vec<SuggestionRecord>>, Response> {
    let limit = query.limit.unwrap_or(50).max(1);
    let mut args = vec![
        "suggestions".to_string(),
        "list".to_string(),
        "--limit".to_string(),
        limit.to_string(),
    ];

    if let Some(status) = query.status.filter(|value| !value.trim().is_empty()) {
        args.push("--status".to_string());
        args.push(status);
    }

    if let Some(target_type) = query.target_type.filter(|value| !value.trim().is_empty()) {
        args.push("--targetType".to_string());
        args.push(target_type);
    }

    let data = state
        .bridge
        .run::<Vec<SuggestionRecord>>(&args, None)
        .await
        .map_err(|error| api_error(StatusCode::from_u16(error.status).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR), "API_ERROR", error.message))?;

    Ok(Json(data))
}

pub async fn create(
    State(state): State<AppState>,
    Extension(admin_email): Extension<String>,
    Json(mut payload): Json<CreateSuggestionRequest>,
) -> Result<(StatusCode, Json<SuggestionRecord>), Response> {
    if payload.actor_email.as_ref().map(|value| value.trim().is_empty()).unwrap_or(true) {
        payload.actor_email = Some(admin_email);
    }

    let args = vec!["suggestions".to_string(), "create".to_string()];
    let input = to_value(&payload)
        .map_err(|error| api_error(StatusCode::BAD_REQUEST, "BAD_REQUEST", error.to_string()))?;
    let data = state
        .bridge
        .run::<SuggestionRecord>(&args, Some(input))
        .await
        .map_err(|error| api_error(StatusCode::from_u16(error.status).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR), "API_ERROR", error.message))?;

    Ok((StatusCode::CREATED, Json(data)))
}

async fn transition(
    state: AppState,
    action: &str,
    id: i64,
    admin_email: String,
    mut payload: SuggestionActionRequest,
) -> Result<Json<SuggestionRecord>, Response> {
    if id < 1 {
        return Err(api_error(StatusCode::BAD_REQUEST, "BAD_REQUEST", "유효한 제안 ID가 아닙니다"));
    }

    if payload.actor_email.as_ref().map(|value| value.trim().is_empty()).unwrap_or(true) {
        payload.actor_email = Some(admin_email);
    }

    let args = vec![
        "suggestions".to_string(),
        action.to_string(),
        "--id".to_string(),
        id.to_string(),
    ];
    let input = to_value(&payload)
        .map_err(|error| api_error(StatusCode::BAD_REQUEST, "BAD_REQUEST", error.to_string()))?;
    let data = state
        .bridge
        .run::<SuggestionRecord>(&args, Some(input))
        .await
        .map_err(|error| api_error(StatusCode::from_u16(error.status).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR), "API_ERROR", error.message))?;

    Ok(Json(data))
}

pub async fn approve(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    Extension(admin_email): Extension<String>,
    Json(payload): Json<SuggestionActionRequest>,
) -> Result<Json<SuggestionRecord>, Response> {
    transition(state, "approve", id, admin_email, payload).await
}

pub async fn reject(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    Extension(admin_email): Extension<String>,
    Json(payload): Json<SuggestionActionRequest>,
) -> Result<Json<SuggestionRecord>, Response> {
    transition(state, "reject", id, admin_email, payload).await
}

pub async fn apply(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    Extension(admin_email): Extension<String>,
    Json(payload): Json<SuggestionActionRequest>,
) -> Result<Json<SuggestionRecord>, Response> {
    transition(state, "apply", id, admin_email, payload).await
}
