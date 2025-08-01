import React, { useState } from "react";
import { useAccount } from 'wagmi';

const Send = () => {
  const { address, isConnected } = useAccount();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedToken, setSelectedToken] = useState("ETH");
  const [gasPrice, setGasPrice] = useState("medium");

  const tokens = [
    { symbol: "ETH", name: "Ethereum", balance: "0.1234", icon: "🔷" },
    { symbol: "USDC", name: "USD Coin", balance: "150.00", icon: "💙" },
    { symbol: "USDT", name: "Tether", balance: "200.00", icon: "💚" },
  ];

  const gasOptions = [
    { id: "low", label: "Low", price: "15", time: "~5 min" },
    { id: "medium", label: "Medium", price: "20", time: "~2 min" },
    { id: "high", label: "High", price: "25", time: "~30 sec" },
  ];

  const handleSend = () => {
    // TODO: Implement actual send logic
    console.log("Sending", amount, selectedToken, "to", recipient);
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Connect Your Wallet</h3>
        <p className="text-gray-500">Please connect your wallet to send tokens</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-1">Send</h2>
        <p className="text-gray-500 text-sm">Transfer tokens to another address</p>
      </div>

      {/* Recipient Address */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Recipient Address</label>
        <div className="relative">
          <input
            type="text"
            placeholder="0x..."
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
          />
          <button className="absolute right-3 top-1/2 transform -translate-y-1/2 text-orange-500 hover:text-orange-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Amount and Token */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Amount</label>
        <div className="flex space-x-2">
          <input
            type="number"
            placeholder="0.0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
          />
          <select
            value={selectedToken}
            onChange={(e) => setSelectedToken(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white min-w-[100px]"
          >
            {tokens.map((token) => (
              <option key={token.symbol} value={token.symbol}>
                {token.symbol}
              </option>
            ))}
          </select>
        </div>
        <div className="flex justify-between text-sm text-gray-500">
          <span>Balance: {tokens.find(t => t.symbol === selectedToken)?.balance} {selectedToken}</span>
          <button className="text-orange-500 hover:text-orange-600 font-medium">Max</button>
        </div>
      </div>

      {/* Gas Settings */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Gas Fee</label>
        <div className="space-y-2">
          {gasOptions.map((option) => (
            <label key={option.id} className="flex items-center p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="gas"
                value={option.id}
                checked={gasPrice === option.id}
                onChange={(e) => setGasPrice(e.target.value)}
                className="text-orange-500 focus:ring-orange-500"
              />
              <div className="ml-3 flex-1">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-700">{option.label}</span>
                  <span className="text-sm text-gray-500">{option.price} Gwei</span>
                </div>
                <span className="text-xs text-gray-400">{option.time}</span>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Transaction Summary */}
      <div className="bg-gray-50 rounded-xl p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Amount</span>
          <span className="font-medium">{amount || "0"} {selectedToken}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Gas Fee</span>
          <span className="font-medium">~$2.50</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Total</span>
          <span className="font-medium text-gray-800">~${(parseFloat(amount) || 0) + 2.50}</span>
        </div>
      </div>

      {/* Send Button */}
      <button
        onClick={handleSend}
        disabled={!recipient || !amount}
        className="w-full py-3 bg-gradient-to-r from-orange-500 to-yellow-400 text-white font-bold rounded-xl shadow-lg hover:from-orange-600 hover:to-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
      >
        Send {selectedToken}
      </button>
    </div>
  );
};

export default Send; 