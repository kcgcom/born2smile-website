use std::{env, net::SocketAddr};

#[derive(Debug, Clone)]
pub struct Config {
    pub bind_addr: SocketAddr,
    pub database_url: Option<String>,
    pub llm_base_url: Option<String>,
    pub llm_model: Option<String>,
    pub shared_secret: Option<String>,
}

fn read_non_empty(key: &str) -> Option<String> {
    env::var(key).ok().map(|value| value.trim().to_string()).filter(|value| !value.is_empty())
}

impl Config {
    pub fn from_env() -> Self {
        let bind_addr = env::var("AI_OPS_AGENT_BIND_ADDR")
            .ok()
            .and_then(|raw| raw.parse().ok())
            .unwrap_or_else(|| "0.0.0.0:8787".parse().expect("default bind addr"));

        Self {
            bind_addr,
            database_url: read_non_empty("AI_OPS_DATABASE_URL"),
            llm_base_url: read_non_empty("AI_OPS_LLM_BASE_URL"),
            llm_model: read_non_empty("AI_OPS_LLM_MODEL"),
            shared_secret: read_non_empty("AI_OPS_SHARED_SECRET"),
        }
    }
}
