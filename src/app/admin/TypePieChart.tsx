"use client"

import { Pie, PieChart, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { ChartContainer } from "@/components/ui/chart"

interface PieData {
  type: string
  count: number
}

interface TypePieChartProps {
  data: PieData[]
}

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"]

export default function TypePieChart({ data }: TypePieChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
        暂无分布数据
      </div>
    )
  }

  const chartData = data.map((item, i) => ({
    name: item.type,
    value: item.count,
    fill: COLORS[i % COLORS.length],
  }))

  return (
    <ChartContainer config={{}} className="h-64 w-full">
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={80}
          paddingAngle={2}
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Pie>
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const item = payload[0].payload
              return (
                <div className="rounded-lg border border-border bg-background px-3 py-2 shadow-md text-xs">
                  <div className="font-medium text-foreground">{item.name}</div>
                  <div className="text-muted-foreground">{item.value} 篇</div>
                </div>
              )
            }
            return null
          }}
        />
        <Legend
          formatter={(value) => (
            <span className="text-xs text-muted-foreground">{value}</span>
          )}
        />
      </PieChart>
    </ChartContainer>
  )
}