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
  it('clamps month-end dates and keeps the original day on later months', () => {
    const timeline = generateTimeline({
      tokenName: 'TEST', totalSupply: TOTAL, tgeDate: '2024-01-31',
      allocations: [{ name: 'A', percent: 100, cliffMonths: 0, vestingMonths: 3, tgePercent: 0, type: 'linear' }],
    });
    expect(timeline.map(row => row.date)).toEqual(['2024-01-31', '2024-02-29', '2024-03-31', '2024-04-30']);
  });

  it('preserves prototype-like allocation names as ordinary data', () => {
    const timeline = generateTimeline({
      tokenName: 'TEST', totalSupply: TOTAL, tgeDate: '2025-01-01',
      allocations: [{ name: '__proto__', percent: 100, cliffMonths: 0, vestingMonths: 0, tgePercent: 100, type: 'cliff' }],
    });
    expect(timeline.length).toBe(1);
    expect(timeline[0].unlocks['__proto__']).toBe(TOTAL);
  });

  it('rejects invalid schedules before building a timeline', () => {
    expect(() => generateTimeline({ tokenName: 'BAD', totalSupply: TOTAL, tgeDate: 'invalid', allocations: [] })).toThrow();
  });
  it('produces correct length', () => {
    const config: TokenConfig = {
      tokenName: 'TEST', totalSupply: TOTAL, tgeDate: '2025-01-01',
      allocations: [
        { name: 'A', percent: 60, cliffMonths: 0, vestingMonths: 6, tgePercent: 10, type: 'linear' },
        { name: 'B', percent: 40, cliffMonths: 6, vestingMonths: 12, tgePercent: 0, type: 'linear' },
      ],
    };
    const timeline = generateTimeline(config);
    // Last unlock is at 6 + 12 = 18, so 0..18 = 19 entries.
    expect(timeline.length).toBe(19);
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

describe('supply conservation across schedule types', () => {
  for (const type of ['linear', 'monthly', 'cliff'] as const) {
    for (const duration of [0, 1, 12]) {
      it(`${type}, duration ${duration}: monthly and cumulative totals agree`, () => {
        const alloc: Allocation = { name: 'A', percent: 100, cliffMonths: 3, vestingMonths: duration, tgePercent: 20, type };
        let sum = 0;
        for (let month = 0; month <= 18; month++) {
          sum += calcAllocationUnlock(alloc, TOTAL, month);
          expect(calcCumulativeUnlock(alloc, TOTAL, month)).toBeCloseTo(sum, 4);
          expect(sum).toBeLessThanOrEqual(TOTAL + 0.0001);
        }
        expect(sum).toBeCloseTo(TOTAL, 4);
      });
    }
  }
});
