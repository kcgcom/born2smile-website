use axum::{
    extract::{Extension, State},
    http::StatusCode,
    Json,
};
use serde_json::to_value;
use tracing::error;

use crate::{
    app::AppState,
    models::{CreateSuggestionRequest, SuggestionJob},
    routes::api_error,
};

pub async fn create(
    State(state): State<AppState>,
    Extension(admin_email): Extension<String>,
    Json(mut payload): Json<CreateSuggestionRequest>,
) -> Result<(StatusCode, Json<SuggestionJob>), axum::response::Response> {
    if payload.actor_email.as_ref().map(|value| value.trim().is_empty()).unwrap_or(true) {
        payload.actor_email = Some(admin_email);
    }

    let input = to_value(&payload)
        .map_err(|error| api_error(StatusCode::BAD_REQUEST, "BAD_REQUEST", error.to_string()))?;
    let create_args = vec!["suggestion-jobs".to_string(), "create".to_string()];
    let job = state
        .bridge
        .run::<SuggestionJob>(&create_args, Some(input.clone()))
        .await
        .map_err(|error| api_error(StatusCode::from_u16(error.status).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR), "API_ERROR", error.message))?;

    let run_args = vec![
        "suggestion-jobs".to_string(),
        "run".to_string(),
        "--id".to_string(),
        job.id.to_string(),
    ];
    let fail_args = vec![
        "suggestion-jobs".to_string(),
        "fail".to_string(),
        "--id".to_string(),
        job.id.to_string(),
    ];
    let bridge = state.bridge.clone();

    tokio::spawn(async move {
        if let Err(run_error) = bridge.run::<SuggestionJob>(&run_args, Some(input.clone())).await {
            error!(job_id = job.id, error = %run_error.message, "suggestion job run failed");
            let _ = bridge
                .run::<SuggestionJob>(
                    &fail_args,
                    Some(serde_json::json!({ "message": run_error.message })),
                )
                .await;
        }
    });

    Ok((StatusCode::ACCEPTED, Json(job)))
}
