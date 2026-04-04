use std::path::PathBuf;

use anyhow::anyhow;
use serde::de::DeserializeOwned;
use serde::Deserialize;
use serde_json::Value;
use tokio::process::Command;

use crate::config::Config;

#[derive(Debug, Clone)]
pub struct ScriptBridge {
    node_bin: String,
    project_root: PathBuf,
    script_path: PathBuf,
}

#[derive(Debug, Deserialize)]
struct ScriptEnvelope<T> {
    ok: bool,
    data: Option<T>,
    message: Option<String>,
    status: Option<u16>,
}

#[derive(Debug)]
pub struct BridgeError {
    pub status: u16,
    pub message: String,
}

impl ScriptBridge {
    pub fn new(config: &Config) -> Self {
        let script_path = config.project_root.join("scripts/ai-ops-runtime.ts");

        Self {
            node_bin: config.node_bin.clone(),
            project_root: config.project_root.clone(),
            script_path,
        }
    }

    pub async fn run<T>(&self, args: &[String], input: Option<Value>) -> Result<T, BridgeError>
    where
        T: DeserializeOwned,
    {
        let mut command = Command::new(&self.node_bin);
        command
            .arg("--import")
            .arg("tsx")
            .arg(&self.script_path)
            .args(args)
            .current_dir(&self.project_root);

        if let Some(input) = input {
            let serialized = serde_json::to_string(&input)
                .map_err(|error| BridgeError::internal(anyhow!(error)))?;
            command.arg("--input").arg(serialized);
        }

        let output = command.output().await.map_err(|error| {
            BridgeError::internal(anyhow!("failed to execute ai-ops runtime: {error}"))
        })?;

        let stdout = String::from_utf8(output.stdout).map_err(|error| {
            BridgeError::internal(anyhow!("ai-ops runtime stdout was not valid UTF-8: {error}"))
        })?;
        let stderr = String::from_utf8(output.stderr).unwrap_or_default();

        let envelope: ScriptEnvelope<T> = serde_json::from_str(stdout.trim()).map_err(|error| {
            BridgeError::internal(
                anyhow!(
                    "failed to parse ai-ops runtime output: {error} (stdout='{}', stderr='{}')",
                    stdout.trim(),
                    stderr.trim()
                ),
            )
        })?;

        if envelope.ok {
            return envelope.data.ok_or_else(|| BridgeError {
                status: 500,
                message: "AI 운영 런타임이 빈 응답을 반환했습니다".to_string(),
            });
        }

        Err(BridgeError {
            status: envelope.status.unwrap_or(if output.status.success() { 400 } else { 500 }),
            message: envelope
                .message
                .filter(|value| !value.trim().is_empty())
                .unwrap_or_else(|| "AI 운영 런타임 호출이 실패했습니다".to_string()),
        })
    }
}

impl BridgeError {
    fn internal(error: anyhow::Error) -> Self {
        Self {
            status: 500,
            message: format!("AI 운영 런타임 호출 실패: {error:#}"),
        }
    }
}
