# 🚀 UdyamAI — Team LedgerX

<div align="center">

**AI-Powered Business Advisory Platform for Rural Entrepreneurs**

*Hyper-Local Intelligence · Multilingual Voice AI · Blockchain-Verified Loans*

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-GitHub_Pages-0071E3?style=for-the-badge)](https://shivam11051.github.io/udyam-ai)
[![Telegram Bot](https://img.shields.io/badge/🤖_AI_Bot-@Udyamm__Bot-26A5E4?style=for-the-badge&logo=telegram)](https://t.me/Udyamm_Bot)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)](https://reactjs.org/)
[![Ethereum](https://img.shields.io/badge/Ethereum-Sepolia-627EEA?style=flat-square&logo=ethereum)](https://sepolia.etherscan.io/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=flat-square&logo=node.js)](https://nodejs.org/)

</div>

---

## 📸 Overview

UdyamAI solves critical financial inclusion and micro-business planning challenges faced by rural micro-entrepreneurs in India. It combines a **Conversational Multilingual AI Advisory Layer** with **Ethereum Smart Contracts** to provide data-backed feasibility analysis, automated MoSJE scheme matching, and eliminates middleman risk in government loan disbursements.

---

## 🤖 Try UdyamAI on Telegram

> **[@Udyamm_Bot](https://t.me/Udyamm_Bot)** — Our live AI assistant is available directly on Telegram!

```
https://t.me/Udyamm_Bot
```

Chat with **UdyamAI** right now to:
- 💡 Get personalised rural business ideas
- 📜 Discover government schemes (NSFDC, NBCFDC, MoSJE)
- 💰 Get loan & interest rate guidance
- 🌍 Ask in **Hindi, Bengali, Tamil, Telugu, Marathi or English**
- 📊 Understand margin money & project cost calculations

No app download needed — works on any device with Telegram installed.

---

## ✨ What's New (v2.0 — Sep 2026)

### 🗺️ Satellite Real-Time Market Heatmap
- **Google Maps–quality satellite tiles** powered by Esri World Imagery (Maxar satellite data)
- Street names, locality labels, and road names overlaid via Esri World Boundaries & Places
- **Pincode-based precision geocoding** — enter a 6-digit Indian pincode for exact map targeting (no more wrong state!)
- Two-strategy geocoder: Pincode → Location name, both scoped strictly to `countrycodes=in`
- Interactive markers: Enterprise center, Consumer hubs (green), Competitor nodes (orange)
- 5 km inner zone + 10 km outer geo-radius rings overlaid on satellite

### 🎙️ Production-Ready Voice AI
- Voice input on **every single form field** including the new Pincode field
- Web Speech API with intelligent error recovery and browser permission handling
- Full report read-aloud with per-section tap-to-listen (TTS)
- AI Voice Q&A Assistant — ask any business question after report generation
- Multilingual AI reports: English, Hindi, Bengali, Tamil, Telugu, Marathi

### 🎨 Flagship Dark Neural UI
- Premium dark glassmorphism aesthetic with neural network particle background
- Udyam AI custom SVG logo with animated glow ring
- 3-step guided wizard with progress indicator
- Zero flickering — GPU-composited layers, no `backdrop-filter` on fixed elements
- All hover animations use `transform: scale()` (no layout-thrashing `translateY`)
- Sidebar uses solid `#14141f` background (removes Chromium's blur-on-fixed GPU bug)

### ⚡ Performance & Stability
- `React.memo` on map component — map never re-renders on parent state changes
- Stable Leaflet icon instances pre-created at module level (zero marker flicker on zoom)
- `useMemo` for marker coordinate arrays
- No Service Worker in dev — eliminated HMR infinite reload loop

---

## 🎯 How It Addresses PS26091

| Requirement | UdyamAI Implementation |
|---|---|
| **Market Reach Analysis** | Satellite map with 5–10 km geo-radius, consumer hub & competitor pin overlays |
| **SWOT & Threats** | Hyper-local SWOT, threats, and competitor-density signals per enterprise |
| **Financial Structuring** | Project Cost = Margin ÷ 10%; Max Loan = 90% of Project Cost |
| **Scheme Matching** | Auto-selects MoSJE scheme (NSFDC, NBCFDC), moratorium-aware EMI schedule |
| **Audit Hook** | Off-chain AI engine + on-chain audit hook for low-cost, traceable referrals |
| **Voice & Multilingual** | Web Speech API STT/TTS in 6 languages, every field voice-enabled |

---

## 🧠 Innovation & Uniqueness

- **Hyper-local + finance-first:** Advice tied directly to user capital, repayment capacity, and live local market conditions
- **Satellite intelligence:** Real-time Esri/Maxar satellite imagery with locality-scoped geocoding to show the actual physical market around the user's village
- **Privacy-first routing:** On-chain credit history improves routing without exposing PII on-chain
- **Voice-first design:** Rural users with low digital literacy can complete the entire advisory flow by voice alone

---

## 📊 Feasibility and Viability

| Dimension | Assessment |
|---|---|
| **Technical** | React + Express + Solidity stack; AI advisory + Leaflet satellite maps |
| **Economic** | Off-chain AI minimizes gas costs; no expensive consultants needed |
| **Financial** | Revenue via partner referrals, FI partnerships, premium advisory |
| **Social** | Multilingual voice support for low-literacy rural users |
| **Scalability** | Modular scheme/partner rules → expand across villages, districts, states |

---

## 🛠️ Challenges & Solutions

| Challenge | Solution |
|---|---|
| **Wrong map location** | Pincode-first geocoding with `countrycodes=in` constraint; never guesses wrong state |
| **Map flickering** | `React.memo` + stable pre-created Leaflet icons + GPU `translateZ(0)` on map container |
| **App-wide flickering** | Removed `backdrop-filter` from `position: fixed` sidebar (Chromium GPU compositing bug) |
| **Stale Market Data** | Data-freshness timestamps and confidence badges on every report card |
| **Low Digital Literacy** | Voice input + multilingual TTS on every field and report section |
| **Privacy & Financial misuse** | No PII on-chain; hashed identifiers, minimal on-chain referral records |
| **Limited Connectivity** | localStorage form/report caching; online/offline status banner |
| **Scheme Info Changes** | Modular scheme rules with regular validation |

---

## 💻 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, React-Leaflet, Lucide Icons, Custom CSS Glassmorphism |
| **Maps** | Esri World Imagery (Maxar satellite) + Esri Boundaries & Places labels |
| **Geocoding** | OpenStreetMap Nominatim API (pincode + location, India-scoped) |
| **Voice** | Web Speech API (STT + TTS), multilingual |
| **Backend / AI** | Node.js, Express.js, Gemini AI (custom UdyamAI persona) |
| **Blockchain** | Ethereum Sepolia Testnet, Solidity, Ethers.js, Hardhat |
| **Deployment** | GitHub Pages (frontend), Render (backend) |

---

## ⚙️ How to Run Locally

### Prerequisites
- Node.js 18+
- MetaMask browser extension
- Backend API key in `.env`

### 1. Smart Contract Deployment
```bash
npx hardhat compile
npx hardhat run scripts/deploy.js --network sepolia
```

### 2. Backend (AI Engine)
```bash
cd backend
npm install
node server.js
```
> Runs on `localhost:5001`. Ensure your `.env` has valid `GEMINI_API_KEY`.

### 3. Frontend (React DApp)
```bash
npm install
npm start
```
> Runs on `localhost:3000`. Connect MetaMask to Sepolia testnet.

---

## 🗂️ Project Structure

```
udyam-ai/
├── src/
│   ├── components/
│   │   ├── BusinessAdvisor.js    # Main AI wizard + satellite map
│   │   ├── BusinessAdvisor.css   # Dark neural glassmorphism UI
│   │   ├── LandingPage.js        # Entry landing page
│   │   ├── EMIScreen.js          # Loan EMI dashboard
│   │   └── Logo.js               # Udyam AI SVG logo
│   ├── App.js                    # App layout + sidebar navigation
│   ├── App.css                   # Global styles
│   └── index.js                  # React entry point
├── backend/
│   ├── server.js                 # Express API server
│   └── controllers/
│       └── aiController.js       # Gemini AI + multilingual prompts
├── contracts/                    # Solidity smart contracts
├── scripts/                      # Hardhat deployment scripts
└── public/
    ├── index.html
    └── manifest.json
```

---

## 👥 Team LedgerX

Built for **Smart India Hackathon 2026** — Problem Statement PS26091 (MoSJE)

---

<div align="center">
Made with ❤️ for India's rural entrepreneurs
</div>
