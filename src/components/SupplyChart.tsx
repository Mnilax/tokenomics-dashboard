import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine,
} from 'recharts';
import { MonthlyUnlock, TokenConfig } from '../lib/schema';
import { findLargeUnlocks } from '../lib/vesting';

interface Props {
  timeline: MonthlyUnlock[];
  config: TokenConfig;
}

const COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#06b6d4', '#3b82f6', '#64748b', '#78716c',
];

export function SupplyChart({ timeline, config }: Props) {
  if (timeline.length === 0) return null;

  const allocNames = config.allocations.map((a) => a.name);
  const markers = findLargeUnlocks(timeline, 0.03, config.totalSupply);

  const data = timeline.map((entry) => {
    return {
      month: `M${entry.month}`,
      date: entry.date,
      cumulative: entry.cumulative,
    };
  });

  const fmt = (n: number) => {
    if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
    if (n >= 1e6) return `${(n / 1e6).toFixed(0)}M`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
    return n.toString();
  };

  return (
    <ResponsiveContainer width="100%" height={400}>
      <AreaChart data={data} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 12 }} />
        <YAxis
          tickFormatter={fmt}
          tick={{ fill: '#9ca3af', fontSize: 12 }}
        />
        <Tooltip
          contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
          formatter={(value: number, name: string) => [fmt(value), name]}
          labelFormatter={(label) => `Month: ${label}`}
        />
        {allocNames.map((name, idx) => (
          <Area
            key={name}
            type="monotone"
            dataKey={(row: { cumulative: Record<string, number> }) => row.cumulative[name] || 0}
            name={name}
            stackId="1"
            fill={COLORS[idx % COLORS.length]}
            stroke={COLORS[idx % COLORS.length]}
            fillOpacity={0.6}
          />
        ))}
        {markers.map((m) => (
          <ReferenceLine
            key={m.month}
            x={`M${m.month}`}
            stroke="#ef4444"
            strokeDasharray="3 3"
            label={{ value: `${m.percent.toFixed(1)}%`, fill: '#ef4444', fontSize: 11 }}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
