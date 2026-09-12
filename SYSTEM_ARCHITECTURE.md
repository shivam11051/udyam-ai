# UdyamAI System Architecture & Technology Stack

This document outlines the complete technology stack and system architecture for the **UdyamAI** decentralized platform. It is designed to be low-cost, hyper-local, and privacy-preserving for rural micro-entrepreneurs.

---

## 💻 Technology Stack

### 1. Frontend (DApp Client)
- **Framework:** React.js (Component-based UI architecture)
- **Styling:** Custom CSS (Modern Glassmorphism UI, fluid micro-animations)
- **Icons:** `lucide-react` (Lightweight SVG icons)
- **Web3 Integration:** `ethers.js` (v6) for MetaMask wallet connection and smart contract interaction.
- **Voice AI:** Web Speech API (`window.SpeechRecognition`) for multilingual voice-to-text input.
- **Hosting:** GitHub Pages (`gh-pages`)

### 2. Backend (Off-Chain AI & API Gateway)
- **Runtime:** Node.js (v18+)
- **Framework:** Express.js (RESTful API architecture)
- **AI Engine:** Custom UdyamAI NLP Model (Dynamic multi-intent brain for business feasibility and financial structuring)
- **Security & Middleware:** `helmet` (HTTP headers), `cors` (Cross-Origin Resource Sharing), `express-rate-limit` (DDoS protection)
- **Database:** MongoDB / Mongoose (Optional integration for off-chain analytics and partner caching)

### 3. Blockchain (On-Chain Escrow & Logic)
- **Network:** Ethereum (Sepolia Testnet)
- **Smart Contract Language:** Solidity (^0.8.20)
- **Development Environment:** Hardhat (Compilation, local node, and deployment scripts)
- **Core Contract:** `MoSJELoanTracker.sol`

---

## 🏗️ System Architecture & Data Flow

The architecture is deliberately split between **Off-Chain AI Computation** (to save gas fees and process complex text data) and **On-Chain Escrow** (to guarantee financial security and immutability).

### Step 1: User Interaction & Multilingual Input
1. A rural micro-entrepreneur accesses the UdyamAI React Frontend.
2. Using the **Web Speech API**, they tap the microphone icon and speak their business idea in their local language (e.g., Hindi, English).
3. The frontend captures the text, merges it with their local demographic data (Social Category, Margin Capital, District), and sends a secure POST request to the Node.js backend.

### Step 2: Off-Chain AI Feasibility Engine
1. The **UdyamAI Custom Model** processes the demographic and geographic data.
2. It generates a structured, deterministic JSON response containing:
   - **Market Reach:** 5–10 km radius consumer analysis.
   - **Hyper-Local SWOT:** Strengths, Weaknesses, Opportunities, and Threats for the specific block.
   - **Scheme Matching:** Automatic recommendation of MoSJE schemes (e.g., NSFDC, NBCFDC) based on demographic eligibility.
   - **Financial Simulator:** Calculates `Total Project Cost = Margin ÷ 10%` and `Max Govt Loan = 90%`. Generates a moratorium-aware EMI schedule.
3. The frontend renders this JSON into interactive, color-coded dashboard widgets.

### Step 3: On-Chain Escrow & SCA Approval
1. Once the entrepreneur is ready to apply, they trigger a Web3 transaction via MetaMask.
2. The user calls the `depositMargin(uint256 _projectCost)` function on `MoSJELoanTracker.sol` and transfers exactly 10% of their projected cost in Sepolia ETH.
3. The smart contract safely escrows this margin capital.
4. The **State Channelizing Agency (SCA)** (the authorized government wallet) monitors the blockchain. Upon off-chain verification, the SCA calls `approveLoan()` to trigger the 90% funding release.

### Step 4: Immutable EMI Tracking (Zero PII)
1. The entrepreneur repays their loan by calling `payEMI()` on the smart contract.
2. **Privacy First:** The blockchain only records the wallet address (`0x...`) and the payment amount. No Personally Identifiable Information (PII) like names, Aadhar numbers, or phone numbers are ever exposed on the public ledger.
3. This creates a transparent, immutable credit history that can be audited by MoSJE without compromising user privacy.
