import React, { useState } from 'react';
import Head from 'next/head';
import { HealthTrendChart, ContractorPerformanceChart, InfrastructureStatusChart } from '@/components/Charts';
import { WalletInfo, GasMonitor, TransactionMonitor } from '@/components/WalletComponents';

export default function Dashboard() {
  const [selectedTxHash, setSelectedTxHash] = useState<string | undefined>();

  return (
    <>
      <Head>
        <title>TrustInfra - Admin Dashboard</title>
        <meta name="description" content="Infrastructure Verification Dashboard" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        {/* Header */}
        <header className="bg-gray-800 border-b border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-white">TrustInfra</h1>
                <p className="text-gray-400 mt-2">Infrastructure Verification System</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-400">Last updated: {new Date().toLocaleTimeString()}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* First Row - Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <WalletInfo />
            <GasMonitor />
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Quick Stats</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-2 bg-gray-700 rounded">
                  <span>Total Infrastructure:</span>
                  <span className="font-bold text-blue-400">--</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-700 rounded">
                  <span>Active Claims:</span>
                  <span className="font-bold text-yellow-400">--</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-700 rounded">
                  <span>Avg Health Score:</span>
                  <span className="font-bold text-green-400">--</span>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <HealthTrendChart />
            <ContractorPerformanceChart />
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <InfrastructureStatusChart />
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">System Health</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-700 rounded">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    Blockchain RPC
                  </span>
                  <span className="text-green-400">Connected</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-700 rounded">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    Relayer Service
                  </span>
                  <span className="text-green-400">Active</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-700 rounded">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    Indexer Service
                  </span>
                  <span className="text-green-400">Running</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-700 rounded">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    Database
                  </span>
                  <span className="text-green-400">Connected</span>
                </div>
              </div>
            </div>
          </div>

          {/* Transaction Monitor */}
          <TransactionMonitor txHash={selectedTxHash} />
        </main>

        {/* Footer */}
        <footer className="border-t border-gray-700 mt-12 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-center text-gray-500 text-sm">
              © 2024 TrustInfra. Enterprise-Grade Web3 Infrastructure Verification System.
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
