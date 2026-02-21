// =============================================================
// 빌드 타임 개발 대시보드 매니페스트 생성
// 실행: pnpm generate-dev-manifest
// =============================================================

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const outFile = path.resolve(rootDir, "lib/dev/generated/dev-manifest.ts");

// -------------------------------------------------------------
// 의존성 수집
// -------------------------------------------------------------

interface DepEntry {
  name: string;
  version: string;
  isDev: boolean;
}

function collectDependencies(): {
  dependencies: DepEntry[];
  stats: { total: number; prod: number; dev: number };
} {
  const pkgPath = path.join(rootDir, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
  const deps: DepEntry[] = [];

  for (const [name, version] of Object.entries(pkg.dependencies ?? {})) {
    deps.push({ name, version: version as string, isDev: false });
  }
  for (const [name, version] of Object.entries(pkg.devDependencies ?? {})) {
    deps.push({ name, version: version as string, isDev: true });
  }

  deps.sort((a, b) => a.name.localeCompare(b.name));

  return {
    dependencies: deps,
    stats: {
      total: deps.length,
      prod: deps.filter((d) => !d.isDev).length,
      dev: deps.filter((d) => d.isDev).length,
    },
  };
}

// -------------------------------------------------------------
// 라우트 스캔 + 렌더링 전략 판별
// -------------------------------------------------------------

interface RouteEntry {
  path: string;
  type: "page" | "api";
  rendering: "SSG" | "SSG+ISR" | "Client" | "Server";
}

function detectRendering(filePath: string, isApi: boolean): RouteEntry["rendering"] {
  if (isApi) return "Server";

  try {
    const content = fs.readFileSync(filePath, "utf-8");

    // 우선순위 1: "use client" 지시어
    if (/^["']use client["']/m.test(content)) return "Client";

    // 우선순위 2: force-static
    if (/export\s+const\s+dynamic\s*=\s*["']force-static["']/.test(content)) return "SSG";

    // 우선순위 3: revalidate (ISR)
    if (/export\s+const\s+revalidate\s*=/.test(content)) return "SSG+ISR";

    // 우선순위 4: generateStaticParams
    if (/export\s+(async\s+)?function\s+generateStaticParams/.test(content)) return "SSG";

    // 우선순위 5: force-dynamic
    if (/export\s+const\s+dynamic\s*=\s*["']force-dynamic["']/.test(content)) return "Server";

    // 우선순위 6: 기본 서버 컴포넌트 → SSG
    return "SSG";
  } catch {
    return "SSG";
  }
}

function fileToRoutePath(filePath: string, appDir: string): string {
  let rel = path.relative(appDir, filePath);
  // page.tsx 또는 route.ts 제거
  rel = rel.replace(/\/(page\.tsx|route\.ts)$/, "");
  // route group 제거: (groupName) → ""
  rel = rel.replace(/\([^)]+\)\/?/g, "");
  // 경로 정리
  rel = "/" + rel.replace(/\\/g, "/");
  if (rel === "/") return "/";
  return rel.replace(/\/$/, "");
}

function scanRoutes(): {
  routes: RouteEntry[];
  stats: { totalPages: number; totalApi: number; byRendering: Record<string, number> };
} {
  const appDir = path.join(rootDir, "app");
  const routes: RouteEntry[] = [];

  function walk(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        // node_modules, .next 등 제외
        if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
        walk(fullPath);
      } else if (entry.name === "page.tsx") {
        const routePath = fileToRoutePath(fullPath, appDir);
        routes.push({
          path: routePath,
          type: "page",
          rendering: detectRendering(fullPath, false),
        });
      } else if (entry.name === "route.ts") {
        const routePath = fileToRoutePath(fullPath, appDir);
        routes.push({
          path: routePath,
          type: "api",
          rendering: "Server",
        });
      }
    }
  }

  walk(appDir);
  routes.sort((a, b) => a.path.localeCompare(b.path));

  const byRendering: Record<string, number> = {};
  for (const r of routes) {
    byRendering[r.rendering] = (byRendering[r.rendering] ?? 0) + 1;
  }

  return {
    routes,
    stats: {
      totalPages: routes.filter((r) => r.type === "page").length,
      totalApi: routes.filter((r) => r.type === "api").length,
      byRendering,
    },
  };
}

// -------------------------------------------------------------
// 프로젝트 통계
// -------------------------------------------------------------

function countFiles(dir: string, ext: string[]): number {
  if (!fs.existsSync(dir)) return 0;
  let count = 0;

  function walk(d: string) {
    const entries = fs.readdirSync(d, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(d, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === ".next" || entry.name === "generated") continue;
        walk(fullPath);
      } else if (ext.some((e) => entry.name.endsWith(e))) {
        count++;
      }
    }
  }

  walk(dir);
  return count;
}

function collectProjectStats() {
  const tsExts = [".ts", ".tsx"];
  const totalFiles =
    countFiles(path.join(rootDir, "app"), tsExts) +
    countFiles(path.join(rootDir, "components"), tsExts) +
    countFiles(path.join(rootDir, "lib"), tsExts) +
    countFiles(path.join(rootDir, "hooks"), tsExts);

  return {
    totalFiles,
    components: countFiles(path.join(rootDir, "components"), [".tsx"]),
    libModules: countFiles(path.join(rootDir, "lib"), [".ts"]),
    hooks: countFiles(path.join(rootDir, "hooks"), [".ts"]),
    blogPosts: countFiles(path.join(rootDir, "lib/blog/posts"), [".ts"]),
  };
}

// -------------------------------------------------------------
// TypeScript 설정
// -------------------------------------------------------------

function collectTsConfig() {
  try {
    const tsConfigPath = path.join(rootDir, "tsconfig.json");
    const raw = fs.readFileSync(tsConfigPath, "utf-8");
    const config = JSON.parse(raw);
    const co = config.compilerOptions ?? {};
    return {
      strict: co.strict ?? false,
      target: co.target ?? "unknown",
      moduleResolution: co.moduleResolution ?? "unknown",
      paths: co.paths ?? {},
    };
  } catch {
    return { strict: false, target: "unknown", moduleResolution: "unknown", paths: {} };
  }
}

// -------------------------------------------------------------
// Firestore 인덱스
// -------------------------------------------------------------

function collectFirestoreIndexes() {
  try {
    const indexPath = path.join(rootDir, "firestore.indexes.json");
    const raw = fs.readFileSync(indexPath, "utf-8");
    const parsed = JSON.parse(raw);
    return (parsed.indexes ?? []).map((idx: { collectionGroup: string; fields: { fieldPath: string; order: string }[] }) => ({
      collectionGroup: idx.collectionGroup,
      fields: idx.fields.map((f: { fieldPath: string; order: string }) => ({
        fieldPath: f.fieldPath,
        order: f.order,
      })),
    }));
  } catch {
    return [];
  }
}

// -------------------------------------------------------------
// Firestore 보안 규칙 파싱
// -------------------------------------------------------------

function collectFirestoreRules() {
  try {
    const rulesPath = path.join(rootDir, "firestore.rules");
    const content = fs.readFileSync(rulesPath, "utf-8");

    const rules: { collection: string; read: boolean; write: boolean; note: string }[] = [];
    const matchRegex = /match\s+\/([a-z-]+)\/\{[^}]+\}\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)?\}/g;

    let m;
    while ((m = matchRegex.exec(content)) !== null) {
      const collection = m[1];
      const block = m[2] ?? "";

      // /{document=**} 패턴은 "기타" 으로 처리
      if (collection === "databases" || collection === "documents") continue;

      const allowRead = /allow\s+read/.test(block) && !/allow\s+read[^;]*:\s*if\s+false/.test(block);
      const allowWrite = /allow\s+write/.test(block) && !/allow\s+write[^;]*:\s*if\s+false/.test(block);

      // allow read, write: if false 패턴 감지
      const readWriteFalse = /allow\s+read,\s*write:\s*if\s+false/.test(block);

      let note = "";
      if (readWriteFalse) {
        note = "Admin SDK 전용 (클라이언트 접근 차단)";
      } else if (allowRead && allowWrite) {
        note = "클라이언트 read/write 허용 (필드 검증)";
      } else if (allowRead) {
        note = "클라이언트 read만 허용";
      }

      rules.push({
        collection,
        read: allowRead && !readWriteFalse,
        write: allowWrite && !readWriteFalse,
        note,
      });
    }

    // 기본 규칙 추가
    if (content.includes("{document=**}")) {
      rules.push({
        collection: "기타 (전체)",
        read: false,
        write: false,
        note: "전체 차단",
      });
    }

    return rules;
  } catch {
    return [];
  }
}

// -------------------------------------------------------------
// 메인
// -------------------------------------------------------------

function main() {
  const { dependencies, stats: depStats } = collectDependencies();
  const { routes, stats: routeStats } = scanRoutes();
  const projectStats = collectProjectStats();
  const tsConfig = collectTsConfig();
  const firestoreIndexes = collectFirestoreIndexes();
  const firestoreRules = collectFirestoreRules();

  const manifest = {
    generatedAt: new Date().toISOString(),
    dependencies,
    dependencyStats: depStats,
    routes,
    routeStats,
    projectStats,
    tsConfig,
    firestoreIndexes,
    firestoreRules,
  };

  const json = JSON.stringify(manifest, null, 2);

  const output = `// =============================================================
// 이 파일은 자동 생성됩니다. 직접 수정하지 마세요.
// 실행: pnpm generate-dev-manifest
// =============================================================

export const DEV_MANIFEST = ${json} as const;

export type DevManifest = typeof DEV_MANIFEST;
`;

  const outDir = path.dirname(outFile);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outFile, output, "utf-8");

  console.log(
    `Generated dev manifest → lib/dev/generated/dev-manifest.ts (${dependencies.length} deps, ${routes.length} routes, ${projectStats.totalFiles} files)`
  );
}

main();
