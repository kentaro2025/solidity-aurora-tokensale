# Token Sale Contract Project

## Description
### Fork from Ethereum Mainnet
The `hardhat.config.ts` file is set up to fork the Ethereum mainnet at the current block number to facilitate testing with actual `USDT` and `USDC` contract addresses from the Ethereum mainnet.

### Impersonate Account
The `hardhat_impersonateAccount` command is employed to transfer adequate amounts of USDT and USDC to our test accounts, ensuring realistic testing scenarios.

### Constants 
The test scripts within `test/TokenSale.test.ts` utilize genuine USDT and USDC addresses on the mainnet, and specified wallet addresses (`usdtHolder` and `usdcHolder`) are equipped with substantial amounts of `USDT`, `USDC`, and sufficient `ETH` to cover transaction gas fees.

```bash
const usdtAddress = "0xdac17f958d2ee523a2206206994597c13d831ec7" # USDT token address
const usdcAddress = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48" # USDC token address
const usdtHolder = "0xF977814e90dA44bFA03b6295A0616a897441aceC" # binance 8
const usdcHolder = "0xAe2D4617c862309A3d75A0fFB358c7a5009c673F" # kraken 10
```

### Token Prices Decimals
Given that `1 AUF = 0.0666 USDT`, you could represent this as `66600` because token price of USDT per AUF scales the rate by `10^6` (which gives you a reasonable precision without hitting integer overflow too quickly). 
This would mean your tokenPrice would need to be set to 66600 for USDT in your `addPaymentTokens` function.

For example:
```bash
# 1 token = 0.0666 usdt
const rateUSDTperAUF = ethers.utils.parseUnits("0.0666", 6)
# 1 token = 0.9999 usdc
const rateUSDCperAUF = ethers.utils.parseUnits("0.9999", 6)
const tokens = [usdtAddress, usdcAddress]
const rates = [rateUSDTperAUF, rateUSDCperAUF]
await tokenSaleContract.addPaymentTokens(tokens, rates)
```


### Main Issue
Importantly, in our `contracts/TokenSale.sol`, there is a unique interface, `IUSDTERC20`, tailored for the USDT's `transferFrom` function.
This adjustment is necessary because USDT does not adhere to the standard ERC20 return behavior for `transferFrom`, which typically `returns a boolean` value indicating success. This deviation requires a specialized approach in the `buyTokens` function to handle `USDT` transactions effectively.

## Commands: Compile, Test, Deploy, and Verify

```bash
npx hardhat clean
npx hardhat compile
npx hardhat test

npx hardhat run --network sepolia scripts/stable.deploy.ts # for only sepolia testnet
npx hardhat run --network sepolia|ethereum scripts/token.deploy.ts # choose one of sepolia or ethereum
npx hardhat run --network sepolia|ethereum scripts/sale.deploy.ts
npx hardhat run --network sepolia|ethereum scripts/sale.start.ts

npx hardhat run --network sepolia|ethereum scripts/verify.ts
```

