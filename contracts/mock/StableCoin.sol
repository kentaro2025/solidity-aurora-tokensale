// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract StableCoin is ERC20, Ownable {
    uint256 public constant MAX_SUPPLY = 100000000 * 10**6; // 100 million tokens, considering 6 decimals
    uint8 private _decimals;

    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        _setupDecimals(6); // Setting the decimals to 6
        _mint(msg.sender, MAX_SUPPLY);
    }

    function _setupDecimals(uint8 decimals) private {
        _decimals = decimals;
    }

    // Override the `decimals` function to set custom decimals
    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }
}
