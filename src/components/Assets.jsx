import React from "react";
import { useAccount } from 'wagmi';
import { usePortfolioData } from '../hooks/usePortfolioData';

const Assets = () => {
  const { address, isConnected } = useAccount();
  const {
    tokens,
    transactions,
    totalValue,
    totalChange,
    loading,
    error,
    selectedChain,
    setSelectedChain,
    lastUpdated,
    refetch,
  } = usePortfolioData();

  const chains = [
    { id: "all", name: "All", icon: "🌐", color: "from-gray-500 to-gray-600" },
    { id: "ethereum", name: "Ethereum", icon: "🔷", color: "from-blue-600 to-blue-400" },
    { id: "polygon", name: "Polygon", icon: "💜", color: "from-blue-400 to-blue-300" },
    { id: "bsc", name: "BSC", icon: "💛", color: "from-blue-300 to-blue-200" },
  ];

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <div className="w-16 h-16 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-700 dark:text-white mb-2">Connect Your Wallet</h3>
        <p className="text-gray-500 dark:text-gray-400">Please connect your wallet to view your assets</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full max-w-sm mx-auto p-4 space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-1">Assets</h2>
          <div className="bg-gradient-to-r from-blue-600 to-blue-400 rounded-xl p-4 text-white">
            <div className="animate-pulse">
              <div className="h-4 bg-white/20 rounded mb-2"></div>
              <div className="h-8 bg-white/20 rounded mb-2"></div>
              <div className="h-4 bg-white/20 rounded"></div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
            <div className="grid grid-cols-4 gap-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
              ))}
            </div>
          </div>

          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-sm mx-auto p-4 space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-1">Assets</h2>
          <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-xl p-4">
            <div className="text-blue-600 mb-2">
              <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-blue-700 dark:text-blue-300 font-medium">Failed to load portfolio data</p>
            <p className="text-blue-600 dark:text-blue-400 text-sm mt-1">{error}</p>
            <button
              onClick={refetch}
              className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-1">Assets</h2>
        <div className="bg-gradient-to-r from-blue-600 to-blue-400 rounded-xl p-4 text-white">
          <p className="text-sm opacity-90">Total Portfolio Value</p>
          <p className="text-3xl font-bold">${totalValue.toFixed(2)}</p>
          <p className={`text-sm ${totalChange >= 0 ? 'text-green-200' : 'text-red-200'}`}>
            {totalChange >= 0 ? '+' : ''}{totalChange.toFixed(2)}% (24h)
          </p>
          {lastUpdated && (
            <p className="text-xs opacity-75 mt-1">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
      </div>

      {/* Chain Selector */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Network</label>
        <div className="grid grid-cols-4 gap-2">
          {chains.map((chain) => (
            <button
              key={chain.id}
              onClick={() => setSelectedChain(chain.id)}
              className={`p-3 rounded-xl border-2 transition-all ${
                selectedChain === chain.id 
                  ? "border-blue-600 bg-blue-50 dark:bg-blue-900"
                  : "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-500"
              }`}
            >
              <div className="text-center">
                <div className="text-lg mb-1">{chain.icon}</div>
                <div className="text-xs font-medium dark:text-white">{chain.name}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Tokens */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tokens</label>
          <span className="text-xs text-gray-500 dark:text-gray-400">{tokens.length} tokens</span>
        </div>
        {tokens.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm">No tokens found on this network</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {tokens.map((token) => (
              <div key={`${token.symbol}-${token.chain}`} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-500 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-700 dark:to-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-lg">{token.icon}</span>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-800 dark:text-white">{token.symbol}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{token.name}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-800 dark:text-white">{token.balance}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{token.value}</div>
                  </div>
                </div>
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                  <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">{token.chain}</span>
                  <span className={`text-xs font-medium ${
                    token.changeType === 'positive' ? 'text-green-600' : 
                    token.changeType === 'negative' ? 'text-red-600' : 'text-gray-600 dark:text-gray-400'
                  }`}>
                    {token.change}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Transactions */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Recent Activity</label>
        {transactions.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-gray-500 dark:text-gray-400 text-sm">No recent transactions</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {transactions.map((tx, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      tx.type === 'send' ? 'bg-blue-100 dark:bg-blue-900' : 
                      tx.type === 'receive' ? 'bg-green-100 dark:bg-green-900' : 'bg-blue-100 dark:bg-blue-900'
                    }`}>
                      <svg className={`w-4 h-4 ${
                        tx.type === 'send' ? 'text-blue-600' : 
                        tx.type === 'receive' ? 'text-green-600' : 'text-blue-600'
                      }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {tx.type === 'send' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />}
                        {tx.type === 'receive' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />}
                        {tx.type === 'swap' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7V4a1 1 0 011-1h3" />}
                      </svg>
                    </div>
                    <div>
                      <div className="font-medium text-gray-800 dark:text-white capitalize">{tx.type}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{tx.to || tx.from}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-800 dark:text-white">{tx.amount} {tx.token}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{tx.time}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button className="p-3 bg-gradient-to-r from-blue-600 to-blue-400 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-500 transition-all">
          Send
        </button>
        <button className="p-3 bg-gradient-to-r from-blue-400 to-blue-300 text-white rounded-xl font-semibold hover:from-blue-500 hover:to-blue-400 transition-all">
          Swap
        </button>
      </div>
    </div>
  );
};

export default Assets;
