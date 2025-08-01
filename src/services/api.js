import axios from 'axios';

// API Keys (you'll need to get these from the respective services)
const COINGECKO_API = 'https://api.coingecko.com/api/v3';
const ETHERSCAN_API = 'https://api.etherscan.io/api';
const ETHERSCAN_API_KEY = 'JT1Y524PGR4BEZ8BUXC9ZK7P68T5FVEW8I'; // Get from https://etherscan.io/apis
const COVALENT_API = 'https://api.covalenthq.com/v1';
const COVALENT_API_KEY = 'cqt_rQVJFGxyjcKVGCcKmjcDyWykmdJx'; // Get from https://www.covalenthq.com/platform/auth/

// Common token addresses
const TOKEN_ADDRESSES = {
  ethereum: {
    USDC: '0xA0b86a33E6441b8C4C8C8C8C8C8C8C8C8C8C8C8',
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
  },
  polygon: {
    USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    MATIC: '0x0000000000000000000000000000000000001010',
  },
  bsc: {
    USDC: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
    USDT: '0x55d398326f99059fF775485246999027B3197955',
    BUSD: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
  },
};

// Fetch token prices from CoinGecko
export const fetchTokenPrices = async (tokenIds) => {
  try {
    const response = await axios.get(`${COINGECKO_API}/simple/price`, {
      params: {
        ids: tokenIds.join(','),
        vs_currencies: 'usd',
        include_24hr_change: true,
        include_24hr_vol: true,
        include_market_cap: true,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching token prices:', error);
    return {};
  }
};

// Fetch Ethereum balance and transactions
export const fetchEthereumData = async (address) => {
  try {
    // Fetch ETH balance
    const balanceResponse = await axios.get(ETHERSCAN_API, {
      params: {
        module: 'account',
        action: 'balance',
        address: address,
        tag: 'latest',
        apikey: ETHERSCAN_API_KEY,
      },
    });

    // Fetch token balances (ERC-20)
    const tokenResponse = await axios.get(ETHERSCAN_API, {
      params: {
        module: 'account',
        action: 'tokentx',
        address: address,
        startblock: 0,
        endblock: 99999999,
        sort: 'desc',
        apikey: ETHERSCAN_API_KEY,
      },
    });

    // Fetch recent transactions
    const txResponse = await axios.get(ETHERSCAN_API, {
      params: {
        module: 'account',
        action: 'txlist',
        address: address,
        startblock: 0,
        endblock: 99999999,
        page: 1,
        offset: 10,
        sort: 'desc',
        apikey: ETHERSCAN_API_KEY,
      },
    });

    return {
      balance: balanceResponse.data.result,
      tokens: tokenResponse.data.result,
      transactions: txResponse.data.result,
    };
  } catch (error) {
    console.error('Error fetching Ethereum data:', error);
    return { balance: '0', tokens: [], transactions: [] };
  }
};

// Fetch Polygon data using Covalent
export const fetchPolygonData = async (address) => {
  try {
    const response = await axios.get(`${COVALENT_API}/137/address/${address}/balances_v2/`, {
      headers: {
        'Authorization': `Bearer ${COVALENT_API_KEY}`,
      },
    });

    return {
      balance: response.data.data.items,
      transactions: [], // Covalent doesn't provide recent transactions in this endpoint
    };
  } catch (error) {
    console.error('Error fetching Polygon data:', error);
    return { balance: [], transactions: [] };
  }
};

// Fetch BSC data using Covalent
export const fetchBSCData = async (address) => {
  try {
    const response = await axios.get(`${COVALENT_API}/56/address/${address}/balances_v2/`, {
      headers: {
        'Authorization': `Bearer ${COVALENT_API_KEY}`,
      },
    });

    return {
      balance: response.data.data.items,
      transactions: [],
    };
  } catch (error) {
    console.error('Error fetching BSC data:', error);
    return { balance: [], transactions: [] };
  }
};

// Fetch transaction history for a specific chain
export const fetchTransactionHistory = async (address, chainId) => {
  try {
    let apiUrl;
    let params = {};

    switch (chainId) {
      case 'ethereum':
        apiUrl = ETHERSCAN_API;
        params = {
          module: 'account',
          action: 'txlist',
          address: address,
          startblock: 0,
          endblock: 99999999,
          page: 1,
          offset: 20,
          sort: 'desc',
          apikey: ETHERSCAN_API_KEY,
        };
        break;
      case 'polygon':
        apiUrl = `${COVALENT_API}/137/address/${address}/transactions_v2/`;
        break;
      case 'bsc':
        apiUrl = `${COVALENT_API}/56/address/${address}/transactions_v2/`;
        break;
      default:
        return [];
    }

    if (chainId === 'ethereum') {
      const response = await axios.get(apiUrl, { params });
      return response.data.result || [];
    } else {
      const response = await axios.get(apiUrl, {
        headers: {
          'Authorization': `Bearer ${COVALENT_API_KEY}`,
        },
      });
      return response.data.data.items || [];
    }
  } catch (error) {
    console.error('Error fetching transaction history:', error);
    return [];
  }
};

// Get token metadata (name, symbol, decimals)
export const getTokenMetadata = (chainId, tokenAddress) => {
  const metadata = {
    ethereum: {
      '0xA0b86a33E6441b8C4C8C8C8C8C8C8C8C8C8C8C8': { name: 'USD Coin', symbol: 'USDC', decimals: 6 },
      '0xdAC17F958D2ee523a2206206994597C13D831ec7': { name: 'Tether', symbol: 'USDT', decimals: 6 },
      '0x6B175474E89094C44Da98b954EedeAC495271d0F': { name: 'Dai', symbol: 'DAI', decimals: 18 },
    },
    polygon: {
      '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174': { name: 'USD Coin', symbol: 'USDC', decimals: 6 },
      '0xc2132D05D31c914a87C6611C10748AEb04B58e8F': { name: 'Tether', symbol: 'USDT', decimals: 6 },
    },
    bsc: {
      '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d': { name: 'USD Coin', symbol: 'USDC', decimals: 18 },
      '0x55d398326f99059fF775485246999027B3197955': { name: 'Tether', symbol: 'USDT', decimals: 18 },
    },
  };

  return metadata[chainId]?.[tokenAddress] || { name: 'Unknown Token', symbol: 'UNKNOWN', decimals: 18 };
};

// Format balance with proper decimals
export const formatBalance = (balance, decimals = 18) => {
  const divisor = Math.pow(10, decimals);
  return (parseInt(balance) / divisor).toFixed(6);
};

// Format USD value
export const formatUSD = (value) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

// Calculate 24h change percentage
export const calculateChange = (currentPrice, previousPrice) => {
  if (!previousPrice || previousPrice === 0) return 0;
  return ((currentPrice - previousPrice) / previousPrice) * 100;
}; 