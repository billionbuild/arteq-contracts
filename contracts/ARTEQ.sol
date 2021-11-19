//
// Copyright (C) 2021 BillionBuild (2B) Team. Reproduction in whole or in part
// without written permission is prohibited. All rights reserved.
//
// SPDX-License-Identifier: GNU General Public License v3.0

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./IarteQTokens.sol";

/// @author Kam Amini <kam@2b.team> <kam.cpp@gmail.com>
///
/// @title ARTEQ token; the main asset in artèQ Investment Fund ecosystem
///
/// @notice Use at your own risk
contract ARTEQ is Context, ERC165, IERC20Metadata {

    uint256 public constant ARTEQTokenId = 1;

    address private _adminAccount;
    address private _arteQTokensContract;

    modifier onlyAdmin() {
        require(_msgSender() == _adminAccount, "ARTEQ: must be admin");
        _;
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC165) returns (bool) {
        return
            interfaceId == type(IERC20).interfaceId ||
            interfaceId == type(IERC20Metadata).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    constructor(address arteQTokensContract) {
        _adminAccount = _msgSender();
        _arteQTokensContract = arteQTokensContract;
    }

    function name() public view virtual override returns (string memory) {
        return "arteQ Investment Fund Token";
    }

    function symbol() public view virtual override returns (string memory) {
        return "ARTEQ";
    }

    function decimals() public view virtual override returns (uint8) {
        return 0;
    }

    function totalSupply() public view virtual override returns (uint256) {
        return IarteQTokens(_arteQTokensContract).compatTotalSupply(_msgSender(), ARTEQTokenId);
    }

    function balanceOf(address account) public view virtual override returns (uint256) {
        return IarteQTokens(_arteQTokensContract).compatBalanceOf(_msgSender(), account, ARTEQTokenId);
    }

    function transfer(address recipient, uint256 amount) public virtual override returns (bool) {
        IarteQTokens(_arteQTokensContract).compatTransfer(_msgSender(), recipient, ARTEQTokenId, amount);
        emit Transfer(_msgSender(), recipient, amount);
        return true;
    }

    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) public virtual override returns (bool) {
        IarteQTokens(_arteQTokensContract).compatTransferFrom(_msgSender(), sender, recipient, ARTEQTokenId, amount);
        emit Transfer(sender, recipient, amount);
        return true;
    }

    function allowance(address owner, address spender) public view virtual override returns (uint256) {
        return IarteQTokens(_arteQTokensContract).compatAllowance(_msgSender(), owner, spender);
    }

    function approve(address spender, uint256 amount) public virtual override returns (bool) {
        IarteQTokens(_arteQTokensContract).compatApprove(_msgSender(), spender, amount);
        emit Approval(_msgSender(), spender, amount);
        return true;
    }

    // If this contract gets a balance in some ERC20 contract after it's finished, then we can rescue it.
    function rescueTokens(IERC20 foreignToken, address to) external onlyAdmin {
        foreignToken.transfer(to, foreignToken.balanceOf(address(this)));
    }

    // If this contract gets a balance in some ERC721 contract after it's finished, then we can rescue it.
    function approveNFTRescue(IERC721 foreignNFT, address to) external onlyAdmin {
        foreignNFT.setApprovalForAll(to, true);
    }

    receive() external payable {
        revert("ARTEQ: cannot accept ether");
    }

    fallback() external payable {
        revert("ARTEQ: cannot accept ether");
    }
}
