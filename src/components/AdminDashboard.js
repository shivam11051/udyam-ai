import { useState, useEffect, useContext } from "react";
import { formatEther, isAddress } from "ethers";
import { AppContext } from "../context/AppContext";
import { ShieldAlert, CheckCircle, FileText, Clock, ExternalLink } from "lucide-react";

export default function AdminDashboard() {
  const { contract, account, isAdmin, provider, addNotif } = useContext(AppContext);
  const [pendingLoans, setPendingLoans] = useState([]);
  const [approvedLoans, setApprovedLoans] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [manualAddress, setManualAddress] = useState("");
  const [approving, setApproving] = useState(null);

  useEffect(() => {
    if (contract && isAdmin) {
      loadDashboardData();
    }
  }, [contract, isAdmin]);

  const loadDashboardData = async () => {
    setLoading(true);
    await Promise.all([fetchLoans(), fetchAllEvents()]);
    setLoading(false);
  };

  const fetchLoans = async () => {
    try {
      const pending = [];
      const approved = [];
      const seen = new Set();
      try {
        const marginFilter = contract.filters.MarginDeposited();
        const currentBlock = await provider.getBlockNumber();
        const startBlock = currentBlock > 9000 ? currentBlock - 9000 : 0;
        const marginLogs = await contract.queryFilter(marginFilter, startBlock, 'latest');

        for (const log of marginLogs) {
          const addr = log.args[0];
          if (seen.has(addr.toLowerCase())) continue;
          seen.add(addr.toLowerCase());
          try {
            const loan = await contract.loans(addr);
            if (loan.isActive === true) {
              if (loan.isApproved === false) {
                pending.push({
                  address: addr,
                  projectCost: formatEther(loan.projectCost),
                  marginDeposited: formatEther(loan.marginDeposited),
                  loanAmount: formatEther(loan.loanAmount),
                });
              } else {
                let sbtLevel = 0;
                try {
                  const tokenId = await contract.userSBT(addr);
                  if (tokenId > 0n) {
                    sbtLevel = Number(await contract.sbtLevel(tokenId));
                  }
                } catch(e) {}
                
                approved.push({
                  address: addr,
                  outstanding: formatEther(loan.outstandingBalance),
                  sbtLevel: sbtLevel
                });
              }
            }
          } catch (e) {
            console.warn("Could not fetch loan for", addr);
          }
        }
      } catch (e) {
        console.warn("Event query failed, trying direct check:", e.message);
      }

      if (!seen.has(account.toLowerCase())) {
        try {
          const ownLoan = await contract.loans(account);
          if (ownLoan.isActive === true) {
            if (ownLoan.isApproved === false) {
              pending.push({
                address: account,
                projectCost: formatEther(ownLoan.projectCost),
                marginDeposited: formatEther(ownLoan.marginDeposited),
                loanAmount: formatEther(ownLoan.loanAmount),
              });
            } else {
                let sbtLevel = 0;
                try {
                  const tokenId = await contract.userSBT(account);
                  if (tokenId > 0n) {
                    sbtLevel = Number(await contract.sbtLevel(tokenId));
                  }
                } catch(e) {}
                
                approved.push({
                  address: account,
                  outstanding: formatEther(ownLoan.outstandingBalance),
                  sbtLevel: sbtLevel
                });
            }
          }
        } catch (e) { /* no loan */ }
      }
      setPendingLoans(pending);
      setApprovedLoans(approved);
    } catch (e) {
      console.error("fetchLoans error:", e);
    }
  };

  const fetchAllEvents = async () => {
    try {
      const events = [];
      try {
        const currentBlock = await provider.getBlockNumber();
        const startBlock = currentBlock > 9000 ? currentBlock - 9000 : 0;

        const [marginLogs, approveLogs, emiLogs] = await Promise.all([
          contract.queryFilter(contract.filters.MarginDeposited(), startBlock, 'latest'),
          contract.queryFilter(contract.filters.LoanApproved(), startBlock, 'latest'),
          contract.queryFilter(contract.filters.EMIPaid(), startBlock, 'latest'),
        ]);

        for (const log of marginLogs) {
          let ts = 0;
          try { const b = await provider.getBlock(log.blockNumber); ts = b.timestamp; } catch(e) { /* ignore */ }
          events.push({ time: ts, action: "Margin Deposited", address: log.args[0], amount: formatEther(log.args[1]) });
        }
        for (const log of approveLogs) {
          let ts = 0;
          try { const b = await provider.getBlock(log.blockNumber); ts = b.timestamp; } catch(e) { /* ignore */ }
          events.push({ time: ts, action: "Loan Approved", address: log.args[0], amount: formatEther(log.args[1]) });
        }
        for (const log of emiLogs) {
          let ts = 0;
          try { const b = await provider.getBlock(log.blockNumber); ts = b.timestamp; } catch(e) { /* ignore */ }
          events.push({ time: ts, action: "EMI Paid", address: log.args[0], amount: formatEther(log.args[1]) });
        }
      } catch (e) {
        console.warn("Event fetch partially failed:", e.message);
      }

      events.sort((a, b) => b.time - a.time);
      setAllEvents(events);
    } catch (e) {
      console.error("fetchAllEvents error:", e);
    }
  };

  const handleApprove = async (entrepreneurAddr) => {
    setApproving(entrepreneurAddr);
    try {
      const tx = await contract.approveLoan(entrepreneurAddr);
      addNotif("Approval transaction submitted...", "info");
      await tx.wait();
      addNotif("Loan Approved Successfully!", "success");
      loadDashboardData();
    } catch (e) {
      addNotif(`Error: ${e.reason || e.message}`, "error");
    }
    setApproving(null);
  };

  const handleManualApprove = async () => {
    if (!manualAddress || !isAddress(manualAddress)) {
      addNotif("Please enter a valid Ethereum address", "error");
      return;
    }
    await handleApprove(manualAddress);
    setManualAddress("");
  };

  if (!isAdmin) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon" style={{ background: 'rgba(255, 69, 58, 0.1)', color: '#FF453A', boxShadow: 'none' }}>
          <ShieldAlert size={40} />
        </div>
        <h3>Access Restricted</h3>
        <p>This dashboard is exclusively secured for the State Channelizing Agency (SCA) compliance officers.</p>
      </div>
    );
  }

  return (
    <div className="advisor-container" style={{ maxWidth: '1200px', padding: '2rem' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '3rem' }}>
        <div>
          <h2 className="title" style={{ marginBottom: '0.5rem', fontSize: '2.5rem', letterSpacing: '-1px' }}>SCA Admin Portal</h2>
          <p className="subtitle" style={{ margin: 0, fontSize: '1.1rem' }}>State Channelizing Agency Loan Portfolio Overview</p>
        </div>
        <div style={{ padding: '0.5rem 1.25rem', background: 'linear-gradient(135deg, rgba(191, 90, 242, 0.1), rgba(94, 92, 230, 0.1))', color: '#BF5AF2', borderRadius: 'var(--radius-pill)', fontSize: '0.85rem', fontWeight: '700', border: '1px solid rgba(191, 90, 242, 0.2)' }}>
          ★ COMPLIANCE OFFICER
        </div>
      </div>

      {/* Neo-Bank Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '3rem' }}>
        
        <div className="card highlight" style={{ padding: '2rem', background: 'var(--bg-card)', border: 'none', boxShadow: 'var(--shadow-md)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', background: 'linear-gradient(90deg, #0071E3, #5E5CE6)' }}></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '3.5rem', fontWeight: '800', color: '#1D1D1F', letterSpacing: '-2px', lineHeight: '1' }}>
                {allEvents.filter(e => e.action === "Margin Deposited").length}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600', marginTop: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Applications</div>
            </div>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(0, 113, 227, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>📋</div>
          </div>
        </div>

        <div className="card highlight" style={{ padding: '2rem', background: 'var(--bg-card)', border: 'none', boxShadow: 'var(--shadow-glow-blue)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', background: 'linear-gradient(90deg, #FF9F0A, #FF453A)' }}></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '3.5rem', fontWeight: '800', color: '#1D1D1F', letterSpacing: '-2px', lineHeight: '1' }}>{pendingLoans.length}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600', marginTop: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Action Required</div>
            </div>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255, 159, 10, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>⏳</div>
          </div>
        </div>

        <div className="card highlight" style={{ padding: '2rem', background: 'var(--bg-card)', border: 'none', boxShadow: 'var(--shadow-md)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', background: 'linear-gradient(90deg, #34C759, #30D158)' }}></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '3.5rem', fontWeight: '800', color: '#1D1D1F', letterSpacing: '-2px', lineHeight: '1' }}>
                {allEvents.filter(e => e.action === "Loan Approved").length}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600', marginTop: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Loans Approved</div>
            </div>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(52, 199, 89, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>✅</div>
          </div>
        </div>

      </div>

      {/* Main Content Split */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '2rem' }}>
        
        {/* Pending Approvals Feed */}
        <div className="card" style={{ padding: '2.5rem', background: 'var(--bg-card)', border: 'none', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.5rem', margin: 0, color: '#1D1D1F' }}>Pending Applications</h3>
            {pendingLoans.length > 0 && (
              <span className="badge" style={{ background: '#FFF5E5', color: '#FF9F0A', fontWeight: 'bold' }}>{pendingLoans.length} Tasks</span>
            )}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#0071E3' }}>
              <div className="spinner" style={{ margin: '0 auto 1.5rem', width: '40px', height: '40px' }}></div>
              <p style={{ fontWeight: '500' }}>Syncing secure ledger...</p>
            </div>
          ) : pendingLoans.length === 0 ? (
            <div className="empty-state" style={{ padding: '4rem 2rem' }}>
              <div className="empty-state-icon" style={{ background: 'var(--bg-main)', color: 'var(--text-tertiary)', boxShadow: 'none' }}>
                <CheckCircle size={40} />
              </div>
              <h4 style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', fontWeight: '500', marginBottom: '0.5rem' }}>All Caught Up</h4>
              <p style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>No pending applications require approval.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {pendingLoans.map((loan, i) => (
                <div key={i} style={{
                  padding: '1.75rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-md)',
                  borderLeft: '4px solid #FF9F0A', display: 'flex', flexWrap: 'wrap', gap: '1.5rem',
                  alignItems: 'center', justifyContent: 'space-between', transition: 'transform var(--transition-fast)'
                }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
                  
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#FF9F0A' }}></div>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.95rem', fontWeight: '600', color: '#1D1D1F' }}>
                        {loan.address}
                      </span>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '2rem' }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Margin Locked</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#34C759' }}>{loan.marginDeposited} ETH</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Requested Loan</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1D1D1F' }}>{loan.loanAmount} ETH</div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleApprove(loan.address)}
                    disabled={approving === loan.address}
                    style={{
                      background: approving === loan.address ? 'var(--border-color)' : 'linear-gradient(135deg, #30D158, #28A745)',
                      color: 'white', border: 'none', padding: '1rem 2rem', borderRadius: 'var(--radius-sm)',
                      fontWeight: '600', fontSize: '1rem', cursor: approving === loan.address ? 'not-allowed' : 'pointer',
                      boxShadow: approving === loan.address ? 'none' : '0 4px 14px rgba(48, 209, 88, 0.4)', transition: 'all 0.2s'
                    }}
                  >
                    {approving === loan.address ? "Signing..." : "Authorize ✓"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Sidebar (Manual Lookup) */}
        <div>
          <div className="card" style={{ padding: '2rem', background: 'var(--bg-card)', border: 'none', boxShadow: 'var(--shadow-sm)', marginBottom: '2rem' }}>
            <h4 style={{ marginBottom: '0.5rem', color: '#1D1D1F', fontSize: '1.1rem' }}>Active Portfolio</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              Track approved loans and on-chain credit scores.
            </p>
            {approvedLoans.length === 0 ? (
              <p style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>No active loans yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {approvedLoans.map((loan, i) => (
                  <div key={i} style={{ padding: '1rem', background: 'var(--bg-main)', borderLeft: loan.sbtLevel > 0 ? '4px solid #30D158' : '4px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#1D1D1F' }}>{loan.address.substring(0,6)}...{loan.address.substring(38)}</span>
                      {loan.sbtLevel > 0 ? (
                        <span style={{ fontSize: '0.8rem', background: '#e0f5e4', color: '#1B8A3A', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 'bold' }}>
                          🏆 Lvl {loan.sbtLevel}
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.8rem', background: '#f0f0f0', color: '#888', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>No SBT</span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Outstanding: <strong style={{color: '#1D1D1F'}}>{loan.outstanding} ETH</strong></div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card" style={{ padding: '2rem', background: 'var(--bg-card)', border: 'none', boxShadow: 'var(--shadow-sm)' }}>
            <h4 style={{ marginBottom: '0.5rem', color: '#1D1D1F', fontSize: '1.1rem' }}>Manual Override</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              Directly authorize a loan disbursement using a known applicant address.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input
                type="text"
                value={manualAddress}
                onChange={e => setManualAddress(e.target.value)}
                placeholder="0x..."
                style={{ padding: '1rem', background: 'var(--bg-main)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', fontSize: '0.95rem', width: '100%' }}
              />
              <button
                className="btn-primary"
                onClick={handleManualApprove}
                disabled={approving === manualAddress || !manualAddress}
                style={{ padding: '1rem', width: '100%' }}
              >
                Execute Approval
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
