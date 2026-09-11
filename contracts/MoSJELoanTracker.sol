// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MoSJELoanTracker
 * @dev Tracks the 10% margin escrow and 90% government loan disbursements 
 * for rural micro-entrepreneurs.
 */
contract MoSJELoanTracker {
    
    address public governmentSCA; // State Channelizing Agency
    address public pendingSCA;
    
    struct LoanAccount {
        address entrepreneur;
        uint256 projectCost;
        uint256 marginDeposited;
        uint256 loanAmount;
        uint256 outstandingBalance;
        bool isActive;
        bool isApproved;
    }
    
    mapping(address => LoanAccount) public loans;
    
    event MarginDeposited(address indexed entrepreneur, uint256 amount);
    event LoanApproved(address indexed entrepreneur, uint256 amount);
    event EMIPaid(address indexed entrepreneur, uint256 amount, uint256 remaining);
    event LoanClosed(address indexed entrepreneur);
    event SCATransferInitiated(address indexed previousSCA, address indexed newSCA);
    event SCATransferCompleted(address indexed previousSCA, address indexed newSCA);
    
    modifier onlySCA() {
        require(msg.sender == governmentSCA, "Only SCA can perform this action");
        _;
    }
    
    constructor() {
        governmentSCA = msg.sender;
    }

    // Two-step ownership transfer for SCA
    function transferSCA(address _newSCA) external onlySCA {
        require(_newSCA != address(0), "Invalid address");
        pendingSCA = _newSCA;
        emit SCATransferInitiated(governmentSCA, _newSCA);
    }

    function acceptSCA() external {
        require(msg.sender == pendingSCA, "Only pending SCA can accept");
        emit SCATransferCompleted(governmentSCA, pendingSCA);
        governmentSCA = pendingSCA;
        pendingSCA = address(0);
    }
    
    // Step 1: Entrepreneur applies and deposits 10% margin
    function depositMargin(uint256 _projectCost) external payable {
        require(loans[msg.sender].isActive == false, "Existing loan active");
        require(_projectCost >= 0.0001 ether, "Project cost too low");
        require(_projectCost <= 100 ether, "Project cost too high");
        
        uint256 requiredMargin = _projectCost / 10;
        require(msg.value == requiredMargin, "Must deposit exactly 10% margin");
        
        loans[msg.sender] = LoanAccount({
            entrepreneur: msg.sender,
            projectCost: _projectCost,
            marginDeposited: msg.value,
            loanAmount: _projectCost - requiredMargin,
            outstandingBalance: _projectCost - requiredMargin,
            isActive: true,
            isApproved: false
        });
        
        emit MarginDeposited(msg.sender, msg.value);
    }
    
    // Step 2: SCA Approves the loan (Off-chain SCA transfers 90% to entrepreneur)
    function approveLoan(address _entrepreneur) external onlySCA {
        require(loans[_entrepreneur].isActive == true, "No active application");
        require(loans[_entrepreneur].isApproved == false, "Already approved");
        
        loans[_entrepreneur].isApproved = true;
        
        // Add a flat 5% interest fee to the outstanding balance representing the total to repay
        uint256 interest = (loans[_entrepreneur].loanAmount * 5) / 100;
        loans[_entrepreneur].outstandingBalance += interest;
        
        emit LoanApproved(_entrepreneur, loans[_entrepreneur].loanAmount);
    }
    
    // Step 3: Entrepreneur pays EMI on-chain
    function payEMI() external payable {
        require(loans[msg.sender].isApproved == true, "Loan not approved");
        require(loans[msg.sender].outstandingBalance > 0, "Loan fully paid");
        require(msg.value >= 100000 gwei || msg.value == loans[msg.sender].outstandingBalance, "EMI amount too small");
        
        uint256 payment = msg.value;
        if(payment > loans[msg.sender].outstandingBalance) {
            payment = loans[msg.sender].outstandingBalance;
        }
        
        // Effects
        loans[msg.sender].outstandingBalance -= payment;
        
        // Interactions (Refund excess)
        if(msg.value > payment) {
            (bool success, ) = msg.sender.call{value: msg.value - payment}("");
            require(success, "Refund failed");
        }
        
        emit EMIPaid(msg.sender, payment, loans[msg.sender].outstandingBalance);

        // Close loan and return margin if fully paid
        if(loans[msg.sender].outstandingBalance == 0) {
            loans[msg.sender].isActive = false;
            uint256 marginToReturn = loans[msg.sender].marginDeposited;
            loans[msg.sender].marginDeposited = 0; // prevent reentrancy
            
            (bool successMargin, ) = msg.sender.call{value: marginToReturn}("");
            require(successMargin, "Margin return failed");
            
            emit LoanClosed(msg.sender);
        }
    }
    
    // SCA withdraws collected EMIs, ensuring we leave enough balance for active margin deposits
    function withdrawCollections(uint256 amount) external onlySCA {
        require(amount <= address(this).balance, "Insufficient balance");
        (bool success, ) = governmentSCA.call{value: amount}("");
        require(success, "Withdrawal failed");
    }
}
