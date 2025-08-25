import React, { useEffect, useMemo, useState } from "react";
import { Wallet, ethers } from "ethers";
import { useConnect, createConnector } from "wagmi";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

/**
 * CreateWallet.jsx (fixed)
 *
 * - Replaces usage of `Connector` (no longer exported by `wagmi`) with
 *   `createConnector` from wagmi v2.
 * - Implements a Local Wallet connector backed by `viem` WalletClient so your
 *   existing wagmi-based components (Swap, Send, etc.) continue to work.
 * - Keeps the original MetaMask-style flow: Create / Import, seed save/confirm,
 *   password-based encryption (AES-GCM PBKDF2), unlock, reveal, lock/delete.
 */

// -----------------------------
// LocalStorage Keys & Versioning
// -----------------------------
const LS_KEYS = {
  META: "wallet_meta_v1", // { pwHash, address }
  DATA: "wallet_data_v1", // { salt, iv, ciphertext } — encrypted { mnemonic, privateKey, address }
};

// Public fallback RPC if no env var is provided
const DEFAULT_RPC =
  (typeof process !== "undefined" && process?.env?.NEXT_PUBLIC_MAINNET_RPC) ||
  "https://cloudflare-eth.com";

// -----------------------------
// Crypto helpers (Web Crypto API)
// -----------------------------
const enc = new TextEncoder();
const dec = new TextDecoder();

