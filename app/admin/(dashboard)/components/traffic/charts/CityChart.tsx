import dynamic from "next/dynamic";
import { CHART_COLORS } from "./chart-constants";

export const CityChart = dynamic(
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
        function CityChartInner({
          data,
        }: {
          data: Array<{ city: string; sessions: number; percentage: number }>;
        }) {
          if (data.length === 0) {
            return (
              <p className="py-8 text-center text-sm text-[var(--muted)]">
                데이터가 없습니다
              </p>
            );
          }

          return (
            <ResponsiveContainer width="100%" height={260}>
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
                  dataKey="city"
                  width={70}
                  tick={{ fontSize: 11, fill: "#374151" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    ((value: number | undefined, _name: string, props: { payload?: { percentage?: number } }) => [`${(value ?? 0).toLocaleString("ko-KR")}건 (${props?.payload?.percentage ?? 0}%)`, "세션"]) as any
                  }
                  labelStyle={{ fontSize: 12, color: "#111827" }}
                  contentStyle={{ borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 12 }}
                />
                <Bar dataKey="sessions" radius={[0, 4, 4, 0]} maxBarSize={20}>
                  {data.map((_, idx) => (
                    <Cell key={idx} fill={CHART_COLORS[2]} fillOpacity={idx === 0 ? 1 : 0.6 - idx * 0.04} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          );
        }
        return CityChartInner;
      },
    ),
  { ssr: false },
);
