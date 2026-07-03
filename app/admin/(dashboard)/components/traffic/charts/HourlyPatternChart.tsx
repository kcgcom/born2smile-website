import dynamic from "next/dynamic";
import { CHART_COLORS } from "./chart-constants";

export const HourlyPatternChart = dynamic(
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
        function HourlyPatternChartInner({
          data,
        }: {
          data: Array<{ hour: string; sessions: number }>;
        }) {
          if (data.length === 0) {
            return <p className="py-8 text-center text-sm text-[var(--muted)]">데이터가 없습니다</p>;
          }
          const max = Math.max(...data.map((d) => d.sessions));
          return (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis
                  dataKey="hour"
                  tick={{ fontSize: 9, fill: "#6B7280" }}
                  tickLine={false}
                  axisLine={false}
                  interval={2}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#6B7280" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)}
                />
                <Tooltip
                  formatter={
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    ((value: number | undefined) => [`${(value ?? 0).toLocaleString("ko-KR")}건`, "세션"]) as any
                  }
                  labelStyle={{ fontSize: 12, color: "#111827" }}
                  contentStyle={{ borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 12 }}
                />
                <Bar dataKey="sessions" radius={[3, 3, 0, 0]} maxBarSize={16}>
                  {data.map((d, idx) => (
                    <Cell
                      key={idx}
                      fill={d.sessions === max ? CHART_COLORS[1] : CHART_COLORS[0]}
                      fillOpacity={d.sessions === max ? 1 : 0.55}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          );
        }
        return HourlyPatternChartInner;
      },
    ),
  { ssr: false },
);
