//
// Copyright (C) 2021 BillionBuild (2B) Team. Reproduction in whole or in part
// without written permission is prohibited. All rights reserved.
//
// SPDX-License-Identifier: GNU General Public License v3.0

pragma solidity ^0.8.0;

/// @author Kam Amini <kam@2b.team> <kam.cpp@gmail.com>
///
/// @title An interface which allows ERC-20 tokens to interact with the
/// main ERC-1155 contract
///
/// @notice Use at your own risk
interface IarteQTokens {
    function compatBalanceOf(address origin, address account, uint256 tokenId) external view returns (uint256);
    function compatTotalSupply(address origin, uint256 tokenId) external view returns (uint256);
    function compatTransfer(address origin, address to, uint256 tokenId, uint256 amount) external;
    function compatTransferFrom(address origin, address from, address to, uint256 tokenId, uint256 amount) external;
    function compatAllowance(address origin, address account, address operator) external view returns (uint256);
    function compatApprove(address origin, address operator, uint256 amount) external;
}

