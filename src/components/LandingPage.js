import React from "react";
import { Bot, Landmark, Link2 } from "lucide-react";
import "./LandingPage.css";

const LandingPage = ({ onConnect }) => {
  return (
    <div className="landing-container">
      {/* Top Nav */}
      <nav className="landing-nav">
        <div className="landing-nav-brand">UdyamAI</div>
        <div className="landing-nav-badge">SIH — MoSJE</div>
      </nav>

      {/* Hero Section */}
      <header className="landing-header">
        <div className="hero-badge">🇮🇳 Ministry of Social Justice & Empowerment</div>
        <h1 className="hero-title">
          Empowering Rural India<br />
          <span className="hero-gradient">with AI & Blockchain</span>
        </h1>
        <p className="hero-subtitle">
          UdyamAI gives micro-entrepreneurs an AI-powered Business Advisor, auto-calculated
          government loan structuring, and tamper-proof on-chain EMI tracking — all in one platform.
        </p>
        <div className="hero-actions">
          <button className="connect-btn" onClick={onConnect}>
            Get Started →
          </button>
          <a href="#how-it-works" className="hero-link">See how it works</a>
        </div>
      </header>

      {/* Stats Bar */}
      <section className="stats-bar">
        <div className="stat-item">
          <span className="stat-number">6.3 Cr+</span>
          <span className="stat-label">MSMEs in India</span>
        </div>
        <div className="stat-divider"></div>
        <div className="stat-item">
          <span className="stat-number">86%</span>
          <span className="stat-label">Lack Formal Credit</span>
        </div>
        <div className="stat-divider"></div>
        <div className="stat-item">
          <span className="stat-number">₹1,200 Cr</span>
          <span className="stat-label">NSFDC Fund Misuse Flagged</span>
        </div>
        <div className="stat-divider"></div>
        <div className="stat-item">
          <span className="stat-number">5+</span>
          <span className="stat-label">Languages Supported</span>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="landing-features">
        <div className="feature-grid">
          <div className="feature-card">
            <div className="feature-icon"><Bot size={32} /></div>
            <h3>AI Business Advisor</h3>
            <p>AI-powered hyper-local market analysis with SWOT, competitor mapping, and pricing strategy — in your language.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><Landmark size={32} /></div>
            <h3>Smart Scheme Routing</h3>
            <p>Automatically identifies the right MoSJE scheme, calculates EMI, moratorium, and total project cost from your 10% margin.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><Link2 size={32} /></div>
            <h3>Blockchain Transparency</h3>
            <p>Every rupee tracked on Ethereum. Margin deposits, loan approvals, and EMI payments — immutable and publicly auditable.</p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="how-it-works" id="how-it-works">
        <h2 className="section-title">How It Works</h2>
        <div className="steps-container">
          <div className="step">
            <div className="step-number">1</div>
            <div className="step-content">
              <h4>Enter Business Details</h4>
              <p>Tell us your location, margin capital, and business category.</p>
            </div>
          </div>
          <div className="step-line"></div>
          <div className="step">
            <div className="step-number">2</div>
            <div className="step-content">
              <h4>AI Generates Report</h4>
              <p>Our AI analyzes local markets and generates a feasibility report with SWOT analysis.</p>
            </div>
          </div>
          <div className="step-line"></div>
          <div className="step">
            <div className="step-number">3</div>
            <div className="step-content">
              <h4>Auto Loan Structuring</h4>
              <p>The system auto-selects the right MoSJE scheme and calculates your exact EMI.</p>
            </div>
          </div>
          <div className="step-line"></div>
          <div className="step">
            <div className="step-number">4</div>
            <div className="step-content">
              <h4>On-Chain Tracking</h4>
              <p>Deposit margin and pay EMI directly through smart contracts. Fully transparent.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <p>Built for Smart India Hackathon — Problem Statement by MoSJE</p>
        <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', opacity: 0.6 }}>Powered by UdyamAI Custom Model • Ethereum Blockchain • React.js</p>
      </footer>
    </div>
  );
};

export default LandingPage;
