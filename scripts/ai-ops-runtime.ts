import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

class CliError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "CliError";
    this.status = status;
  }
}

function loadLocalEnv() {
  const loadEnvFile = (process as typeof process & {
    loadEnvFile?: (path?: string) => void;
  }).loadEnvFile;

  if (typeof loadEnvFile === "function") {
    for (const fileName of [".env.local", ".env"]) {
      const filePath = join(process.cwd(), fileName);
      if (!existsSync(filePath)) continue;

      try {
        loadEnvFile(filePath);
      } catch {
        // Fall back to the minimal parser below.
      }
    }
  }

  for (const fileName of [".env.local", ".env"]) {
    const filePath = join(process.cwd(), fileName);
    if (!existsSync(filePath)) continue;

    const content = readFileSync(filePath, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex <= 0) continue;

      const key = trimmed.slice(0, separatorIndex).trim();
      let value = trimmed.slice(separatorIndex + 1).trim();
      if (!key || process.env[key] !== undefined) continue;

      if (
        (value.startsWith("\"") && value.endsWith("\"")) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      process.env[key] = value.replace(/\\n/g, "\n");
    }
  }
}

loadLocalEnv();

async function getModules() {
  const aiOpsModule = await import("../lib/admin-ai-ops");
  const validationModule = await import("../lib/blog-validation");

  return {
    aiOps: ("default" in aiOpsModule ? aiOpsModule.default : aiOpsModule) as typeof import("../lib/admin-ai-ops"),
    aiOpsSuggestionActionSchema: validationModule.aiOpsSuggestionActionSchema,
    aiOpsSuggestionRequestSchema: validationModule.aiOpsSuggestionRequestSchema,
  };
}

function parseFlags(argv: string[]) {
  const positional: string[] = [];
  const flags = new Map<string, string>();

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      positional.push(token);
      continue;
    }

    const key = token.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new CliError(`옵션 값이 필요합니다: --${key}`, 400);
    }
    flags.set(key, value);
    index += 1;
  }

  return { positional, flags };
}

function readJsonFlag(flags: Map<string, string>, key: string): unknown {
  const raw = flags.get(key);
  if (!raw) return undefined;

  try {
    return JSON.parse(raw) as JsonValue;
  } catch {
    throw new CliError(`JSON 형식이 올바르지 않습니다: --${key}`, 400);
  }
}

function getRequiredInt(flags: Map<string, string>, key: string): number {
  const raw = flags.get(key);
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) {
    throw new CliError(`유효한 숫자 옵션이 아닙니다: --${key}`, 400);
  }
  return value;
}

function getActorEmail(body: unknown, fallback = "system@ai-ops.local") {
  if (!body || typeof body !== "object") return fallback;

  const actorEmail = (body as { actorEmail?: unknown; actor_email?: unknown }).actorEmail
    ?? (body as { actorEmail?: unknown; actor_email?: unknown }).actor_email;

  if (typeof actorEmail === "string" && actorEmail.trim()) {
    return actorEmail.trim();
  }

  return fallback;
}

async function run() {
  const { aiOps, aiOpsSuggestionActionSchema, aiOpsSuggestionRequestSchema } = await getModules();
  const { positional, flags } = parseFlags(process.argv.slice(2));
  const [resource, action = ""] = positional;

  if (!resource) {
    throw new CliError("실행할 ai-ops 리소스를 지정해야 합니다", 400);
  }

  switch (resource) {
    case "briefing": {
      const period = flags.get("period") === "28d" ? "28d" : "7d";
      return aiOps.getAiOpsBriefing(period);
    }
    case "targets":
      return aiOps.getAiOpsTargets();
    case "activity": {
      const rawLimit = flags.get("limit");
      const limit = rawLimit ? getRequiredInt(flags, "limit") : 30;
      return aiOps.listAiActivity(limit);
    }
    case "suggestions": {
      switch (action) {
        case "list": {
          const rawLimit = flags.get("limit");
          const limit = rawLimit ? getRequiredInt(flags, "limit") : 50;
          const status = flags.get("status");
          const targetType = flags.get("targetType") ?? flags.get("target-type");

          return aiOps.listAiSuggestions({
            status: status === "draft" || status === "approved" || status === "rejected" || status === "applied"
              ? status
              : "all",
            targetType: targetType === "post" || targetType === "page" || targetType === "site"
              ? targetType
              : "all",
            limit,
          });
        }
        case "create": {
          const body = readJsonFlag(flags, "input");
          const parsed = aiOpsSuggestionRequestSchema.safeParse(body);
          if (!parsed.success) {
            throw new CliError("운영 제안 요청 형식이 올바르지 않습니다", 400);
          }

          return aiOps.createAiSuggestion({
            ...parsed.data,
            actorEmail: getActorEmail(body),
          });
        }
        case "approve":
        case "reject":
        case "apply": {
          const id = getRequiredInt(flags, "id");
          const body = readJsonFlag(flags, "input") ?? {};
          const parsed = aiOpsSuggestionActionSchema.safeParse(body);
          if (!parsed.success) {
            throw new CliError(`${action} 요청 형식이 올바르지 않습니다`, 400);
          }

          const payload = {
            id,
            actorEmail: getActorEmail(body),
            note: parsed.data.note,
          };

          if (action === "approve") return aiOps.approveAiSuggestion(payload);
          if (action === "reject") return aiOps.rejectAiSuggestion(payload);
          return aiOps.applyAiSuggestion(payload);
        }
        default:
          throw new CliError(`지원하지 않는 suggestions 액션입니다: ${action || "(없음)"}`, 400);
      }
    }
    default:
      throw new CliError(`지원하지 않는 ai-ops 리소스입니다: ${resource}`, 400);
  }
}

void run()
  .then((data) => {
    console.log(JSON.stringify({ ok: true, data }));
  })
  .catch((error: unknown) => {
    const message = error instanceof Error
      ? error.message
      : typeof error === "object" && error && "message" in error && typeof error.message === "string"
        ? error.message
        : "알 수 없는 오류가 발생했습니다";
    const status = error instanceof CliError ? error.status : 500;

    console.log(JSON.stringify({ ok: false, status, message }));
    process.exitCode = 1;
  });
