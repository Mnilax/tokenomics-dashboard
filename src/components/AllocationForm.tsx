import React, { useRef } from 'react';
import { Allocation, TokenConfig, VestingType, createDefaultAllocation, parseConfigJSON } from '../lib/schema';

interface Props {
  config: TokenConfig;
  onChange: (config: TokenConfig) => void;
}

const VESTING_TYPES: VestingType[] = ['linear', 'monthly', 'cliff'];

export function AllocationForm({ config, onChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const updateField = (key: keyof TokenConfig, value: string | number) => {
    onChange({ ...config, [key]: value });
  };

  const updateAllocation = (idx: number, key: keyof Allocation, value: string | number) => {
    const allocs = [...config.allocations];
    allocs[idx] = { ...allocs[idx], [key]: value };
    onChange({ ...config, allocations: allocs });
  };

  const addAllocation = () => {
    onChange({
      ...config,
      allocations: [...config.allocations, createDefaultAllocation()],
    });
  };

  const removeAllocation = (idx: number) => {
    onChange({
      ...config,
      allocations: config.allocations.filter((_, i) => i !== idx),
    });
  };

  const importJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = parseConfigJSON(ev.target?.result as string);
        onChange(data);
      } catch (error) {
        alert(`Invalid configuration: ${error instanceof Error ? error.message : 'Could not read JSON file'}`);
      }
    };
    reader.onerror = () => alert('Could not read configuration file');
    reader.readAsText(file);
    e.target.value = '';
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.tokenName.toLowerCase()}-tokenomics.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalPercent = config.allocations.reduce((s, a) => s + a.percent, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Token Name</label>
          <input
            type="text"
            value={config.tokenName}
            onChange={(e) => updateField('tokenName', e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Total Supply</label>
          <input
            type="number"
            value={config.totalSupply}
            onChange={(e) => updateField('totalSupply', Number(e.target.value))}
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">TGE Date</label>
          <input
            type="date"
            value={config.tgeDate}
            onChange={(e) => updateField('tgeDate', e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-300">
            Allocations ({totalPercent.toFixed(1)}%
            {Math.abs(totalPercent - 100) > 0.01 && (
              <span className="text-red-400"> — should be 100%</span>
            )}
            )
          </h3>
          <div className="flex gap-2">
            <input ref={fileRef} type="file" accept=".json" onChange={importJSON} className="hidden" />
            <button
              onClick={() => fileRef.current?.click()}
              className="text-xs px-3 py-1 bg-gray-700 rounded hover:bg-gray-600"
            >
              Import JSON
            </button>
            <button
              onClick={exportJSON}
              className="text-xs px-3 py-1 bg-gray-700 rounded hover:bg-gray-600"
            >
              Export JSON
            </button>
          </div>
        </div>

        {config.allocations.map((alloc, idx) => (
          <div key={idx} className="grid grid-cols-7 gap-2 items-end bg-gray-800/50 p-3 rounded">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Name</label>
              <input
                type="text"
                value={alloc.name}
                onChange={(e) => updateAllocation(idx, 'name', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm"
                placeholder="e.g. Team"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">%</label>
              <input
                type="number"
                value={alloc.percent}
                onChange={(e) => updateAllocation(idx, 'percent', Number(e.target.value))}
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm"
                min={0} max={100} step={0.1}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Cliff (mo)</label>
              <input
                type="number"
                value={alloc.cliffMonths}
                onChange={(e) => updateAllocation(idx, 'cliffMonths', Number(e.target.value))}
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm"
                min={0}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Vesting (mo)</label>
              <input
                type="number"
                value={alloc.vestingMonths}
                onChange={(e) => updateAllocation(idx, 'vestingMonths', Number(e.target.value))}
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm"
                min={0}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">TGE %</label>
              <input
                type="number"
                value={alloc.tgePercent}
                onChange={(e) => updateAllocation(idx, 'tgePercent', Number(e.target.value))}
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm"
                min={0} max={100}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Type</label>
              <select
                value={alloc.type}
                onChange={(e) => updateAllocation(idx, 'type', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm"
              >
                {VESTING_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => removeAllocation(idx)}
              className="text-red-400 hover:text-red-300 text-sm pb-1"
            >
              ✕
            </button>
          </div>
        ))}

        <button
          onClick={addAllocation}
          className="w-full py-2 border border-dashed border-gray-600 rounded text-sm text-gray-400 hover:text-gray-200 hover:border-gray-400"
        >
          + Add Allocation
        </button>
      </div>
    </div>
  );
}
