//SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

// These imports are here to force Hardhat to compile contracts we depend on in our tests but don't need anywhere else.

import "@ensdomains/ens-contracts/contracts/ethregistrar/BaseRegistrarImplementation.sol";
import "@ensdomains/ens-contracts/contracts/ethregistrar/ExponentialPremiumPriceOracle.sol";
import "@ensdomains/ens-contracts/contracts/ethregistrar/ETHRegistrarController.sol";
import "@ensdomains/ens-contracts/contracts/registry/ENSRegistry.sol";
import "@ensdomains/ens-contracts/contracts/reverseRegistrar/ReverseRegistrar.sol";
import "@ensdomains/ens-contracts/contracts/wrapper/StaticMetadataService.sol";
