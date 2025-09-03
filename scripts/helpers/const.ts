import { readContractInfo } from "./utility"

interface StableCointDictionary {
  [key: string]: string
}

const usdtInfo = readContractInfo("USDT", "sepolia")
const usdcInfo = readContractInfo("USDC", "sepolia")

export let usdtAddress: StableCointDictionary = {}
usdtAddress["ethereum"] = "0xdac17f958d2ee523a2206206994597c13d831ec7"
usdtAddress["sepolia"] = usdtInfo ? usdtInfo.address : ""

export let usdcAddress: StableCointDictionary = {}
usdcAddress["ethereum"] = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
usdcAddress["sepolia"] = usdcInfo ? usdcInfo.address : ""

export const tokenName = "Aurora Foundation Token"
export const tokenSymbol = "AUF"
export const initPoolBalance = 10000000

export const treasury = "0x2205183B44ec598dAc52589D0336FD1E332c9f07"
