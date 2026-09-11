const { ethers } = require("ethers");
require("dotenv").config();
const Event = require("../models/Event");

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const ALCHEMY_KEY = process.env.ALCHEMY_KEY;

// Minimal ABI with just the events we need for MoSJELoanTracker
const ABI = [
  "event MarginDeposited(address indexed entrepreneur, uint256 amount)",
  "event LoanApproved(address indexed entrepreneur, uint256 amount)",
  "event EMIPaid(address indexed entrepreneur, uint256 amount, uint256 remaining)",
  "event LoanClosed(address indexed entrepreneur)",
  "event SCATransferInitiated(address indexed previousSCA, address indexed newSCA)",
  "event SCATransferCompleted(address indexed previousSCA, address indexed newSCA)"
];

let provider;
let contract;
let isListening = false;

async function initContract() {
  try {
    console.log("🔌 Connecting to Alchemy...");
    // FIX BUG-015 for eventListener (if it was an issue here, ensure correct instantiation)
    provider = new ethers.JsonRpcProvider(ALCHEMY_KEY);
    
    console.log("📋 Creating contract instance...");
    contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
    
    console.log("✅ Contract initialized successfully");
    console.log(`📍 Address: ${CONTRACT_ADDRESS}`);
    return true;
  } catch (error) {
    console.error("❌ Contract init failed:", error.message);
    return false;
  }
}

async function startEventListener() {
  console.log("🔔 Event listener service initialized");
  console.log("📍 Contract:", process.env.CONTRACT_ADDRESS);

  if (isListening) {
    console.warn("⚠️ Event listener already running");
    return;
  }

  const initialized = await initContract();
  if (!initialized) {
    console.warn("⚠️ Event listener will be offline - contract not initialized");
    return;
  }

  try {
    contract.on("MarginDeposited", async (entrepreneur, amount, event) => {
      console.log(`\n📊 ===== MarginDeposited =====`);
      try {
        await Event.create({
          eventType: "MarginDeposited",
          user: entrepreneur,
          amount: amount.toString(),
          transactionHash: event.log.transactionHash,
          blockNumber: event.log.blockNumber,
        });
      } catch (error) {
        console.error("❌ Error saving MarginDeposited:", error.message);
      }
    });

    contract.on("LoanApproved", async (entrepreneur, amount, event) => {
      console.log(`\n📊 ===== LoanApproved =====`);
      try {
        await Event.create({
          eventType: "LoanApproved",
          user: entrepreneur,
          amount: amount.toString(),
          transactionHash: event.log.transactionHash,
          blockNumber: event.log.blockNumber,
        });
      } catch (error) {
        console.error("❌ Error saving LoanApproved:", error.message);
      }
    });

    contract.on("EMIPaid", async (entrepreneur, amount, remaining, event) => {
      console.log(`\n📊 ===== EMIPaid =====`);
      try {
        await Event.create({
          eventType: "EMIPaid",
          user: entrepreneur,
          amount: amount.toString(),
          remaining: remaining.toString(),
          transactionHash: event.log.transactionHash,
          blockNumber: event.log.blockNumber,
        });
      } catch (error) {
        console.error("❌ Error saving EMIPaid:", error.message);
      }
    });

    contract.on("LoanClosed", async (entrepreneur, event) => {
      console.log(`\n📊 ===== LoanClosed =====`);
      try {
        await Event.create({
          eventType: "LoanClosed",
          user: entrepreneur,
          transactionHash: event.log.transactionHash,
          blockNumber: event.log.blockNumber,
        });
      } catch (error) {
        console.error("❌ Error saving LoanClosed:", error.message);
      }
    });

    contract.on("SCATransferInitiated", async (previousSCA, newSCA, event) => {
      console.log(`\n📊 ===== SCATransferInitiated =====`);
      try {
        await Event.create({
          eventType: "SCATransferInitiated",
          user: previousSCA,
          newSCA: newSCA,
          transactionHash: event.log.transactionHash,
          blockNumber: event.log.blockNumber,
        });
      } catch (error) {
        console.error("❌ Error saving SCATransferInitiated:", error.message);
      }
    });

    contract.on("SCATransferCompleted", async (previousSCA, newSCA, event) => {
      console.log(`\n📊 ===== SCATransferCompleted =====`);
      try {
        await Event.create({
          eventType: "SCATransferCompleted",
          user: previousSCA,
          newSCA: newSCA,
          transactionHash: event.log.transactionHash,
          blockNumber: event.log.blockNumber,
        });
      } catch (error) {
        console.error("❌ Error saving SCATransferCompleted:", error.message);
      }
    });

    isListening = true;
    console.log("\n✅ ✅ ✅ ALL EVENT LISTENERS ACTIVE ✅ ✅ ✅\n");

  } catch (error) {
    console.error("❌ Error starting event listeners:", error.message);
  }
}

module.exports = { startEventListener };