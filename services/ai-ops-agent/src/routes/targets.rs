use axum::{extract::State, Json};

use crate::{app::AppState, models::TargetOption};

pub async fn list(State(state): State<AppState>) -> Json<Vec<TargetOption>> {
    let note = state.config.llm_base_url.as_ref().map(|_| "remote scaffold target".to_string());
    Json(vec![
        TargetOption {
            id: "sample-post".to_string(),
            label: "샘플 블로그 포스트".to_string(),
            target_type: "post".to_string(),
            note: note.clone(),
        },
        TargetOption {
            id: "implant".to_string(),
            label: "임플란트 페이지".to_string(),
            target_type: "page".to_string(),
            note,
        },
    ])
}
