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

// TODO(kam): prevent transfer ether to contracts

/// @author Kam Amini <kam@arteq.io> <kam@2b.team> <kam.cpp@gmail.com>
///
/// @notice Use at your own risk
contract arteQArtDrop is ERC721URIStorage {

    uint256 public constant MAX_NR_TOKENS_PER_ACCOUNT = 5;

    int256 public constant LOCKED_STAGE = 0;
    int256 public constant WHITELISTING_STAGE = 2;
    int256 public constant RESERVATION_STAGE = 3;
    int256 public constant MINTING_STAGE = 4;
    int256 public constant DISTRIBUTION_STAGE = 5;

    // Counter for token IDs
    uint256 private _tokenIdCounter;

    address private _adminContract;

    // in wei
    uint256 private _pricePerToken;
    // in wei
    uint256 private _serviceFee;

    string private _defaultTokenURI;

    // The current art drop stage. It can have the following values:
    //
    //   0: Locked / Read-only mode
    //   2: Selection of the registered wallets (whitelisting)
    //   3: Reservation / Purchase stage
    //   4: Minting stage
    //   5: Distribution of the tokens / Drop stage
    //
    // * 1 is missing from the above list. That's to keep the off-chain
    //   and on-chain states in sync.
    // * Only admin accounts with a quorum of votes can change the
    //   current stage.
    // * Some functions only work in certain stages.
    // * When the 4th stage (last stage) is finished, the contract
    //   will be put back into locked mode (stage 0).
    // * Admins can only advance/retreat the current stage by movements of +1 or -1.
    int256 private _stage;

    // A mapping from the whitelisted addresses to the maximum number of tokens they can obtain
    mapping(address => uint256) _whitelistedAccounts;

    // Counts the number of whitelisted accounts
    uint256 _whitelistedAccountsCounter;

    // Counts the number of reserved tokens
    uint256 _reservedTokensCounter;

    // An operator which is allowed to perform certain operations such as adding whitelisted
    // accounts, removing them, or doing the token reservation for credit card payments. These
    // accounts can only be defined by a quorom of votes among admins.
    mapping(address => uint256) _operators;

    event WhitelistedAccountAdded(address doer, address account, uint256 maxNrOfTokensToObtain);
    event WhitelistedAccountRemoved(address doer, address account);
    event PricePerTokenChanged(address doer, uint256 adminTaskId, uint256 oldValue, uint256 newValue);
    event ServiceFeeChanged(address doer, uint256 adminTaskId, uint256 oldValue, uint256 newValue);
    event StageChanged(address doer, uint256 adminTaskId, int256 oldValue, int256 newValue);
    event OperatorAdded(address doer, uint256 adminTaskId, address toBeOperatorAccount);
    event OperatorRemoved(address doer, uint256 adminTaskId, address toBeRemovedOperatorAccount);
    event DefaultTokenURIChanged(address doer, uint256 adminTaskId, string newValue);
    event TokensReserved(address doer, address target, uint256 nrOfTokensToReserve);
    event Deposited(address doer, uint256 priceOfTokens, uint256 serviceFee, uint256 totalValue);
    event Returned(address doer, address target, uint256 returnedValue);
    event Withdrawn(address doer, address target, uint256 amount);
    event TokenURIChanged(address doer, uint256 tokenId, string newValue);
    event GenesisTokenURIChanged(address doer, uint256 adminTaskId, string newValue);

    modifier adminApprovalRequired(uint256 adminTaskId) {
        _;
        // This must succeed otherwise the tx gets reverted
        IarteQTaskFinalizer(_adminContract).finalizeTask(msg.sender, adminTaskId);
    }

    modifier onlyLockedStage() {
        require(_stage == LOCKED_STAGE, "arteQArtDrop: only callable in locked stage");
        _;
    }

    modifier onlyWhitelistingStage() {
        require(_stage == WHITELISTING_STAGE, "arteQArtDrop: only callable in whitelisting stage");
        _;
    }

    modifier onlyReservationStage() {
        require(_stage == RESERVATION_STAGE, "arteQArtDrop: only callable in reservation stage");
        _;
    }

    modifier onlyMintingStage() {
        require(_stage == MINTING_STAGE, "arteQArtDrop: only callable in minting stage");
        _;
    }

    modifier onlyDistributionStage() {
        require(_stage == DISTRIBUTION_STAGE, "arteQArtDrop: only callable in distribution stage");
        _;
    }

    modifier onlyWhenNotLocked() {
        require(_stage > 1, "arteQArtDrop: only callable in not-locked stages");
        _;
    }

    modifier onlyWhenNotInReservationStage() {
        require(_stage != RESERVATION_STAGE, "arteQArtDrop: only callable in a non-reservation stage");
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
        string memory initialDefaultTokenURI,
        string memory initialGenesisTokenURI
    ) ERC721(name, symbol) {

        require(adminContract != address(0), "arteQArtDrop: admin contract cannot be zero");
        require(adminContract.code.length > 0, "arteQArtDrop: non-contract account for admin contract");
        require(initialPricePerToken > 0, "arteQArtDrop: zero initial price per token");
        require(bytes(initialDefaultTokenURI).length > 0, "arteQArtDrop: invalid default token uri");
        require(bytes(initialGenesisTokenURI).length > 0, "arteQArtDrop: invalid genesis token uri");

        _adminContract = adminContract;

        _pricePerToken = initialPricePerToken;
        emit PricePerTokenChanged(msg.sender, 0, 0, _pricePerToken);

        _serviceFee = initialServiceFee;
        emit ServiceFeeChanged(msg.sender, 0, 0, _serviceFee);

        _defaultTokenURI = initialDefaultTokenURI;
        emit DefaultTokenURIChanged(msg.sender, 0, _defaultTokenURI);

        _tokenIdCounter = 1;

        _whitelistedAccountsCounter = 0;
        _reservedTokensCounter = 0;

        // Contract is locked/read-only by default.
        _stage = 0;
        emit StageChanged(msg.sender, 0, 0, _stage);

        // Mint genesis token. Contract will be the eternal owner of the genesis token.
        _mint(address(this), 0);
        _setTokenURI(0, initialGenesisTokenURI);
        emit GenesisTokenURIChanged(msg.sender, 0, initialGenesisTokenURI);
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

    function stage() external view returns (int256) {
        return _stage;
    }

    function nrOfWhitelistedAccounts() external view returns (uint256) {
        return _whitelistedAccountsCounter;
    }

    function nrOfReservedTokens() external view returns (uint256) {
        return _reservedTokensCounter;
    }

    function setPricePerToken(uint256 adminTaskId, uint256 newValue) external
      onlyWhenNotLocked
      onlyWhenNotInReservationStage
      adminApprovalRequired(adminTaskId) {
        require(newValue > 0, "arteQArtDrop: new price cannot be zero");
        uint256 oldValue = _pricePerToken;
        _pricePerToken = newValue;
        emit PricePerTokenChanged(msg.sender, adminTaskId, oldValue, _pricePerToken);
    }

    function setServiceFee(uint256 adminTaskId, uint256 newValue) external
      onlyWhenNotLocked
      onlyWhenNotInReservationStage
      adminApprovalRequired(adminTaskId) {
        require(newValue > 0, "arteQArtDrop: new price cannot be zero");
        uint256 oldValue = _serviceFee;
        _serviceFee = newValue;
        emit ServiceFeeChanged(msg.sender, adminTaskId, oldValue, _serviceFee);
    }

    function setDefaultTokenURI(uint256 adminTaskId, string memory newValue) external
      onlyWhenNotLocked
      onlyWhenNotInReservationStage
      adminApprovalRequired(adminTaskId) {
        require(bytes(newValue).length > 0, "arteQArtDrop: empty string");
        _defaultTokenURI = newValue;
        emit DefaultTokenURIChanged(msg.sender, adminTaskId, _defaultTokenURI);
    }

    function setGenesisTokenURI(uint256 adminTaskId, string memory newValue) external
      onlyLockedStage
      adminApprovalRequired(adminTaskId) {
        require(bytes(newValue).length > 0, "arteQArtDrop: empty string");
        _setTokenURI(0, newValue);
        emit GenesisTokenURIChanged(msg.sender, adminTaskId, newValue);
    }

    function retreatStage(uint256 adminTaskId) external
      adminApprovalRequired(adminTaskId) {
        int256 oldStage = _stage;
        _stage -= 1;
        if (_stage == -1) {
            _stage = 5;
        } else if (_stage == 1) {
            _stage = 0;
        }
        emit StageChanged(msg.sender, adminTaskId, oldStage, _stage);
    }

    function advanceStage(uint256 adminTaskId) external
      adminApprovalRequired(adminTaskId) {
        int256 oldStage = _stage;
        _stage += 1;
        if (_stage == 6) {
            _stage = 0;
        } else if (_stage == 1) {
            _stage = 2;
        }
        emit StageChanged(msg.sender, adminTaskId, oldStage, _stage);
    }

    function addOperator(uint256 adminTaskId, address toBeOperatorAccount) external
      adminApprovalRequired(adminTaskId) {
        require(toBeOperatorAccount != address(0), "arteQArtDrop: cannot set zero as operator");
        require(_operators[toBeOperatorAccount] == 0, "arteQArtDrop: already an operator");
        _operators[toBeOperatorAccount] = 1;
        emit OperatorAdded(msg.sender, adminTaskId, toBeOperatorAccount);
    }

    function removeOperator(uint256 adminTaskId, address toBeRemovedOperatorAccount) external
      adminApprovalRequired(adminTaskId) {
        require(toBeRemovedOperatorAccount != address(0), "arteQArtDrop: cannot remove zero as operator");
        require(_operators[toBeRemovedOperatorAccount] == 1, "arteQArtDrop: not an operator");
        _operators[toBeRemovedOperatorAccount] = 0;
        emit OperatorRemoved(msg.sender, adminTaskId, toBeRemovedOperatorAccount);
    }

    function isOperator(address account) external view returns(bool) {
        return _operators[account] == 1;
    }

    function addToWhitelistedAccounts(
      address[] memory accounts,
      uint[] memory listOfMaxNrOfTokensToObtain
    ) external
      onlyOperator
      onlyWhitelistingStage {
        require(accounts.length > 0, "arteQArtDrop: zero length");
        require(listOfMaxNrOfTokensToObtain.length > 0, "arteQArtDrop: zero length");
        require(accounts.length == listOfMaxNrOfTokensToObtain.length, "arteQArtDrop: different lengths");
        for (uint256 i = 0; i < accounts.length; i++) {
            address account = accounts[i];
            uint256 maxNrOfTokensToObtain = listOfMaxNrOfTokensToObtain[i];

            require(account != address(0), "arteQArtDrop: cannot whitelist zero address");
            require(maxNrOfTokensToObtain >= 1 && maxNrOfTokensToObtain <= MAX_NR_TOKENS_PER_ACCOUNT,
                "arteQArtDrop: invalid nr of tokens to obtain");
            require(account.code.length == 0, "arteQArtDrop: cannot whitelist a contract");
            require(_whitelistedAccounts[account] == 0, "arteQArtDrop: already whitelisted");

            _whitelistedAccounts[account] = maxNrOfTokensToObtain;
            _whitelistedAccountsCounter += 1;

            emit WhitelistedAccountAdded(msg.sender, account, maxNrOfTokensToObtain);
        }
    }

    function removeFromWhitelistedAccounts(address[] memory accounts) external
      onlyOperator
      onlyWhitelistingStage {
        require(accounts.length > 0, "arteQArtDrop: zero length");
        for (uint256 i = 0; i < accounts.length; i++) {
            address account = accounts[i];

            require(account != address(0), "arteQArtDrop: cannot remove zero address");
            require(_whitelistedAccounts[account] > 0, "arteQArtDrop: account is not whitelisted");

            _whitelistedAccounts[account] = 0;
            _whitelistedAccountsCounter -= 1;

            emit WhitelistedAccountRemoved(msg.sender, account);
        }
    }

    function whitelistedNrOfTokens(address account) external view returns (uint256) {
        return _whitelistedAccounts[account];
    }

    // Only callable by a whitelisted account
    //
    // * Account must have sent enough ETH to cover the price of all tokens + service fee
    // * Account cannot reserve more than what has been whitelisted for
    function reserveTokens(uint256 nrOfTokensToReserve) external payable
      onlyWhitelisted
      onlyReservationStage {
        require(msg.value > 0, "arteQArtDrop: zero funds");
        require(nrOfTokensToReserve > 0, "arteQArtDrop: zero tokens to reserve");
        require(nrOfTokensToReserve <= _whitelistedAccounts[msg.sender],
              "arteQArtDrop: exceeding the reservation allowance");

        // Handle payments
        uint256 priceOfTokens = nrOfTokensToReserve * _pricePerToken;
        uint256 priceToPay = priceOfTokens + _serviceFee;
        require(msg.value >= priceToPay, "arteQArtDrop: insufficient funds");
        uint256 remainder = msg.value - priceToPay;
        if (remainder > 0) {
            (bool success, ) = msg.sender.call{value: remainder}(new bytes(0));
            require(success, "arteQArtDrop: failed to send the remainder");
            emit Returned(msg.sender, msg.sender, remainder);
        }
        emit Deposited(msg.sender, priceOfTokens, _serviceFee, priceToPay);

        _reserveTokens(msg.sender, nrOfTokensToReserve);
    }

    // This method is called by an operator to complete the reservation of fiat payments
    // such as credit card, iDeal, etc.
    function reserveTokensForAccounts(
      address[] memory accounts,
      uint256[] memory listOfNrOfTokensToReserve
    ) external
      onlyOperator
      onlyReservationStage {
        require(accounts.length > 0, "arteQArtDrop: zero length");
        require(listOfNrOfTokensToReserve.length > 0, "arteQArtDrop: zero length");
        require(accounts.length == listOfNrOfTokensToReserve.length, "arteQArtDrop: different lengths");
        for (uint256 i = 0; i < accounts.length; i++) {
            address account = accounts[i];
            uint256 nrOfTokensToReserve = listOfNrOfTokensToReserve[i];

            require(account != address(0), "arteQArtDrop: cannot be zero address");
            require(_whitelistedAccounts[account] > 0, "arteQArtDrop: not a whitelisted account");
            require(nrOfTokensToReserve <= _whitelistedAccounts[account],
                  "arteQArtDrop: exceeding the reservation allowance");

            _reserveTokens(account, nrOfTokensToReserve);
        }
    }

    function updateTokenURIs(uint256[] memory tokenIds, string[] memory newTokenURIs) external
      onlyOperator
      onlyDistributionStage {
        require(tokenIds.length > 0, "arteQArtDrop: zero length");
        require(newTokenURIs.length > 0, "arteQArtDrop: zero length");
        require(tokenIds.length == newTokenURIs.length, "arteQArtDrop: different lengths");
        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 tokenId = tokenIds[i];
            string memory newTokenURI = newTokenURIs[i];

            require(tokenId > 0, "arteQArtDrop: cannot alter genesis token");
            require(bytes(newTokenURI).length > 0, "arteQArtDrop: empty string");

            _setTokenURI(tokenId, newTokenURI);
            emit TokenURIChanged(msg.sender, tokenId, newTokenURI);
        }
    }

    function transferTo(address target, uint256 amount) external
      onlyOperator {
        require(target != address(0), "arteQArtDrop: target cannot be zero");
        require(amount > 0, "arteQArtDrop: cannot transfer zero");
        require(amount <= address(this).balance, "arteQArtDrop: transfer more than balance");

        (bool success, ) = target.call{value: amount}(new bytes(0));
        require(success, "arteQArtDrop: failed to transfer");

        emit Withdrawn(msg.sender, target, amount);
    }

    function _reserveTokens(address target, uint256 nrOfTokensToReserve) internal {
        for (uint256 i = 1; i <= nrOfTokensToReserve; i++) {
            uint256 newTokenId = _tokenIdCounter;
            _mint(target, newTokenId);
            _setTokenURI(newTokenId, _defaultTokenURI);
            emit TokenURIChanged(msg.sender, newTokenId, _defaultTokenURI);
            _tokenIdCounter += 1;
            _reservedTokensCounter += 1;
        }
        _whitelistedAccounts[target] -= nrOfTokensToReserve;
        require(_whitelistedAccounts[target] >= 0, "arteQArtDrop: should not happen");
        emit TokensReserved(msg.sender, target, nrOfTokensToReserve);
    }

    receive() external payable {
        revert("arteQArtDrop: cannot accept ether");
    }

    fallback() external payable {
        revert("arteQArtDrop: cannot accept ether");
    }
}
