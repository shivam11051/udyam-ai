import { useState, useEffect, useContext } from "react";
import { formatEther } from "ethers";
import { AppContext } from "../context/AppContext";
import { Wallet, Inbox, ArrowUpRight } from "lucide-react";

export default function TransactionHistory() {
  const { contract, account, provider } = useContext(AppContext);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (contract && account) {
      fetchEvents();
    }
  }, [contract, account]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const marginFilter = contract.filters.MarginDeposited();
      const approveFilter = contract.filters.LoanApproved();
      const emiFilter = contract.filters.EMIPaid();

      const currentBlock = await provider.getBlockNumber();
      const startBlock = currentBlock > 9000 ? currentBlock - 9000 : 0;

      let [marginLogs, approveLogs, emiLogs] = await Promise.all([
        contract.queryFilter(marginFilter, startBlock, 'latest'),
        contract.queryFilter(approveFilter, startBlock, 'latest'),
        contract.queryFilter(emiFilter, startBlock, 'latest')
      ]);

      marginLogs = marginLogs.filter(log => log.args?.[0]?.toLowerCase() === account?.toLowerCase());
      approveLogs = approveLogs.filter(log => log.args?.[0]?.toLowerCase() === account?.toLowerCase());
      emiLogs = emiLogs.filter(log => log.args?.[0]?.toLowerCase() === account?.toLowerCase());

      const allEvents = [];

      for (let log of marginLogs) {
        let ts = 0;
        try { const block = await provider.getBlock(log.blockNumber); ts = block.timestamp; } catch(e) { /* ignore */ }
        allEvents.push({
          type: 'Margin Locked',
          amount: formatEther(log.args[1]),
          txHash: log.transactionHash,
          timestamp: ts,
        });
      }

      for (let log of approveLogs) {
        let ts = 0;
        try { const block = await provider.getBlock(log.blockNumber); ts = block.timestamp; } catch(e) { /* ignore */ }
        allEvents.push({
          type: 'SCA Authorized',
          amount: formatEther(log.args[1]),
          txHash: log.transactionHash,
          timestamp: ts,
        });
      }

      for (let log of emiLogs) {
        let ts = 0;
        try { const block = await provider.getBlock(log.blockNumber); ts = block.timestamp; } catch(e) { /* ignore */ }
        allEvents.push({
          type: 'EMI Repayment',
          amount: formatEther(log.args[1]),
          remaining: formatEther(log.args[2]),
          txHash: log.transactionHash,
          timestamp: ts,
        });
      }

      allEvents.sort((a, b) => b.timestamp - a.timestamp);
      setEvents(allEvents);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  if (!account) return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <Wallet size={40} />
      </div>
      <h3>Immutable Ledger</h3>
      <p>Connect your MetaMask wallet to view your cryptographic transaction history.</p>
    </div>
  );

  return (
    <div className="advisor-container" style={{ maxWidth: '1000px', padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '3rem' }}>
        <div>
          <h2 className="title" style={{ marginBottom: '0.5rem', fontSize: '2.5rem', letterSpacing: '-1px' }}>Blockchain Ledger</h2>
          <p className="subtitle" style={{ margin: 0, fontSize: '1.1rem' }}>Immutable, cryptographic history of your MoSJE loan events.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-pill)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
          <div className="live-dot" style={{ width: '6px', height: '6px' }}></div>
          <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Sepolia Network Sync</span>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden', border: 'none', boxShadow: 'var(--shadow-lg)' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '5rem 2rem', background: 'var(--bg-card)' }}>
            <div className="spinner" style={{ margin: '0 auto 1.5rem', width: '40px', height: '40px' }}></div>
            <p style={{ color: '#0071E3', fontWeight: '600' }}>Syncing with Ethereum Nodes...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="empty-state" style={{ padding: '4rem 2rem' }}>
            <div className="empty-state-icon" style={{ background: 'var(--bg-main)', color: 'var(--text-tertiary)', boxShadow: 'none' }}>
              <Inbox size={40} />
            </div>
            <h4 style={{ color: 'var(--text-secondary)', fontSize: '1.25rem', fontWeight: '500', marginBottom: '0.5rem' }}>No Transactions Found</h4>
            <p style={{ color: 'var(--text-tertiary)' }}>Your blockchain history is currently empty.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', background: 'var(--bg-card)' }}>
              <thead style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border-light)' }}>
                <tr>
                  <th style={{ padding: '1.25rem 2rem', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Timestamp</th>
                  <th style={{ padding: '1.25rem 2rem', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Event Signature</th>
                  <th style={{ padding: '1.25rem 2rem', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Value (ETH)</th>
                  <th style={{ padding: '1.25rem 2rem', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Explorer Proof</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-light)', transition: 'background var(--transition-fast)' }} onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--bg-main)'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <td style={{ padding: '1.5rem 2rem', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                      {ev.timestamp ? new Date(ev.timestamp * 1000).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'Pending Confirm...'}
                    </td>
                    <td style={{ padding: '1.5rem 2rem' }}>
                      <span style={{ 
                        display: 'inline-flex', alignItems: 'center', padding: '0.4rem 1rem', borderRadius: 'var(--radius-pill)', fontSize: '0.85rem', fontWeight: '700',
                        background: ev.type === 'SCA Authorized' ? 'rgba(52, 199, 89, 0.1)' : ev.type === 'EMI Repayment' ? 'rgba(0, 113, 227, 0.1)' : '#FFF5E5',
                        color: ev.type === 'SCA Authorized' ? '#1B8A3A' : ev.type === 'EMI Repayment' ? '#0071E3' : '#FF9F0A'
                      }}>
                        {ev.type}
                      </span>
                    </td>
                    <td style={{ padding: '1.5rem 2rem' }}>
                      <div style={{ fontWeight: '700', color: '#1D1D1F', fontSize: '1.05rem' }}>{ev.amount}</div>
                      {ev.remaining && <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: '0.25rem', fontWeight: '500' }}>Balance: {ev.remaining}</div>}
                    </td>
                    <td style={{ padding: '1.5rem 2rem' }}>
                      <a href={`https://sepolia.etherscan.io/tx/${ev.txHash}`} target="_blank" rel="noreferrer" style={{ 
                        display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', 
                        background: 'var(--bg-main)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-primary)', textDecoration: 'none', fontWeight: '600', fontSize: '0.9rem',
                        transition: 'all 0.2s'
                      }} onMouseOver={e => { e.currentTarget.style.background = '#0071E3'; e.currentTarget.style.color = 'white'; }} onMouseOut={e => { e.currentTarget.style.background = 'var(--bg-main)'; e.currentTarget.style.color = 'var(--text-primary)'; }}>
                        {ev.txHash.slice(0, 6)}...{ev.txHash.slice(-4)}
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg>
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}