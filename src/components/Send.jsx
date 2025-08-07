import React, { useState } from "react";
import { parseEther } from "viem";
import { erc20Abi } from "viem";
import {
  useAccount,
  useChainId,
  useBalance,
  useWalletClient,
} from "wagmi";
import {
  getPublicClient,
  getWalletClient,
  simulateContract,
} from "wagmi/actions";

export default function Send() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();
  const { data: balanceData } = useBalance({ address });

  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [tokenAddress, setTokenAddress] = useState("");
  const [sending, setSending] = useState(false);
  const [txHash, setTxHash] = useState(null);
  const [error, setError] = useState(null);

  const handleSend = async () => {
    try {
      setSending(true);
      setTxHash(null);
      setError(null);

      if (!walletClient || !address || !chainId) throw new Error("Wallet not ready");

      const publicClient = getPublicClient({ chainId });

      if (!tokenAddress) {
        // Native token (ETH)
        const hash = await walletClient.sendTransaction({
          to: recipient,
          value: parseEther(amount),
          account: address,
        });
        setTxHash(hash);
      } else {
        // ERC20 token
        const result = await simulateContract({
          address: tokenAddress,
          abi: erc20Abi,
          functionName: "transfer",
          args: [recipient, parseEther(amount)],
          account: address,
        });

        const hash = await walletClient.writeContract(result.request);
        setTxHash(hash);
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto p-4 space-y-4">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Send Tokens</h2>
        {isConnected && balanceData && (
          <p className="text-sm text-gray-500">
            Balance: {balanceData.formatted} {balanceData.symbol}
          </p>
        )}
      </div>

      <div className="space-y-3">
        <input
          type="text"
          placeholder="Recipient address"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          className="w-full px-4 py-2 border rounded-xl text-sm"
        />
        <input
          type="text"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full px-4 py-2 border rounded-xl text-sm"
        />
        <input
          type="text"
          placeholder="Token contract (leave empty for ETH)"
          value={tokenAddress}
          onChange={(e) => setTokenAddress(e.target.value)}
          className="w-full px-4 py-2 border rounded-xl text-sm"
        />
        <button
          onClick={handleSend}
          disabled={sending || !recipient || !amount}
          className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-400 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-500 transition"
        >
          {sending ? "Sending..." : "Send"}
        </button>
        {txHash && (
          <p className="text-green-600 text-sm break-all">
            Sent! Tx: <a href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank" rel="noreferrer">{txHash}</a>
          </p>
        )}
        {error && <p className="text-red-600 text-sm">{error}</p>}
      </div>
    </div>
  );
}
