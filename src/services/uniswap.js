import { ethers } from 'ethers';
import { Token, CurrencyAmount, Percent, TradeType } from '@uniswap/sdk-core';
import { Pool, SwapQuoter, SwapRouter, Trade } from '@uniswap/v3-sdk';
import { AlphaRouter } from '@uniswap/smart-order-router';

// ERC20 ABI for approvals
const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function symbol() external view returns (string)',
  'function name() external view returns (string)',
];

// Uniswap V3 Router ABI
const UNISWAP_V3_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
  'function exactInput((bytes path, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum)) external payable returns (uint256 amountOut)',
];

// Chain configurations
const CHAIN_CONFIGS = {
  ethereum: {
    chainId: 1,
    rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/your-api-key',
    uniswapRouter: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
    quoter: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
  },
  polygon: {
    chainId: 137,
    rpcUrl: 'https://polygon-rpc.com',
    uniswapRouter: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
    quoter: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
  },
  arbitrum: {
    chainId: 42161,
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    uniswapRouter: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
    quoter: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6',
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
  },
};

// Common token addresses
const COMMON_TOKENS = {
  ethereum: {
    WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    USDC: '0xA0b86a33E6441b8C4C8C8C8C8C8C8C8C8C8C8C8',
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
  },
  polygon: {
    WMATIC: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
    USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
  },
  arbitrum: {
    WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    USDC: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
    USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
  },
};

class UniswapService {
  constructor() {
    this.providers = {};
    this.routers = {};
    this.quoters = {};
  }

  // Get or create provider for a chain
  getProvider(chainId) {
    if (!this.providers[chainId]) {
      const config = Object.values(CHAIN_CONFIGS).find(c => c.chainId === chainId);
      if (!config) throw new Error(`Unsupported chain: ${chainId}`);
      
      this.providers[chainId] = new ethers.providers.JsonRpcProvider(config.rpcUrl);
    }
    return this.providers[chainId];
  }

  // Get router for a chain
  getRouter(chainId) {
    if (!this.routers[chainId]) {
      const provider = this.getProvider(chainId);
      const config = Object.values(CHAIN_CONFIGS).find(c => c.chainId === chainId);
      this.routers[chainId] = new ethers.Contract(config.uniswapRouter, UNISWAP_V3_ROUTER_ABI, provider);
    }
    return this.routers[chainId];
  }

  // Get token info
  async getTokenInfo(tokenAddress, chainId) {
    const provider = this.getProvider(chainId);
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    
    try {
      const [symbol, name, decimals] = await Promise.all([
        tokenContract.symbol(),
        tokenContract.name(),
        tokenContract.decimals(),
      ]);
      
      return { symbol, name, decimals: decimals.toString() };
    } catch (error) {
      console.error('Error getting token info:', error);
      return { symbol: 'UNKNOWN', name: 'Unknown Token', decimals: '18' };
    }
  }

  // Check token allowance
  async checkAllowance(tokenAddress, ownerAddress, spenderAddress, chainId) {
    const provider = this.getProvider(chainId);
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    
    try {
      const allowance = await tokenContract.allowance(ownerAddress, spenderAddress);
      return allowance;
    } catch (error) {
      console.error('Error checking allowance:', error);
      return ethers.constants.AddressZero;
    }
  }

  // Approve token spending
  async approveToken(tokenAddress, spenderAddress, amount, signer) {
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
    
    try {
      const tx = await tokenContract.approve(spenderAddress, amount);
      const receipt = await tx.wait();
      return receipt;
    } catch (error) {
      console.error('Error approving token:', error);
      throw error;
    }
  }

