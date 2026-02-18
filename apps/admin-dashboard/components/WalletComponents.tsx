import React, { useEffect, useState } from 'react';
import { useStore } from '@/store/appStore';
import { getRelayerStats, getGasPrice, getTransactionReceipt } from '@/lib/api';
import { format } from 'date-fns';

export const WalletInfo: React.FC = () => {
  const { wallet } = useStore();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await getRelayerStats();
        setStats(data);
      } catch (error) {
        console.error('Error loading stats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Wallet Information</h3>
      <div className="space-y-4">
        <div className="flex justify-between items-center p-2 bg-gray-700 rounded">
          <span>Balance:</span>
          <span className="font-mono text-lg text-green-400">{wallet.balance} {wallet.symbol}</span>
        </div>
        <div className="flex justify-between items-center p-2 bg-gray-700 rounded">
          <span>Relayer Address:</span>
          <span className="font-mono text-sm truncate text-blue-400">{stats?.relayerAddress}</span>
        </div>
        <div className="flex justify-between items-center p-2 bg-gray-700 rounded">
          <span>Nonce:</span>
          <span className="font-mono">{stats?.nonce || 'Loading...'}</span>
        </div>
      </div>
    </div>
  );
};

export const GasMonitor: React.FC = () => {
  const [gasData, setGasData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadGasData = async () => {
      try {
        const data = await getGasPrice();
        setGasData(data);
      } catch (error) {
        console.error('Error loading gas data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadGasData();
    const interval = setInterval(loadGasData, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Gas Price Monitor</h3>
      {loading ? (
        <div className="text-center text-gray-400">Loading...</div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center p-2 bg-gray-700 rounded">
            <span>Base Fee:</span>
            <span className="font-mono text-lg">{gasData?.baseFeePerGas ? (BigInt(gasData.baseFeePerGas) / BigInt(1e9)).toString() : 'N/A'} Gwei</span>
          </div>
          <div className="flex justify-between items-center p-2 bg-gray-700 rounded">
            <span>Max Fee per Gas:</span>
            <span className="font-mono text-lg text-green-400">{gasData?.maxFeePerGas ? (BigInt(gasData.maxFeePerGas) / BigInt(1e9)).toString() : 'N/A'} Gwei</span>
          </div>
          <div className="flex justify-between items-center p-2 bg-gray-700 rounded">
            <span>Priority Fee:</span>
            <span className="font-mono text-lg text-yellow-400">{gasData?.maxPriorityFeePerGas ? (BigInt(gasData.maxPriorityFeePerGas) / BigInt(1e9)).toString() : 'N/A'} Gwei</span>
          </div>
          <div className="text-xs text-gray-500 mt-4">Updated: {new Date().toLocaleTimeString()}</div>
        </div>
      )}
    </div>
  );
};

export const TransactionMonitor: React.FC<{ txHash?: string }> = ({ txHash }) => {
  const [txData, setTxData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!txHash) return;

    const loadTxData = async () => {
      setLoading(true);
      try {
        const data = await getTransactionReceipt(txHash);
        setTxData(data);
      } catch (error) {
        console.error('Error loading transaction:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTxData();
    const interval = setInterval(loadTxData, 5000);

    return () => clearInterval(interval);
  }, [txHash]);

  if (!txHash) {
    return null;
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 mt-4">
      <h3 className="text-lg font-semibold mb-4">Transaction Status</h3>
      {loading ? (
        <div className="text-center text-gray-400">Loading...</div>
      ) : txData ? (
        <div className="space-y-3">
          <div className="flex justify-between items-center p-2 bg-gray-700 rounded">
            <span>Status:</span>
            <span className={`font-semibold ${txData.status === 'success' ? 'text-green-400' : 'text-red-400'}`}>
              {txData.status.toUpperCase()}
            </span>
          </div>
          <div className="flex justify-between items-center p-2 bg-gray-700 rounded">
            <span>Tx Hash:</span>
            <span className="font-mono text-sm text-blue-400 truncate">{txData.txHash}</span>
          </div>
          <div className="flex justify-between items-center p-2 bg-gray-700 rounded">
            <span>Block Number:</span>
            <span className="font-mono">{txData.blockNumber}</span>
          </div>
          <div className="flex justify-between items-center p-2 bg-gray-700 rounded">
            <span>Gas Used:</span>
            <span className="font-mono text-yellow-400">{BigInt(txData.gasUsed).toString()}</span>
          </div>
          <div className="flex justify-between items-center p-2 bg-gray-700 rounded">
            <span>Gas Price:</span>
            <span className="font-mono">{(BigInt(txData.gasPrice) / BigInt(1e9)).toString()} Gwei</span>
          </div>
          <div className="flex justify-between items-center p-2 bg-gray-700 rounded">
            <span>Transaction Fee:</span>
            <span className="font-mono text-lg text-orange-400">{txData.transactionFee} Wei</span>
          </div>
        </div>
      ) : (
        <div className="text-center text-gray-400">No transaction data available</div>
      )}
    </div>
  );
};
