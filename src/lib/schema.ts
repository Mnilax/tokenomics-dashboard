/**
 * Types and validation for tokenomics data.
 */

export type VestingType = 'linear' | 'monthly' | 'cliff';

export interface Allocation {
  name: string;
  percent: number;          // % of total supply (0-100)
  cliffMonths: number;      // months before any vesting starts
  vestingMonths: number;    // duration of vesting after cliff
  tgePercent: number;       // % unlocked at TGE (0-100 of this allocation)
  type: VestingType;
}

export interface TokenConfig {
  tokenName: string;
  totalSupply: number;
  tgeDate: string;          // ISO date
  allocations: Allocation[];
}

export interface MonthlyUnlock {
  month: number;            // 0 = TGE
  date: string;             // ISO date
  unlocks: Record<string, number>;  // allocation name -> tokens unlocked this month
  cumulative: Record<string, number>; // allocation name -> total unlocked so far
  totalUnlocked: number;    // cumulative total across all allocations
  circulatingPercent: number; // % of total supply
}

export const MAX_SCHEDULE_MONTHS = 1200;

export function validateConfig(value: unknown): string[] {
  const errors: string[] = [];
  if (!value || typeof value !== 'object' || Array.isArray(value)) return ['Configuration must be an object'];
  const config = value as Record<string, unknown>;
  if (typeof config.tokenName !== 'string' || !config.tokenName.trim()) errors.push('Token name is required');
  if (typeof config.totalSupply !== 'number' || !Number.isFinite(config.totalSupply) || config.totalSupply <= 0) {
    errors.push('Total supply must be a finite positive number');
  }
  const date = typeof config.tgeDate === 'string' ? config.tgeDate : '';
  const parsedDate = new Date(`${date}T00:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) {
    errors.push('TGE date must be a valid ISO date (YYYY-MM-DD)');
  }
  if (!Array.isArray(config.allocations) || config.allocations.length === 0) return [...errors, 'At least one allocation is required'];

  const names = new Set<string>();
  let totalPercent = 0;
  for (const [index, value] of config.allocations.entries()) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      errors.push(`Allocation ${index + 1} must be an object`);
      continue;
    }
    const a = value as Record<string, unknown>;
    const name = typeof a.name === 'string' ? a.name.trim() : '';
    if (!name) errors.push('Allocation name is required');
    if (names.has(name)) errors.push(`Duplicate allocation name: ${name}`);
    names.add(name);
    for (const key of ['percent', 'tgePercent'] as const) {
      const number = a[key];
      if (typeof number !== 'number' || !Number.isFinite(number) || number < 0 || number > 100) {
        errors.push(`${name || index + 1}: ${key} must be a finite number from 0 to 100`);
      }
    }
    if (typeof a.percent === 'number' && Number.isFinite(a.percent)) totalPercent += a.percent;
    for (const key of ['cliffMonths', 'vestingMonths'] as const) {
      const number = a[key];
      if (typeof number !== 'number' || !Number.isInteger(number) || number < 0 || number > MAX_SCHEDULE_MONTHS) {
        errors.push(`${name || index + 1}: ${key} must be an integer from 0 to ${MAX_SCHEDULE_MONTHS}`);
      }
    }
    if (typeof a.cliffMonths === 'number' && typeof a.vestingMonths === 'number' && a.cliffMonths + Math.max(a.vestingMonths, 1) > MAX_SCHEDULE_MONTHS) {
      errors.push(`${name || index + 1}: schedule must finish within ${MAX_SCHEDULE_MONTHS} months`);
    }
    if (!['linear', 'monthly', 'cliff'].includes(a.type as string)) errors.push(`${name || index + 1}: invalid vesting type`);
  }
  if (Math.abs(totalPercent - 100) > 0.01) {
    errors.push(`Allocation percentages sum to ${totalPercent.toFixed(1)}%, should be 100%`);
  }
  return errors;
}

export function parseConfigJSON(text: string): TokenConfig {
  const data: unknown = JSON.parse(text);
  const errors = validateConfig(data);
  if (errors.length) throw new Error(errors.join('\n'));
  return data as TokenConfig;
}

export function createDefaultAllocation(): Allocation {
  return {
    name: '',
    percent: 0,
    cliffMonths: 0,
    vestingMonths: 12,
    tgePercent: 0,
    type: 'linear',
  };
}

export function createDefaultConfig(): TokenConfig {
  return {
    tokenName: 'TOKEN',
    totalSupply: 1_000_000_000,
    tgeDate: new Date().toISOString().split('T')[0],
    allocations: [],
  };
}
