mod app;
mod bridge;
mod config;
mod models;
mod routes;

use anyhow::Context;
use tokio::net::TcpListener;
use tracing::info;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| "info,ai_ops_agent=debug".into()))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let config = config::Config::from_env();
    let bind_addr = config.bind_addr;
    let state = app::AppState::build(config).await?;
    let router = app::router(state);
    let listener = TcpListener::bind(bind_addr)
        .await
        .with_context(|| format!("failed to bind {bind_addr}"))?;

    info!(%bind_addr, "ai-ops-agent listening");
    axum::serve(listener, router).await?;
    Ok(())
}
