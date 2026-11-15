import dynamic from "next/dynamic";
import { CHART_COLORS } from "./chart-constants";
import { useState } from "react";
import { getTopPageDisplayTitle } from "../types";

const EMPTY_TITLES = new Map<string, string>();

export const TopPagesChart = dynamic(
  () =>
    import("recharts").then(
      ({
        ResponsiveContainer,
        BarChart,
        Bar,
        XAxis,
        YAxis,
        Tooltip,
        CartesianGrid,
        Cell,
      }) => {
        function TopPagesChartInner({
          data,
          selectedPath,
          onSelect,
          titles = EMPTY_TITLES,
        }: {
          data: Array<{ path: string; views: number; sessions: number }>;
          selectedPath?: string | null;
          onSelect?: (path: string) => void;
          titles?: Map<string, string>;
        }) {
          const [chartWidth, setChartWidth] = useState(0);
          const labelWidth = chartWidth >= 480 ? 190 : 110;
          const getLabel = (path: string) => getTopPageDisplayTitle(path, titles);
          if (data.length === 0) {
            return (
              <p className="py-8 text-center text-sm text-[var(--muted)]">
                데이터가 없습니다
              </p>
            );
          }

          const truncate = (path: string) => {
            const label = getLabel(path);
            const limit = labelWidth - 16;
            let width = 0;
            let shortened = "";
            for (const character of label) {
              width += /[\u0000-\u007f]/.test(character) ? 6 : 11;
              if (width > limit) return shortened + "…";
              shortened += character;
            }
            return label;
          };

          return (
            <>
            <div role="img" aria-label="주요 페이지·섹션 차트 · 아래 표에서 수치와 상세를 확인할 수 있습니다.">
            <ResponsiveContainer width="100%" height={260} onResize={width => setChartWidth(Math.round(width))}>
              <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 0, right: 40, bottom: 0, left: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: "#6B7280" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => v.toLocaleString("ko-KR")}
                />
                <YAxis
                  type="category"
                  dataKey="path"
                  width={labelWidth}
                  tick={{ fontSize: 11, fill: "#374151" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={truncate}
                />
                <Tooltip
                  labelFormatter={label => getLabel(String(label ?? ""))}
                  formatter={
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    ((value: number | undefined, name: string) => [(value ?? 0).toLocaleString("ko-KR"), name === "views" ? "조회수" : "세션수"]) as any
                  }
                  labelStyle={{ fontSize: 12, color: "#111827" }}
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid #E5E7EB",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="views" radius={[0, 4, 4, 0]} maxBarSize={20}>
                  {data.map((item) => (
                    <Cell
                      key={item.path}
                      fill={CHART_COLORS[0]}
                      fillOpacity={!selectedPath || selectedPath === item.path ? 0.85 : 0.35}
                      onClick={onSelect ? () => onSelect(item.path) : undefined}
                      style={onSelect ? { cursor: "pointer" } : undefined}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            </div>
            <details className="mt-3 rounded-xl border border-slate-200 p-3">
              <summary className="min-h-11 cursor-pointer text-sm font-semibold text-blue-800">수치 및 상세 표 보기</summary>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <caption className="sr-only">주요 페이지·섹션 차트 수치 및 상세</caption>
                  <thead><tr><th scope="col" className="p-2 text-left">페이지</th><th scope="col" className="p-2 text-right">조회수</th><th scope="col" className="p-2 text-right">세션 수</th></tr></thead>
                  <tbody>{data.map(item => <tr key={item.path} className="border-t border-slate-200">
                    <th scope="row" className="break-words p-2 text-left font-medium">
                      {onSelect ? <button type="button" onClick={() => onSelect(item.path)} className="min-h-11 text-left text-blue-800 underline focus-visible:outline-2 focus-visible:outline-blue-700" aria-label={`${item.path} 상세 보기`}>{getLabel(item.path)}</button> : getLabel(item.path)}
                      {getLabel(item.path) !== item.path && <span className="mt-1 block break-all text-xs font-normal text-slate-600">{item.path}</span>}
                    </th>
                    <td className="p-2 text-right">{item.views.toLocaleString("ko-KR")}</td><td className="p-2 text-right">{item.sessions.toLocaleString("ko-KR")}</td>
                  </tr>)}</tbody>
                </table>
              </div>
            </details>
            </>
          );
        }
        return TopPagesChartInner;
      },
    ),
  { ssr: false },
);
