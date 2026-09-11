# UdyamAI — Decentralized Rural Micro-Entrepreneurship Platform

UdyamAI solves critical financial inclusion and micro-business planning challenges faced by rural micro-entrepreneurs in India. By combining **Google Gemini AI** with **Ethereum Smart Contracts**, the platform provides data-backed feasibility analysis, automated MoSJE scheme matching, and eliminates middleman risk in government loan disbursements.

## 🚀 Key Features

### 1. Multilingual Voice-to-Text AI Assistant
- Built with the **Google Gemini API**.
- Rural entrepreneurs can simply "speak" their business ideas in their local language.
- The AI generates a localized, hyper-specific feasibility report, competitor analysis, and pricing strategy for their specific district.

### 2. Automated MoSJE Scheme Matching & Financial Structuring
- Replaces manual calculations with an automated rule engine.
- Automatically structures the required 10% margin, calculates the total project cost, and determines the EMI schedule based on the exact MoSJE scheme the entrepreneur qualifies for.

### 3. Smart Contract Escrow (Ethereum Sepolia)
- Implements `MoSJELoanTracker.sol`.
- 10% margin deposits are securely locked in a smart contract.
- The State Channelizing Agency (SCA) can transparently monitor these deposits and approve loans on-chain.
- Eradicates diversion of funds and ensures an immutable audit trail of all EMI payments.

## 💻 Tech Stack

- **Frontend:** React.js, Lucide Icons, Modern CSS (Glassmorphism UI)
- **Backend/AI:** Node.js, Express.js, Google Gemini API, Web Speech API
- **Blockchain:** Ethereum (Sepolia Testnet), Solidity, Ethers.js, Hardhat

## ⚙️ How to Run Locally

### 1. Smart Contract Deployment
```bash
npx hardhat compile
npx hardhat run scripts/deploy.js --network sepolia
```
*Note: Ensure your `.env` is configured with `ALCHEMY_KEY` and `PRIVATE_KEY`.*

### 2. Backend (Gemini AI)
```bash
cd backend
npm install
node server.js
```
*Runs on `localhost:5001`. Ensure your `.env` has a valid `GEMINI_API_KEY`.*

### 3. Frontend (React DApp)
```bash
npm install
npm start
```
*Runs on `localhost:3000`.*
