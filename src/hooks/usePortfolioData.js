import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import {
  fetchTokenPrices,
  fetchEthereumData,
  fetchPolygonData,
  fetchBSCData,
  fetchTransactionHistory,
  getTokenMetadata,
  formatBalance,
  formatUSD,
  calculateChange,
} from '../services/api';

export const usePortfolioData = () => {
  const { address, isConnected } = useAccount();
  const [portfolioData, setPortfolioData] = useState({
    tokens: [],
    transactions: [],
    totalValue: 0,
    totalChange: 0,
    loading: false,
    error: null,
  });
  const [selectedChain, setSelectedChain] = useState('all');
  const [lastUpdated, setLastUpdated] = useState(null);

  // Fetch data for a specific chain
  const fetchChainData = useCallback(async (chainId, walletAddress) => {
    try {
      let chainData = { tokens: [], transactions: [] };

      switch (chainId) {
        case 'ethereum':
          const ethData = await fetchEthereumData(walletAddress);
          chainData = {
            tokens: ethData.tokens || [],
            transactions: ethData.transactions || [],
            nativeBalance: ethData.balance || '0',
          };
          break;
        case 'polygon':
          const polygonData = await fetchPolygonData(walletAddress);
          chainData = {
            tokens: polygonData.balance || [],
            transactions: polygonData.transactions || [],
            nativeBalance: '0', // MATIC balance will be in tokens array
          };
          break;
        case 'bsc':
          const bscData = await fetchBSCData(walletAddress);
          chainData = {
            tokens: bscData.balance || [],
            transactions: bscData.transactions || [],
            nativeBalance: '0', // BNB balance will be in tokens array
          };
          break;
        default:
          return { tokens: [], transactions: [] };
      }

      return chainData;
    } catch (error) {
      console.error(`Error fetching ${chainId} data:`, error);
      return { tokens: [], transactions: [] };
    }
  }, []);

  // Process and format token data
  const processTokenData = useCallback((rawTokens, chainId, prices, nativeBalance) => {
    const processedTokens = [];
    const tokensArray = Array.isArray(rawTokens) ? rawTokens : [];

    // Add native token (ETH, MATIC, BNB)
    const nativeToken = {
      ethereum: { symbol: 'ETH', name: 'Ethereum', icon: '🔷' },
      polygon: { symbol: 'MATIC', name: 'Polygon', icon: '💜' },
      bsc: { symbol: 'BNB', name: 'Binance Coin', icon: '💛' },
    }[chainId];

    if (nativeToken) {
      const price = prices[nativeToken.symbol.toLowerCase()]?.usd || 0;
      const change = prices[nativeToken.symbol.toLowerCase()]?.usd_24h_change || 0;
      const balance = nativeBalance ? formatBalance(nativeBalance, 18) : '0';
      processedTokens.push({
        symbol: nativeToken.symbol,
        name: nativeToken.name,
        balance: balance,
        value: formatUSD(parseFloat(balance) * price),
        change: `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`,
        changeType: change >= 0 ? 'positive' : change < 0 ? 'negative' : 'neutral',
        icon: nativeToken.icon,
        chain: chainId,
        price: price,
      });
    }

    // Process ERC-20 tokens
    tokensArray.forEach(token => {
      const metadata = getTokenMetadata(chainId, token.contract_address);
      const balance = formatBalance(token.balance || '0', metadata.decimals);
      const price = prices[metadata.symbol.toLowerCase()]?.usd || 0;
      const change = prices[metadata.symbol.toLowerCase()]?.usd_24h_change || 0;
      const value = parseFloat(balance) * price;

      if (parseFloat(balance) > 0) {
        processedTokens.push({
          symbol: metadata.symbol,
          name: metadata.name,
          balance: balance,
          value: formatUSD(value),
          change: `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`,
          changeType: change >= 0 ? 'positive' : change < 0 ? 'negative' : 'neutral',
          icon: '🪙', // Generic token icon
          chain: chainId,
          price: price,
        });
      }
    });

    return processedTokens;
  }, []);

  // Process transaction data
  const processTransactionData = useCallback((rawTransactions, chainId) => {
    const txArray = Array.isArray(rawTransactions) ? rawTransactions : [];
    return txArray.slice(0, 10).map(tx => {
      const isReceive = tx.to?.toLowerCase() === address?.toLowerCase();
      const isSend = tx.from?.toLowerCase() === address?.toLowerCase();
      
      return {
        type: isReceive ? 'receive' : isSend ? 'send' : 'swap',
        token: 'ETH', // This would be determined from the transaction
        amount: formatBalance(tx.value || '0'),
        value: formatUSD(parseFloat(formatBalance(tx.value || '0')) * 2000), // Approximate ETH price
        to: isReceive ? tx.from : tx.to,
        from: isReceive ? tx.from : tx.to,
        time: new Date(parseInt(tx.timeStamp) * 1000).toLocaleDateString(),
        status: tx.isError === '0' ? 'confirmed' : 'failed',
        hash: tx.hash,
      };
    });
  }, [address]);

  // Main data fetching function
  const fetchPortfolioData = useCallback(async () => {
    if (!isConnected || !address) return;

    setPortfolioData(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Fetch token prices
      const tokenIds = ['ethereum', 'matic-network', 'binancecoin', 'usd-coin', 'tether'];
      const prices = await fetchTokenPrices(tokenIds);

      // Fetch data for all chains
      const chains = ['ethereum', 'polygon', 'bsc'];
      const allTokens = [];
      const allTransactions = [];

      for (const chain of chains) {
        const chainData = await fetchChainData(chain, address);
        const processedTokens = processTokenData(chainData.tokens, chain, prices, chainData.nativeBalance);
        const processedTransactions = processTransactionData(chainData.transactions, chain);
        
        allTokens.push(...processedTokens);
        allTransactions.push(...processedTransactions);
      }

      // Calculate totals
      const totalValue = allTokens.reduce((sum, token) => {
        return sum + parseFloat(token.value.replace('$', '').replace(',', ''));
      }, 0);

      const totalChange = allTokens.reduce((sum, token) => {
        const change = parseFloat(token.change.replace('%', '').replace('+', '').replace('-', ''));
        return sum + change;
      }, 0);

      setPortfolioData({
        tokens: allTokens,
        transactions: allTransactions,
        totalValue,
        totalChange,
        loading: false,
        error: null,
      });

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching portfolio data:', error);
      setPortfolioData(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to fetch portfolio data',
      }));
    }
  }, [isConnected, address, fetchChainData, processTokenData, processTransactionData]);

  // Auto-refresh data every 5 minutes
  useEffect(() => {
    if (isConnected && address) {
      fetchPortfolioData();
      
      const interval = setInterval(fetchPortfolioData, 5 * 60 * 1000); // 5 minutes
      return () => clearInterval(interval);
    }
  }, [isConnected, address, fetchPortfolioData]);

  // Filter tokens by selected chain
  const filteredTokens = selectedChain === 'all' 
    ? portfolioData.tokens 
    : portfolioData.tokens.filter(token => token.chain === selectedChain);

  // Filter transactions by selected chain
  const filteredTransactions = selectedChain === 'all'
    ? portfolioData.transactions
    : portfolioData.transactions.filter(tx => tx.chain === selectedChain);

  return {
    ...portfolioData,
    tokens: filteredTokens,
    transactions: filteredTransactions,
    selectedChain,
    setSelectedChain,
    lastUpdated,
    refetch: fetchPortfolioData,
  };
}; 