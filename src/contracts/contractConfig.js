export const ADDRESS = "0x550E44B995f116d96a67aB2798d3948f525051b8";

export const ABI = [
  { type: "function", name: "governmentSCA", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" },
  { type: "function", name: "pendingSCA", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" },
  {
    type: "function", name: "loans",
    inputs: [{ name: "account", type: "address" }],
    outputs: [
      { name: "entrepreneur", type: "address" },
      { name: "projectCost", type: "uint256" },
      { name: "marginDeposited", type: "uint256" },
      { name: "loanAmount", type: "uint256" },
      { name: "outstandingBalance", type: "uint256" },
      { name: "isActive", type: "bool" },
      { name: "isApproved", type: "bool" }
    ],
    stateMutability: "view"
  },
  { type: "function", name: "transferSCA", inputs: [{ name: "_newSCA", type: "address" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "acceptSCA", inputs: [], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "depositMargin", inputs: [{ name: "_projectCost", type: "uint256" }], outputs: [], stateMutability: "payable" },
  { type: "function", name: "approveLoan", inputs: [{ name: "_entrepreneur", type: "address" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "payEMI", inputs: [], outputs: [], stateMutability: "payable" },
  { type: "function", name: "withdrawCollections", inputs: [{ name: "amount", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  {
    type: "event", name: "MarginDeposited",
    inputs: [
      { name: "entrepreneur", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false }
    ]
  },
  {
    type: "event", name: "LoanApproved",
    inputs: [
      { name: "entrepreneur", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false }
    ]
  },
  {
    type: "event", name: "EMIPaid",
    inputs: [
      { name: "entrepreneur", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "remaining", type: "uint256", indexed: false }
    ]
  },
  {
    type: "event", name: "LoanClosed",
    inputs: [
      { name: "entrepreneur", type: "address", indexed: true }
    ]
  },
  {
    type: "event", name: "SCATransferInitiated",
    inputs: [
      { name: "previousSCA", type: "address", indexed: true },
      { name: "newSCA", type: "address", indexed: true }
    ]
  },
  {
    type: "event", name: "SCATransferCompleted",
    inputs: [
      { name: "previousSCA", type: "address", indexed: true },
      { name: "newSCA", type: "address", indexed: true }
    ]
  }
];

export const NETWORK = {
  id:          11155111,
  name:        "Sepolia",
  rpcUrl:      process.env.REACT_APP_RPC_URL || "https://rpc.sepolia.org",
  explorerUrl: "https://sepolia.etherscan.io",
};

export default { ADDRESS, ABI, NETWORK };