import chai, { expect } from "chai"
import hre, { ethers } from "hardhat"

const increaseTime = async (secondsToIncrease: number) => {
  await hre.ethers.provider.send("evm_increaseTime", [secondsToIncrease])
  await hre.ethers.provider.send("evm_mine", [])
}

describe("Aurora Foundation", function () {
  async function deployContract() {
    const [deployer, ...accounts] = await ethers.getSigners()
    const AuroraFoundation = await ethers.getContractFactory("AuroraFoundationToken")
    const auroraToken = await AuroraFoundation.deploy("Aurora Foundation Token", "AFT")
    await auroraToken.deployed()

    return { auroraToken, deployer, accounts }
  }

  describe("Deploy the contract", function () {
    let decimals = 0

    it("Should be deployed correctly", async () => {
      const { auroraToken, deployer, accounts } = await deployContract()
      decimals = await auroraToken.decimals()

      expect(await auroraToken.name()).to.equal("Aurora Foundation Token")
      expect(await auroraToken.symbol()).to.equal("AFT")
      expect(await auroraToken.balanceOf(await deployer.getAddress())).to.equal(
        ethers.utils.parseUnits("100000000", decimals)
      )
    })
  })

  describe("Freeze & Unfreeze Test", function () {
    let decimals = 0

    it("Should test transfer in the freeze status", async () => {
      const { auroraToken, deployer, accounts } = await deployContract()
      decimals = await auroraToken.decimals()

      const receipeint1 = await accounts[0].getAddress()
      const amount = ethers.utils.parseUnits("1000", decimals)
      await auroraToken.connect(deployer).transfer(receipeint1, amount)

      await auroraToken.connect(deployer).freezeAll()
      const receipeint2 = await accounts[1].getAddress()
      await expect(auroraToken.connect(accounts[0]).transfer(receipeint2, amount)).to.be.revertedWith(
        "Transactions are paused"
      )
    })

    it("Should test transfer in unfreeze status", async () => {
      const { auroraToken, deployer, accounts } = await deployContract()

      const receipeint1 = await accounts[0].getAddress()
      const amount = ethers.utils.parseUnits("1000", decimals)
      await auroraToken.connect(deployer).transfer(receipeint1, amount)

      await auroraToken.connect(deployer).freezeAll()
      await auroraToken.connect(deployer).unfreezeAll()

      const receipeint2 = await accounts[1].getAddress()
      await auroraToken.connect(accounts[0]).transfer(receipeint2, amount)

      expect(await auroraToken.balanceOf(receipeint2)).to.equal(amount)
    })

    it("Should be transferred by excluded addresses even though the status is frozen", async () => {
      const { auroraToken, deployer, accounts } = await deployContract()

      const receipeint1 = await accounts[0].getAddress()
      const amount = ethers.utils.parseUnits("1000", decimals)
      await auroraToken.connect(deployer).transfer(receipeint1, amount)

      await auroraToken.connect(deployer).freezeAll()
      await auroraToken.connect(deployer).excludeAddress(receipeint1)

      const receipeint2 = await accounts[1].getAddress()
      await auroraToken.connect(accounts[0]).transfer(receipeint2, amount)

      expect(await auroraToken.balanceOf(receipeint2)).to.equal(amount)
    })

    it("Should be failed to transfer by included addresses if the status is frozen", async () => {
      const { auroraToken, deployer, accounts } = await deployContract()

      const receipeint0 = await accounts[0].getAddress()
      const amount = ethers.utils.parseUnits("1000", decimals)
      await auroraToken.connect(deployer).transfer(receipeint0, amount)

      await auroraToken.connect(deployer).freezeAll()
      await auroraToken.connect(deployer).includeAddress(receipeint0)

      const receipeint1 = await accounts[1].getAddress()
      await expect(auroraToken.connect(accounts[0]).transfer(receipeint1, amount)).to.be.revertedWith(
        "Transactions are paused"
      )
    })
  })

  describe("Distribute Tokens Test", function () {
    let decimals = 0
    it("Should test to distribute", async () => {
      const { auroraToken, deployer, accounts } = await deployContract()
      decimals = await auroraToken.decimals()

      for (let i = 0; i < 5; i++) {
        const receipeint = await accounts[i].getAddress()
        const amount = ethers.utils.parseUnits("1000", decimals)
        await auroraToken.connect(deployer).transfer(receipeint, amount)
        expect(await auroraToken.balanceOf(receipeint)).to.equal(amount)
      }
    })
  })

  describe("Wait For Delay Freeze Test", function () {
    let decimals = 0

    it("Should test transfer after unfreeze delay", async () => {
      const { auroraToken, deployer, accounts } = await deployContract()
      decimals = await auroraToken.decimals()

      const receipeint1 = await accounts[0].getAddress()
      const amount = ethers.utils.parseUnits("1000", decimals)
      await auroraToken.connect(deployer).transfer(receipeint1, amount)

      await auroraToken.connect(deployer).freezeAll()
      const receipeint2 = await accounts[1].getAddress()
      await expect(auroraToken.connect(accounts[0]).transfer(receipeint2, amount)).to.be.revertedWith(
        "Transactions are paused"
      )

      await increaseTime(31 * 24 * 60 * 60) // passing 31 days
      await auroraToken.connect(accounts[0]).transfer(receipeint2, amount)
    })
  })
})
