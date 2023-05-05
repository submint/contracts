//SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@ensdomains/ens-contracts/contracts/wrapper/NameWrapper.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract TestNFT is ERC721 {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    constructor(
        string memory name,
        string memory symbol
    ) ERC721(name, symbol) {}

    function awardItem(
        address player
    )
        public
        returns (
            // string memory tokenURI
            uint256
        )
    {
        _tokenIds.increment();

        uint256 newItemId = _tokenIds.current();
        _mint(player, newItemId);
        // _setTokenURI(newItemId, tokenURI);

        return newItemId;
    }
}
