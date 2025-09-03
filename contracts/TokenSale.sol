// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableMap.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

interface IUSDTERC20 {
    function decimals() external view returns (uint8);

    function transferFrom(
        address from,
        address to,
        uint256 value
    ) external;
}

contract TokenSale is Ownable, ReentrancyGuard {
    using EnumerableMap for EnumerableMap.AddressToUintMap;

    event ChangedTokenSaleActive(bool active, uint256 timestamp);
    event TokenSold(address indexed buyer, uint256 amount);
    event TreasuryAddressChanged(address newTreasuryAddress);
    event PaymentTokenAdded(address indexed paymentToken, uint256 tokenPrice);
    event PaymentTokenRemoved(address indexed paymentToken);
    event PaymentTokenChanged(address indexed paymentToken, uint256 tokenPrice);
    event AdminAdded(address admin);
    event AdminRemoved(address admin);

    error InvalidAddress();
    error InvalidTokensAndPricesLength(uint256 tokensLength, uint256 pricesLength);
    error PaymentTokensExceeded(uint256 tokensCount);
    error AlreadyAddedPaymentToken(address paymentToken);
    error NotAddedPaymentToken(address paymentToken);
    error InvalidPaymentTokenPrice(address paymentToken);
    error NotStartedSale();
    error InvalidNumOfTokens();
    error TransferTokenFailed(address token, address from, address to, uint256 amount);

    address public tokenForSale;
    address public treasuryAddress;
    EnumerableMap.AddressToUintMap private tokenPricesMap;
    uint256 public totalSaledTokens;
    bool public saleActive;
    uint256 public constant MAX_PAYMENT_TOKENS = 50;

    constructor(address saleToken, address treasury) {
        treasuryAddress = treasury;
        tokenForSale = saleToken;
        saleActive = false;
    }

    function addPaymentTokens(address[] calldata paymentTokens, uint256[] calldata tokenPrices) public onlyOwner {
        if (paymentTokens.length != tokenPrices.length || paymentTokens.length == 0)
            revert InvalidTokensAndPricesLength(paymentTokens.length, tokenPrices.length);

        if (paymentTokens.length + tokenPricesMap.length() > MAX_PAYMENT_TOKENS)
            revert PaymentTokensExceeded(paymentTokens.length + tokenPricesMap.length());

        for (uint256 i = 0; i < paymentTokens.length; i++) {
            address paymentToken = paymentTokens[i];
            uint256 tokenPrice = tokenPrices[i];
            if (paymentToken == address(0)) revert InvalidAddress();
            if (tokenPrice == 0) revert InvalidPaymentTokenPrice(paymentToken);
            if (tokenPricesMap.contains(paymentToken)) revert AlreadyAddedPaymentToken(paymentToken);

            tokenPricesMap.set(paymentToken, tokenPrices[i]);
            emit PaymentTokenAdded(paymentToken, tokenPrices[i]);
        }
    }

    function updateTokenPrice(address paymentToken, uint256 newPrice) public onlyOwner {
        if (newPrice == 0) revert InvalidPaymentTokenPrice(paymentToken);
        if (!tokenPricesMap.contains(paymentToken) && tokenPricesMap.length() >= MAX_PAYMENT_TOKENS)
            revert PaymentTokensExceeded(tokenPricesMap.length());
        tokenPricesMap.set(paymentToken, newPrice);
        emit PaymentTokenChanged(paymentToken, newPrice);
    }

    function removePaymentTokenPrice(address paymentToken) public onlyOwner {
        if (!tokenPricesMap.contains(paymentToken)) revert NotAddedPaymentToken(paymentToken);
        tokenPricesMap.remove(paymentToken);
        emit PaymentTokenRemoved(paymentToken);
    }

    function getPaymentTokenPrice(address paymentToken) public view returns (uint256) {
        return tokenPricesMap.get(paymentToken);
    }

    function getAllPaymentTokens() public view returns (address[] memory) {
        address[] memory paymentTokens = new address[](tokenPricesMap.length());
        for (uint256 i = 0; i < tokenPricesMap.length(); ++i) {
            (address paymentToken, ) = tokenPricesMap.at(i);
            paymentTokens[i] = paymentToken;
        }
        return paymentTokens;
    }

    function setTreasuryAddress(address newTreasuryAddress) public onlyOwner {
        if (newTreasuryAddress == address(0)) revert InvalidAddress();

        treasuryAddress = newTreasuryAddress;
        emit TreasuryAddressChanged(newTreasuryAddress);
    }

    function startStopSale(bool active) public onlyOwner {
        if (saleActive != active) {
            saleActive = active;
            emit ChangedTokenSaleActive(active, block.timestamp);
        }
    }

    function calculateOutputAmount(address paymentToken, uint256 amountInput) public view returns (uint256) {
        if (tokenPricesMap.contains(paymentToken)) {
            uint256 tokenInDecimals = IUSDTERC20(paymentToken).decimals();
            uint256 tokenOutDecimals = IUSDTERC20(tokenForSale).decimals();
            uint256 tokenPrice = tokenPricesMap.get(paymentToken);

            // Adjust the formula to account for token price being a scaled number
            // ex: 1 AUF = 0.066666 USDT, represented as 66666 in a scale of 10^6
            return (amountInput * 10**(tokenOutDecimals + 6 - tokenInDecimals)) / tokenPrice;
        }
        return 0;
    }

    function calculateInputAmount(address paymentToken, uint256 amountOutput) public view returns (uint256) {
        if (tokenPricesMap.contains(paymentToken)) {
            uint256 tokenInDecimals = IUSDTERC20(paymentToken).decimals();
            uint256 tokenOutDecimals = IUSDTERC20(tokenForSale).decimals();
            uint256 tokenPrice = tokenPricesMap.get(paymentToken);

            // Reverse the formula to calculate the required amount of input tokens to get the desired amount of output tokens
            // Given amountOutput, calculate how much input is needed.
            // The price is scaled by 10^8 (or another appropriate factor), so adjust accordingly:
            return (amountOutput * tokenPrice) / 10**(tokenOutDecimals + 6 - tokenInDecimals);
        }
        return 0; // Return 0 if the paymentToken is not recognized
    }

    function buyTokensWithInputAmount(address paymentToken, uint256 amountInput) public nonReentrant {
        if (!saleActive) revert NotStartedSale();
        if (amountInput == 0) revert InvalidNumOfTokens();
        if (!tokenPricesMap.contains(paymentToken)) revert NotAddedPaymentToken(paymentToken);

        uint256 amountOutput = calculateOutputAmount(paymentToken, amountInput);
        totalSaledTokens += amountOutput;

        IUSDTERC20(paymentToken).transferFrom(msg.sender, treasuryAddress, amountInput);
        if (!IERC20(tokenForSale).transfer(msg.sender, amountOutput))
            revert TransferTokenFailed(tokenForSale, address(this), msg.sender, amountOutput);

        emit TokenSold(msg.sender, amountOutput);
    }

    function buyTokens(address paymentToken, uint256 amountOutput) public nonReentrant {
        if (!saleActive) revert NotStartedSale();
        if (amountOutput == 0) revert InvalidNumOfTokens();
        if (!tokenPricesMap.contains(paymentToken)) revert NotAddedPaymentToken(paymentToken);

        uint256 amountInput = calculateInputAmount(paymentToken, amountOutput);
        totalSaledTokens += amountOutput;

        IUSDTERC20(paymentToken).transferFrom(msg.sender, treasuryAddress, amountInput);
        if (!IERC20(tokenForSale).transfer(msg.sender, amountOutput))
            revert TransferTokenFailed(tokenForSale, address(this), msg.sender, amountOutput);

        emit TokenSold(msg.sender, amountOutput);
    }

    function getSaleTokenBalance() public view returns (uint256) {
        return IERC20(tokenForSale).balanceOf(address(this));
    }

    function withdrawTokens() public onlyOwner {
        uint256 contractBalance = getSaleTokenBalance();
        if (!IERC20(tokenForSale).transfer(treasuryAddress, contractBalance))
            revert TransferTokenFailed(tokenForSale, address(this), treasuryAddress, contractBalance);
    }
}
