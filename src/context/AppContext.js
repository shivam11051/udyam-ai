import { createContext, useState, useEffect, useCallback, useRef } from "react";
import { ethers } from "ethers";
import { ADDRESS, ABI } from "../contracts/contractConfig";

export const AppContext = createContext();

export function AppContextProvider({ children }) {
  const [contract,      setContract]      = useState(null);
  const [account,       setAccount]       = useState(null);
  const [provider,      setProvider]      = useState(null);
  const [signer,        setSigner]        = useState(null);
  const [isAdmin,       setIsAdmin]       = useState(false);
  const [loading,       setLoading]       = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [authHeaders,   setAuthHeaders]   = useState(null);

  const notifIdRef = useRef(0);

  const addNotif = useCallback((message, type = "info", duration = 4000, url = null) => {
    const id = ++notifIdRef.current;
    setNotifications(prev => [...prev, { id, message, type, url }]);
    if (duration > 0) {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }, duration);
    }
    return id;
  }, []);

  const removeNotif = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  async function initializeWeb3() {
    setLoading(true);
    try {
      if (!window.ethereum) {
        addNotif("MetaMask not found. Install it from metamask.io.", "error", 0);
        setLoading(false);
        return;
      }

      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      if (!accounts.length) {
        addNotif("No accounts returned from MetaMask.", "error");
        setLoading(false);
        return;
      }

      const userAccount = accounts[0];
      setAccount(userAccount);

      const p = new ethers.BrowserProvider(window.ethereum);
      
      const network = await p.getNetwork();
      if (Number(network.chainId) !== 11155111 && Number(network.chainId) !== 31337) { // allow hardhat local
        addNotif("Please switch to Sepolia testnet.", "error", 0);
        setLoading(false);
        return;
      }

      setProvider(p);

      const s = await p.getSigner();
      setSigner(s);

      const c = new ethers.Contract(ADDRESS, ABI, s);
      setContract(c);

      addNotif(`Connected: ${userAccount.slice(0, 6)}...${userAccount.slice(-4)}`, "success");

      try {
        const scaAddress = await c.governmentSCA();
        if (scaAddress.toLowerCase() === userAccount.toLowerCase()) {
          setIsAdmin(true);
          addNotif("SCA Admin mode enabled.", "success");
        }
      } catch (e) {
        console.error("Could not fetch SCA admin status:", e.message);
      }

      window.ethereum.removeAllListeners?.("accountsChanged");
      window.ethereum.removeAllListeners?.("chainChanged");

      window.ethereum.on("accountsChanged", (newAccounts) => {
        if (newAccounts.length === 0) disconnect();
        else window.location.reload();
      });

      window.ethereum.on("chainChanged", () => window.location.reload());

    } catch (err) {
      addNotif(err.code === 4001 ? "Connection cancelled." : `Failed: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  }

  function disconnect() {
    setAccount(null);
    setContract(null);
    setSigner(null);
    setProvider(null);
    setIsAdmin(false);
    setAuthHeaders(null);
    addNotif("Disconnected.", "info");
  }

  async function getAuthHeaders() {
    if (authHeaders) return authHeaders;
    if (!signer || !account) throw new Error("Wallet not connected");
    
    try {
      const message = `Login to MoSJE DApp: ${Date.now()}`;
      const signature = await signer.signMessage(message);
      
      const headers = {
        "x-address": account,
        "x-message": message,
        "x-signature": signature
      };
      setAuthHeaders(headers);
      return headers;
    } catch (err) {
      throw new Error("Failed to sign authentication message.");
    }
  }

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.request({ method: "eth_accounts" })
        .then(accounts => {
          if (accounts.length > 0) initializeWeb3();
          else setLoading(false);
        })
        .catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const value = {
    contract, account, provider, signer, isAdmin, loading, notifications, authHeaders,
    addNotif, removeNotif, initializeWeb3, disconnect, getAuthHeaders
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export default AppContext;