import React, { useState, useEffect } from "react";
import { useWeb3Modal } from "@web3modal/wagmi/react";
import { useAccount } from "wagmi";
import Send from "./Send.jsx";
import Assets from "./Assets.jsx";
import QRCode from "./QRCode.jsx";
import UniswapFrame from "./Swap.jsx";
import CreateWallet from "./createwallet.jsx";
import logo from "../assets/logo.svg";

const tabs = [
  { name: "Assets", icon: (/* icon */ <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>) },
  { name: "Send", icon: (/* icon */ <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>) },
  { name: "Swap", icon: (/* icon */ <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 7V4a1 1 0 011-1h3" /><path d="M20 17v3a1 1 0 01-1 1h-3" /><path d="M4 17l4-4-4-4" /><path d="M20 7l-4 4 4 4" /></svg>) },
  { name: "QR", icon: (/* icon */ <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /><path d="M7 17v.01M7 14v.01M10 17v.01M17 10v.01M17 7v.01M20 10v.01" /></svg>) },
  { name: "Wallet", icon: (/* icon */ <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 7h14a2 2 0 012 2v6a2 2 0 01-2 2H3V7z" /><path d="M16 11h2v2h-2z" /></svg>) }
];

export default function Homepage() {
  const [activeTab, setActiveTab] = useState("Assets");
  const { open } = useWeb3Modal();
  const { address, isConnected } = useAccount();
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("darkMode") === "true");

  const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";

  useEffect(() => {
    const html = document.documentElement;
    if (darkMode) html.classList.add("dark");
    else html.classList.remove("dark");
    localStorage.setItem("darkMode", darkMode);
  }, [darkMode]);

  return (
    <div>
      <div className="min-h-screen flex flex-col items-center justify-between bg-gradient-to-br from-blue-50 via-white to-blue-200 dark:from-gray-900 dark:via-gray-800 dark:to-black relative overflow-x-hidden text-gray-900 dark:text-gray-100">

        {/* Decorative Backgrounds */}
        <svg className="absolute -top-20 -left-20 opacity-20 z-0" width="400" height="400" viewBox="0 0 400 400" fill="none">
          <circle cx="200" cy="200" r="200" fill="#2563eb" />
        </svg>
        <svg className="absolute -bottom-32 -right-32 opacity-10 z-0" width="400" height="400" viewBox="0 0 400 400" fill="none">
          <circle cx="200" cy="200" r="200" fill="#1e3a8a" />
        </svg>

        {/* Wallet Card */}
        <div className="relative z-10 w-full max-w-sm mt-12 mb-4 p-6 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md rounded-2xl shadow-2xl flex flex-col items-center border border-blue-100 dark:border-gray-700">
          <div className="mb-2 flex items-center justify-center" style={{ height: "100px" }}>
            <img src={logo} alt="Logo" className="w-[600px] h-16" />
          </div>
          {isConnected ? (
            <div className="mt-3 px-5 py-2 bg-gradient-to-r from-blue-700 to-blue-400 text-white rounded-xl font-bold shadow text-center">
              {shortAddress}
            </div>
          ) : (
            <button
              className="mt-3 px-5 py-2 bg-gradient-to-r from-blue-600 to-blue-400 text-white rounded-xl font-bold shadow hover:from-blue-700 hover:to-blue-500 dark:from-blue-700 dark:to-blue-500 transition"
              onClick={open}
            >
              Connect Wallet
            </button>
          )}
        </div>

        {/* Main Panel */}
        <div className="flex-1 w-full max-w-sm flex flex-col items-center justify-center relative z-10">
          {activeTab === "Assets" && <Assets />}
          {activeTab === "Send" && <Send />}
          {activeTab === "Swap" && <UniswapFrame />}
          {activeTab === "QR" && <QRCode />}
          {activeTab === "Wallet" && <CreateWallet />}
        </div>

        {/* Bottom Nav */}
        <div className="w-full max-w-sm fixed bottom-0 left-1/2 -translate-x-1/2 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md rounded-t-2xl shadow-lg flex justify-around py-3 border-t border-blue-100 dark:border-gray-700 z-20">
          {tabs.map((tab) => (
            <button
              key={tab.name}
              className={`flex flex-col items-center flex-1 py-1 transition font-semibold ${
                activeTab === tab.name
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-gray-400 dark:text-gray-500 hover:text-blue-400 dark:hover:text-blue-300"
              }`}
              onClick={() => setActiveTab(tab.name)}
            >
              <span>{tab.icon}</span>
              <span className="text-xs mt-1">{tab.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
