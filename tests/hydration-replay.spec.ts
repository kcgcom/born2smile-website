import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

for (const renderer of ["react-dom", "react-dom-experimental"] as const) {
  test(`개발 렌더러(${renderer})가 hydration을 재시도해도 서버 본문을 유지한다`, async ({ page }) => {
    const sources = Object.fromEntries([
      ["react", "react/cjs/react.development.js"],
      ["scheduler", "scheduler/cjs/scheduler.development.js"],
      [renderer, `${renderer}/cjs/react-dom.development.js`],
      [`${renderer}/client`, `${renderer}/cjs/react-dom-client.development.js`],
      ...(renderer === "react-dom-experimental"
        ? [
          ["react-experimental", "react-experimental/cjs/react.development.js"],
          ["scheduler-experimental", "scheduler-experimental/cjs/scheduler.development.js"],
        ]
        : []),
    ].map(([name, path]) => [name, readFileSync(require.resolve(`next/dist/compiled/${path}`), "utf8")]));

    const results = await page.evaluate(async ({ renderer, sources }) => {
      const modules = new Map<string, { exports: unknown }>();
      const process = { env: { NODE_ENV: "development" } };
      function loadModule(id: string): unknown {
        const name = id.replace("next/dist/compiled/", "");
        const supplied = modules.get(name);
        if (supplied) return supplied.exports;
        const compiled = { exports: {} };
        modules.set(name, compiled);
        new Function("module", "exports", "require", "process", sources[name])(
          compiled, compiled.exports, loadModule, process,
        );
        return compiled.exports;
      }

      const React = loadModule(renderer === "react-dom" ? "react" : "react-experimental") as typeof import("react");
      const { hydrateRoot } = loadModule(`${renderer}/client`) as typeof import("react-dom/client");
      const sections = [
        { tag: "section", text: "리뷰 안내" },
        { tag: "style", text: ".print-only { display: block }" },
        { tag: "h1", text: "404" },
        { tag: "article", text: "블로그 본문", suspense: true },
      ];
      const results = [];
      for (const { tag, text, suspense } of sections) {
        const container = document.createElement("div");
        const original = document.createElement("main");
        original.id = "main-content";
        const child = document.createElement(tag);
        child.textContent = text;
        if (suspense) {
          original.append(document.createComment("$"), child, document.createComment("/$"));
        } else {
          original.append(child);
        }
        container.append(original);
        document.body.append(container);

        const errors: string[] = [];
        let root: ReturnType<typeof hydrateRoot> | undefined;
        await new Promise<void>(resolve => {
          const content = React.createElement(tag, { ref: () => resolve() }, text);
          const loaded = suspense ? React.createElement(React.Suspense, null, content) : content;
          // Flight can resolve lazy children to rendered elements.
          const lazyChild = React.lazy(() => Promise.resolve({
            default: loaded as unknown as import("react").ComponentType,
          }));
          function App() {
            return React.createElement("main", { id: "main-content" },
              lazyChild as unknown as import("react").ReactNode);
          }
          React.startTransition(() => {
            root = hydrateRoot(container, React.createElement(App), {
              onRecoverableError: error => errors.push(String(error)),
            });
          });
        });
        results.push({ tag, errors, retained: container.firstChild === original && child.parentNode === original });
        root?.unmount();
        container.remove();
      }
      return results;
    }, { renderer, sources });

    expect(results).toEqual([
      { tag: "section", errors: [], retained: true },
      { tag: "style", errors: [], retained: true },
      { tag: "h1", errors: [], retained: true },
      { tag: "article", errors: [], retained: true },
    ]);
  });
}
