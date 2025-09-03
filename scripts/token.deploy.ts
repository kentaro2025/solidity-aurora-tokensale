import { ethers, network } from "hardhat"
import { contractFactory } from "./helpers/deploy"
import { writeContractInfo } from "./helpers/utility"
import { tokenName, tokenSymbol } from "./helpers/const"

async function deployToken() {
  const signers = await ethers.getSigners()

  const args = [tokenName, tokenSymbol]
  const aftToken = await contractFactory("AuroraFoundationToken", args)
  writeContractInfo("AuroraFoundationToken", network.name, aftToken.address, await signers[0].getAddress(), args)
  console.log("Aurora Foundation Token is deployed")
}
deployToken()
