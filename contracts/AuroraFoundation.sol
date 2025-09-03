/// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract AuroraFoundationToken is ERC20, Ownable {
    uint256 private constant MAX_PERCENTAGE_SUPPLY = 10000; // representing 100.00%
    uint256 public constant DEFAULT_MAX_PER_WALLET_PERCENTAGE = 200; // 2% of total supply
    uint256 public constant DEFAULT_MAX_PER_TX_PERCENTAGE = 200; // 2% of total supply
    uint256 public constant MIN_PERC = 100; // 1% of total supply

    uint256 public maxPerWalletPercentage = DEFAULT_MAX_PER_WALLET_PERCENTAGE; // Max percentage of total supply per wallet
    uint256 public maxPerTxPercentage = DEFAULT_MAX_PER_TX_PERCENTAGE; // Max percentage of total supply per transaction

    mapping(address => uint256) private lastTxBlock;
    mapping(address => bool) public excludedAddresses;
    bool public paused = true;
    uint256 public deploymentTimestamp;
    uint256 public constant UNFREEZE_DELAY = 30 days; // 1 month delay

    modifier notFrozen(address _from, address _to) {
        require(
            !paused ||
                excludedAddresses[_from] ||
                excludedAddresses[_to] ||
                block.timestamp > deploymentTimestamp + UNFREEZE_DELAY,
            "Transactions are paused"
        );
        _;
    }

    modifier checkLimitations(
        address from,
        address to,
        uint256 amount
    ) {
        if (!(excludedAddresses[from] || excludedAddresses[to])) {
            require(amount <= maxPerTx(), "Transfer amount exceeds the maximum per transaction");
            require(balanceOf(to) + amount <= maxPerWallet(), "Recipient balance would exceed the maximum per wallet");
        }
        _;
    }

    constructor(string memory name_, string memory symbol_) ERC20(name_, symbol_) {
        _mint(msg.sender, 100000000 * (10**uint256(decimals())));
        excludedAddresses[msg.sender] = true; // Exclude owner from being frozen
        deploymentTimestamp = block.timestamp;
    }

    function transfer(address recipient, uint256 amount)
        public
        virtual
        override
        notFrozen(_msgSender(), recipient)
        checkLimitations(msg.sender, recipient, amount)
        returns (bool)
    {
        return super.transfer(recipient, amount);
    }

    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) public virtual override notFrozen(sender, recipient) checkLimitations(sender, recipient, amount) returns (bool) {
        return super.transferFrom(sender, recipient, amount);
    }

    function maxPerWallet() public view returns (uint256) {
        return (totalSupply() * maxPerWalletPercentage) / MAX_PERCENTAGE_SUPPLY;
    }

    function maxPerTx() public view returns (uint256) {
        return (totalSupply() * maxPerTxPercentage) / MAX_PERCENTAGE_SUPPLY;
    }

    function setMaxPerWalletPercentage(uint256 percentage) public onlyOwner {
        require(percentage >= MIN_PERC && percentage <= MAX_PERCENTAGE_SUPPLY, "Percentage exceeds maximum");
        maxPerWalletPercentage = percentage;
    }

    function setMaxPerTxPercentage(uint256 percentage) public onlyOwner {
        require(percentage >= MIN_PERC && percentage <= MAX_PERCENTAGE_SUPPLY, "Percentage exceeds maximum");
        maxPerTxPercentage = percentage;
    }

    function excludeAddress(address _address) public onlyOwner {
        excludedAddresses[_address] = true;
    }

    function includeAddress(address _address) public onlyOwner {
        excludedAddresses[_address] = false;
    }

    function freezeAll() public onlyOwner {
        paused = true;
    }

    function unfreezeAll() public onlyOwner {
        paused = false;
    }

    function isPaused() public view returns (bool) {
        return paused;
    }

    function freezeAddress(address _address) public onlyOwner {
        excludedAddresses[_address] = true;
    }

    function unfreezeAddress(address _address) public onlyOwner {
        excludedAddresses[_address] = false;
    }

    function isAddressFrozen(address _address) public view returns (bool) {
        return excludedAddresses[_address];
    }
}
