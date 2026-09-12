# Team LedgerX — UdyamAI

**AI-Powered Financial Advisory for Rural Entrepreneurs**
*From Ideas to Opportunities | Simple • Local • Trusted*

UdyamAI solves critical financial inclusion and micro-business planning challenges faced by rural micro-entrepreneurs in India. By combining a **Conversational Multilingual AI Advisory Layer** with **Ethereum Smart Contracts**, the platform provides data-backed feasibility analysis, automated MoSJE scheme matching, and eliminates middleman risk in government loan disbursements.

---

## 🎯 How It Addresses PS26091
- **Market Reach Analysis:** Analyzes local opportunity within 5–10 km radius.
- **SWOT & Threats:** Generates hyper-local SWOT, threats, and competitor-density signals for the chosen enterprise.
- **Financial Structuring:** Project Cost = Margin ÷ 10%; Max Loan = 90% of Project Cost.
- **Scheme Matching:** Auto-selects MoSJE scheme (e.g., NSFDC, NBCFDC), generates a moratorium-aware repayment schedule, and routes to nearby partners.
- **Audit Hook:** Off-chain recommendation engine + on-chain audit hook gives low-cost, traceable referrals.

## 🧠 Innovation & Uniqueness
- **Hyper-local + finance-first:** Advice tied directly to the user's capital and repayment capacity.
- **Privacy-first routing:** On-chain credit history improves routing without exposing Personally Identifiable Information (PII) on-chain.

---

## 📊 Feasibility and Viability

- **Technical Feasibility:** Uses an existing React, Express, and smart-contract stack, augmented with AI advisory and map-based local market analysis.
- **Economic Feasibility:** Low-cost off-chain computation minimizes blockchain gas costs while reducing dependence on expensive human consultants.
- **Financial Viability:** Revenue generation through partner referrals, financial-institution partnerships, and premium advisory services, while keeping basic guidance accessible.
- **Social Feasibility:** Multilingual, voice support makes it exceptionally easy for rural use (low digital literacy).
- **Scalability:** Modular scheme and partner rules allow expansion across villages, districts, and states without changing the core architecture.

---

## 🛠️ Challenges & Solutions

| Challenge | Our Solution |
| :--- | :--- |
| **Stale Local Market Data** | Use data-freshness timestamps and confidence labels; clearly distinguish estimates from verified information. |
| **Low Digital Literacy** | Provide multilingual voice guidance, simple forms, and assisted workflows for first-time users. |
| **Privacy & Financial Data misuse** | Never store PII on-chain; use consent, hashed identifiers, and minimal on-chain referral records. |
| **Limited Internet Connectivity** | Cache core workflows and reports, with low-bandwidth and offline-friendly interactions. |
| **Scheme/Partner Info Changes** | Maintain modular scheme and partner rules with regular updates and validation. |

---

## 💻 Tech Stack
- **Frontend:** React.js, Lucide Icons, Modern CSS (Glassmorphism UI)
- **Backend/AI:** Node.js, Express.js, Custom UdyamAI Model, Web Speech API
- **Blockchain:** Ethereum (Sepolia Testnet), Solidity, Ethers.js, Hardhat

## ⚙️ How to Run Locally

### 1. Smart Contract Deployment
```bash
npx hardhat compile
npx hardhat run scripts/deploy.js --network sepolia
```

### 2. Backend (Custom AI)
```bash
cd backend
npm install
node server.js
```
*Runs on `localhost:5001`. Ensure your `.env` has valid API keys.*

### 3. Frontend (React DApp)
```bash
npm install
npm start
```
*Runs on `localhost:3000`.*
