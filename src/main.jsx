import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createWeb3Modal } from '@web3modal/wagmi/react'
import { WagmiProvider, createConfig, http } from 'wagmi'
import { mainnet, sepolia } from 'wagmi/chains'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { walletConnect } from 'wagmi/connectors'
import './index.css'
import App from './App.jsx'

// Configure chains & providers
const chains = [mainnet, sepolia]
const projectId = '91fa08a44a9a5d8955931a4fe16bf865'

const metadata = {
  name: 'Wallet DApp',
  description: 'A MetaMask-inspired wallet DApp',
  url: 'https://wallet-dapp.com',
  icons: ['https://avatars.githubusercontent.com/u/37784886']
}

const config = createConfig({
  chains,
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
  connectors: [
    walletConnect({ projectId, metadata, showQrModal: true })
  ]
})

const queryClient = new QueryClient()

createWeb3Modal({
  wagmiConfig: config,
  projectId,
  chains,
  themeMode: 'light',
  themeVariables: {
    '--w3m-font-family': 'Roboto, sans-serif',
    '--w3m-accent-color': '#f6851b'
  }
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
    <App />
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>,
)
