import { ethers, network } from "hardhat"
import { contractFactory } from "./helpers/deploy"
import { readContractInfo, writeContractInfo } from "./helpers/utility"
import { treasury } from "./helpers/const"

async function deployTokenSale() {
  const signers = await ethers.getSigners()

  const aftTokenInfo = readContractInfo("AuroraFoundationToken", network.name)
  if (aftTokenInfo) {
    const args = [aftTokenInfo.address, treasury]
    const tokenSale = await contractFactory("TokenSale", args)
    writeContractInfo("TokenSale", network.name, tokenSale.address, await signers[0].getAddress(), args)
    console.log("TokenSale is deployed")
  }
}
deployTokenSale()
