// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

contract MockAggregatorV3Interface is AggregatorV3Interface {
    int private price;
    uint256 public constant override version = 0;
    uint8 public constant override decimals = 8;
    string public constant override description =
        "MockAggregatorV3Interface.sol";

    constructor(int _price) {
        price = _price;
    }

    function setPrice(int _price) public {
        price = _price;
    }

    function latestRoundData()
        public
        view
        override
        returns (uint80, int256, uint256, uint256, uint80)
    {
        return (0, price, 0, 0, 0);
    }

    function getRoundData(
        uint80 _roundId
    ) external pure override returns (uint80, int, uint, uint, uint80) {
        return (0, 0, 0, 0, 0);
    }
}
