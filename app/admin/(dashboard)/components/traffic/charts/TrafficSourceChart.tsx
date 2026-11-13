import dynamic from "next/dynamic";
import { CHART_COLORS } from "./chart-constants";

export const TrafficSourceChart = dynamic(
  () =>
    import("recharts").then(
      ({
        ResponsiveContainer,
        PieChart,
        Pie,
        Cell,
        Tooltip,
        Legend,
      }) => {
        function TrafficSourceChartInner({
          data,
          selectedSource,
          onSelect,
        }: {
          data: Array<{ source: string; sessions: number; percentage: number }>;
          selectedSource: string | null;
          onSelect: (source: string) => void;
        }) {
          if (data.length === 0) {
            return (
              <p className="py-8 text-center text-sm text-[var(--muted)]">
                데이터가 없습니다
              </p>
            );
          }

          return (
            <>
            <div role="img" aria-label="유입 경로 차트 · 아래 표에서 수치와 상세를 확인할 수 있습니다.">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={data}
                  dataKey="sessions"
                  nameKey="source"
                  cx="50%"
                  cy="45%"
                  outerRadius={80}
                  innerRadius={44}
                >
                  {data.map((item, idx) => (
                    <Cell
                      key={item.source}
                      fill={CHART_COLORS[idx % CHART_COLORS.length]}
                      fillOpacity={!selectedSource || selectedSource === item.source ? 1 : 0.35}
                      onClick={() => onSelect(item.source)}
                      style={{ cursor: "pointer" }}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    ((value: number | undefined, name: string, props: { payload?: { percentage?: number } }) => [`${(value ?? 0).toLocaleString("ko-KR")}건 (${props?.payload?.percentage ?? 0}%)`, name]) as any
                  }
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid #E5E7EB",
                    fontSize: 12,
                  }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
                />
              </PieChart>
            </ResponsiveContainer>
            </div>
            <details className="mt-3 rounded-xl border border-slate-200 p-3">
              <summary className="min-h-11 cursor-pointer text-sm font-semibold text-blue-800">수치 및 상세 표 보기</summary>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <caption className="sr-only">유입 경로 차트 수치 및 상세</caption>
                  <thead><tr><th scope="col" className="p-2 text-left">유입 경로</th><th scope="col" className="p-2 text-right">세션 수</th><th scope="col" className="p-2 text-right">비중 (%)</th></tr></thead>
                  <tbody>{data.map(item => <tr key={item.source} className="border-t border-slate-200">
                    <th scope="row" className="break-all p-2 text-left font-medium">{onSelect ? <button type="button" onClick={() => onSelect(item.source)} className="min-h-11 text-blue-800 underline focus-visible:outline-2 focus-visible:outline-blue-700" aria-label={`${item.source} 상세 보기`}>{item.source}</button> : item.source}</th>
                    <td className="p-2 text-right">{item.sessions.toLocaleString("ko-KR")}</td><td className="p-2 text-right">{item.percentage.toLocaleString("ko-KR")}</td>
                  </tr>)}</tbody>
                </table>
              </div>
            </details>
            </>
          );
        }
        return TrafficSourceChartInner;
      },
    ),
  { ssr: false },
);
