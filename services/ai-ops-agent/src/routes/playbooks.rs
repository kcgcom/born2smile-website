use axum::{
    extract::State,
    http::StatusCode,
    response::Response,
    Json,
};

use crate::{
    app::AppState,
    models::Playbook,
    routes::api_error,
};

pub async fn list(State(state): State<AppState>) -> Result<Json<Vec<Playbook>>, Response> {
    let args = vec!["playbooks".to_string()];
    let data = state
        .bridge
        .run::<Vec<Playbook>>(&args, None)
        .await
        .map_err(|error| api_error(StatusCode::from_u16(error.status).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR), "API_ERROR", error.message))?;

    Ok(Json(data))
}
