# Submint Contracts

## Install

```
yarn install
```

## Test

```
# Run all tests
npx hardhat test
# Run a specific test
npx hardhat test --grep <test name>
# Get coverage
npx hardhat coverage
# Get gas report
REPORT_GAS=true npx hardhat test
```

## Deployment

### Testnet

Deploy contract
```
npx hardhat run scripts/deploy.ts --network goerli
```
Verify contract on Etherscan
```
npx hardhat verify <CONTRACT_ADDRESS> --network goerli --constructor-args ./scripts/argument-goerli.js
```

Azuki goerli address: 0x10b8b56d53bfa5e374f38e6c0830bad4ebee33e6
APE coin goerli address: 0xa68abbb4e36b18a16732cf6d42e826aaa27f52fc
