import { ethers, network } from "hardhat"
import { contractFactory } from "./helpers/deploy"
import { readContractInfo } from "./helpers/utility"
import { initPoolBalance, usdtAddress, usdcAddress } from "./helpers/const"
import AFTTokenABI from "../abi/AuroraFoundationToken.json"
import TokenSaleABI from "../abi/TokenSale.json"

async function deployTokenSale() {
  const signers = await ethers.getSigners()

  const aftTokenInfo = readContractInfo("AuroraFoundationToken", network.name)
  const tokenSaleInfo = readContractInfo("TokenSale", network.name)

  if (aftTokenInfo && tokenSaleInfo) {
    const aftToken = new ethers.Contract(aftTokenInfo.address, AFTTokenABI, signers[0])
    const tokenSaleContract = new ethers.Contract(tokenSaleInfo.address, TokenSaleABI, signers[0])

    const initBalance = ethers.utils.parseUnits(initPoolBalance.toString(), await aftToken.decimals())
    await aftToken.transfer(tokenSaleInfo.address, initBalance)
    console.log("AFT Token transferred in the TokenSale")

    const paymentTokens = [usdtAddress[network.name], usdcAddress[network.name]]
    const rateUSDTperAUF = ethers.utils.parseUnits("0.0666", 6)
    const rateUSDCperAUF = ethers.utils.parseUnits("0.0666", 6)
    const paymentPrices = [rateUSDTperAUF, rateUSDCperAUF]
    await tokenSaleContract.addPaymentTokens(paymentTokens, paymentPrices)
    console.log("Added payment tokens with price")

    await aftToken.excludeAddress(tokenSaleInfo.address)
    console.log("Added tokenSale as excluded in AUF token")

    await tokenSaleContract.startStopSale(true)
    console.log("Started tokenSale")
  }
}
deployTokenSale()
