import { ethers } from "hardhat"

export async function contractFactory(
  contractName: string,
  args: Array<any> = [],
  libs: any = {},
  options: { gasLimit?: number } = {}
) {
  // get contract factory and optionally link with libraries
  const Contract = await ethers.getContractFactory(contractName, libs)

  // Set up deployment options, including the gas limit
  const deployOptions = {
    ...options,
  }

  // deploy contract with optional arguments
  const instance = await Contract.deploy(...args, deployOptions)

  // wait for deployment and return
  await instance.deployed()
  return instance
}
