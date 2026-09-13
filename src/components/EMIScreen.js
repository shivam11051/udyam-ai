import { useState, useEffect, useContext, useRef } from "react";
import { formatEther, parseEther } from "ethers";
import { AppContext } from "../context/AppContext";
import { Link, Wallet, CheckCircle, ShieldCheck, ChevronRight } from "lucide-react";

export default function EMIScreen() {
  const { contract, account, isAdmin, addNotif } = useContext(AppContext);
  const [loanData, setLoanData] = useState(null);
  const [sbtScore, setSbtScore] = useState(0);
  const [loading, setLoading] = useState(false);
  const [projectCostInput, setProjectCostInput] = useState("");
  const [emiInput, setEmiInput] = useState("");
  const isProcessing = useRef(false);

  useEffect(() => {
    if (contract && account) {
      fetchLoanData();
    }
  }, [contract, account]);

  const fetchLoanData = async () => {
    try {
      const data = await contract.loans(account);
      setLoanData(data);
      
      // Fetch SBT Credit Score Level
      const tokenId = await contract.userSBT(account);
      if (tokenId > 0n) {
        const level = await contract.sbtLevel(tokenId);
        setSbtScore(Number(level));
      }
    } catch (e) {
      console.error("Error fetching loan data:", e);
    }
  };

  const depositMargin = async () => {
    if (!projectCostInput || isProcessing.current) return;
    isProcessing.current = true;
    setLoading(true);
    try {
      // 1 ETH = 10,000,000 INR for demo purposes to save Sepolia ETH
      const ethEquivalent = (parseFloat(projectCostInput) / 10000000).toFixed(18);
      const costWei = parseEther(ethEquivalent);
      const marginWei = costWei / 10n;
      const tx = await contract.depositMargin(costWei, { value: marginWei });
      addNotif("Transaction submitted. Waiting for confirmation...", "info");
      await tx.wait();
      addNotif("Margin Deposited Successfully!", "success");
      fetchLoanData();
    } catch (e) {
      addNotif(`Error: ${e.message}`, "error");
    }
    isProcessing.current = false;
    setLoading(false);
  };

  const payEMI = async () => {
    if (!emiInput || isProcessing.current) return;
    isProcessing.current = true;
    setLoading(true);
    try {
      const cleanInput = String(emiInput).trim();
      const ethEquivalent = (parseFloat(cleanInput) / 10000000).toFixed(18);
      const tx = await contract.payEMI({ value: parseEther(ethEquivalent) });
      addNotif("Transaction submitted...", "info");
      await tx.wait();
      addNotif("EMI Paid Successfully!", "success");
      setEmiInput("");
      fetchLoanData();
    } catch (e) {
      if (e.message.includes("insufficient funds")) {
        addNotif("Error: You don't have enough ETH in your wallet to cover the payment + gas fees.", "error");
      } else {
        addNotif(`Error: ${e.message}`, "error");
      }
    }
    isProcessing.current = false;
    setLoading(false);
  };



  if (!account) return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <Wallet size={40} />
      </div>
      <h3>No Wallet Connected</h3>
      <p>Please authorize MetaMask access in the top navigation bar to access your secure on-chain financial dashboard.</p>
    </div>
  );

  // Math Helpers for UI
  let progressPercent = 0;
  let loanAmountEth = 0;
  let outstandingEth = 0;
  
  if (loanData && loanData.isActive && loanData.loanAmount > 0n) {
    loanAmountEth = parseFloat(formatEther(loanData.loanAmount));
    outstandingEth = parseFloat(formatEther(loanData.outstandingBalance));
    progressPercent = Math.max(0, Math.min(100, ((loanAmountEth - outstandingEth) / loanAmountEth) * 100));
  }

  const setQuickPay = (percentage) => {
    if (!loanData) return;
    const out = parseFloat(formatEther(loanData.outstandingBalance));
    const amountEth = out * percentage;
    const amountInr = amountEth * 10000000;
    setEmiInput(amountInr.toFixed(0));
  };

  return (
    <div className="advisor-container" style={{ maxWidth: '1000px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
        <div>
          <h2 className="title" style={{ marginBottom: '0.5rem' }}>MoSJE Financial Portal</h2>
          <p className="subtitle" style={{ margin: 0 }}>Secure, immutable loan tracking on Ethereum Sepolia.</p>
        </div>
        <div style={{ padding: '0.5rem 1rem', background: 'rgba(52, 199, 89, 0.1)', color: '#34C759', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', fontWeight: '600', border: '1px solid rgba(52, 199, 89, 0.2)' }}>
          ✓ Blockchain Verified
        </div>
      </div>



      {loanData && loanData.isActive ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem' }}>
          {/* Main Status Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* Visual Timeline */}
            <div className="card">
              <h3 style={{ marginBottom: '2rem', fontSize: '1.25rem' }}>Application Journey</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
                <div style={{ position: 'absolute', top: '15px', left: '10%', right: '10%', height: '3px', background: 'var(--border-light)', zIndex: 0 }}></div>
                <div style={{ position: 'absolute', top: '15px', left: '10%', width: loanData.isApproved ? (loanData.outstandingBalance === 0n ? '80%' : '40%') : '0%', height: '3px', background: '#34C759', zIndex: 1, transition: 'width 1s ease' }}></div>
                
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, flex: 1 }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#34C759', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', border: '4px solid var(--bg-card)' }}>✓</div>
                  <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-primary)' }}>Margin Locked</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, flex: 1 }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: loanData.isApproved ? '#34C759' : 'var(--bg-secondary)', color: loanData.isApproved ? 'white' : 'var(--text-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', border: '4px solid var(--bg-card)' }}>{loanData.isApproved ? '✓' : '2'}</div>
                  <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', fontWeight: loanData.isApproved ? '600' : '500', color: loanData.isApproved ? 'var(--text-primary)' : 'var(--text-secondary)' }}>SCA Approval</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, flex: 1 }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: loanData.outstandingBalance === 0n && loanData.isApproved ? '#34C759' : 'var(--bg-secondary)', color: loanData.outstandingBalance === 0n && loanData.isApproved ? 'white' : 'var(--text-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', border: '4px solid var(--bg-card)' }}>{loanData.outstandingBalance === 0n && loanData.isApproved ? '✓' : '3'}</div>
                  <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', fontWeight: loanData.outstandingBalance === 0n && loanData.isApproved ? '600' : '500', color: loanData.outstandingBalance === 0n && loanData.isApproved ? 'var(--text-primary)' : 'var(--text-secondary)' }}>Repayment</p>
                </div>
              </div>
            </div>

            {/* Repayment Progress (Only if approved) */}
            {loanData.isApproved && (
              <div className="card">
                <h3 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Repayment Status</h3>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '2rem' }}>
                  <div style={{ position: 'relative', width: '120px', height: '120px' }}>
                    <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%' }}>
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--border-light)" strokeWidth="3" />
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#0071E3" strokeWidth="3" strokeDasharray={`${progressPercent}, 100`} style={{ transition: 'stroke-dasharray 1s ease' }} />
                    </svg>
                    <div style={{ position: 'absolute', top: '0', left: '0', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                      <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{progressPercent.toFixed(0)}%</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>PAID</span>
                    </div>
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '1rem', borderBottom: '1px solid var(--border-light)', marginBottom: '1rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Total Disbursed:</span>
                      <strong style={{ fontSize: '1.1rem' }}>₹ {(parseFloat(formatEther(loanData.loanAmount)) * 10000000).toLocaleString('en-IN')}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Remaining Balance:</span>
                      <strong style={{ fontSize: '1.1rem', color: '#FF3B30' }}>₹ {(parseFloat(formatEther(loanData.outstandingBalance)) * 10000000).toLocaleString('en-IN')}</strong>
                    </div>
                  </div>
                </div>

                {loanData.outstandingBalance > 0n ? (
                  <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                    <h4 style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Make a Payment</span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>via Smart Contract</span>
                    </h4>
                    
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                      <button onClick={() => setQuickPay(0.10)} style={{ flex: 1, padding: '0.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '4px', cursor: 'pointer', fontWeight: '500' }}>10%</button>
                      <button onClick={() => setQuickPay(0.25)} style={{ flex: 1, padding: '0.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '4px', cursor: 'pointer', fontWeight: '500' }}>25%</button>
                      <button onClick={() => setQuickPay(1.00)} style={{ flex: 1, padding: '0.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '4px', cursor: 'pointer', fontWeight: '500', color: '#0071E3' }}>Pay in Full</button>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <div style={{ position: 'relative', flex: 1 }}>
                        <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }}>₹</span>
                        <input type="number" step="10" value={emiInput} onChange={e => setEmiInput(e.target.value)} placeholder="0" style={{ paddingLeft: '2.5rem', width: '100%', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem 0.75rem 2.5rem' }} />
                      </div>
                      <button className="btn-primary" onClick={payEMI} disabled={loading || !emiInput} style={{ padding: '0.75rem 1.5rem' }}>
                        {loading ? "Processing..." : "Pay Now"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '1.5rem', background: 'rgba(52, 199, 89, 0.1)', color: '#1B8A3A', borderRadius: 'var(--radius-md)', textAlign: 'center', fontWeight: '600', border: '1px solid rgba(52, 199, 89, 0.3)' }}>
                    🎉 Congratulations! Your MoSJE loan is fully paid off.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Side Info Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* SBT Credit Score Widget */}
            {sbtScore > 0 && (
              <div className="card" style={{ padding: '1.5rem', background: 'linear-gradient(135deg, #FFF5E5, #FFE4B5)', border: '1px solid #FFD070' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ fontSize: '2.5rem' }}>🏆</div>
                  <div>
                    <h4 style={{ margin: 0, color: '#D97706', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Udyam Credit Score</h4>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#92400E' }}>Level {sbtScore} SBT</div>
                  </div>
                </div>
                <p style={{ margin: '1rem 0 0 0', fontSize: '0.8rem', color: '#B45309', lineHeight: '1.4' }}>
                  Your on-chain repayment history. Higher levels unlock lower interest rates for future MoSJE loans.
                </p>
              </div>
            )}

            <div className="card" style={{ padding: '1.5rem' }}>
              <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem' }}>Financial Ledger</h4>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.95rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Project Cost</span>
                <span style={{ fontWeight: '500' }}>₹ {(parseFloat(formatEther(loanData.projectCost)) * 10000000).toLocaleString('en-IN')} <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>({formatEther(loanData.projectCost)} ETH)</span></span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.95rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Margin (10%)</span>
                <span style={{ fontWeight: '500', color: '#34C759' }}>₹ {(parseFloat(formatEther(loanData.marginDeposited)) * 10000000).toLocaleString('en-IN')} <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>({formatEther(loanData.marginDeposited)} ETH)</span></span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.95rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Loan Principal</span>
                <span style={{ fontWeight: '500' }}>₹ {(parseFloat(formatEther(loanData.loanAmount)) * 10000000).toLocaleString('en-IN')} <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>({formatEther(loanData.loanAmount)} ETH)</span></span>
              </div>

              <div style={{ height: '1px', background: 'var(--border-light)', margin: '1rem 0' }}></div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Status</span>
                <span className={`badge ${loanData.isApproved ? 'badge-green' : ''}`} style={{ background: loanData.isApproved ? 'rgba(52, 199, 89, 0.1)' : '#FFF5E5', color: loanData.isApproved ? '#1B8A3A' : '#FF9500', fontSize: '0.75rem' }}>
                  {loanData.isApproved ? "Approved" : "Awaiting SCA"}
                </span>
              </div>
            </div>

            <div className="card" style={{ padding: '1.5rem', background: 'linear-gradient(135deg, #0071E3, #5E5CE6)', color: 'white', border: 'none' }}>
              <h4 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Immutable Transparency</h4>
              <p style={{ fontSize: '0.85rem', opacity: 0.9, lineHeight: '1.5' }}>
                Your margin deposit is held in a secure Ethereum smart contract. MoSJE guidelines guarantee zero fund diversion.
              </p>
            </div>
          </div>

        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem', maxWidth: '600px', margin: '0 auto', border: '1px solid var(--border-light)', boxShadow: '0 10px 30px rgba(0,0,0,0.02)' }}>
          <div style={{ width: '80px', height: '80px', background: 'rgba(0, 113, 227, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto', fontSize: '2.5rem' }}>💼</div>
          <h3 style={{ marginBottom: '1rem', fontSize: '1.75rem' }}>Apply for MoSJE Loan</h3>
          <p style={{ marginBottom: '2.5rem', color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: '1.6' }}>
            To begin your entrepreneurial journey, deposit 10% of your project cost as margin capital into the secure escrow smart contract.
          </p>
          
          <div className="form-group" style={{ textAlign: 'left', background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: 'var(--radius-md)', marginBottom: '2rem' }}>
            <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Total Project Cost (INR)</label>
            <input 
              type="number" 
              step="1000" 
              value={projectCostInput} 
              onChange={e => setProjectCostInput(e.target.value)} 
              placeholder="e.g. 500000" 
              style={{ fontSize: '1.5rem', padding: '1rem 0', border: 'none', background: 'transparent', borderBottom: '2px solid var(--border-light)', borderRadius: 0, outline: 'none' }} 
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', fontSize: '0.95rem', fontWeight: '500' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Required Margin Deposit (10%)</span>
              <span style={{ color: '#0071E3', fontWeight: 'bold' }}>₹ {projectCostInput ? (parseFloat(projectCostInput) * 0.1).toLocaleString('en-IN') : "0"}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.8rem', fontWeight: '500' }}>
              <span style={{ color: 'var(--text-tertiary)' }}>Equivalent Testnet ETH</span>
              <span style={{ color: 'var(--text-tertiary)' }}>{projectCostInput ? (parseFloat(projectCostInput) * 0.1 / 10000000).toFixed(6) : "0.000000"} ETH</span>
            </div>
          </div>

          <button className="btn-primary" onClick={depositMargin} disabled={loading || !projectCostInput} style={{ width: '100%', padding: '1.25rem', fontSize: '1.125rem', borderRadius: 'var(--radius-md)' }}>
            {loading ? "Confirming on Blockchain..." : "Deposit Margin Capital"}
          </button>
        </div>
      )}
    </div>
  );
}