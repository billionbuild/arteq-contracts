//
// Copyright (C) 2021 BillionBuild (2B) Team. Reproduction in whole or in part
// without written permission is prohibited. All rights reserved.
//
// SPDX-License-Identifier: GNU General Public License v3.0

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./ERC1155Supply.sol";
import "./IarteQTokens.sol";

/// @author Kam Amini <kam@2b.team> <kam.cpp@gmail.com>
///
/// @title This contract keeps track of the tokens used in artèQ Investment
/// Fund ecosystem. It also contains the logic used for profit distribution.
///
/// @notice Use at your own risk
contract arteQTokens is ERC1155Supply, IarteQTokens {

    /// The main artèQ token
    uint256 public constant ARTEQ = 1;

    /// The governance token of artèQ Investment Fund
    uint256 public constant gARTEQ = 2;

    // The mapping from token IDs to their respective Metadata URIs
    mapping (uint256 => string) private _tokenMetadataURIs;

    // A counter limiting the number of times that the admin account can be changed.
    uint private _changeAdminAccountCounter;

    // The creator of the this contract having limited and specific rights to
    // do adminitrative tasks.
    address private _adminAccount;

    // Treasury account responsible for asset-token ratio appreciation.
    address private _treasuryAccount;

    // This can be a Uniswap V1 exchange (pool) account created for ARTEQ token,
    // or any other exchange account. Treasury contract uses these pools to buy
    // back or sell tokens. In case of buy backs, the tokens are delivered to
    // treasury account via these contracts.
    address private _exchange1Account;
    address private _exchange2Account;
    address private _exchange3Account;
    address private _exchange4Account;
    address private _exchange5Account;

    // All the profits accumulated since the deployment of the contract. This is
    // used as a marker to facilitate the caluclation of every eligible account's
    // share from the profits in a given time range.
    uint256 private _allTimeProfit;

    // The actual number of profit tokens transferred to accounts
    uint256 private _profitTokensTransferredToAccounts;

    // The percentage of the bought back tokens which is considered as profit for gARTEQ owners
    // Default value is 20% and only admin account can change that.
    uint private _profitPercentage;

    // In order to caluclate the share of each elgiible account from the profits,
    // and more importantly, in order to do this efficiently (less gas usage),
    // we need this mapping to remember the "all time profit" when an account
    // is modified (receives tokens or sends tokens).
    mapping (address => uint256) private _profitMarkers;

    // A timestamp indicating when the ramp-up phase gets expired.
    uint256 private _rampUpPhaseExpireTimestamp;

    // Indicates until when the address cannot send any tokens
    mapping (address => uint256) private _lockedUntilTimestamps;

    /// Emitted when the admin account is changed.
    event AdminAccountChanged(address newAccount);

    /// Emitted when the treasury account is changed.
    event TreasuryAccountChanged(address newAccount);

    /// Emitted when the exchange account is changed.
    event Exchange1AccountChanged(address newAccount);
    event Exchange2AccountChanged(address newAccount);
    event Exchange3AccountChanged(address newAccount);
    event Exchange4AccountChanged(address newAccount);
    event Exchange5AccountChanged(address newAccount);

    /// Emitted when the profit percentage is changed.
    event ProfitPercentageChanged(uint newPercentage);

    /// Emitted when a token distribution occurs during the ramp-up phase
    event RampUpPhaseTokensDistributed(address to, uint256 amount, uint256 lockedUntilTimestamp);

    /// Emitted when some buy back tokens are received by the treasury account.
    event ProfitTokensCollected(uint256 amount);

    /// Emitted when a share holder receives its tokens from the buy back profits.
    event ProfitTokensDistributed(address to, uint256 amount);

    modifier onlyAdmin() {
        require(_msgSender() == _adminAccount, "arteQTokens: must be admin");
        _;
    }

    modifier validToken(uint256 tokenId) {
        require(tokenId == ARTEQ || tokenId == gARTEQ, "arteQTokens: nonexistent token");
        _;
    }

    modifier onlyRampUpPhase() {
        require(block.timestamp < _rampUpPhaseExpireTimestamp, "arteQTokens: ramp up phase is finished");
        _;
    }

    constructor() {
        _changeAdminAccountCounter = 0;
        _adminAccount = _msgSender();

        /// Must be set later
        _treasuryAccount = address(0);

        /// Must be set later
        _exchange1Account = address(0);
        _exchange2Account = address(0);
        _exchange3Account = address(0);
        _exchange4Account = address(0);
        _exchange5Account = address(0);

        setURI(ARTEQ, "ipfs://QmfBtH8BSztaYn3QFnz2qvu2ehZgy8AZsNMJDkgr3pdqT8");
        setURI(gARTEQ, "ipfs://QmRAXmU9AymDgtphh37hqx5R2QXSS2ngchQRDFtg6XSD7w");

        /// 10 billion
        _initialMint(_msgSender(), ARTEQ, 10 ** 10, "");
        /// 1 million
        _initialMint(_msgSender(), gARTEQ, 10 ** 6, "");

        /// Obviously, no profit at the time of deployment
        _allTimeProfit = 0;

        _profitPercentage = 20;

        /// Friday, December 31, 2021 11:59:59 PM (GMT)
        _rampUpPhaseExpireTimestamp = 1640995199;
    }

    /// See {ERC1155-uri}
    function uri(uint256 tokenId) public view virtual override validToken(tokenId) returns (string memory) {
        return _tokenMetadataURIs[tokenId];
    }

    /// See {ERC1155-setURI}
    function setURI(
        uint256 tokenId,
        string memory newUri
    ) public onlyAdmin validToken(tokenId) {
        _tokenMetadataURIs[tokenId] = newUri;
        emit URI(newUri, tokenId);
    }

    /// Sets a new admin account. This can only be done three times. The main purpose of this allowance
    /// is to change the admin account to a smart contract connected to DAO subsystem and control this
    /// contract through a DAO mechanism. One time change could be enough but three times can compensate
    /// for the possible mistakes made in the process yet keeping the trust and security of the token
    /// contract intact.
    ///
    /// @param newAccount new admin address
    function setAdminAccount(address newAccount) public onlyAdmin {
        require(newAccount != address(0), "arteQTokens: zero address for admin account");
        require(_changeAdminAccountCounter < 3, "arteQTokens: cannot change admin account");
        require(newAccount != _adminAccount, "arteQTokens: cannot set the same account");
        _adminAccount = newAccount;
        _changeAdminAccountCounter += 1;
        emit AdminAccountChanged(newAccount);
    }

    /// Returns the set treasury account
    /// @return The set treasury account
    function getTreasuryAccount() public view returns(address) {
        return _treasuryAccount;
    }

    /// Sets a new treasury account. Just after deployment, treasury account is set to zero address but once
    /// set to a non-zero address, it cannot be changed back to zero address again.
    ///
    /// @param newAccount new treasury address
    function setTreasuryAccount(address newAccount) public onlyAdmin {
        require(newAccount != address(0), "arteQTokens: zero address for treasury account");
        _treasuryAccount = newAccount;
        emit TreasuryAccountChanged(newAccount);
    }

    /// Returns the 1st exchange account
    /// @return The 1st exchnage account
    function getExchange1Account() public view returns(address) {
        return _exchange1Account;
    }

    /// Returns the 2nd exchange account
    /// @return The 2nd exchnage account
    function getExchange2Account() public view returns(address) {
        return _exchange2Account;
    }

    /// Returns the 3rd exchange account
    /// @return The 3rd exchnage account
    function getExchange3Account() public view returns(address) {
        return _exchange3Account;
    }

    /// Returns the 4th exchange account
    /// @return The 4th exchnage account
    function getExchange4Account() public view returns(address) {
        return _exchange4Account;
    }

    /// Returns the 5th exchange account
    /// @return The 5th exchnage account
    function getExchange5Account() public view returns(address) {
        return _exchange5Account;
    }

    /// Sets a new exchange account. Just after deployment, exchange account is set to zero address but once
    /// set to a non-zero address, it cannot be changed back to zero address again.
    ///
    /// @param newAccount new exchange address
    function setExchange1Account(address newAccount) public onlyAdmin {
        require(newAccount != address(0), "arteQTokens: zero address for exchange account");
        _exchange1Account = newAccount;
        emit Exchange1AccountChanged(newAccount);
    }

    /// Sets a new exchange account. Just after deployment, exchange account is set to zero address but once
    /// set to a non-zero address, it cannot be changed back to zero address again.
    ///
    /// @param newAccount new exchange address
    function setExchange2Account(address newAccount) public onlyAdmin {
        require(newAccount != address(0), "arteQTokens: zero address for exchange account");
        _exchange2Account = newAccount;
        emit Exchange2AccountChanged(newAccount);
    }

    /// Sets a new exchange account. Just after deployment, exchange account is set to zero address but once
    /// set to a non-zero address, it cannot be changed back to zero address again.
    ///
    /// @param newAccount new exchange address
    function setExchange3Account(address newAccount) public onlyAdmin {
        require(newAccount != address(0), "arteQTokens: zero address for exchange account");
        _exchange3Account = newAccount;
        emit Exchange3AccountChanged(newAccount);
    }

    /// Sets a new exchange account. Just after deployment, exchange account is set to zero address but once
    /// set to a non-zero address, it cannot be changed back to zero address again.
    ///
    /// @param newAccount new exchange address
    function setExchange4Account(address newAccount) public onlyAdmin {
        require(newAccount != address(0), "arteQTokens: zero address for exchange account");
        _exchange4Account = newAccount;
        emit Exchange4AccountChanged(newAccount);
    }

    /// Sets a new exchange account. Just after deployment, exchange account is set to zero address but once
    /// set to a non-zero address, it cannot be changed back to zero address again.
    ///
    /// @param newAccount new exchange address
    function setExchange5Account(address newAccount) public onlyAdmin {
        require(newAccount != address(0), "arteQTokens: zero address for exchange account");
        _exchange5Account = newAccount;
        emit Exchange5AccountChanged(newAccount);
    }

    /// Returns the profit percentage
    /// @return The set treasury account
    function getProfitPercentage() public view returns(uint) {
        return _profitPercentage;
    }

    /// Sets a new profit percentage. This is the percentage of bought-back tokens which is considered
    /// as profit for gARTEQ owners. The value can be between 10% and 50%.
    ///
    /// @param newPercentage new exchange address
    function setProfitPercentage(uint newPercentage) public onlyAdmin {
        require(newPercentage >= 10 && newPercentage <= 50, "arteQTokens: invalid value for profit percentage");
        _profitPercentage = newPercentage;
        emit ProfitPercentageChanged(newPercentage);
    }

    /// A token distribution mechanism, only valid in ramp-up phase, valid till the end of 2021.
    function rampUpPhaseDistributeToken(
        address[] memory tos,
        uint256[] memory amounts,
        uint256[] memory lockedUntilTimestamps
    ) public onlyAdmin onlyRampUpPhase {
        require(tos.length == amounts.length, "arteQTokens: inputs have incorrect lengths");
        for (uint256 i = 0; i < tos.length; i++) {
            require(tos[i] != _treasuryAccount, "arteQTokens: cannot trasnfer to treasury account");
            require(tos[i] != _adminAccount, "arteQTokens: cannot trasnfer to admin account");
            _safeTransferFrom(_msgSender(), _adminAccount, tos[i], ARTEQ, amounts[i], "");
            if (lockedUntilTimestamps[i] > 0) {
                _lockedUntilTimestamps[tos[i]] = lockedUntilTimestamps[i];
            }
            emit RampUpPhaseTokensDistributed(tos[i], amounts[i], lockedUntilTimestamps[i]);
        }
    }

    function balanceOf(address account, uint256 tokenId) public view virtual override validToken(tokenId) returns (uint256) {
        if (tokenId == gARTEQ) {
            return super.balanceOf(account, tokenId);
        }
        return super.balanceOf(account, tokenId) + _calcProfitTokens(account);
    }

    function allTimeProfit() public view returns (uint256) {
        return _allTimeProfit;
    }

    function totalCirculatingGovernanceTokens() public view returns (uint256) {
        return totalSupply(gARTEQ) - balanceOf(_adminAccount, gARTEQ);
    }

    function profitTokensTransferredToAccounts() public view returns (uint256) {
        return _profitTokensTransferredToAccounts;
    }

    function compatBalanceOf(address /* origin */, address account, uint256 tokenId) public view virtual override returns (uint256) {
        return balanceOf(account, tokenId);
    }

    function compatTotalSupply(address /* origin */, uint256 tokenId) public view virtual override  returns (uint256) {
        return totalSupply(tokenId);
    }

    function compatTransfer(address origin, address to, uint256 tokenId, uint256 amount) public virtual override {
        address from = origin;
        _safeTransferFrom(origin, from, to, tokenId, amount, "");
    }

    function compatTransferFrom(address origin, address from, address to, uint256 tokenId, uint256 amount) public virtual override {
        require(
            from == origin || isApprovedForAll(from, origin),
            "arteQTokens: caller is not owner nor approved "
        );
        _safeTransferFrom(origin, from, to, tokenId, amount, "");
    }

    function compatAllowance(address /* origin */, address account, address operator) public view virtual override returns (uint256) {
        if (isApprovedForAll(account, operator)) {
            return 2 ** 256 - 1;
        }
        return 0;
    }

    function compatApprove(address origin, address operator, uint256 amount) public virtual override {
        _setApprovalForAll(origin, operator, amount > 0);
    }

    // If this contract gets a balance in some ERC20 contract after it's finished, then we can rescue it.
    function rescueTokens(IERC20 foreignToken, address to) external onlyAdmin {
        foreignToken.transfer(to, foreignToken.balanceOf(address(this)));
    }

    // If this contract gets a balance in some ERC721 contract after it's finished, then we can rescue it.
    function approveNFTRescue(IERC721 foreignNFT, address to) external onlyAdmin {
        foreignNFT.setApprovalForAll(to, true);
    }

    function _beforeTokenTransfer(
        address operator,
        address from,
        address to,
        uint256 id,
        uint256[] memory amounts,
        bytes memory data
    ) internal virtual override {
        // We have to call the super function in order to have the total supply correct.
        // It is actually needed by the first two _initialMint calls only. After that, it is
        // a no-op function.
        super._beforeTokenTransfer(operator, from, to, id, amounts, data);

        // this is one of the two first _initialMint calls
        if (from == address(0)) {
            return;
        }

        // This is a buy-back callback from exchange account
        if ((
                from == _exchange1Account ||
                from == _exchange2Account ||
                from == _exchange3Account ||
                from == _exchange4Account ||
                from == _exchange5Account
        ) && to == _treasuryAccount) {
            require(amounts.length == 2 && id == ARTEQ, "arteQTokens: invalid transfer from exchange");
            uint256 numerator = SafeMath.mul(amounts[0], _profitPercentage);
            uint256 profit = SafeMath.div(numerator, 100, "artQTokens: overflow");
            amounts[1] = amounts[0] - profit;
            _allTimeProfit += profit;
            emit ProfitTokensCollected(profit);
            return;
        }

        // Ensures that the locked accounts cannot send their ARTEQ tokens
        if (id == ARTEQ) {
            require(_lockedUntilTimestamps[from] == 0 || block.timestamp > _lockedUntilTimestamps[from], "arteQTokens: account cannot send tokens");
        }

        // Transfer the accumulated profit to 'from' account
        if (from != _adminAccount &&
            from != _treasuryAccount &&
            from != _exchange1Account &&
            from != _exchange2Account &&
            from != _exchange3Account &&
            from != _exchange4Account &&
            from != _exchange5Account) {
            _distributeProfitTokens(from);
        }

        // Transfer the accumulated profit to 'to' account
        if (to != _adminAccount &&
            to != _treasuryAccount &&
            to != _exchange1Account &&
            to != _exchange2Account &&
            to != _exchange3Account &&
            to != _exchange4Account &&
            to != _exchange5Account) {
            _distributeProfitTokens(to);
        }
    }

    function _calcProfitTokens(address account) internal view returns (uint256) {
        if (account == _adminAccount ||
            account == _treasuryAccount ||
            account == _exchange1Account ||
            account == _exchange2Account ||
            account == _exchange3Account ||
            account == _exchange4Account ||
            account == _exchange5Account) {
            return 0;
        }
        uint256 profitDifference = SafeMath.sub(_allTimeProfit, _profitMarkers[account], "arteQTokens: sub overflow");
        uint256 totalGovTokens = SafeMath.sub(totalSupply(gARTEQ), balanceOf(_adminAccount, gARTEQ), "arteQTokens: sub 2 overflow");
        if (totalGovTokens == 0) {
            return 0;
        }
        uint256 numerator = SafeMath.mul(profitDifference, balanceOf(account, gARTEQ));
        uint256 tokensToTransfer = SafeMath.div(numerator, totalGovTokens, "arteQTokens: div overflow");
        return tokensToTransfer;
    }

    function _distributeProfitTokens(address account) internal {
        bool updateProfitMarker = true;
        // If 'account' has some governance tokens then calculate the accumulated profit since the last distribution
        if (balanceOf(account, gARTEQ) > 0) {
            uint256 tokensToTransfer = _calcProfitTokens(account);
            // If the profit is too small and no token can be transferred, then don't update the profit marker and
            // let the account wait for the next round of profit distribution
            if (tokensToTransfer == 0) {
                updateProfitMarker = false;
            } else {
                _balances[ARTEQ][account] += tokensToTransfer;
                _profitTokensTransferredToAccounts += tokensToTransfer;
                emit ProfitTokensDistributed(account, tokensToTransfer);
            }
        }
        if (updateProfitMarker) {
            _profitMarkers[account] = _allTimeProfit;
        }
    }

    receive() external payable {
        revert("arteQTokens: cannot accept ether");
    }

    fallback() external payable {
        revert("arteQTokens: cannot accept ether");
    }
}
