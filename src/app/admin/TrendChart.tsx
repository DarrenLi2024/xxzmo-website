"use client"

import { Line, LineChart, ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from "recharts"
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart"

interface TrendData {
  month: string
  chuli: number
  jigu: number
}

interface TrendChartProps {
  data: TrendData[]
}

const chartConfig = {
  chuli: { label: "樗栎集", color: "var(--chart-1)" },
  jigu: { label: "辑古录", color: "var(--chart-2)" },
} as const

export default function TrendChart({ data }: TrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
        暂无趋势数据
      </div>
    )
  }

  const displayData = data.map((d) => ({
    ...d,
    month: d.month.slice(5),
  }))

  return (
    <ChartContainer config={chartConfig} className="h-64 w-full">
      <LineChart data={displayData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          content={<ChartTooltipContent indicator="dashed" />}
        />
        <Legend
          wrapperStyle={{ fontSize: 12 }}
        />
        <Line
          type="monotone"
          dataKey="chuli"
          stroke="var(--chart-1)"
          strokeWidth={2}
          dot={{ r: 3, fill: "var(--chart-1)" }}
          activeDot={{ r: 5 }}
          name="樗栎集"
        />
        <Line
          type="monotone"
          dataKey="jigu"
          stroke="var(--chart-2)"
          strokeWidth={2}
          dot={{ r: 3, fill: "var(--chart-2)" }}
          activeDot={{ r: 5 }}
          name="辑古录"
        />
      </LineChart>
    </ChartContainer>
  )
}