function toBase64(arr) {
  return btoa(String.fromCharCode(...new Uint8Array(arr)));
}
function fromBase64(b64) {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function deriveAesKey(password, salt) {
  const keyMat = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, [
    "deriveKey",
  ]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 310000, hash: "SHA-256" },
    keyMat,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptJson(obj, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveAesKey(password, salt);
  const plaintext = enc.encode(JSON.stringify(obj));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
  return { salt: toBase64(salt), iv: toBase64(iv), ciphertext: toBase64(new Uint8Array(ciphertext)) };
}

async function decryptJson(payload, password) {
  const salt = fromBase64(payload.salt);
  const iv = fromBase64(payload.iv);
  const data = fromBase64(payload.ciphertext);
  const key = await deriveAesKey(password, salt);
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  return JSON.parse(dec.decode(plaintext));
}

// -----------------------------
// Local wagmi connector (viem WalletClient based)
// -----------------------------
function localConnector({ privateKey, rpcUrl = DEFAULT_RPC }) {
  return createConnector((wagmiConfig) => {
    const account = privateKeyToAccount(privateKey);
    let currentChain = wagmiConfig.chains?.[0];

    const getChain = (id) =>
      wagmiConfig.chains?.find((c) => c.id === id) || wagmiConfig.chains?.[0];

    return {
      id: "localWallet",
      name: "Local Wallet",
      type: "local",

      async connect({ chainId } = {}) {
        currentChain = getChain(chainId ?? currentChain?.id);
        return { accounts: [account.address], chainId: currentChain?.id || 1 };
      },

      async disconnect() {
        // nothing to tear down for a local, stateless connector
      },

      async getAccount() {
        return account.address;
      },

      async getChainId() {
        return currentChain?.id || wagmiConfig.chains?.[0]?.id || 1;
      },

      async getWalletClient({ chainId } = {}) {
        const ch = getChain(chainId ?? currentChain?.id);
        return createWalletClient({ account, chain: ch, transport: http(rpcUrl) });
      },

      isAuthorized: async () => true,

      // Event handlers (no-ops for local wallet)
      onAccountsChanged: () => {},
      onChainChanged: (cid) => {
        const idNum = typeof cid === "string" ? Number(cid) : cid;
        currentChain = getChain(idNum);
      },
      onDisconnect: () => {},
    };
  });
}

// -----------------------------
// Small UI helpers
// -----------------------------
const Card = ({ children }) => (
  <div className="w-full max-w-sm mx-auto p-4">
    <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl p-6">
      {children}
    </div>
  </div>
);

const Label = ({ children }) => (
  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{children}</label>
);

const Input = (props) => (
  <input
    {...props}
    className={`w-full px-4 py-2 rounded-xl border bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-200 dark:border-gray-700 ${props.className || ""}`}
  />
);

const Button = ({ children, variant = "primary", className = "", ...rest }) => {
  const base =
    "w-full py-3 rounded-xl font-semibold transition shadow focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50";
  const styles = {
    primary:
      "bg-gradient-to-r from-blue-600 to-blue-400 text-white hover:from-blue-700 hover:to-blue-500 focus:ring-blue-400",
    secondary:
      "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 focus:ring-gray-400",
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-400",
  };
  return (
    <button className={`${base} ${styles[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
};

// -----------------------------
// Component
// -----------------------------
export default function CreateWallet() {
  const [step, setStep] = useState("loading");
  const [hasWallet, setHasWallet] = useState(false);

  // password / unlock
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [unlockPassword, setUnlockPassword] = useState("");
  const [pwError, setPwError] = useState("");

  // generated or imported wallet details (in-memory only until saved)
  const [mnemonic, setMnemonic] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [address, setAddress] = useState("");

  // seed confirmation
  const [checkIdx, setCheckIdx] = useState([2, 9]);
  const [checkAnswers, setCheckAnswers] = useState({});
  const [ack, setAck] = useState(false);

  // import flow
  const [importText, setImportText] = useState("");

  const { connect } = useConnect();

  useEffect(() => {
    // Detect existing wallet
    const meta = localStorage.getItem(LS_KEYS.META);
    setHasWallet(!!meta);
    setStep(meta ? "unlock" : "landing");
  }, []);

  // prepare random check positions when mnemonic exists
  useEffect(() => {
    if (mnemonic) {
      const words = mnemonic.split(" ");
      const i1 = Math.floor(Math.random() * words.length);
      let i2 = Math.floor(Math.random() * words.length);
      if (i2 === i1) i2 = (i2 + 1) % words.length;
      setCheckIdx([i1, i2].sort((a, b) => a - b));
    }
  }, [mnemonic]);

  const maskedAddress = useMemo(
    () => (address ? `${address.slice(0, 6)}…${address.slice(-4)}` : ""),
    [address]
  );

  // -----------------------------
  // Core actions
  // -----------------------------
  const startCreate = async () => {
    const wallet = Wallet.createRandom();
    const phrase = wallet.mnemonic?.phrase || "";
    setMnemonic(phrase);
    setPrivateKey(wallet.privateKey);
    setAddress(wallet.address);
    setStep("seed");
  };

  const startImport = () => setStep("import");

  const connectToWagmi = (pk) => {
    try {
      const rpcUrl = DEFAULT_RPC; // replace with dynamic chain RPC if needed
      connect({ connector: localConnector({ privateKey: pk, rpcUrl }) });
    } catch (err) {
      console.error("Failed to connect local wallet to wagmi", err);
    }
  };

  const tryUnlock = async () => {
    try {
      setPwError("");
      const metaRaw = localStorage.getItem(LS_KEYS.META);
      const dataRaw = localStorage.getItem(LS_KEYS.DATA);
      if (!metaRaw || !dataRaw) throw new Error("No wallet data found.");
      const meta = JSON.parse(metaRaw);
      const enteredHash = await sha256Hex(unlockPassword);
      if (meta.pwHash !== enteredHash) throw new Error("Incorrect password.");
      const payload = JSON.parse(dataRaw);
      const secret = await decryptJson(payload, unlockPassword);
      setMnemonic(secret.mnemonic || "");
      setPrivateKey(secret.privateKey);
      setAddress(secret.address);
      connectToWagmi(secret.privateKey);
      setStep("done");
    } catch (e) {
      setPwError(e.message);
    }
  };

  const saveNewWallet = async () => {
    if (password.length < 8) {
      setPwError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setPwError("Passwords do not match.");
      return;
    }
    const words = mnemonic.split(" ");
    const a = (checkAnswers[checkIdx[0]] || "").trim().toLowerCase();
    const b = (checkAnswers[checkIdx[1]] || "").trim().toLowerCase();
    if (a !== words[checkIdx[0]] || b !== words[checkIdx[1]] || !ack) {
      setPwError("Seed confirmation failed. Check the words and acknowledgement.");
      return;
    }
    const payload = await encryptJson({ mnemonic, privateKey, address }, password);
    const pwHash = await sha256Hex(password);
    localStorage.setItem(LS_KEYS.DATA, JSON.stringify(payload));
    localStorage.setItem(LS_KEYS.META, JSON.stringify({ pwHash, address }));
    setHasWallet(true);
    connectToWagmi(privateKey);
    setStep("done");
  };

  const handleImport = async () => {
    try {
      setPwError("");
      const text = importText.trim();
      if (!text) throw new Error("Enter a seed phrase or a private key.");
      let w;
      if (text.split(/\s+/).length >= 12) {
        // Seed phrase
        w = Wallet.fromPhrase(text);
      } else {
        // Private key
        const pk = text.startsWith("0x") ? text : `0x${text}`;
        w = new Wallet(pk);
      }
      setMnemonic(w.mnemonic?.phrase || "");
      setPrivateKey(w.privateKey);
      setAddress(w.address);
      setStep("setPasswordForImport");
    } catch (e) {
      setPwError(e.message);
    }
  };

  const saveImportedWallet = async () => {
    if (password.length < 8) {
      setPwError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setPwError("Passwords do not match.");
      return;
    }
    const payload = await encryptJson({ mnemonic, privateKey, address }, password);
    const pwHash = await sha256Hex(password);
    localStorage.setItem(LS_KEYS.DATA, JSON.stringify(payload));
    localStorage.setItem(LS_KEYS.META, JSON.stringify({ pwHash, address }));
    setHasWallet(true);
    connectToWagmi(privateKey);
    setStep("done");
  };

  const lockWallet = () => {
    // Keep encrypted data; just go back to unlock prompt
    setUnlockPassword("");
    setStep("unlock");
  };

  const destroyWallet = () => {
    localStorage.removeItem(LS_KEYS.DATA);
    localStorage.removeItem(LS_KEYS.META);
    setMnemonic("");
    setPrivateKey("");
    setAddress("");
    setPassword("");
    setConfirmPassword("");
    setImportText("");
    setHasWallet(false);
    setStep("landing");
  };

  // -----------------------------
  // Screens
  // -----------------------------
  if (step === "loading") return null;

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* Header */}
      <div className="text-center mb-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Wallet</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {step === "unlock" && "A wallet already exists on this device. Please unlock."}
          {step === "landing" && "Create or import a wallet to get started."}
          {step === "seed" && "Save your seed phrase. This is the only way to recover your wallet."}
          {step === "done" && "Wallet ready. You can now use it safely."}
        </p>
      </div>

      {/* Landing */}
      {step === "landing" && (
        <Card>
          <div className="space-y-3">
            <Button onClick={startCreate}>Create a new wallet</Button>
            <Button variant="secondary" onClick={startImport}>Import an existing wallet</Button>
          </div>
        </Card>
      )}

      {/* Unlock */}
      {step === "unlock" && (
        <Card>
          <div className="space-y-3">
            <Label>Password</Label>
            <Input
              type="password"
              placeholder="Enter your password to unlock"
              value={unlockPassword}
              onChange={(e) => setUnlockPassword(e.target.value)}
            />
            {pwError && <p className="text-red-600 text-sm">{pwError}</p>}
            <Button onClick={tryUnlock} disabled={!unlockPassword}>Unlock</Button>
            <Button variant="secondary" onClick={() => setStep("landing")}>Use a different wallet</Button>
          </div>
        </Card>
      )}

      {/* Seed Save Step */}
      {step === "seed" && (
        <Card>
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
              <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                Write these 12/24 words down in order and store them somewhere safe. Never share them.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
              {mnemonic.split(" ").map((w, i) => (
                <div key={i} className="text-sm font-mono flex items-center gap-2">
                  <span className="opacity-60 w-6 text-right">{i + 1}.</span>
                  <span className="break-all">{w}</span>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <Label>
                Confirm word #{checkIdx[0] + 1}
              </Label>
              <Input
                placeholder={`Type word #${checkIdx[0] + 1}`}
                value={checkAnswers[checkIdx[0]] || ""}
                onChange={(e) => setCheckAnswers({ ...checkAnswers, [checkIdx[0]]: e.target.value })}
              />
              <Label>
                Confirm word #{checkIdx[1] + 1}
              </Label>
              <Input
                placeholder={`Type word #${checkIdx[1] + 1}`}
                value={checkAnswers[checkIdx[1]] || ""}
                onChange={(e) => setCheckAnswers({ ...checkAnswers, [checkIdx[1]]: e.target.value })}
              />

              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-1" checked={ack} onChange={(e) => setAck(e.target.checked)} />
                <span className="text-gray-600 dark:text-gray-300">
                  I understand that if I lose my seed phrase, no one can recover it for me.
                </span>
              </label>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button variant="secondary" onClick={() => setStep("landing")}>Back</Button>
                <Button onClick={() => setStep("setPassword")}>I saved my seed</Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Set Password (for new or import) */}
      {(step === "setPassword" || step === "setPasswordForImport") && (
        <Card>
          <div className="space-y-3">
            <Label>Create a password</Label>
            <Input type="password" placeholder="At least 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} />
            <Label>Confirm password</Label>
            <Input type="password" placeholder="Re-type password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            {pwError && <p className="text-red-600 text-sm">{pwError}</p>}
            {step === "setPassword" ? (
              <Button onClick={saveNewWallet}>Save & Finish</Button>
            ) : (
              <Button onClick={saveImportedWallet}>Encrypt & Finish</Button>
            )}
            <Button variant="secondary" onClick={() => setStep("landing")}>Cancel</Button>
          </div>
        </Card>
      )}

      {/* Import screen */}
      {step === "import" && (
        <Card>
          <div className="space-y-3">
            <Label>Seed phrase or private key</Label>
            <textarea
              placeholder="Enter a 12/24-word seed phrase or a 0x... private key"
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              className="w-full min-h-[120px] px-4 py-2 rounded-xl border bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {pwError && <p className="text-red-600 text-sm">{pwError}</p>}
            <div className="grid grid-cols-2 gap-3">
              <Button variant="secondary" onClick={() => setStep("landing")}>Back</Button>
              <Button onClick={handleImport}>Continue</Button>
            </div>
          </div>
        </Card>
      )}

      {/* Done / Wallet Info */}
      {step === "done" && (
        <Card>
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Address</p>
              <div className="px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-mono text-sm">
                {address}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button onClick={lockWallet} variant="secondary">Lock</Button>
              <Button onClick={() => navigator.clipboard.writeText(address)} variant="secondary">Copy Address</Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="danger" onClick={destroyWallet}>Delete Wallet</Button>
              <Button variant="secondary" onClick={() => setStep("reveal")}>Reveal Secret</Button>
            </div>
          </div>
        </Card>
      )}

      {/* Reveal secret (password gated) */}
      {step === "reveal" && (
        <Card>
          <RevealSecret onBack={() => setStep("done")} />
        </Card>
      )}
    </div>
  );
}

function RevealSecret({ onBack }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [secret, setSecret] = useState(null);

  const reveal = async () => {
    try {
      setError("");
      const metaRaw = localStorage.getItem(LS_KEYS.META);
      const dataRaw = localStorage.getItem(LS_KEYS.DATA);
      if (!metaRaw || !dataRaw) throw new Error("No wallet found");
      const meta = JSON.parse(metaRaw);
      const enteredHash = await sha256Hex(pw);
      if (meta.pwHash !== enteredHash) throw new Error("Incorrect password.");
      const payload = JSON.parse(dataRaw);
      const obj = await decryptJson(payload, pw);
      setSecret(obj);
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="space-y-4">
      {!secret ? (
        <>
          <Label>Password</Label>
          <Input type="password" placeholder="Enter your password" value={pw} onChange={(e) => setPw(e.target.value)} />
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <Button variant="secondary" onClick={onBack}>Back</Button>
            <Button onClick={reveal}>Reveal</Button>
          </div>
        </>
      ) : (
        <div className="space-y-3">
          <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-800 rounded-xl p-3">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              Do not share these with anyone. Anyone with these can access your funds.
            </p>
          </div>
          {secret.mnemonic && (
            <div>
              <Label>Seed phrase</Label>
              <div className="grid grid-cols-2 gap-2 bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                {secret.mnemonic.split(" ").map((w, i) => (
                  <div key={i} className="text-sm font-mono flex items-center gap-2">
                    <span className="opacity-60 w-6 text-right">{i + 1}.</span>
                    <span className="break-all">{w}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div>
            <Label>Private key</Label>
            <div className="px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-mono text-xs break-all">
              {secret.privateKey}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="secondary" onClick={onBack}>Close</Button>
            <Button variant="secondary" onClick={() => navigator.clipboard.writeText(secret.mnemonic || secret.privateKey)}>Copy</Button>
          </div>
        </div>
      )}
    </div>
  );
}
