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
      // Try to determine token symbol and price
      let tokenSymbol = 'ETH';
      let decimals = 18;
      let price = 0;
      if (chainId === 'polygon') {
        tokenSymbol = 'MATIC';
        decimals = 18;
      } else if (chainId === 'bsc') {
        tokenSymbol = 'BNB';
        decimals = 18;
      }
      // If ERC-20, try to get symbol/decimals from tx (if available)
      if (tx.tokenSymbol) {
        tokenSymbol = tx.tokenSymbol;
      }
      if (tx.tokenDecimal) {
        decimals = parseInt(tx.tokenDecimal);
      }
      // Use price from prices object if available
      // fallback to 0 if not found
      // prices is not in scope here, so pass as argument later
      // For now, leave as 0, will fix in fetchPortfolioData
      return {
        type: isReceive ? 'receive' : isSend ? 'send' : 'swap',
        token: tokenSymbol,
        amount: formatBalance(tx.value || '0', decimals),
        // value will be set in fetchPortfolioData
        value: tx.value || '0',
        to: isReceive ? tx.from : tx.to,
        from: isReceive ? tx.from : tx.to,
        time: new Date(parseInt(tx.timeStamp) * 1000).toLocaleDateString(),
        status: tx.isError === '0' ? 'confirmed' : 'failed',
        hash: tx.hash,
        chain: chainId,
        decimals,
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

      // Fetch data for all chains in parallel
      const chains = ['ethereum', 'polygon', 'bsc'];
      const chainDataArr = await Promise.all(
        chains.map(chain => fetchChainData(chain, address))
      );

      const allTokens = [];
      let allTransactions = [];

      chainDataArr.forEach((chainData, idx) => {
        const chain = chains[idx];
        // Normalize tokens array for all chains
        let tokensArr = [];
        if (chain === 'ethereum') {
          tokensArr = chainData.tokens || [];
        } else {
          tokensArr = chainData.tokens || [];
        }
        const processedTokens = processTokenData(tokensArr, chain, prices, chainData.nativeBalance);
        const processedTransactions = processTransactionData(chainData.transactions, chain);
        allTokens.push(...processedTokens);
        allTransactions.push(...processedTransactions);
      });

      // Now, update transaction value to use correct price and formatted USD
      allTransactions = allTransactions.map(tx => {
        let price = 0;
        const symbol = tx.token?.toLowerCase();
        if (symbol === 'eth') price = prices['ethereum']?.usd || 0;
        else if (symbol === 'matic') price = prices['matic-network']?.usd || 0;
        else if (symbol === 'bnb') price = prices['binancecoin']?.usd || 0;
        else if (prices[symbol]) price = prices[symbol]?.usd || 0;
        const value = parseFloat(tx.amount) * price;
        return {
          ...tx,
          value: formatUSD(value),
        };
      });

      // Calculate totals
      const totalValue = allTokens.reduce((sum, token) => {
        return sum + parseFloat(token.value.replace('$', '').replace(',', ''));
      }, 0);

      // Weighted average for totalChange
      const totalChange = allTokens.reduce((acc, token) => {
        const change = parseFloat(token.change.replace('%', '').replace('+', '').replace('-', ''));
        const value = parseFloat(token.value.replace('$', '').replace(',', ''));
        return {
          sum: acc.sum + (change * value),
          total: acc.total + value,
        };
      }, { sum: 0, total: 0 });
      const weightedChange = totalChange.total > 0 ? totalChange.sum / totalChange.total : 0;

      setPortfolioData({
        tokens: allTokens,
        transactions: allTransactions,
        totalValue,
        totalChange: weightedChange,
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