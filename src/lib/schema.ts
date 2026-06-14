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

export function validateConfig(config: TokenConfig): string[] {
  const errors: string[] = [];

  if (!config.tokenName) errors.push('Token name is required');
  if (config.totalSupply <= 0) errors.push('Total supply must be positive');
  if (!config.tgeDate) errors.push('TGE date is required');
  if (config.allocations.length === 0) errors.push('At least one allocation is required');

  const totalPercent = config.allocations.reduce((sum, a) => sum + a.percent, 0);
  if (Math.abs(totalPercent - 100) > 0.01) {
    errors.push(`Allocation percentages sum to ${totalPercent.toFixed(1)}%, should be 100%`);
  }

  for (const a of config.allocations) {
    if (!a.name) errors.push('Allocation name is required');
    if (a.percent < 0 || a.percent > 100) errors.push(`${a.name}: percent must be 0-100`);
    if (a.cliffMonths < 0) errors.push(`${a.name}: cliff months must be >= 0`);
    if (a.vestingMonths < 0) errors.push(`${a.name}: vesting months must be >= 0`);
    if (a.tgePercent < 0 || a.tgePercent > 100) errors.push(`${a.name}: TGE% must be 0-100`);
  }

  return errors;
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
