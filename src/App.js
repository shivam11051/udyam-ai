import { useState, useContext } from "react";
import "./App.css";
import Logo from "./components/Logo";
import BusinessAdvisor from "./components/BusinessAdvisor";
import LandingPage from "./components/LandingPage";
import ErrorBoundary from "./components/ErrorBoundary";
import EMIScreen from "./components/EMIScreen";
import TransactionHistory from "./components/TransactionHistory";
import AdminDashboard from "./components/AdminDashboard";
import { AppContextProvider, AppContext } from "./context/AppContext";
import { Bot, Landmark, History, ShieldCheck, Wallet } from "lucide-react";

function AppContent() {
  const { account, initializeWeb3, disconnect, isAdmin } = useContext(AppContext);
  const [screen, setScreen] = useState("advisor");
  const [showLanding, setShowLanding] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (showLanding) {
    return (
      <div className="landing-layout">
        <LandingPage onConnect={() => setShowLanding(false)} />
      </div>
    );
  }

  const navItems = [
    { id: "advisor", icon: <Bot size={20} />, label: "AI Business Advisor" },
    { id: "emi", icon: <Landmark size={20} />, label: "EMI Dashboard" },
    { id: "history", icon: <History size={20} />, label: "Blockchain Ledger" },
  ];

  if (isAdmin) {
    navItems.push({ id: "admin", icon: <ShieldCheck size={20} />, label: "SCA Dashboard" });
  }

  return (
    <div className="app-layout">
      {/* Mobile overlay */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>}

      {/* SIDEBAR */}
      <nav className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <Logo />
        </div>
        <div className="sidebar-nav">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => { setScreen(item.id); setSidebarOpen(false); }}
              className={`nav-btn ${screen === item.id ? "active" : ""}`}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </div>
        <div className="sidebar-footer">
          <div className="sidebar-footer-text">
            {account ? (
              <span style={{ fontSize: '0.8rem', color: '#86868B', wordBreak: 'break-all' }}>
                🟢 {account.slice(0, 6)}...{account.slice(-4)}
              </span>
            ) : (
              <span style={{ fontSize: '0.8rem', color: '#A1A1A6' }}>Not connected</span>
            )}
          </div>
        </div>
      </nav>

      {/* MAIN CONTENT AREA */}
      <main className="main-content">
        <div className="top-nav">
          {!account ? (
            <button onClick={initializeWeb3} className="wallet-pill" style={{ cursor: 'pointer' }}>
              <Wallet size={18} />
              <span>Connect Wallet</span>
            </button>
          ) : (
            <div className="wallet-pill" style={{ cursor: 'pointer' }} onClick={disconnect}>
              <Wallet size={18} />
              <div className="live-dot"></div>
              <span>Live on Sepolia</span>
              <span style={{ marginLeft: '0.5rem', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                {account.slice(0, 6)}...{account.slice(-4)}
              </span>
            </div>
          )}
        </div>
        
        <div className="content-area">
          {screen === "advisor" && <BusinessAdvisor onApply={() => setScreen("emi")} />}
          {screen === "emi" && <EMIScreen />}
          {screen === "history" && <TransactionHistory />}
          {screen === "admin" && <AdminDashboard />}
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
       <AppContextProvider>
         <AppContent />
       </AppContextProvider>
    </ErrorBoundary>
  );
}

export default App;