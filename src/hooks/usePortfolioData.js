// src/hooks/usePortfolioData.js
import { useState, useEffect, useCallback } from "react";
import {
  fetchEthereumData,
  fetchPolygonData,
  fetchBSCData,
  fetchTokenPrices,
  fetchTransactionHistory,
  formatBalance,
  formatUSD,
  calculateChange,
} from "../services/api";

export const usePortfolioData = (address) => {
  const [tokens, setTokens] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [totalValue, setTotalValue] = useState(0);
  const [totalChange, setTotalChange] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedChain, setSelectedChain] = useState("all");
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchData = useCallback(async () => {
    if (!address) return;

    setLoading(true);
    setError(null);

    try {
      let allTokens = [];
      let allTransactions = [];

      // Ethereum
      if (selectedChain === "all" || selectedChain === "ethereum") {
        const ethData = await fetchEthereumData(address);
        allTransactions = [...allTransactions, ...ethData.transactions];

        // ETH native balance
        allTokens.push({
          chain: "ethereum",
          symbol: "ETH",
          name: "Ethereum",
          balance: formatBalance(ethData.balance, 18),
          value: "$0", // placeholder until we fetch prices
          change: "0%",
          changeType: "neutral",
          icon: "🔷",
        });

        // Tokens (ERC20)
        ethData.tokens.forEach((t) => {
          allTokens.push({
            chain: "ethereum",
            symbol: t.tokenSymbol,
            name: t.tokenName,
            balance: formatBalance(t.value, t.tokenDecimal),
            value: "$0",
            change: "0%",
            changeType: "neutral",
            icon: "💰",
          });
        });
      }

      // Polygon
      if (selectedChain === "all" || selectedChain === "polygon") {
        const polyData = await fetchPolygonData(address);
        polyData.balance.forEach((t) => {
          allTokens.push({
            chain: "polygon",
            symbol: t.contract_ticker_symbol,
            name: t.contract_name,
            balance: formatBalance(t.balance, t.contract_decimals),
            value: "$0",
            change: "0%",
            changeType: "neutral",
            icon: "💜",
          });
        });
      }

      // BSC
      if (selectedChain === "all" || selectedChain === "bsc") {
        const bscData = await fetchBSCData(address);
        bscData.balance.forEach((t) => {
          allTokens.push({
            chain: "bsc",
            symbol: t.contract_ticker_symbol,
            name: t.contract_name,
            balance: formatBalance(t.balance, t.contract_decimals),
            value: "$0",
            change: "0%",
            changeType: "neutral",
            icon: "💛",
          });
        });
      }

      // Get prices from CoinGecko (for top symbols only)
      const ids = allTokens.map((t) => t.symbol.toLowerCase());
      const prices = await fetchTokenPrices(ids);

      // Apply prices & calculate portfolio value
      let total = 0;
      allTokens = allTokens.map((t) => {
        const priceInfo = prices[t.symbol.toLowerCase()];
        if (priceInfo) {
          const usdValue = parseFloat(t.balance) * priceInfo.usd;
          total += usdValue;

          const changePct = priceInfo.usd_24h_change;
          return {
            ...t,
            value: formatUSD(usdValue),
            change: `${changePct.toFixed(2)}%`,
            changeType: changePct > 0 ? "positive" : changePct < 0 ? "negative" : "neutral",
          };
        }
        return t;
      });

      setTokens(allTokens);
      setTransactions(allTransactions);
      setTotalValue(total);
      setTotalChange(calculateChange(total, total / (1 + totalChange / 100)));
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to fetch portfolio data");
    } finally {
      setLoading(false);
    }
  }, [address, selectedChain]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    tokens,
    transactions,
    totalValue,
    totalChange,
    loading,
    error,
    selectedChain,
    setSelectedChain,
    lastUpdated,
    refetch: fetchData,
  };
};
