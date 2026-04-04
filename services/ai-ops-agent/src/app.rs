use axum::Router;
use sqlx::postgres::PgPoolOptions;

use crate::{config::Config, routes};

#[derive(Clone)]
pub struct AppState {
    pub config: Config,
    pub db: Option<sqlx::PgPool>,
}

impl AppState {
    pub async fn build(config: Config) -> anyhow::Result<Self> {
        let db = if let Some(database_url) = &config.database_url {
            Some(PgPoolOptions::new().max_connections(5).connect_lazy(database_url)?)
        } else {
            None
        };

        Ok(Self { config, db })
    }
}

pub fn router(state: AppState) -> Router {
    routes::router(state)
}
