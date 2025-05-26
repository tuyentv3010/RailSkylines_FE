"use client";
import { Bar, BarChart, XAxis, YAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const colors = [
  "var(--color-chrome)",
  "var(--color-safari)",
  "var(--color-firefox)",
  "var(--color-edge)",
  "var(--color-other)",
  "var(--color-blue)",
  "var(--color-green)",
  "var(--color-purple)",
  "var(--color-orange)",
  "var(--color-pink)",
  "var(--color-teal)",
  "var(--color-yellow)",
];

const chartConfig = {
  successOrders: {
    label: "Đơn thanh toán",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

type TrainRanking = {
  name: string;
  successOrders: number;
  fill?: string;
};

const getColorIndexForName = (name: string): number => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % colors.length;
};

export function DishBarChart({
  chartData,
}: {
  chartData: TrainRanking[] | null | undefined;
}) {
  // Handle case where chartData is null or undefined
  if (!chartData || !Array.isArray(chartData)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Xếp hạng Tàu</CardTitle>
          <CardDescription>Được đi nhiều nhất</CardDescription>
        </CardHeader>
        <CardContent>
          <p>No data available</p>
        </CardContent>
      </Card>
    );
  }

  // Assign a unique color to each train based on its name
  const chartDataColors = chartData.map((data) => ({
    ...data,
    fill: colors[getColorIndexForName(data.name)],
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Xếp hạng Tàu</CardTitle>
        <CardDescription>Được đi nhiều nhất</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart
            accessibilityLayer
            data={chartDataColors}
            layout="vertical"
            margin={{
              left: 0,
            }}
          >
            <YAxis
              dataKey="name"
              type="category"
              tickLine={false}
              tickMargin={2}
              axisLine={false}
              tickFormatter={(value) => value}
            />
            <XAxis dataKey="successOrders" type="number" hide />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Bar
              dataKey="successOrders"
              name="Đơn thanh toán"
              layout="vertical"
              radius={5}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
