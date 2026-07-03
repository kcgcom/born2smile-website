import dynamic from "next/dynamic";
import { CHART_COLORS, DEVICE_LABELS } from "./chart-constants";

export const DeviceChart = dynamic(
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
        function DeviceChartInner({
          data,
        }: {
          data: Array<{ category: string; sessions: number; percentage: number }>;
        }) {
          if (data.length === 0) {
            return (
              <p className="py-8 text-center text-sm text-[var(--muted)]">
                데이터가 없습니다
              </p>
            );
          }

          const labeled = data.map((d) => ({
            ...d,
            label: DEVICE_LABELS[d.category] ?? d.category,
          }));

          return (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={labeled}
                  dataKey="sessions"
                  nameKey="label"
                  cx="50%"
                  cy="45%"
                  outerRadius={80}
                  innerRadius={44}
                >
                  {labeled.map((_, idx) => (
                    <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
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
          );
        }
        return DeviceChartInner;
      },
    ),
  { ssr: false },
);