  // Get quote for swap
  async getQuote(fromToken, toToken, amount, chainId) {
    try {
      const provider = this.getProvider(chainId);
      const config = Object.values(CHAIN_CONFIGS).find(c => c.chainId === chainId);
      
      // Create router instance
      const router = new AlphaRouter({ chainId, provider });
      
      // Create token instances
      const fromTokenInfo = await this.getTokenInfo(fromToken.address, chainId);
      const toTokenInfo = await this.getTokenInfo(toToken.address, chainId);
      
      const fromTokenInstance = new Token(
        chainId,
        fromToken.address,
        parseInt(fromTokenInfo.decimals),
        fromTokenInfo.symbol,
        fromTokenInfo.name
      );
      
      const toTokenInstance = new Token(
        chainId,
        toToken.address,
        parseInt(toTokenInfo.decimals),
        toTokenInfo.symbol,
        toTokenInfo.name
      );
      
      // Create amount
      const amountIn = CurrencyAmount.fromRawAmount(
        fromTokenInstance,
        ethers.utils.parseUnits(amount, fromTokenInfo.decimals).toString()
      );
      
      // Get quote
      const route = await router.route(amountIn, toTokenInstance, TradeType.EXACT_INPUT, {
        recipient: ethers.constants.AddressZero,
        slippageTolerance: new Percent(50, 10_000), // 0.5%
        deadline: Math.floor(Date.now() / 1000 + 1800), // 30 minutes
      });
      
      if (!route) {
        throw new Error('No route found');
      }
      
      return {
        amountOut: route.quote.toString(),
        amountOutMin: route.quoteMin.toString(),
        route: route,
        gasEstimate: route.estimatedGasUsed.toString(),
      };
    } catch (error) {
      console.error('Error getting quote:', error);
      throw error;
    }
  }

  // Execute swap
  async executeSwap(swapParams, signer) {
    try {
      const { fromToken, toToken, amountIn, amountOutMin, route, chainId } = swapParams;
      const config = Object.values(CHAIN_CONFIGS).find(c => c.chainId === chainId);
      
      // Check if approval is needed
      const allowance = await this.checkAllowance(
        fromToken.address,
        await signer.getAddress(),
        config.uniswapRouter,
        chainId
      );
      
      const amountInWei = ethers.utils.parseUnits(amountIn, fromToken.decimals);
      
      if (allowance < amountInWei) {
        // Need approval
        console.log('Approval needed, requesting approval...');
        const approvalTx = await this.approveToken(
          fromToken.address,
          config.uniswapRouter,
          ethers.constants.MaxUint256,
          signer
        );
        console.log('Approval confirmed:', approvalTx.transactionHash);
      }
      
      // Execute swap
      const router = new ethers.Contract(config.uniswapRouter, UNISWAP_V3_ROUTER_ABI, signer);
      
      const deadline = Math.floor(Date.now() / 1000 + 1800); // 30 minutes
      
      let tx;
      if (route.methodParameters) {
        tx = await signer.sendTransaction({
          to: config.uniswapRouter,
          data: route.methodParameters.calldata,
          value: route.methodParameters.value,
          gasLimit: BigInt(route.estimatedGasUsed) * BigInt(120) / BigInt(100), // Add 20% buffer
        });
      } else {
        throw new Error('No route parameters available');
      }
      
      const receipt = await tx.wait();
      return receipt;
    } catch (error) {
      console.error('Error executing swap:', error);
      throw error;
    }
  }

  // Get token balance
  async getTokenBalance(tokenAddress, userAddress, chainId) {
    try {
      const provider = this.getProvider(chainId);
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
      const balance = await tokenContract.balanceOf(userAddress);
      const decimals = await tokenContract.decimals();
      return ethers.utils.formatUnits(balance, decimals);
    } catch (error) {
      console.error('Error getting token balance:', error);
      return '0';
    }
  }

  // Get ETH balance
  async getETHBalance(userAddress, chainId) {
    try {
      const provider = this.getProvider(chainId);
      const balance = await provider.getBalance(userAddress);
      return ethers.utils.formatEther(balance);
    } catch (error) {
      console.error('Error getting ETH balance:', error);
      return '0';
    }
  }
}

export const uniswapService = new UniswapService(); 