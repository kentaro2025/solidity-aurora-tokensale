import fs from "fs"
import path from "path"

type ContractInfo = {
  address: string
  deployer: string
  datetime: string
  args: string[]
}

interface DeployedContracts {
  [key: string]: {
    [key: string]: ContractInfo
  }
}

const filePath = path.join(__dirname, "../../deployed-contracts.json")

function getCurrentFormattedDateTime(): string {
  const now = new Date()
  return (
    now.getFullYear() +
    "/" +
    ("0" + (now.getMonth() + 1)).slice(-2) +
    "/" +
    ("0" + now.getDate()).slice(-2) +
    " " +
    ("0" + now.getHours()).slice(-2) +
    ":" +
    ("0" + now.getMinutes()).slice(-2) +
    ":" +
    ("0" + now.getSeconds()).slice(-2)
  )
}

// Function to read contract information
export function readContractInfo(contractName: string, networkName: string): ContractInfo | null {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf8")
      const contracts: DeployedContracts = JSON.parse(data)

      if (contracts[contractName] && contracts[contractName][networkName]) {
        return contracts[contractName][networkName]
      }
    }

    console.log(`${contractName} not found.`)
    return null
  } catch (error) {
    console.error(`Failed to read the contract ${contractName}:`, error)
    return null
  }
}

// Function to write/update contract information
export function writeContractInfo(
  contractName: string,
  networkName: string,
  address: string,
  deployer: string,
  args: string[]
): void {
  try {
    if (!fs.existsSync(filePath)) {
      console.log("File does not exist, creating file...")
      fs.writeFileSync(filePath, "{}") // Create a new JSON file with empty object
    }

    const data = fs.readFileSync(filePath, "utf8")
    const contracts: DeployedContracts = JSON.parse(data)

    if (!contracts[contractName]) {
      contracts[contractName] = {}
    }

    const info: ContractInfo = {
      address: address,
      deployer: deployer,
      datetime: getCurrentFormattedDateTime(),
      args: args,
    }
    contracts[contractName][networkName] = info

    fs.writeFileSync(filePath, JSON.stringify(contracts, null, 4)) // writing back to JSON file
    console.log("Contract information updated successfully.")
  } catch (error) {
    console.error("Failed to write the contract information:", error)
  }
}
