'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts'
import { Card, CardContent } from '@/components/ui/card'

interface TrendChartProps {
  title: string
  data: Array<Record<string, any>>
  dataKey: string
  xAxisKey?: string
  color?: string
  type?: 'area' | 'bar'
  height?: number
  loading?: boolean
  stackedKeys?: string[]
  stackColors?: string[]
}

export function TrendChart({
  title,
  data,
  dataKey,
  xAxisKey = 'date',
  color = '#3b82f6',
  type = 'area',
  height = 240,
  loading,
  stackedKeys,
  stackColors,
}: TrendChartProps) {
  const formatXAxis = (value: string) => {
    if (!value) return ''
    const parts = value.split('-')
    if (parts.length >= 3) {
      return `${parts[1]}/${parts[2]}`
    }
    return value
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <h3 className="text-sm font-medium text-ink-secondary mb-4">{title}</h3>
        {loading ? (
          <div
            className="bg-surface-hover rounded animate-pulse"
            style={{ height }}
          />
        ) : (
          <ResponsiveContainer width="100%" height={height}>
            {type === 'bar' ? (
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey={xAxisKey}
                  tickFormatter={formatXAxis}
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                {stackedKeys ? (
                  stackedKeys.map((key, i) => (
                    <Bar
                      key={key}
                      dataKey={key}
                      stackId="stack"
                      fill={stackColors?.[i] || color}
                      radius={i === stackedKeys.length - 1 ? [4, 4, 0, 0] : undefined}
                    />
                  ))
                ) : (
                  <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} />
                )}
              </BarChart>
            ) : (
              <AreaChart data={data}>
                <defs>
                  <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey={xAxisKey}
                  tickFormatter={formatXAxis}
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                {stackedKeys ? (
                  stackedKeys.map((key, i) => (
                    <Area
                      key={key}
                      type="monotone"
                      dataKey={key}
                      stackId="stack"
                      stroke={stackColors?.[i] || color}
                      fill={stackColors?.[i] || color}
                      fillOpacity={0.15}
                    />
                  ))
                ) : (
                  <Area
                    type="monotone"
                    dataKey={dataKey}
                    stroke={color}
                    fill={`url(#gradient-${dataKey})`}
                    strokeWidth={2}
                  />
                )}
              </AreaChart>
            )}
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
