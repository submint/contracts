import { ethers } from "hardhat";
import { network } from 'hardhat';

const goerliArguments: string[] = require('./argument-goerli')
const mainnetArguments: string[] = require('./argument-mainnet')

async function main() {
  const chainIdHex = await network.provider.send('eth_chainId');
  const args = chainIdHex === '0x1' ? mainnetArguments : goerliArguments;

  console.log(args)
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString())

  const SubnameMinterV1 = await ethers.getContractFactory("SubnameMinterV1");
  const controller = await SubnameMinterV1.deploy(args[0], args[1], args[2], args[3]);
  await controller.deployed()
  console.log(`Deployed to ${controller.address}`)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
