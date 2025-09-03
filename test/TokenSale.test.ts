import chai, { expect } from "chai"
import hre, { ethers } from "hardhat"

const usdtAddress = "0xdac17f958d2ee523a2206206994597c13d831ec7" // ethereum mainnet
const usdcAddress = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48" // ethereum mainnet
const usdtHolder = "0xF977814e90dA44bFA03b6295A0616a897441aceC" // binance 8
const usdcHolder = "0xAe2D4617c862309A3d75A0fFB358c7a5009c673F" // kraken 10

const increaseTime = async (secondsToIncrease: number) => {
  await hre.ethers.provider.send("evm_increaseTime", [secondsToIncrease])
  await hre.ethers.provider.send("evm_mine", [])
}

const depositStableCoinToSinger = async (stableCoin: string, holder: string, recipient: string) => {
  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [holder],
  })
  const signer = await ethers.getSigner(holder)

  // USDT / USDC contract
  const stableCoinContract = await ethers.getContractAt("IERC20", stableCoin, signer)

  // Mint new USDT / USDC to your test account
  await stableCoinContract.transfer(recipient, ethers.utils.parseUnits("10000", 6))
}

const getStableToken = async (address: string, signer: any) => {
  return await ethers.getContractAt("IERC20", address, signer)
}

describe("Token Sale", function () {
  async function deployContract() {
    const [deployer, ...accounts] = await ethers.getSigners()
    const AuroraFoundation = await ethers.getContractFactory("AuroraFoundationToken")
    const auroraToken = await AuroraFoundation.deploy("Aurora Foundation Token", "AFT")
    await auroraToken.deployed()

    const TokenSaleContract = await ethers.getContractFactory("TokenSale")
    const tokenSaleContract = await TokenSaleContract.deploy(auroraToken.address, accounts[3].address)
    await tokenSaleContract.deployed()

    return { auroraToken, tokenSaleContract, deployer, accounts }
  }

  describe("Deploy the contract", function () {
    it("Should be deployed correctly", async () => {
      const { auroraToken, tokenSaleContract, deployer, accounts } = await deployContract()
      expect(await auroraToken.name()).to.equal("Aurora Foundation Token")
      expect(await auroraToken.symbol()).to.equal("AFT")
    })
  })

  describe("Test TokenSale contract", function () {
    let auroraToken: any
    let tokenSaleContract: any
    let deployer: any
    let accounts: any
    let decimals = 0
    let decimalsStable = 0
    let decimalsTokenRate = 0
    const usdtRate = "0.96663"
    const usdcRate = "0.06666"

    before(async function () {
      const deployedInfo = await deployContract()
      auroraToken = deployedInfo.auroraToken
      tokenSaleContract = deployedInfo.tokenSaleContract
      deployer = deployedInfo.deployer
      accounts = deployedInfo.accounts
      decimals = await auroraToken.decimals()
      decimalsStable = 6
      decimalsTokenRate = 6

      await depositStableCoinToSinger(usdtAddress, usdtHolder, accounts[0].address)
      await depositStableCoinToSinger(usdcAddress, usdcHolder, accounts[0].address)
    })

    it("Should test add payment tokens with prices", async () => {
      const paymentTokens = [usdtAddress, usdcAddress]
      const usdtPrice = ethers.utils.parseUnits(usdtRate, decimalsTokenRate)
      const usdcPrice = ethers.utils.parseUnits(usdcRate, decimalsTokenRate)
      const paymentPrices = [usdtPrice, usdcPrice]
      await tokenSaleContract.connect(deployer).addPaymentTokens(paymentTokens, paymentPrices)

      const addedTokens = await tokenSaleContract.getAllPaymentTokens()
      expect(addedTokens.length).to.be.equal(paymentTokens.length)
    })

    it("Should test revert cases in adding payment tokens", async () => {
      const usdtPrice = ethers.utils.parseUnits(usdtRate, decimalsTokenRate)
      const usdcPrice = ethers.utils.parseUnits(usdcRate, decimalsTokenRate)
      const paymentPrices = [usdtPrice, usdcPrice]
      await expect(
        tokenSaleContract.connect(deployer).addPaymentTokens([usdtAddress, usdtAddress, usdcAddress], paymentPrices)
      ).to.revertedWith("InvalidTokensAndPricesLength")

      await expect(
        tokenSaleContract.connect(deployer).addPaymentTokens([ethers.constants.AddressZero, usdcAddress], paymentPrices)
      ).to.revertedWith("InvalidAddress")

      await expect(
        tokenSaleContract.connect(deployer).addPaymentTokens([usdtAddress, usdcAddress], [0, 0])
      ).to.revertedWith("InvalidPaymentTokenPrice")

      await expect(
        tokenSaleContract.connect(deployer).addPaymentTokens([usdtAddress, usdtAddress], paymentPrices)
      ).to.revertedWith("AlreadyAddedPaymentToken")

      const paymentTokens = []
      paymentPrices.length = 0
      for (let i = 0; i < 100; i++) {
        paymentTokens.push(usdtAddress)
        paymentPrices.push(usdtPrice)
      }
      await expect(tokenSaleContract.connect(deployer).addPaymentTokens(paymentTokens, paymentPrices)).to.revertedWith(
        "PaymentTokensExceeded"
      )
    })

    it("Should test deposit sale token to contract", async () => {
      const totalBalance = await auroraToken.balanceOf(deployer.address)
      await auroraToken.connect(deployer).transfer(tokenSaleContract.address, totalBalance)
      const liquidityBalance = await auroraToken.balanceOf(tokenSaleContract.address)

      expect(totalBalance).to.be.equal(liquidityBalance)
    })

    it("Should test start token sale", async () => {
      await expect(tokenSaleContract.connect(deployer).startStopSale(true)).to.be.emit(
        tokenSaleContract,
        "ChangedTokenSaleActive"
      )

      expect(await tokenSaleContract.saleActive()).to.be.equal(true)
    })

    it("Should test calculate auf token amount from payment token amount", async () => {
      const inputAmount = 100
      const payBalance = ethers.utils.parseUnits(inputAmount.toString(), decimalsStable) // usdt decimals is 6, 100 USDT or USDC

      let aufAmount = await tokenSaleContract.calculateOutputAmount(usdtAddress, payBalance)
      let compareAmount = inputAmount / parseFloat(usdtRate)
      expect(compareAmount.toFixed(8)).to.be.equal(parseFloat(ethers.utils.formatEther(aufAmount)).toFixed(8))
      console.log(`\tUSDT: Amount-100, AUF Amount-${ethers.utils.formatEther(aufAmount)}`)

      aufAmount = await tokenSaleContract.calculateOutputAmount(usdcAddress, payBalance)
      compareAmount = inputAmount / parseFloat(usdcRate)
      expect(compareAmount.toFixed(8)).to.be.equal(parseFloat(ethers.utils.formatEther(aufAmount)).toFixed(8))
      console.log(`\tUSDC: Amount-100, AUF Amount-${ethers.utils.formatEther(aufAmount)}`)
    })

    it("Should test calculate usdt/usdc input amount", async () => {
      const outputAmount = 1
      const aufAmount = ethers.utils.parseUnits(outputAmount.toString(), 18) // auf token decimals is 18

      const usdtAmount = await tokenSaleContract.calculateInputAmount(usdtAddress, aufAmount)
      let compareAmount = outputAmount * parseFloat(usdtRate)
      expect(compareAmount.toFixed(8)).to.be.equal(parseFloat(ethers.utils.formatUnits(usdtAmount, 6)).toFixed(8))
      console.log(`\tUSDT: AUF Amount-1, USDT Amount-${ethers.utils.formatUnits(usdtAmount, 6)}`)

      const usdcAmount = await tokenSaleContract.calculateInputAmount(usdcAddress, aufAmount)
      compareAmount = outputAmount * parseFloat(usdcRate)
      expect(compareAmount.toFixed(8)).to.be.equal(parseFloat(ethers.utils.formatUnits(usdcAmount, 6)).toFixed(8))
      console.log(`\tUSDC: AUF Amount-1, USDC Amount-${ethers.utils.formatUnits(usdcAmount, 6)}`)
    })

    it("Should test buy token using USDT", async () => {
      const buyer = accounts[0]
      const usdtContract = await getStableToken(usdtAddress, buyer)

      const payBalance = ethers.utils.parseUnits("100", 6)
      // exclude the receipient address to receive sale token
      await auroraToken.connect(deployer).excludeAddress(buyer.address)

      // holder approves to transfer USDT by token sale contract
      await usdtContract.approve(tokenSaleContract.address, payBalance)

      await tokenSaleContract.connect(buyer).buyTokensWithInputAmount(usdtAddress, payBalance)
      const tokenBalance = ethers.utils.formatUnits(await auroraToken.balanceOf(buyer.address), 18)
      const usdtBalance = ethers.utils.formatUnits(await usdtContract.balanceOf(buyer.address), 6)

      console.log(`\tBuy Token: ${tokenBalance}, Current USDT: ${usdtBalance}`)
    })

    it("Should test buy token using USDC", async () => {
      const buyer = accounts[0]
      const usdcContract = await getStableToken(usdcAddress, buyer)

      const needBalance = ethers.utils.parseUnits("100", 18)
      // exclude the receipient address to receive sale token
      await auroraToken.connect(deployer).excludeAddress(buyer.address)

      const payBalance = await tokenSaleContract.calculateInputAmount(usdcAddress, needBalance)

      // holder approves to transfer USDC by token sale contract
      await usdcContract.approve(tokenSaleContract.address, payBalance)

      await tokenSaleContract.connect(buyer).buyTokens(usdcAddress, needBalance)
      const tokenBalance = ethers.utils.formatUnits(await auroraToken.balanceOf(buyer.address), 18)
      const usdcBalance = ethers.utils.formatUnits(await usdcContract.balanceOf(buyer.address), 6)

      console.log(`\tBuy Token: ${tokenBalance}, Current USDC: ${usdcBalance}`)
    })

    it("Should test revert cases in buying token", async () => {
      const buyer = accounts[0]
      const usdcContract = await getStableToken(usdcAddress, buyer)

      await expect(tokenSaleContract.connect(buyer).buyTokens(usdcAddress, 0)).to.revertedWith("InvalidNumOfTokens")

      const needBalance = ethers.utils.parseUnits("100", 18)
      // exclude the receipient address to receive sale token
      await auroraToken.connect(deployer).excludeAddress(buyer.address)

      const payBalance = await tokenSaleContract.calculateInputAmount(usdcAddress, needBalance)
      await expect(
        tokenSaleContract.connect(buyer).buyTokens(ethers.constants.AddressZero, payBalance)
      ).to.revertedWith("NotAddedPaymentToken")

      await expect(tokenSaleContract.connect(buyer).buyTokens(usdcAddress, needBalance)).to.revertedWith(
        "ERC20: transfer amount exceeds allowance"
      )

      await usdcContract.approve(tokenSaleContract.address, payBalance)
      await tokenSaleContract.connect(buyer).buyTokens(usdcAddress, needBalance)

      const tokenBalance = ethers.utils.formatUnits(await auroraToken.balanceOf(buyer.address), 18)
      const usdcBalance = ethers.utils.formatUnits(await usdcContract.balanceOf(buyer.address), 6)

      console.log(`\tBuy Token: ${tokenBalance}, Current USDC: ${usdcBalance}`)
    })
  })
})
