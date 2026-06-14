import { describe, it, expect } from 'vitest';
import { calcAllocationUnlock, calcCumulativeUnlock, generateTimeline } from './vesting';
import { Allocation, TokenConfig } from './schema';

const TOTAL = 1_000_000_000;

describe('calcAllocationUnlock', () => {
  it('unlocks TGE tokens at month 0', () => {
    const alloc: Allocation = {
      name: 'Sale', percent: 10, cliffMonths: 0,
      vestingMonths: 12, tgePercent: 20, type: 'linear',
    };
    const tge = calcAllocationUnlock(alloc, TOTAL, 0);
    expect(tge).toBe(20_000_000); // 10% of 1B = 100M, 20% TGE = 20M
  });

  it('returns 0 during cliff', () => {
    const alloc: Allocation = {
      name: 'Team', percent: 20, cliffMonths: 12,
      vestingMonths: 24, tgePercent: 0, type: 'linear',
    };
    expect(calcAllocationUnlock(alloc, TOTAL, 6)).toBe(0);
    expect(calcAllocationUnlock(alloc, TOTAL, 12)).toBe(0);
  });

  it('vests linearly after cliff', () => {
    const alloc: Allocation = {
      name: 'Team', percent: 20, cliffMonths: 6,
      vestingMonths: 12, tgePercent: 0, type: 'linear',
    };
    const monthly = calcAllocationUnlock(alloc, TOTAL, 7);
    // 200M / 12 months = 16.67M per month
    expect(monthly).toBeCloseTo(200_000_000 / 12, 0);
  });

  it('cliff type unlocks everything at once', () => {
    const alloc: Allocation = {
      name: 'Advisor', percent: 5, cliffMonths: 12,
      vestingMonths: 0, tgePercent: 0, type: 'cliff',
    };
    expect(calcAllocationUnlock(alloc, TOTAL, 12)).toBe(0);
    expect(calcAllocationUnlock(alloc, TOTAL, 13)).toBe(50_000_000);
    expect(calcAllocationUnlock(alloc, TOTAL, 14)).toBe(0);
  });
});

describe('calcCumulativeUnlock', () => {
  it('accumulates correctly', () => {
    const alloc: Allocation = {
      name: 'Sale', percent: 10, cliffMonths: 0,
      vestingMonths: 10, tgePercent: 10, type: 'linear',
    };
    // TGE: 10% of 100M = 10M
    // Vesting: 90M over 10 months = 9M/month
    const cum5 = calcCumulativeUnlock(alloc, TOTAL, 5);
    expect(cum5).toBeCloseTo(10_000_000 + 5 * 9_000_000, 0);
  });

  it('reaches 100% after full vesting', () => {
    const alloc: Allocation = {
      name: 'Full', percent: 100, cliffMonths: 0,
      vestingMonths: 12, tgePercent: 0, type: 'linear',
    };
    const cum = calcCumulativeUnlock(alloc, TOTAL, 12);
    expect(cum).toBeCloseTo(TOTAL, 0);
  });
});

describe('generateTimeline', () => {
  it('produces correct length', () => {
    const config: TokenConfig = {
      tokenName: 'TEST', totalSupply: TOTAL, tgeDate: '2025-01-01',
      allocations: [
        { name: 'A', percent: 60, cliffMonths: 0, vestingMonths: 6, tgePercent: 10, type: 'linear' },
        { name: 'B', percent: 40, cliffMonths: 6, vestingMonths: 12, tgePercent: 0, type: 'linear' },
      ],
    };
    const timeline = generateTimeline(config);
    // Max = 6 + 12 + 1 = 19, so 0..19 = 20 entries
    expect(timeline.length).toBe(20);
    expect(timeline[0].month).toBe(0);
  });

  it('ends at 100% circulating', () => {
    const config: TokenConfig = {
      tokenName: 'TEST', totalSupply: TOTAL, tgeDate: '2025-01-01',
      allocations: [
        { name: 'A', percent: 100, cliffMonths: 0, vestingMonths: 12, tgePercent: 0, type: 'linear' },
      ],
    };
    const timeline = generateTimeline(config);
    const last = timeline[timeline.length - 1];
    expect(last.circulatingPercent).toBeCloseTo(100, 1);
  });
});
