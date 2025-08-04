import React from "react";
import { useAccount } from 'wagmi';
import { QRCodeSVG } from 'qrcode.react';

const QRCode = () => {
  const { address, isConnected } = useAccount();

  const handleCopyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
    }
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <div className="w-16 h-16 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Connect Your Wallet</h3>
        <p className="text-gray-500 dark:text-gray-400">Please connect your wallet to view QR code</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-1">QR Code</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Share your wallet address</p>
      </div>

      {/* QR Code Card */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="text-center">
          {/* QR Code */}
          <div className="inline-block bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm mb-6">
            <QRCodeSVG 
              value={address} 
              size={200} 
              fgColor={typeof window !== 'undefined' && document.documentElement.classList.contains('dark') ? "#ffffff" : "#1B263B"}
              
              level="H"
              includeMargin={true} 
            />
          </div>

          {/* Address */}
          <div className="space-y-3">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Wallet Address</div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <div className="font-mono text-sm text-gray-900 dark:text-white break-all">
                {address}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <button 
          onClick={handleCopyAddress}
          className="w-full py-3 bg-gradient-to-r from-orange-500 to-yellow-400 text-white font-semibold rounded-xl hover:from-orange-600 hover:to-yellow-500 transition-all duration-200 shadow-lg"
        >
          Copy Address
        </button>
        
        <button 
          className="w-full py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200"
        >
          Share QR Code
        </button>
      </div>

      {/* Info Section */}
      <div className="bg-blue-50 dark:bg-blue-950 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
        <div className="flex items-start space-x-3">
          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">How to use</h4>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Share this QR code with others to receive payments. They can scan it with their wallet app to get your address.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRCode;
