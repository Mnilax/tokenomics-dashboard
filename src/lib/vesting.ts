/**
 * Core vesting calculation engine — pure functions.
 *
 * Input: allocations + total supply + TGE date
 * Output: monthly timeline of unlocks and circulating supply
 */

import { Allocation, MonthlyUnlock, TokenConfig, validateConfig } from './schema';

/**
 * Calculate tokens unlocked for a single allocation at a given month.
 */
export function calcAllocationUnlock(
  alloc: Allocation,
  totalSupply: number,
  month: number,
): number {
  if (!Number.isInteger(month) || month < 0) return 0;
  const totalTokens = (alloc.percent / 100) * totalSupply;
  const tgeTokens = (alloc.tgePercent / 100) * totalTokens;
  const vestableTokens = totalTokens - tgeTokens;

  // Month 0 = TGE
  if (month === 0) {
    return tgeTokens;
  }

  // During cliff — no unlocks
  if (month <= alloc.cliffMonths) {
    return 0;
  }

  // After cliff — vesting
  const monthsAfterCliff = month - alloc.cliffMonths;

  if (alloc.vestingMonths <= 0) {
    // No vesting period — all unlocked at cliff end
    if (month === alloc.cliffMonths + 1) {
      return vestableTokens;
    }
    return 0;
  }

  switch (alloc.type) {
    case 'cliff':
      // Everything unlocks at cliff end
      if (monthsAfterCliff === 1) {
        return vestableTokens;
      }
      return 0;

    case 'monthly':
    case 'linear': {
      // Linear/monthly: equal portions over vesting period
      if (monthsAfterCliff > alloc.vestingMonths) {
        return 0;
      }
      return vestableTokens / alloc.vestingMonths;
    }

    default:
      return 0;
  }
}

/**
 * Calculate cumulative tokens unlocked for an allocation up to a given month.
 */
export function calcCumulativeUnlock(
  alloc: Allocation,
  totalSupply: number,
  upToMonth: number,
): number {
  if (!Number.isInteger(upToMonth) || upToMonth < 0) return 0;
  const total = (alloc.percent / 100) * totalSupply;
  const tge = (alloc.tgePercent / 100) * total;
  const elapsed = Math.max(0, upToMonth - alloc.cliffMonths);
  if (alloc.type === 'cliff' || alloc.vestingMonths === 0) return elapsed >= 1 ? total : tge;
  return tge + (total - tge) * Math.min(elapsed / alloc.vestingMonths, 1);
}

/**
 * Generate the full monthly timeline.
 */
export function generateTimeline(config: TokenConfig): MonthlyUnlock[] {
  const errors = validateConfig(config);
  if (errors.length) throw new Error(errors.join('\n'));
  // Find the latest month any allocation finishes
  const maxMonth = config.allocations.reduce((max, a) => {
    if (a.percent === 0 || a.tgePercent === 100) return max;
    const duration = a.type === 'cliff' ? 1 : Math.max(a.vestingMonths, 1);
    return Math.max(max, a.cliffMonths + duration);
  }, 0);

  const timeline: MonthlyUnlock[] = [];
  const tgeDate = new Date(`${config.tgeDate}T00:00:00.000Z`);

  for (let month = 0; month <= maxMonth; month++) {
    // Keep the original day where possible, clamping month ends in UTC.
    const date = new Date(tgeDate);
    date.setUTCDate(1);
    date.setUTCMonth(date.getUTCMonth() + month);
    const nextMonth = new Date(date);
    nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
    nextMonth.setUTCDate(0);
    date.setUTCDate(Math.min(tgeDate.getUTCDate(), nextMonth.getUTCDate()));

    const unlocks: Record<string, number> = Object.create(null);
    const cumulative: Record<string, number> = Object.create(null);
    let totalUnlocked = 0;

    for (const alloc of config.allocations) {
      const monthUnlock = calcAllocationUnlock(alloc, config.totalSupply, month);
      const cumUnlock = calcCumulativeUnlock(alloc, config.totalSupply, month);

      unlocks[alloc.name] = monthUnlock;
      cumulative[alloc.name] = cumUnlock;
      totalUnlocked += cumUnlock;
    }

    timeline.push({
      month,
      date: date.toISOString().split('T')[0],
      unlocks,
      cumulative,
      totalUnlocked,
      circulatingPercent: (totalUnlocked / config.totalSupply) * 100,
    });
  }

  return timeline;
}

/**
 * Find months with large unlocks (for chart markers).
 */
export function findLargeUnlocks(
  timeline: MonthlyUnlock[],
  threshold: number = 0.05, // 5% of total supply
  totalSupply: number = 1,
): { month: number; date: string; amount: number; percent: number }[] {
  const markers = [];

  for (const entry of timeline) {
    const monthTotal = Object.values(entry.unlocks).reduce((a, b) => a + b, 0);
    const percent = (monthTotal / totalSupply) * 100;

    if (percent >= threshold * 100) {
      markers.push({
        month: entry.month,
        date: entry.date,
        amount: monthTotal,
        percent,
      });
    }
  }

  return markers;
}
