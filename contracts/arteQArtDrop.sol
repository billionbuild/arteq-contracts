/*
 * This file is part of the contracts written for artèQ Investment Fund (https://github.com/billionbuild/arteq-contracts).
 * Copyright (c) 2021 BillionBuild (2B) Team.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, version 3.
 *
 * This program is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */
// SPDX-License-Identifier: GNU General Public License v3.0

pragma solidity 0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "./IarteQTaskFinalizer.sol";

/// @author Kam Amini <kam@arteq.io> <kam@2b.team> <kam.cpp@gmail.com>
///
/// @notice Use at your own risk
contract arteQArtDrop is ERC721URIStorage {

    uint256 public constant MAX_NR_TOKENS_PER_ACCOUNT = 5;

    // Counter for token IDs
    uint256 private _tokenIdCounter;

    address private _adminContract;

    uint256 private _pricePerToken;
    uint256 private _serviceFee;

    string private _defaultTokenURI;

    // The current art drop phase. It can have the following values:
    //
    //   0: Locked / Read-only mode
    //   1: Whitelisting the accounts
    //   2: Reservation / Purchase phase
    //   3: Minting phase
    //   4: Distribution of the tokens / Drop phase
    //
    // * Only admin accounts with a quorum of votes can change the
    //   current phase.
    // * Some functions only work in certain phases.
    // * When the 4th phase (last phase) is finished, the contract
    //   will be put back into locked mode (phase 0).
    // * Admins can only advance/retreat the current phase (movements of +/-1).
    int256 private _phase;

    // A mapping from the whitelisted addresses to the maximum number of tokens they can obtain
    mapping(address => uint256) _whitelistedAccounts;

    // An operator which is allowed to perform certain operations such as adding whitelisted
    // accounts, removing them, or doing the token reservation for credit card payments. These
    // accounts can only be defined by a quorom of votes among admins.
    mapping(address => uint256) _operators;

    event WhitelistedAccountAdded(address operator, address account, uint256 maxNrOfTokensToObtain);
    event WhitelistedAccountRemoved(address operator, address account);
    event PricePerTokenChanged(address operator, uint256 adminTaskId, uint256 oldValue, uint256 newValue);
    event ServiceFeeChanged(address operator, uint256 adminTaskId, uint256 oldValue, uint256 newValue);
    event PhaseChanged(address operator, uint256 adminTaskId, int256 oldValue, int256 newValue);
    event OperatorAdded(address operator, uint256 adminTaskId, address toBeOperatorAccount);
    event OperatorRemoved(address operator, uint256 adminTaskId, address toBeRemovedOperatorAccount);
    event DefaultTokenURIChanged(address operator, uint256 adminTaskId, string oldValue, string newValue);
    event TokensReserved(address operator, address target, uint256 nrOfTokensToReserve);
    event Deposited(address operator, uint256 priceOfTokens, uint256 serviceFee, uint256 totalValue);
    event TokenURIChanged(address operator, uint256 tokenId, string oldValue, string newValue);

    modifier adminApprovalRequired(uint256 adminTaskId) {
        _;
        // This must succeed otherwise the tx gets reverted
        IarteQTaskFinalizer(_adminContract).finalizeTask(msg.sender, adminTaskId);
    }

    modifier onlyLockedPhase() {
        require(_phase == 0, "arteQArtDrop: only callable in locked phase");
        _;
    }

    modifier onlyWhitelistingPhase() {
        require(_phase == 1, "arteQArtDrop: only callable in whitelisting phase");
        _;
    }

    modifier onlyReservationPhase() {
        require(_phase == 2, "arteQArtDrop: only callable in reservation phase");
        _;
    }

    modifier onlyMintingPhase() {
        require(_phase == 3, "arteQArtDrop: only callable in minting phase");
        _;
    }

    modifier onlyDistributionPhase() {
        require(_phase == 4, "arteQArtDrop: only callable in distribution phase");
        _;
    }

    modifier onlyWhenNotLocked() {
        require(_phase > 0, "arteQArtDrop: only callable in not-locked phases");
        _;
    }

    modifier onlyWhenNotInReservationPhase() {
        require(_phase != 2, "arteQArtDrop: only callable in a non-reservation phase");
        _;
    }

    modifier onlyOperator() {
        require(_operators[msg.sender] > 0, "arteQArtDrop: not an operator account");
        _;
    }

    modifier onlyWhitelisted() {
        require(_whitelistedAccounts[msg.sender] > 0, "arteQArtDrop: not a whitelisted account");
        _;
    }

    constructor(
        address adminContract,
        string memory name,
        string memory symbol,
        uint256 initialPricePerToken,
        uint256 initialServiceFee,
        string memory initialDefaultTokenURI
    ) ERC721(name, symbol) {

        require(adminContract != address(0), "arteQArtDrop: admin contract cannot be zero");
        require(adminContract.code.length > 0, "arteQArtDrop: non-contract account for admin contract");
        require(initialPricePerToken > 0, "arteQArtDrop: zero initial price per token");
        require(bytes(initialDefaultTokenURI).length > 0, "arteQArtDrop: invalid default token uri");

        _adminContract = adminContract;

        _pricePerToken = initialPricePerToken;
        emit PricePerTokenChanged(msg.sender, 0, 0, _pricePerToken);

        _serviceFee = initialServiceFee;
        emit ServiceFeeChanged(msg.sender, 0, 0, _serviceFee);

        _defaultTokenURI = initialDefaultTokenURI;
        emit DefaultTokenURIChanged(msg.sender, 0, "", _defaultTokenURI);

        _tokenIdCounter = 1;

        // Contract is locked/read-only by default.
        _phase = 0;
    }

    function pricePerToken() external view returns (uint256) {
        return _pricePerToken;
    }

    function serviceFee() external view returns (uint256) {
        return _serviceFee;
    }

    function defaultTokenURI() external view returns (string memory) {
        return _defaultTokenURI;
    }

    function phase() external view returns (int256) {
        return _phase;
    }

    function setPricePerToken(uint256 adminTaskId, uint256 newValue) external onlyWhenNotLocked onlyWhenNotInReservationPhase adminApprovalRequired(adminTaskId) {
        require(newValue > 0, "arteQArtDrop: new price cannot be zero");
        uint256 oldValue = _pricePerToken;
        _pricePerToken = newValue;
        emit PricePerTokenChanged(msg.sender, adminTaskId, oldValue, _pricePerToken);
    }

    function setServiceFee(uint256 adminTaskId, uint256 newValue) external onlyWhenNotLocked onlyWhenNotInReservationPhase adminApprovalRequired(adminTaskId) {
        require(newValue > 0, "arteQArtDrop: new price cannot be zero");
        uint256 oldValue = _serviceFee;
        _serviceFee = newValue;
        emit ServiceFeeChanged(msg.sender, adminTaskId, oldValue, _serviceFee);
    }

    function setDefaultTokenURI(uint256 adminTaskId, string memory newValue) external onlyWhenNotLocked onlyWhenNotInReservationPhase adminApprovalRequired(adminTaskId) {
        require(bytes(newValue).length > 0, "arteQArtDrop: empty string");
        string memory oldValue = _defaultTokenURI;
        _defaultTokenURI = newValue;
        emit DefaultTokenURIChanged(msg.sender, adminTaskId, oldValue, _defaultTokenURI);
    }

    function retreatPhase(uint256 adminTaskId) external adminApprovalRequired(adminTaskId) {
        int256 oldPhase = _phase;
        _phase -= 1;
        if (_phase == -1) {
            _phase = 4;
        }
        emit PhaseChanged(msg.sender, adminTaskId, oldPhase, _phase);
    }

    function advancePhase(uint256 adminTaskId) external adminApprovalRequired(adminTaskId) {
        int256 oldPhase = _phase;
        _phase += 1;
        if (_phase == 5) {
            _phase = 0;
        }
        emit PhaseChanged(msg.sender, adminTaskId, oldPhase, _phase);
    }

    function addOperator(uint256 adminTaskId, address toBeOperatorAccount) external adminApprovalRequired(adminTaskId) {
        require(toBeOperatorAccount != address(0), "arteQArtDrop: cannot set zero as operator");
        require(_operators[toBeOperatorAccount] == 0, "arteQArtDrop: already an operator");
        _operators[toBeOperatorAccount] = 1;
        emit OperatorAdded(msg.sender, adminTaskId, toBeOperatorAccount);
    }

    function removeOperator(uint256 adminTaskId, address toBeRemovedOperatorAccount) external adminApprovalRequired(adminTaskId) {
        require(toBeRemovedOperatorAccount != address(0), "arteQArtDrop: cannot remove zero as operator");
        require(_operators[toBeRemovedOperatorAccount] == 1, "arteQArtDrop: not an operator");
        _operators[toBeRemovedOperatorAccount] = 0;
        emit OperatorRemoved(msg.sender, adminTaskId, toBeRemovedOperatorAccount);
    }

    function addToWhitelistedAccounts(address[] memory accounts, uint[] memory listOfMaxNrOfTokensToObtain) external onlyOperator onlyWhitelistingPhase {
        require(accounts.length > 0, "arteQArtDrop: zero length");
        require(accounts.length == listOfMaxNrOfTokensToObtain.length, "arteQArtDrop: invalid lengths");
        for (uint256 i = 0; i < accounts.length; i++) {
            address account = accounts[i];
            uint256 maxNrOfTokensToObtain = listOfMaxNrOfTokensToObtain[i];

            require(account != address(0), "arteQArtDrop: cannot whitelist zero address");
            require(maxNrOfTokensToObtain >= 1 && maxNrOfTokensToObtain <= MAX_NR_TOKENS_PER_ACCOUNT, "arteQArtDrop: invalid nr of tokens to obtain");
            require(account.code.length == 0, "arteQArtDrop: cannot whitelist a contract");
            require(_whitelistedAccounts[account] == 0, "arteQArtDrop: already whitelisted");

            _whitelistedAccounts[account] = maxNrOfTokensToObtain;

            emit WhitelistedAccountAdded(msg.sender, account, maxNrOfTokensToObtain);
        }
    }

    function removeFromWhitelistedAccounts(address[] memory accounts) external onlyOperator onlyWhitelistingPhase {
        require(accounts.length > 0, "arteQArtDrop: zero length");
        for (uint256 i = 0; i < accounts.length; i++) {
            address account = accounts[i];

            require(account != address(0), "arteQArtDrop: cannot remove zero address");
            require(_whitelistedAccounts[account] > 0, "arteQArtDrop: account is not whitelisted");

            _whitelistedAccounts[account] = 0;

            emit WhitelistedAccountRemoved(msg.sender, account);
        }
    }

    // Only callable by a whitelisted account
    //
    // * Account must have sent enough ETH to cover the price of all tokens + service fee
    // * Account cannot reserve more than what has been whitelisted for
    function reserveTokens(uint256 nrOfTokensToReserve) external payable onlyWhitelisted onlyReservationPhase {
        require(msg.value > 0, "arteQArtDrop: zero funds");
        require(nrOfTokensToReserve > 0, "arteQArtDrop: zero tokens to reserve");
        require(nrOfTokensToReserve <= _whitelistedAccounts[msg.sender], "arteQArtDrop: exceeding the reservation allowance");

        // Handle payments
        uint256 priceOfTokens = nrOfTokensToReserve * _pricePerToken;
        uint256 priceToPay = priceOfTokens + _serviceFee;
        require(msg.value >= priceToPay, "arteQArtDrop: insufficient funds");
        uint256 remainder = msg.value - priceToPay;
        if (remainder > 0) {
            (bool success, ) = msg.sender.call{value: remainder}(new bytes(0));
            require(success, "arteQArtDrop: failed to send the remainder");
        }
        emit Deposited(msg.sender, priceOfTokens, _serviceFee, priceToPay);

        _reserveTokens(msg.sender, nrOfTokensToReserve);
    }

    // This method is called by an operator to complete the reservation of fiat payments such as credit card, iDeal, etc.
    function reserveTokensForAccounts(address[] memory accounts, uint256[] memory listOfNrOfTokensToReserve) external onlyOperator {
        require(accounts.length > 0, "arteQArtDrop: zero length");
        require(accounts.length == listOfNrOfTokensToReserve.length, "arteQArtDrop: invalid lengths");
        for (uint256 i = 0; i < accounts.length; i++) {
            address account = accounts[i];
            uint256 nrOfTokensToReserve = listOfNrOfTokensToReserve[i];

            require(_whitelistedAccounts[account] > 0, "arteQArtDrop: not a whitelisted account");
            require(nrOfTokensToReserve <= _whitelistedAccounts[account], "arteQArtDrop: exceeding the reservation allowance");

            _reserveTokens(account, nrOfTokensToReserve);
        }
    }

    function updateTokenURIs(uint256[] memory tokenIds, string[] memory newTokenURIs) external onlyOperator onlyDistributionPhase {
        require(tokenIds.length > 0, "arteQArtDrop: zero length");
        require(tokenIds.length == newTokenURIs.length, "arteQArtDrop: invalid lengths");
        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 tokenId = tokenIds[i];
            string memory newTokenURI = newTokenURIs[i];

            string memory oldValue = tokenURI(tokenId);
            _setTokenURI(tokenId, newTokenURI);
            emit TokenURIChanged(msg.sender, tokenId, oldValue, newTokenURI);
        }
    }

    function _reserveTokens(address target, uint256 nrOfTokensToReserve) internal {
        for (uint256 i = 1; i <= nrOfTokensToReserve; i++) {
            uint256 newTokenId = _tokenIdCounter;
            _mint(target, newTokenId);
            _setTokenURI(newTokenId, _defaultTokenURI);
            emit TokenURIChanged(msg.sender, newTokenId, "", _defaultTokenURI);
            _tokenIdCounter += 1;
        }
        _whitelistedAccounts[msg.sender] -= nrOfTokensToReserve;
        emit TokensReserved(msg.sender, target, nrOfTokensToReserve);
    }
}
