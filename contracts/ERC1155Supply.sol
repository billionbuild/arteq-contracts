//
// Copyright (C) 2021 BillionBuild (2B) Team. Reproduction in whole or in part
// without written permission is prohibited. All rights reserved.
//
// SPDX-License-Identifier: MIT
// Based on OpenZeppelin Contracts v4.3.2 (token/ERC1155/extensions/ERC1155Supply.sol)

pragma solidity ^0.8.0;

import "./ERC1155.sol";

/**
 * @author Modified by Kam Amini <kam@2b.team> <kam.cpp@gmail.com>
 *
 * @notice Use at your own risk
 *
 * @dev Extension of ERC1155 that adds tracking of total supply per id.
 *
 * Useful for scenarios where Fungible and Non-fungible tokens have to be
 * clearly identified. Note: While a totalSupply of 1 might mean the
 * corresponding is an NFT, there is no guarantees that no other token with the
 * same id are not going to be minted.
 *
 * Note: 2B has modified the original code to cover its needs as
 * part of artèQ Investment Fund ecosystem
 */
abstract contract ERC1155Supply is ERC1155 {
    mapping(uint256 => uint256) private _totalSupply;

    /**
     * @dev Total amount of tokens in with a given id.
     */
    function totalSupply(uint256 id) public view virtual returns (uint256) {
        return _totalSupply[id];
    }

    /**
     * @dev Indicates whether any token exist with a given id, or not.
     */
    function exists(uint256 id) public view virtual returns (bool) {
        return ERC1155Supply.totalSupply(id) > 0;
    }

    /**
     * @dev See {ERC1155-_beforeTokenTransfer}.
     */
    function _beforeTokenTransfer(
        address operator,
        address from,
        address to,
        uint256 id,
        uint256[] memory amounts,
        bytes memory data
    ) internal virtual override {
        super._beforeTokenTransfer(operator, from, to, id, amounts, data);

        if (from == address(0)) {
            _totalSupply[id] += amounts[0];
        }

        if (to == address(0)) {
            _totalSupply[id] -= amounts[0];
        }
    }
}
