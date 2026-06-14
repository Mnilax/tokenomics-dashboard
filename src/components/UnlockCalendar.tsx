import { MonthlyUnlock, TokenConfig } from '../lib/schema';

interface Props {
  timeline: MonthlyUnlock[];
  config: TokenConfig;
}

export function UnlockCalendar({ timeline, config }: Props) {
  if (timeline.length === 0) return null;

  const allocNames = config.allocations.map((a) => a.name);

  const fmt = (n: number) => {
    if (n === 0) return '—';
    if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
    if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
    return n.toFixed(0);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-700">
            <th className="text-left py-2 px-3 text-gray-400">Month</th>
            <th className="text-left py-2 px-3 text-gray-400">Date</th>
            {allocNames.map((name) => (
              <th key={name} className="text-right py-2 px-3 text-gray-400">{name}</th>
            ))}
            <th className="text-right py-2 px-3 text-gray-400 font-bold">Total Unlocked</th>
            <th className="text-right py-2 px-3 text-gray-400">Circ %</th>
          </tr>
        </thead>
        <tbody>
          {timeline.map((entry) => {
            const monthTotal = Object.values(entry.unlocks).reduce((a, b) => a + b, 0);
            const isLargeUnlock = monthTotal / config.totalSupply > 0.03;

            return (
              <tr
                key={entry.month}
                className={`border-b border-gray-800 ${isLargeUnlock ? 'bg-red-900/20' : 'hover:bg-gray-800/50'}`}
              >
                <td className="py-1.5 px-3 text-gray-300">M{entry.month}</td>
                <td className="py-1.5 px-3 text-gray-500">{entry.date}</td>
                {allocNames.map((name) => (
                  <td key={name} className="py-1.5 px-3 text-right text-gray-300">
                    {fmt(entry.unlocks[name] || 0)}
                  </td>
                ))}
                <td className="py-1.5 px-3 text-right font-semibold text-gray-100">
                  {fmt(entry.totalUnlocked)}
                </td>
                <td className="py-1.5 px-3 text-right text-gray-400">
                  {entry.circulatingPercent.toFixed(1)}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
