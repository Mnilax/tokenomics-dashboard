import { describe, it, expect } from 'vitest';
import { parseConfigJSON, validateConfig, TokenConfig } from './schema';

const valid: TokenConfig = {
  tokenName: 'TEST', totalSupply: 1000, tgeDate: '2024-01-31',
  allocations: [{ name: 'Team', percent: 100, cliffMonths: 0, vestingMonths: 12, tgePercent: 10, type: 'linear' }],
};

describe('runtime configuration validation', () => {
  it('accepts the documented configuration shape', () => {
    expect(parseConfigJSON(JSON.stringify(valid))).toEqual(valid);
  });

  it.each([null, [], {}, { allocations: 'oops' }, { ...valid, allocations: [null] }])('rejects malformed imports without crashing: %j', (value) => {
    expect(validateConfig(value).length).toBeGreaterThan(0);
    expect(() => parseConfigJSON(JSON.stringify(value))).toThrow();
  });

  it.each(['2025-02-29', '2024-02-30', 'not-a-date', '2024-01-01T12:00:00Z'])('rejects invalid date %s', (tgeDate) => {
    expect(validateConfig({ ...valid, tgeDate }).length).toBeGreaterThan(0);
  });

  it.each([NaN, Infinity, -1, 0, '1000'])('rejects invalid supply %s', (totalSupply) => {
    expect(validateConfig({ ...valid, totalSupply }).length).toBeGreaterThan(0);
  });

  it.each([
    { percent: '100' }, { tgePercent: NaN }, { cliffMonths: 1.5 },
    { vestingMonths: Infinity }, { vestingMonths: 1000000 }, { type: 'unknown' },
  ])('rejects invalid allocation fields %j', (fields) => {
    expect(validateConfig({ ...valid, allocations: [{ ...valid.allocations[0], ...fields }] }).length).toBeGreaterThan(0);
  });

  it('rejects duplicate names before keyed charts overwrite allocations', () => {
    const allocation = { ...valid.allocations[0], percent: 50 };
    expect(validateConfig({ ...valid, allocations: [allocation, allocation] })).toContain('Duplicate allocation name: Team');
  });
});
