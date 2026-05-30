"use client"

import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

export const description = "Inventory stock chart"

export type InventoryChartDatum = {
  name: string
  items: number
  categories: number
}

const chartConfig = {
  items: {
    label: "Items",
    color: "var(--chart-1)",
  },
  categories: {
    label: "Categories",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

export function ChartAreaInteractive({ data }: { data: InventoryChartDatum[] }) {
  const chartData = data.length > 0 ? data : [{ name: "No inventory", items: 0, categories: 0 }]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inventory Load</CardTitle>
        <CardDescription>Items and categories across your inventory locations</CardDescription>
      </CardHeader>
      <CardContent className="px-2 pt-2 sm:px-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[260px] w-full">
          <AreaChart data={chartData} margin={{ left: 12, right: 12 }}>
            <defs>
              <linearGradient id="fillItems" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-items)" stopOpacity={0.45} />
                <stop offset="95%" stopColor="var(--color-items)" stopOpacity={0.04} />
              </linearGradient>
              <linearGradient id="fillCategories" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-categories)" stopOpacity={0.35} />
                <stop offset="95%" stopColor="var(--color-categories)" stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="name"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={24}
              tickFormatter={(value) => String(value).slice(0, 12)}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
            <Area
              dataKey="categories"
              type="natural"
              fill="url(#fillCategories)"
              stroke="var(--color-categories)"
              strokeWidth={2}
            />
            <Area
              dataKey="items"
              type="natural"
              fill="url(#fillItems)"
              stroke="var(--color-items)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
