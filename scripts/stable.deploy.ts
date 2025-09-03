import { ethers, network } from "hardhat"
import { contractFactory } from "./helpers/deploy"
import { writeContractInfo } from "./helpers/utility"

async function deployStableCoin() {
  const signers = await ethers.getSigners()

  const args = ["Custom USDT", "USDT"]
  const usdtToken = await contractFactory("StableCoin", args)
  writeContractInfo("USDT", network.name, usdtToken.address, await signers[0].getAddress(), args)
  console.log("USDT is deployed")

  const args1 = ["Custom USDC", "USDC"]
  const usdcToken = await contractFactory("StableCoin", args1)
  writeContractInfo("USDC", network.name, usdcToken.address, await signers[0].getAddress(), args1)
  console.log("USDC is deployed")
}
deployStableCoin()
