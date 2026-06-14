import { useState } from 'react';
import { AllocationForm } from './components/AllocationForm';
import { AllocationPie } from './components/AllocationPie';
import { SupplyChart } from './components/SupplyChart';
import { UnlockCalendar } from './components/UnlockCalendar';
import { TokenConfig, validateConfig } from './lib/schema';
import { generateTimeline } from './lib/vesting';
import sampleData from './examples/sample-token.json';

function App() {
  const [config, setConfig] = useState<TokenConfig>(sampleData as TokenConfig);
  const [activeTab, setActiveTab] = useState<'chart' | 'calendar'>('chart');

  const errors = validateConfig(config);
  const timeline = errors.length === 0 ? generateTimeline(config) : [];

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800 px-6 py-4">
        <h1 className="text-xl font-bold">
          📊 {config.tokenName} Tokenomics Dashboard
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Vesting schedule visualization — enter allocations to see unlock timeline
        </p>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Form */}
        <section className="bg-gray-900 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Configuration</h2>
          <AllocationForm config={config} onChange={setConfig} />
        </section>

        {/* Errors */}
        {errors.length > 0 && (
          <div className="bg-red-900/30 border border-red-800 rounded-lg p-4">
            <h3 className="text-red-400 font-semibold mb-2">Validation Errors</h3>
            <ul className="text-sm text-red-300 list-disc list-inside">
              {errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        )}

        {/* Charts */}
        {timeline.length > 0 && (
          <>
            {/* Pie */}
            <section className="bg-gray-900 rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4">Allocation Distribution</h2>
              <AllocationPie allocations={config.allocations} />
            </section>

            {/* Tabs */}
            <section className="bg-gray-900 rounded-lg p-6">
              <div className="flex items-center gap-4 mb-4">
                <button
                  onClick={() => setActiveTab('chart')}
                  className={`px-4 py-1.5 rounded text-sm ${
                    activeTab === 'chart'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                  }`}
                >
                  Supply Chart
                </button>
                <button
                  onClick={() => setActiveTab('calendar')}
                  className={`px-4 py-1.5 rounded text-sm ${
                    activeTab === 'calendar'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                  }`}
                >
                  Unlock Calendar
                </button>
              </div>

              {activeTab === 'chart' ? (
                <>
                  <h2 className="text-lg font-semibold mb-2">Circulating Supply Over Time</h2>
                  <p className="text-sm text-gray-500 mb-4">
                    Stacked area chart — red dashed lines mark large unlocks (&gt;3% of supply)
                  </p>
                  <SupplyChart timeline={timeline} config={config} />
                </>
              ) : (
                <>
                  <h2 className="text-lg font-semibold mb-2">Monthly Unlock Calendar</h2>
                  <p className="text-sm text-gray-500 mb-4">
                    Highlighted rows indicate large unlock events
                  </p>
                  <UnlockCalendar timeline={timeline} config={config} />
                </>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
