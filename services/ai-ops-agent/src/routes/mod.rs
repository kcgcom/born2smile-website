use axum::{
    extract::State,
    http::{HeaderMap, StatusCode},
    middleware::{from_fn, from_fn_with_state},
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use serde::Serialize;

use crate::app::AppState;

pub mod activity;
pub mod briefing;
pub mod healthz;
pub mod suggestion_jobs;
pub mod suggestions;
pub mod targets;

#[derive(Debug, Serialize)]
pub struct ErrorBody {
    pub error: String,
    pub message: String,
}

pub fn router(state: AppState) -> Router {
    let protected = Router::new()
        .route("/ai-ops/briefing", get(briefing::get))
        .route("/ai-ops/suggestion-jobs", post(suggestion_jobs::create))
        .route("/ai-ops/suggestions", get(suggestions::list).post(suggestions::create))
        .route("/ai-ops/suggestions/{id}/approve", post(suggestions::approve))
        .route("/ai-ops/suggestions/{id}/reject", post(suggestions::reject))
        .route("/ai-ops/suggestions/{id}/apply", post(suggestions::apply))
        .route("/ai-ops/activity", get(activity::list))
        .route("/ai-ops/targets", get(targets::list))
        .route_layer(from_fn(admin_email_middleware))
        .layer(from_fn_with_state(state.clone(), shared_secret_middleware));

    Router::new()
        .route("/healthz", get(healthz::get))
        .merge(protected)
        .with_state(state)
}

pub fn api_error(status: StatusCode, error: &str, message: impl Into<String>) -> Response {
    (
        status,
        Json(ErrorBody {
            error: error.to_string(),
            message: message.into(),
        }),
    )
        .into_response()
}

async fn shared_secret_middleware(
    State(state): State<AppState>,
    headers: HeaderMap,
    request: axum::extract::Request,
    next: axum::middleware::Next,
) -> Result<Response, StatusCode> {
    if let Some(secret) = state.config.shared_secret.as_deref() {
        let provided = headers.get("x-ai-ops-secret").and_then(|value| value.to_str().ok());
        if provided != Some(secret) {
            return Err(StatusCode::UNAUTHORIZED);
        }
    }

    Ok(next.run(request).await)
}

async fn admin_email_middleware(
    mut request: axum::extract::Request,
    next: axum::middleware::Next,
) -> Result<Response, StatusCode> {
    let email = request
        .headers()
        .get("x-admin-email")
        .and_then(|value| value.to_str().ok())
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_string);

    if let Some(email) = email {
        request.extensions_mut().insert(email);
        return Ok(next.run(request).await);
    }

    Err(StatusCode::UNAUTHORIZED)
}
