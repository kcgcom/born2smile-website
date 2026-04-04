use std::{env, net::SocketAddr, path::PathBuf};

#[derive(Debug, Clone)]
pub struct Config {
    pub bind_addr: SocketAddr,
    pub database_url: Option<String>,
    pub llm_base_url: Option<String>,
    pub llm_model: Option<String>,
    pub shared_secret: Option<String>,
    pub node_bin: String,
    pub project_root: PathBuf,
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
        let default_project_root = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .parent()
            .and_then(|path| path.parent())
            .map(PathBuf::from)
            .expect("repo root");

        Self {
            bind_addr,
            database_url: read_non_empty("AI_OPS_DATABASE_URL"),
            llm_base_url: read_non_empty("AI_OPS_LLM_BASE_URL"),
            llm_model: read_non_empty("AI_OPS_LLM_MODEL"),
            shared_secret: read_non_empty("AI_OPS_SHARED_SECRET"),
            node_bin: read_non_empty("AI_OPS_AGENT_NODE_BIN").unwrap_or_else(|| "node".to_string()),
            project_root: read_non_empty("AI_OPS_AGENT_PROJECT_ROOT")
                .map(PathBuf::from)
                .unwrap_or(default_project_root),
        }
    }
}
