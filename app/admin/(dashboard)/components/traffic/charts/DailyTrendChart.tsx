import dynamic from "next/dynamic";
import { formatDateLabel } from "./chart-constants";

export const DailyTrendChart = dynamic(
  () =>
    import("recharts").then(
      ({
        ResponsiveContainer,
        AreaChart,
        Area,
        XAxis,
        YAxis,
        Tooltip,
        CartesianGrid,
      }) => {
        function DailyTrendChartInner({
          data,
        }: {
          data: Array<{ date: string; sessions: number; pageviews: number }>;
        }) {
          if (data.length === 0) {
            return (
              <p className="py-8 text-center text-sm text-[var(--muted)]">
                데이터가 없습니다
              </p>
            );
          }

          const formatted = data.map((d) => ({
            ...d,
            dateLabel: formatDateLabel(d.date),
          }));

          return (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart
                data={formatted}
                margin={{ top: 4, right: 4, bottom: 0, left: -16 }}
              >
                <defs>
                  <linearGradient id="sessionsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis
                  dataKey="dateLabel"
                  tick={{ fontSize: 10, fill: "#6B7280" }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#6B7280" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) =>
                    v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)
                  }
                />
                <Tooltip
                  formatter={
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    ((value: number | undefined, name: string) => [(value ?? 0).toLocaleString("ko-KR"), name === "sessions" ? "세션" : "페이지뷰"]) as any
                  }
                  labelStyle={{ fontSize: 12, color: "#111827", fontWeight: 600 }}
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid #E5E7EB",
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="sessions"
                  stroke="#2563EB"
                  strokeWidth={2}
                  fill="url(#sessionsGradient)"
                  dot={false}
                  activeDot={{ r: 4, fill: "#2563EB" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          );
        }
        return DailyTrendChartInner;
      },
    ),
  { ssr: false },
);
