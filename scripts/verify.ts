import hre, { ethers } from "hardhat"
import { readContractInfo } from "./helpers/utility"

// ArrowToekn & Staking contract addresses on the Fuji testnet
const tokenContractInfo = readContractInfo("AuroraFoundationToken", hre.network.name)
const tokenSaleInfo = readContractInfo("TokenSale", hre.network.name)
const usdtInfo = readContractInfo("USDT", hre.network.name)
const usdcInfo = readContractInfo("USDC", hre.network.name)

async function verifyContracts() {
  if (tokenContractInfo != null) {
    await verify(tokenContractInfo.address, tokenContractInfo.args)
  }

  if (tokenSaleInfo != null) {
    await verify(tokenSaleInfo.address, tokenSaleInfo.args)
  }

  if (usdtInfo != null) {
    await verify(usdtInfo.address, usdtInfo.args)
  }

  if (usdcInfo != null) {
    await verify(usdcInfo.address, usdcInfo.args)
  }
}

async function verify(contract: string, args: (string | string[])[]) {
  try {
    await hre.run("verify:verify", {
      address: contract,
      constructorArguments: args,
    })
  } catch (e: unknown) {
    if (typeof e === "string") {
      console.log("Error String: ", e.toUpperCase())
    } else if (e instanceof Error) {
      console.log("Error.message: ", e.message)
    }
    console.log(`\n******`)
    console.log()
  }
}

verifyContracts()
