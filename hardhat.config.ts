import "@nomicfoundation/hardhat-toolbox";
import { HardhatUserConfig } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";

require('dotenv').config()

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: '0.8.19',
        settings: {
          optimizer: {
            enabled: true,
            runs: 1500,
          },
        },
      },
    ],
  },
  networks: {
    mainnet: {
      url: process.env.MAIN_NET_URL || '',
      accounts: [process.env.MAINNET_PRIVATE_KEY || '']
    },
    goerli: {
      url: process.env.GOERLI_URL || '',
      accounts: [process.env.GOERLI_PRIVATE_KEY || '']
    },
    hardhat: {
      allowUnlimitedContractSize: true,
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || ''
  }
};

export default config;
