const { expect } = require("chai");
const { ethers } = require("hardhat");

const ARTEQ = 1;
const gARTEQ = 2;

const zeroAddress = "0x0000000000000000000000000000000000000000";

let contract;
let govToken;
let admin;
let another_admin;
let treasury1;
let treasury2;
let governor1;
let governor2;
let governor3;
let trader1;
let trader2;
let exchange;

describe("arteQ Tokens", function() {

    beforeEach(async () => {
        [
            admin,
            another_admin,
            treasury1,
            treasury2,
            governor1,
            governor2,
            governor3,
            trader1,
            trader2,
            exchange,
        ] = await ethers.getSigners();

        const arteQTokensContract = await hre.ethers.getContractFactory("arteQTokens", admin);
        contract = await arteQTokensContract.deploy();

        await contract.deployed();

        deployReceipt = await contract.deployTransaction.wait();
        expect(deployReceipt.logs.length).to.equal(4);
        await expect(contract.deployTransaction).to.emit(contract, "URI").withArgs("ipfs://QmfBtH8BSztaYn3QFnz2qvu2ehZgy8AZsNMJDkgr3pdqT8", ARTEQ);
        await expect(contract.deployTransaction).to.emit(contract, "URI").withArgs("ipfs://QmRAXmU9AymDgtphh37hqx5R2QXSS2ngchQRDFtg6XSD7w", gARTEQ);
        // await expect(contract.deployTransaction).to.emit(contract, "TransferSingle").withArgs(admin.address, zeroAddress, admin.address, ARTEQ, 10 ** 10);
        // await expect(contract.deployTransaction).to.emit(contract, "TransferSingle").withArgs(admin.address, zeroAddress, admin.address, gARTEQ, 1 ** 6);

        expect(await contract.connect(trader1).totalSupply(ARTEQ)).to.equal(10 ** 10);
        expect(await contract.connect(trader1).balanceOf(admin.address, ARTEQ)).to.equal(10 ** 10);

        expect(await contract.connect(trader1).totalSupply(gARTEQ)).to.equal(10 ** 6);
        expect(await contract.connect(trader1).balanceOf(admin.address, gARTEQ)).to.equal(10 ** 6);
    });

    it("should not accept ether", async() => {
        await expect(trader1.sendTransaction({
            to: contract.address,
            value: ethers.utils.parseEther("1"),
        })).to.be.revertedWith("arteQTokens: cannot accept ether");
    });

    it("checking treasury account just right after deployment", async () => {
        expect(await contract.connect(trader1).getTreasuryAccount()).to.equal(zeroAddress);
    });

    it("reading total supply of a nonexisting token must be zero", async () => {
        const nonExistingTokenId = 3;
        expect(await contract.connect(trader1).exists(nonExistingTokenId)).to.equal(false);
        expect(await contract.connect(trader1).totalSupply(nonExistingTokenId)).to.equal(0);
    });

    it("admin account can only be changed by the admin account", async() => {
        const call = contract.connect(trader1).setAdminAccount(another_admin.address);
        await expect(call).to.be.revertedWith("arteQTokens: must be admin");

        const call2 = contract.connect(admin).setAdminAccount(another_admin.address);
        const tx = await call2;
        receipt = await tx.wait();
        expect(receipt.logs.length).to.equal(1);
        await expect(call2).to.emit(contract, "AdminAccountChanged").withArgs(another_admin.address);
    });

    it("admin account cannot be set to zero address", async () => {
        const call = contract.connect(admin).setAdminAccount(zeroAddress);
        await expect(call).to.be.revertedWith("arteQTokens: zero address for admin account");
    });

    it("cannot use the same account to set a new admin account", async() => {
        await contract.connect(admin).setAdminAccount(another_admin.address);
        await expect(contract.connect(another_admin).setAdminAccount(another_admin.address)).to.be.revertedWith("arteQTokens: cannot set the same account");
    });

    it("admin account can only be changed three times", async() => {
        const call = contract.connect(admin).setAdminAccount(another_admin.address);
        const tx = await call;
        receipt = await tx.wait();
        expect(receipt.logs.length).to.equal(1);
        await expect(call).to.emit(contract, "AdminAccountChanged").withArgs(another_admin.address);

        await contract.connect(another_admin).setAdminAccount(admin.address);
        await contract.connect(admin).setAdminAccount(another_admin.address);
        await expect(contract.connect(another_admin).setAdminAccount(admin.address)).to.be.revertedWith("arteQTokens: cannot change admin account");
    });

    it("treasury account can only be changed by the admin account", async() => {
        const call = contract.connect(trader1).setTreasuryAccount(treasury2.address);
        await expect(call).to.be.revertedWith("arteQTokens: must be admin");

        const call2 = contract.connect(admin).setTreasuryAccount(treasury2.address);
        const tx = await call2;
        receipt = await tx.wait();
        expect(receipt.logs.length).to.equal(1);
        await expect(call2).to.emit(contract, "TreasuryAccountChanged").withArgs(treasury2.address);

        const call3 = contract.connect(admin).setTreasuryAccount(treasury1.address);
        const tx2 = await call3;
        receipt2 = await tx2.wait();
        expect(receipt2.logs.length).to.equal(1);
        await expect(call3).to.emit(contract, "TreasuryAccountChanged").withArgs(treasury1.address);
    });

    it("treasury account cannot be set to zero address", async () => {
        const call = contract.connect(admin).setTreasuryAccount(zeroAddress);
        await expect(call).to.be.revertedWith("arteQTokens: zero address for treasury account");
    });

    it("exchange account can only be changed by the admin account", async() => {
        const call = contract.connect(trader1).setExchange1Account(treasury2.address);
        await expect(call).to.be.revertedWith("arteQTokens: must be admin");

        const call2 = contract.connect(admin).setExchange1Account(exchange.address);
        const tx = await call2;
        receipt = await tx.wait();
        expect(receipt.logs.length).to.equal(1);
        await expect(call2).to.emit(contract, "Exchange1AccountChanged").withArgs(exchange.address);
    });

    it("exchange account cannot be set to zero address", async () => {
        const call = contract.connect(admin).setExchange1Account(zeroAddress);
        await expect(call).to.be.revertedWith("arteQTokens: zero address for exchange account");
    });

    it("token uris can only be changed by the admin account", async() => {
        const newURI = "ipfs://AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSs";

        const call = contract.connect(trader1).setURI(ARTEQ, newURI);
        await expect(call).to.be.revertedWith("arteQTokens: must be admin");

        const call2 = contract.connect(admin).setURI(ARTEQ, newURI);
        const tx = await call2;
        receipt = await tx.wait();
        expect(receipt.logs.length).to.equal(1);
        await expect(call2).to.emit(contract, "URI").withArgs(newURI, ARTEQ);

        expect(await contract.connect(trader1).uri(ARTEQ)).to.equal(newURI);
    });

    it("setting the uri for a nonexisting token must fail", async() => {
        const nonExistingTokenId = 3;
        const newURI = "ipfs://AaBbCcDdEeFfGgHhIiJjKkLlMmNnOo";

        const call = contract.connect(admin).setURI(nonExistingTokenId, newURI);
        await expect(call).to.be.revertedWith("arteQTokens: nonexistent token");
    });

    it("profit percentage can only be changed by admin account", async () => {
        await expect(contract.connect(trader1).setProfitPercentage(23)).to.be.revertedWith("arteQTokens: must be admin");
    })

    it("profit percentage min and max values", async () => {
        await expect(contract.connect(admin).setProfitPercentage(9)).to.be.revertedWith("arteQTokens: invalid value for profit percentage");
        await contract.connect(admin).setProfitPercentage(10);
        await contract.connect(admin).setProfitPercentage(23);
        await contract.connect(admin).setProfitPercentage(50);
        await expect(contract.connect(admin).setProfitPercentage(51)).to.be.revertedWith("arteQTokens: invalid value for profit percentage");
    });

    it("[ramp up phase] token distribution can be called only by admin before end of phase (no lock set)", async() => {
        // set time to before end of phase
        await ethers.provider.send("evm_setNextBlockTimestamp", [ 1640985000 ]);
        await ethers.provider.send("evm_mine");

        const call = contract.connect(trader1).rampUpPhaseDistributeToken(
            [ trader1.address, governor1.address ],
            [ 100, 1000 ],
            [ 0, 0 ],
        );
        await expect(call).to.be.revertedWith("arteQTokens: must be admin");
    });

    it("[ramp up phase] token distribution can not have any transfer to treasury and admin accounts before end of phase (no lock set)", async() => {
        await contract.connect(admin).setTreasuryAccount(treasury1.address);
        await contract.connect(admin).setExchange1Account(exchange.address);

        // set time to before end of phase
        await ethers.provider.send("evm_setNextBlockTimestamp", [ 1640985500 ]);
        await ethers.provider.send("evm_mine");

        const call = contract.connect(admin).rampUpPhaseDistributeToken(
            [ trader1.address, treasury1.address ],
            [ 100, 1000 ],
            [ 0, 0 ],
        );
        await expect(call).to.be.revertedWith("arteQTokens: cannot trasnfer to treasury account");

        const call2 = contract.connect(admin).rampUpPhaseDistributeToken(
            [ trader1.address, admin.address ],
            [ 100, 1000 ],
            [ 0, 0 ],
        );
        await expect(call2).to.be.revertedWith("arteQTokens: cannot trasnfer to admin account");
    });

    it("[ramp up phase] correct token distribution before end of phase (no lock set)", async() => {
        // set time to before end of phase
        await ethers.provider.send("evm_setNextBlockTimestamp", [ 1640986000 ]);
        await ethers.provider.send("evm_mine");

        const call = contract.connect(admin).rampUpPhaseDistributeToken(
            [ trader1.address, governor1.address ],
            [ 100, 1000 ],
            [ 0, 0 ],
        );
        const tx = await call;
        receipt = await tx.wait();
        expect(receipt.logs.length).to.equal(4);
        await expect(call).to.emit(contract, "TransferSingle").withArgs(admin.address, admin.address, trader1.address, ARTEQ, 100);
        await expect(call).to.emit(contract, "TransferSingle").withArgs(admin.address, admin.address, governor1.address, ARTEQ, 1000);
        await expect(call).to.emit(contract, "RampUpPhaseTokensDistributed").withArgs(trader1.address, 100, 0);
        await expect(call).to.emit(contract, "RampUpPhaseTokensDistributed").withArgs(governor1.address, 1000, 0);

        expect(await contract.connect(trader2).balanceOf(trader1.address, ARTEQ)).to.equal(100);
        expect(await contract.connect(trader2).balanceOf(governor1.address, ARTEQ)).to.equal(1000);
        expect(await contract.connect(trader2).balanceOf(admin.address, ARTEQ)).to.equal(10 ** 10 - 100 - 1000);
    });

    it("[ramp up phase] correct token distribution before end of phase (with lock set)", async() => {
        // set time to before end of phase
        await ethers.provider.send("evm_setNextBlockTimestamp", [ 1640986100 ]);
        await ethers.provider.send("evm_mine");

        {
            const call = contract.connect(admin).rampUpPhaseDistributeToken(
                [ trader1.address, governor1.address ],
                [ 100, 1000 ],
                [ 0, 1640986500 ],
            );
            const tx = await call;
            receipt = await tx.wait();
            expect(receipt.logs.length).to.equal(4);
            await expect(call).to.emit(contract, "TransferSingle").withArgs(admin.address, admin.address, trader1.address, ARTEQ, 100);
            await expect(call).to.emit(contract, "TransferSingle").withArgs(admin.address, admin.address, governor1.address, ARTEQ, 1000);
            await expect(call).to.emit(contract, "RampUpPhaseTokensDistributed").withArgs(trader1.address, 100, 0);
            await expect(call).to.emit(contract, "RampUpPhaseTokensDistributed").withArgs(governor1.address, 1000, 1640986500);

            expect(await contract.connect(trader2).balanceOf(trader1.address, ARTEQ)).to.equal(100);
            expect(await contract.connect(trader2).balanceOf(governor1.address, ARTEQ)).to.equal(1000);
            expect(await contract.connect(trader2).balanceOf(admin.address, ARTEQ)).to.equal(10 ** 10 - 100 - 1000);
        }

        // advance time but don't go beyond the lock period
        await ethers.provider.send("evm_setNextBlockTimestamp", [ 1640986200 ]);
        await ethers.provider.send("evm_mine");

        // trader1 is not locked so it can send tokens
        {
            const call = await contract.connect(trader1).safeTransferFrom(trader1.address, treasury1.address, ARTEQ, 10, []);
            const tx = await call;
            receipt = await tx.wait();
            expect(receipt.logs.length).to.equal(1);
            await expect(call).to.emit(contract, "TransferSingle").withArgs(trader1.address, trader1.address, treasury1.address, ARTEQ, 10);
            expect(await contract.connect(trader2).balanceOf(trader1.address, ARTEQ)).to.equal(90);
            expect(await contract.connect(trader1).balanceOf(treasury1.address, ARTEQ)).to.equal(10);
        }

        // governor1 is locked so it cannot send tokens
        {
            const call = contract.connect(governor1).safeTransferFrom(governor1.address, treasury1.address, ARTEQ, 10, []);
            await expect(call).to.be.revertedWith("arteQTokens: account cannot send tokens");
        }

        // receives are not locked
        {
            const call = await contract.connect(admin).safeTransferFrom(admin.address, trader1.address, ARTEQ, 10, []);
            const tx = await call;
            receipt = await tx.wait();
            expect(receipt.logs.length).to.equal(1);
            await expect(call).to.emit(contract, "TransferSingle").withArgs(admin.address, admin.address, trader1.address, ARTEQ, 10);
            expect(await contract.connect(trader2).balanceOf(trader1.address, ARTEQ)).to.equal(100);
            expect(await contract.connect(trader1).balanceOf(admin.address, ARTEQ)).to.equal(10 ** 10 - 100 - 1000 - 10);
        }

        // receives are not locked
        {
            const call = await contract.connect(admin).safeTransferFrom(admin.address, governor1.address, ARTEQ, 10, []);
            const tx = await call;
            receipt = await tx.wait();
            expect(receipt.logs.length).to.equal(1);
            await expect(call).to.emit(contract, "TransferSingle").withArgs(admin.address, admin.address, governor1.address, ARTEQ, 10);
            expect(await contract.connect(trader2).balanceOf(governor1.address, ARTEQ)).to.equal(1010);
            expect(await contract.connect(trader1).balanceOf(admin.address, ARTEQ)).to.equal(10 ** 10 - 100 - 1000 - 20);
        }

        // advance time and go beyond the lock period
        await ethers.provider.send("evm_setNextBlockTimestamp", [ 1640986600 ]);
        await ethers.provider.send("evm_mine");

        // trader1 is not locked so it can send tokens
        {
            const call = await contract.connect(trader1).safeTransferFrom(trader1.address, treasury1.address, ARTEQ, 10, []);
            const tx = await call;
            receipt = await tx.wait();
            expect(receipt.logs.length).to.equal(1);
            await expect(call).to.emit(contract, "TransferSingle").withArgs(trader1.address, trader1.address, treasury1.address, ARTEQ, 10);
            expect(await contract.connect(trader2).balanceOf(trader1.address, ARTEQ)).to.equal(90);
            expect(await contract.connect(trader1).balanceOf(treasury1.address, ARTEQ)).to.equal(20);
        }

        // governor1 is locked so it cannot send tokens
        {
            const call = contract.connect(governor1).safeTransferFrom(governor1.address, treasury1.address, ARTEQ, 10, []);
            const tx = await call;
            receipt = await tx.wait();
            expect(receipt.logs.length).to.equal(1);
            await expect(call).to.emit(contract, "TransferSingle").withArgs(governor1.address, governor1.address, treasury1.address, ARTEQ, 10);
            expect(await contract.connect(trader2).balanceOf(governor1.address, ARTEQ)).to.equal(1000);
            expect(await contract.connect(trader1).balanceOf(treasury1.address, ARTEQ)).to.equal(30);
        }

        // TODO(kam): test approved send
    });

    it("[ramp up phase] token distribution when the phase has finished (no lock set)", async() => {
        // set time to before end of phase
        await ethers.provider.send("evm_setNextBlockTimestamp", [ 1641000000 ]);
        await ethers.provider.send("evm_mine");

        const call = contract.connect(admin).rampUpPhaseDistributeToken(
            [ trader1.address, governor1.address ],
            [ 100, 1000 ],
            [ 0, 0 ],
        );
        await expect(call).to.be.revertedWith("arteQTokens: ramp up phase is finished");
    });

    it("[profit distribution] treasury receives some ARTEQ tokens from exchnage account", async() => {
        // check admin balance
        expect(await contract.connect(admin).balanceOf(admin.address, ARTEQ)).to.equal(10 ** 10);
        // setup treasury account
        await contract.connect(admin).setTreasuryAccount(treasury1.address);
        // check the treasury balance
        expect(await contract.connect(admin).balanceOf(treasury1.address, ARTEQ)).to.equal(0);
        // setup exchange account
        await contract.connect(admin).setExchange1Account(exchange.address);
        // check the treasury balance
        expect(await contract.connect(admin).balanceOf(exchange.address, ARTEQ)).to.equal(0);
        // transfer some tokens to treasury
        await contract.connect(admin).safeTransferFrom(admin.address, treasury1.address, ARTEQ, 1000, []);
        // transfer some tokens to exchange
        await contract.connect(admin).safeTransferFrom(admin.address, exchange.address, ARTEQ, 10000, []);
        // check the balances again
        expect(await contract.connect(admin).balanceOf(admin.address, ARTEQ)).to.equal(10 ** 10 - 1000 - 10000);
        expect(await contract.connect(admin).balanceOf(treasury1.address, ARTEQ)).to.equal(1000);
        expect(await contract.connect(admin).balanceOf(exchange.address, ARTEQ)).to.equal(10000);

        // simulate a deposit from the exchange account (Uniswap V1 compatible contract)
        await contract.connect(exchange).safeTransferFrom(exchange.address, treasury1.address, ARTEQ, 100, []);
        // check the balances
        expect(await contract.connect(admin).allTimeProfit()).to.equal(20);
        expect(await contract.connect(admin).balanceOf(treasury1.address, ARTEQ)).to.equal(1000 + 80);
    });

    it("[profit distribution] treasury receives less than or equal to 5 ARTEQ tokens from exchnage account", async() => {
        // check admin balance
        expect(await contract.connect(admin).balanceOf(admin.address, ARTEQ)).to.equal(10 ** 10);
        // setup treasury account
        await contract.connect(admin).setTreasuryAccount(treasury1.address);
        // check the treasury balance
        expect(await contract.connect(admin).balanceOf(treasury1.address, ARTEQ)).to.equal(0);
        // setup exchange account
        await contract.connect(admin).setExchange1Account(exchange.address);
        // check the treasury balance
        expect(await contract.connect(admin).balanceOf(exchange.address, ARTEQ)).to.equal(0);
        // transfer some tokens to treasury
        await contract.connect(admin).safeTransferFrom(admin.address, treasury1.address, ARTEQ, 1000, []);
        // transfer some tokens to exchange
        await contract.connect(admin).safeTransferFrom(admin.address, exchange.address, ARTEQ, 10000, []);
        // check the balances again
        expect(await contract.connect(admin).balanceOf(admin.address, ARTEQ)).to.equal(10 ** 10 - 1000 - 10000);
        expect(await contract.connect(admin).balanceOf(treasury1.address, ARTEQ)).to.equal(1000);
        expect(await contract.connect(admin).balanceOf(exchange.address, ARTEQ)).to.equal(10000);

        // simulate a deposit of less than 5 tokens from the exchange account (Uniswap V1 compatible contract)
        await contract.connect(exchange).safeTransferFrom(exchange.address, treasury1.address, ARTEQ, 4, []);
        // check the balances
        expect(await contract.connect(admin).allTimeProfit()).to.equal(0); // no profit could be gained
        expect(await contract.connect(admin).balanceOf(treasury1.address, ARTEQ)).to.equal(1000 + 4);

        // simulate a deposit of exact 5 tokens from the exchange account (Uniswap V1 compatible contract)
        await contract.connect(exchange).safeTransferFrom(exchange.address, treasury1.address, ARTEQ, 5, []);
        // check the balances
        expect(await contract.connect(admin).allTimeProfit()).to.equal(1); // 1 token profit
        expect(await contract.connect(admin).balanceOf(treasury1.address, ARTEQ)).to.equal(1000 + 4 + 4);
    });

    it("[profit distribution] treasury receives some ARTEQ tokens from exchnage account and distribute the profit among gARTEQ holders", async() => {
        // check admin balance
        expect(await contract.connect(admin).balanceOf(admin.address, ARTEQ)).to.equal(10 ** 10);
        // setup treasury account
        await contract.connect(admin).setTreasuryAccount(treasury1.address);
        // check the treasury balance
        expect(await contract.connect(admin).balanceOf(treasury1.address, ARTEQ)).to.equal(0);
        // setup exchange account
        await contract.connect(admin).setExchange1Account(exchange.address);
        // check the treasury balance
        expect(await contract.connect(admin).balanceOf(exchange.address, ARTEQ)).to.equal(0);
        // transfer some tokens to treasury
        await contract.connect(admin).safeTransferFrom(admin.address, treasury1.address, ARTEQ, 1000, []);
        // transfer some tokens to exchange
        await contract.connect(admin).safeTransferFrom(admin.address, exchange.address, ARTEQ, 10000, []);

        // check the balances of governors before any transfer
        expect(await contract.connect(admin).balanceOf(governor1.address, ARTEQ)).to.equal(0);
        expect(await contract.connect(admin).balanceOf(governor2.address, ARTEQ)).to.equal(0);
        expect(await contract.connect(admin).balanceOf(governor3.address, ARTEQ)).to.equal(0);
        expect(await contract.connect(admin).balanceOf(governor1.address, gARTEQ)).to.equal(0);
        expect(await contract.connect(admin).balanceOf(governor2.address, gARTEQ)).to.equal(0);
        expect(await contract.connect(admin).balanceOf(governor3.address, gARTEQ)).to.equal(0);
        // transfer some ARTEQ tokens to governor 1
        await contract.connect(admin).safeTransferFrom(admin.address, governor1.address, ARTEQ, 100, []);
        // transfer some ARTEQ tokens to governor 2
        await contract.connect(admin).safeTransferFrom(admin.address, governor2.address, ARTEQ, 200, []);
        // transfer some ARTEQ tokens to governor 3
        await contract.connect(admin).safeTransferFrom(admin.address, governor3.address, ARTEQ, 300, []);
        // transfer some gARTEQ tokens to governor 1
        await contract.connect(admin).safeTransferFrom(admin.address, governor1.address, gARTEQ, 4000, []);
        // transfer some gARTEQ tokens to governor 2
        await contract.connect(admin).safeTransferFrom(admin.address, governor2.address, gARTEQ, 2500, []);
        // transfer some gARTEQ tokens to governor 3
        await contract.connect(admin).safeTransferFrom(admin.address, governor3.address, gARTEQ, 3500, []);

        // check the balances again
        expect(await contract.connect(admin).totalSupply(ARTEQ)).to.equal(10 ** 10);
        expect(await contract.connect(admin).totalSupply(gARTEQ)).to.equal(10 ** 6);
        expect(await contract.connect(admin).balanceOf(admin.address, ARTEQ)).to.equal(10 ** 10 - 1000 - 10000 - 100 - 200 - 300);
        expect(await contract.connect(admin).balanceOf(treasury1.address, ARTEQ)).to.equal(1000);
        expect(await contract.connect(admin).balanceOf(exchange.address, ARTEQ)).to.equal(10000);
        expect(await contract.connect(admin).balanceOf(governor1.address, ARTEQ)).to.equal(100);
        expect(await contract.connect(admin).balanceOf(governor2.address, ARTEQ)).to.equal(200);
        expect(await contract.connect(admin).balanceOf(governor3.address, ARTEQ)).to.equal(300);
        expect(await contract.connect(admin).balanceOf(admin.address, gARTEQ)).to.equal(10 ** 6 - 4000 - 2500 - 3500);
        expect(await contract.connect(admin).balanceOf(treasury1.address, gARTEQ)).to.equal(0);
        expect(await contract.connect(admin).balanceOf(exchange.address, gARTEQ)).to.equal(0);
        expect(await contract.connect(admin).balanceOf(governor1.address, gARTEQ)).to.equal(4000);
        expect(await contract.connect(admin).balanceOf(governor2.address, gARTEQ)).to.equal(2500);
        expect(await contract.connect(admin).balanceOf(governor3.address, gARTEQ)).to.equal(3500);
        expect(await contract.connect(admin).totalCirculatingGovernanceTokens()).to.equal(4000 + 2500 + 3500);
        expect(await contract.connect(admin).profitTokensTransferredToAccounts()).to.equal(0);

        // round 1: simulate a small deposit from the exchange account (Uniswap V1 compatible contract)
        await contract.connect(exchange).safeTransferFrom(exchange.address, treasury1.address, ARTEQ, 10, []);
        // check the balances
        expect(await contract.connect(admin).allTimeProfit()).to.equal(2);
        expect(await contract.connect(admin).balanceOf(treasury1.address, ARTEQ)).to.equal(1000 + 8);
        expect(await contract.connect(admin).profitTokensTransferredToAccounts()).to.equal(0);

        // check governors' balances
        expect(await contract.connect(admin).balanceOf(governor1.address, ARTEQ)).to.equal(100);
        expect(await contract.connect(admin).balanceOf(governor2.address, ARTEQ)).to.equal(200);
        expect(await contract.connect(admin).balanceOf(governor3.address, ARTEQ)).to.equal(300);
        expect(await contract.connect(admin).balanceOf(governor1.address, gARTEQ)).to.equal(4000);
        expect(await contract.connect(admin).balanceOf(governor2.address, gARTEQ)).to.equal(2500);
        expect(await contract.connect(admin).balanceOf(governor3.address, gARTEQ)).to.equal(3500);
        expect(await contract.connect(admin).profitTokensTransferredToAccounts()).to.equal(0);

        // round 2: simulate another bigger deposit from the exchange account (Uniswap V1 compatible contract)
        await contract.connect(exchange).safeTransferFrom(exchange.address, treasury1.address, ARTEQ, 90, []);
        // check the balances
        expect(await contract.connect(admin).allTimeProfit()).to.equal(2 + 18);
        expect(await contract.connect(admin).balanceOf(treasury1.address, ARTEQ)).to.equal(1000 + 8 + 72);
        expect(await contract.connect(admin).profitTokensTransferredToAccounts()).to.equal(0);

        // check governors' balances
        expect(await contract.connect(admin).balanceOf(governor1.address, ARTEQ)).to.equal(100 + 8);
        expect(await contract.connect(admin).balanceOf(governor2.address, ARTEQ)).to.equal(200 + 5);
        expect(await contract.connect(admin).balanceOf(governor3.address, ARTEQ)).to.equal(300 + 7);
        expect(await contract.connect(admin).balanceOf(governor1.address, gARTEQ)).to.equal(4000);
        expect(await contract.connect(admin).balanceOf(governor2.address, gARTEQ)).to.equal(2500);
        expect(await contract.connect(admin).balanceOf(governor3.address, gARTEQ)).to.equal(3500);
        expect(await contract.connect(admin).profitTokensTransferredToAccounts()).to.equal(0);
    });

    it("[profit distribution] treasury receives some ARTEQ tokens from exchnage account and distribute the profit among gARTEQ holders (2)", async() => {
        // check admin balance
        expect(await contract.connect(admin).balanceOf(admin.address, ARTEQ)).to.equal(10 ** 10);
        // setup treasury account
        await contract.connect(admin).setTreasuryAccount(treasury1.address);
        // check the treasury balance
        expect(await contract.connect(admin).balanceOf(treasury1.address, ARTEQ)).to.equal(0);
        // setup exchange account
        await contract.connect(admin).setExchange1Account(exchange.address);
        // check the treasury balance
        expect(await contract.connect(admin).balanceOf(exchange.address, ARTEQ)).to.equal(0);
        // transfer some tokens to treasury
        await contract.connect(admin).safeTransferFrom(admin.address, treasury1.address, ARTEQ, 1000, []);
        // transfer some tokens to exchange
        await contract.connect(admin).safeTransferFrom(admin.address, exchange.address, ARTEQ, 10000, []);

        // check the balances of governors before any transfer
        expect(await contract.connect(admin).balanceOf(governor1.address, ARTEQ)).to.equal(0);
        expect(await contract.connect(admin).balanceOf(governor2.address, ARTEQ)).to.equal(0);
        expect(await contract.connect(admin).balanceOf(governor3.address, ARTEQ)).to.equal(0);
        expect(await contract.connect(admin).balanceOf(governor1.address, gARTEQ)).to.equal(0);
        expect(await contract.connect(admin).balanceOf(governor2.address, gARTEQ)).to.equal(0);
        expect(await contract.connect(admin).balanceOf(governor3.address, gARTEQ)).to.equal(0);
        // transfer some ARTEQ tokens to governor 1
        await contract.connect(admin).safeTransferFrom(admin.address, governor1.address, ARTEQ, 100, []);
        // transfer some ARTEQ tokens to governor 2
        await contract.connect(admin).safeTransferFrom(admin.address, governor2.address, ARTEQ, 200, []);
        // transfer some ARTEQ tokens to governor 3
        await contract.connect(admin).safeTransferFrom(admin.address, governor3.address, ARTEQ, 300, []);
        // transfer some gARTEQ tokens to governor 1
        await contract.connect(admin).safeTransferFrom(admin.address, governor1.address, gARTEQ, 2000, []);
        // transfer some gARTEQ tokens to governor 2
        await contract.connect(admin).safeTransferFrom(admin.address, governor2.address, gARTEQ, 1500, []);
        // transfer some gARTEQ tokens to governor 3
        await contract.connect(admin).safeTransferFrom(admin.address, governor3.address, gARTEQ, 3500, []);

        // check the balances again
        expect(await contract.connect(admin).totalSupply(ARTEQ)).to.equal(10 ** 10);
        expect(await contract.connect(admin).totalSupply(gARTEQ)).to.equal(10 ** 6);
        expect(await contract.connect(admin).balanceOf(admin.address, ARTEQ)).to.equal(10 ** 10 - 1000 - 10000 - 100 - 200 - 300);
        expect(await contract.connect(admin).balanceOf(treasury1.address, ARTEQ)).to.equal(1000);
        expect(await contract.connect(admin).balanceOf(exchange.address, ARTEQ)).to.equal(10000);
        expect(await contract.connect(admin).balanceOf(governor1.address, ARTEQ)).to.equal(100);
        expect(await contract.connect(admin).balanceOf(governor2.address, ARTEQ)).to.equal(200);
        expect(await contract.connect(admin).balanceOf(governor3.address, ARTEQ)).to.equal(300);
        expect(await contract.connect(admin).balanceOf(admin.address, gARTEQ)).to.equal(10 ** 6 - 2000 - 1500 - 3500);
        expect(await contract.connect(admin).balanceOf(treasury1.address, gARTEQ)).to.equal(0);
        expect(await contract.connect(admin).balanceOf(exchange.address, gARTEQ)).to.equal(0);
        expect(await contract.connect(admin).balanceOf(governor1.address, gARTEQ)).to.equal(2000);
        expect(await contract.connect(admin).balanceOf(governor2.address, gARTEQ)).to.equal(1500);
        expect(await contract.connect(admin).balanceOf(governor3.address, gARTEQ)).to.equal(3500);
        expect(await contract.connect(admin).totalCirculatingGovernanceTokens()).to.equal(2000 + 1500 + 3500);
        expect(await contract.connect(admin).profitTokensTransferredToAccounts()).to.equal(0);

        // simulate a deposit from the exchange account (Uniswap V1 compatible contract)
        const call = contract.connect(exchange).safeTransferFrom(exchange.address, treasury1.address, ARTEQ, 79, []);
        const tx = await call;
        receipt = await tx.wait();
        expect(receipt.logs.length).to.equal(2);
        await expect(call).to.emit(contract, "TransferSingle").withArgs(exchange.address, exchange.address, treasury1.address, ARTEQ, 79);
        await expect(call).to.emit(contract, "ProfitTokensCollected").withArgs(15);
        // check the balances
        expect(await contract.connect(admin).allTimeProfit()).to.equal(15);
        expect(await contract.connect(admin).balanceOf(treasury1.address, ARTEQ)).to.equal(1000 + 64);
        expect(await contract.connect(admin).profitTokensTransferredToAccounts()).to.equal(0);

        // check governors' balances
        expect(await contract.connect(admin).balanceOf(governor1.address, ARTEQ)).to.equal(100 + 4);
        expect(await contract.connect(admin).balanceOf(governor2.address, ARTEQ)).to.equal(200 + 3);
        expect(await contract.connect(admin).balanceOf(governor3.address, ARTEQ)).to.equal(300 + 7);
        expect(await contract.connect(admin).balanceOf(governor1.address, gARTEQ)).to.equal(2000);
        expect(await contract.connect(admin).balanceOf(governor2.address, gARTEQ)).to.equal(1500);
        expect(await contract.connect(admin).balanceOf(governor3.address, gARTEQ)).to.equal(3500);
        expect(await contract.connect(admin).profitTokensTransferredToAccounts()).to.equal(0);
    });

    it("[profit distribution] transfer of gARTEQ token among governors before and after profit distribution", async() => {
        // check admin balance
        expect(await contract.connect(admin).balanceOf(admin.address, ARTEQ)).to.equal(10 ** 10);
        // setup treasury account
        await contract.connect(admin).setTreasuryAccount(treasury1.address);
        // check the treasury balance
        expect(await contract.connect(admin).balanceOf(treasury1.address, ARTEQ)).to.equal(0);
        // setup exchange account
        await contract.connect(admin).setExchange1Account(exchange.address);
        // check the treasury balance
        expect(await contract.connect(admin).balanceOf(exchange.address, ARTEQ)).to.equal(0);
        // transfer some tokens to treasury
        await contract.connect(admin).safeTransferFrom(admin.address, treasury1.address, ARTEQ, 1000, []);
        // transfer some tokens to exchange
        await contract.connect(admin).safeTransferFrom(admin.address, exchange.address, ARTEQ, 10000, []);

        // check the balances of governors before any transfer
        expect(await contract.connect(admin).balanceOf(governor1.address, ARTEQ)).to.equal(0);
        expect(await contract.connect(admin).balanceOf(governor2.address, ARTEQ)).to.equal(0);
        expect(await contract.connect(admin).balanceOf(governor3.address, ARTEQ)).to.equal(0);
        expect(await contract.connect(admin).balanceOf(governor1.address, gARTEQ)).to.equal(0);
        expect(await contract.connect(admin).balanceOf(governor2.address, gARTEQ)).to.equal(0);
        expect(await contract.connect(admin).balanceOf(governor3.address, gARTEQ)).to.equal(0);
        // transfer some ARTEQ tokens to governor 1
        await contract.connect(admin).safeTransferFrom(admin.address, governor1.address, ARTEQ, 100, []);
        // transfer some ARTEQ tokens to governor 2
        await contract.connect(admin).safeTransferFrom(admin.address, governor2.address, ARTEQ, 200, []);
        // transfer some ARTEQ tokens to governor 3
        await contract.connect(admin).safeTransferFrom(admin.address, governor3.address, ARTEQ, 300, []);
        // transfer some gARTEQ tokens to governor 1
        await contract.connect(admin).safeTransferFrom(admin.address, governor1.address, gARTEQ, 4000, []);
        // transfer some gARTEQ tokens to governor 2
        await contract.connect(admin).safeTransferFrom(admin.address, governor2.address, gARTEQ, 2500, []);
        // transfer some gARTEQ tokens to governor 3
        await contract.connect(admin).safeTransferFrom(admin.address, governor3.address, gARTEQ, 3500, []);

        // check the balances again
        expect(await contract.connect(admin).totalSupply(ARTEQ)).to.equal(10 ** 10);
        expect(await contract.connect(admin).totalSupply(gARTEQ)).to.equal(10 ** 6);
        expect(await contract.connect(admin).balanceOf(admin.address, ARTEQ)).to.equal(10 ** 10 - 1000 - 10000 - 100 - 200 - 300);
        expect(await contract.connect(admin).balanceOf(treasury1.address, ARTEQ)).to.equal(1000);
        expect(await contract.connect(admin).balanceOf(exchange.address, ARTEQ)).to.equal(10000);
        expect(await contract.connect(admin).balanceOf(governor1.address, ARTEQ)).to.equal(100);
        expect(await contract.connect(admin).balanceOf(governor2.address, ARTEQ)).to.equal(200);
        expect(await contract.connect(admin).balanceOf(governor3.address, ARTEQ)).to.equal(300);
        expect(await contract.connect(admin).balanceOf(admin.address, gARTEQ)).to.equal(10 ** 6 - 4000 - 2500 - 3500);
        expect(await contract.connect(admin).balanceOf(treasury1.address, gARTEQ)).to.equal(0);
        expect(await contract.connect(admin).balanceOf(exchange.address, gARTEQ)).to.equal(0);
        expect(await contract.connect(admin).balanceOf(governor1.address, gARTEQ)).to.equal(4000);
        expect(await contract.connect(admin).balanceOf(governor2.address, gARTEQ)).to.equal(2500);
        expect(await contract.connect(admin).balanceOf(governor3.address, gARTEQ)).to.equal(3500);
        expect(await contract.connect(admin).totalCirculatingGovernanceTokens()).to.equal(4000 + 2500 + 3500);
        expect(await contract.connect(admin).profitTokensTransferredToAccounts()).to.equal(0);

        // round 1: simulate a deposit from the exchange account (Uniswap V1 compatible contract)
        await contract.connect(exchange).safeTransferFrom(exchange.address, treasury1.address, ARTEQ, 100, []);
        // check the balances
        expect(await contract.connect(admin).allTimeProfit()).to.equal(20);
        expect(await contract.connect(admin).balanceOf(treasury1.address, ARTEQ)).to.equal(1000 + 80);
        expect(await contract.connect(admin).profitTokensTransferredToAccounts()).to.equal(0);

        // check governors' balances
        expect(await contract.connect(admin).balanceOf(governor1.address, ARTEQ)).to.equal(100 + 8);
        expect(await contract.connect(admin).balanceOf(governor2.address, ARTEQ)).to.equal(200 + 5);
        expect(await contract.connect(admin).balanceOf(governor3.address, ARTEQ)).to.equal(300 + 7);
        expect(await contract.connect(admin).balanceOf(governor1.address, gARTEQ)).to.equal(4000);
        expect(await contract.connect(admin).balanceOf(governor2.address, gARTEQ)).to.equal(2500);
        expect(await contract.connect(admin).balanceOf(governor3.address, gARTEQ)).to.equal(3500);
        expect(await contract.connect(admin).profitTokensTransferredToAccounts()).to.equal(0);

        // now, governors exchange gARTEQ tokens
        await contract.connect(governor3).safeTransferFrom(governor3.address, governor2.address, gARTEQ, 500, []);
        expect(await contract.connect(admin).balanceOf(governor1.address, ARTEQ)).to.equal(100 + 8);
        expect(await contract.connect(admin).balanceOf(governor2.address, ARTEQ)).to.equal(200 + 5);
        expect(await contract.connect(admin).balanceOf(governor3.address, ARTEQ)).to.equal(300 + 7);
        expect(await contract.connect(admin).balanceOf(governor1.address, gARTEQ)).to.equal(4000);
        expect(await contract.connect(admin).balanceOf(governor2.address, gARTEQ)).to.equal(3000);
        expect(await contract.connect(admin).balanceOf(governor3.address, gARTEQ)).to.equal(3000);
        expect(await contract.connect(admin).profitTokensTransferredToAccounts()).to.equal(5 + 7);

        // round 2: simulate another deposit from the exchange account (Uniswap V1 compatible contract)
        await contract.connect(exchange).safeTransferFrom(exchange.address, treasury1.address, ARTEQ, 100, []);
        // check the balances
        expect(await contract.connect(admin).allTimeProfit()).to.equal(20 + 20);
        expect(await contract.connect(admin).balanceOf(treasury1.address, ARTEQ)).to.equal(1000 + 80 + 80);
        expect(await contract.connect(admin).profitTokensTransferredToAccounts()).to.equal(5 + 7);

        // check governors' balances
        expect(await contract.connect(admin).balanceOf(governor1.address, ARTEQ)).to.equal(100 + 8 + 8);
        expect(await contract.connect(admin).balanceOf(governor2.address, ARTEQ)).to.equal(200 + 5 + 6);
        expect(await contract.connect(admin).balanceOf(governor3.address, ARTEQ)).to.equal(300 + 7 + 6);
        expect(await contract.connect(admin).balanceOf(governor1.address, gARTEQ)).to.equal(4000);
        expect(await contract.connect(admin).balanceOf(governor2.address, gARTEQ)).to.equal(3000);
        expect(await contract.connect(admin).balanceOf(governor3.address, gARTEQ)).to.equal(3000);
        expect(await contract.connect(admin).profitTokensTransferredToAccounts()).to.equal(5 + 7);
    });

    it("[profit distribution] transfer of gARTEQ token to a new account before and after profit distribution", async() => {
        // check admin balance
        expect(await contract.connect(admin).balanceOf(admin.address, ARTEQ)).to.equal(10 ** 10);
        // setup treasury account
        await contract.connect(admin).setTreasuryAccount(treasury1.address);
        // check the treasury balance
        expect(await contract.connect(admin).balanceOf(treasury1.address, ARTEQ)).to.equal(0);
        // setup exchange account
        await contract.connect(admin).setExchange1Account(exchange.address);
        // check the treasury balance
        expect(await contract.connect(admin).balanceOf(exchange.address, ARTEQ)).to.equal(0);
        // transfer some tokens to treasury
        await contract.connect(admin).safeTransferFrom(admin.address, treasury1.address, ARTEQ, 1000, []);
        // transfer some tokens to exchange
        await contract.connect(admin).safeTransferFrom(admin.address, exchange.address, ARTEQ, 10000, []);

        // check the balances of governors before any transfer
        expect(await contract.connect(admin).balanceOf(governor1.address, ARTEQ)).to.equal(0);
        expect(await contract.connect(admin).balanceOf(governor2.address, ARTEQ)).to.equal(0);
        expect(await contract.connect(admin).balanceOf(governor3.address, ARTEQ)).to.equal(0);
        expect(await contract.connect(admin).balanceOf(governor1.address, gARTEQ)).to.equal(0);
        expect(await contract.connect(admin).balanceOf(governor2.address, gARTEQ)).to.equal(0);
        expect(await contract.connect(admin).balanceOf(governor3.address, gARTEQ)).to.equal(0);
        // transfer some ARTEQ tokens to governor 1
        await contract.connect(admin).safeTransferFrom(admin.address, governor1.address, ARTEQ, 100, []);
        // transfer some ARTEQ tokens to governor 2
        await contract.connect(admin).safeTransferFrom(admin.address, governor2.address, ARTEQ, 200, []);
        // transfer some ARTEQ tokens to governor 3
        await contract.connect(admin).safeTransferFrom(admin.address, governor3.address, ARTEQ, 300, []);
        // transfer some gARTEQ tokens to governor 1
        await contract.connect(admin).safeTransferFrom(admin.address, governor1.address, gARTEQ, 4000, []);
        // transfer some gARTEQ tokens to governor 2
        await contract.connect(admin).safeTransferFrom(admin.address, governor2.address, gARTEQ, 2500, []);
        // transfer some gARTEQ tokens to governor 3
        await contract.connect(admin).safeTransferFrom(admin.address, governor3.address, gARTEQ, 3500, []);

        // check the balances again
        expect(await contract.connect(admin).totalSupply(ARTEQ)).to.equal(10 ** 10);
        expect(await contract.connect(admin).totalSupply(gARTEQ)).to.equal(10 ** 6);
        expect(await contract.connect(admin).balanceOf(admin.address, ARTEQ)).to.equal(10 ** 10 - 1000 - 10000 - 100 - 200 - 300);
        expect(await contract.connect(admin).balanceOf(treasury1.address, ARTEQ)).to.equal(1000);
        expect(await contract.connect(admin).balanceOf(exchange.address, ARTEQ)).to.equal(10000);
        expect(await contract.connect(admin).balanceOf(governor1.address, ARTEQ)).to.equal(100);
        expect(await contract.connect(admin).balanceOf(governor2.address, ARTEQ)).to.equal(200);
        expect(await contract.connect(admin).balanceOf(governor3.address, ARTEQ)).to.equal(300);
        expect(await contract.connect(admin).balanceOf(admin.address, gARTEQ)).to.equal(10 ** 6 - 4000 - 2500 - 3500);
        expect(await contract.connect(admin).balanceOf(treasury1.address, gARTEQ)).to.equal(0);
        expect(await contract.connect(admin).balanceOf(exchange.address, gARTEQ)).to.equal(0);
        expect(await contract.connect(admin).balanceOf(governor1.address, gARTEQ)).to.equal(4000);
        expect(await contract.connect(admin).balanceOf(governor2.address, gARTEQ)).to.equal(2500);
        expect(await contract.connect(admin).balanceOf(governor3.address, gARTEQ)).to.equal(3500);
        expect(await contract.connect(admin).balanceOf(trader1.address, ARTEQ)).to.equal(0);
        expect(await contract.connect(admin).balanceOf(trader1.address, gARTEQ)).to.equal(0);
        expect(await contract.connect(admin).totalCirculatingGovernanceTokens()).to.equal(4000 + 2500 + 3500);
        expect(await contract.connect(admin).profitTokensTransferredToAccounts()).to.equal(0);

        // round 1: simulate a deposit from the exchange account (Uniswap V1 compatible contract)
        await contract.connect(exchange).safeTransferFrom(exchange.address, treasury1.address, ARTEQ, 100, []);
        // check the balances
        expect(await contract.connect(admin).allTimeProfit()).to.equal(20);
        expect(await contract.connect(admin).balanceOf(treasury1.address, ARTEQ)).to.equal(1000 + 80);
        expect(await contract.connect(admin).profitTokensTransferredToAccounts()).to.equal(0);

        // check governors' balances
        expect(await contract.connect(admin).balanceOf(governor1.address, ARTEQ)).to.equal(100 + 8);
        expect(await contract.connect(admin).balanceOf(governor2.address, ARTEQ)).to.equal(200 + 5);
        expect(await contract.connect(admin).balanceOf(governor3.address, ARTEQ)).to.equal(300 + 7);
        expect(await contract.connect(admin).balanceOf(trader1.address, ARTEQ)).to.equal(0);
        expect(await contract.connect(admin).balanceOf(governor1.address, gARTEQ)).to.equal(4000);
        expect(await contract.connect(admin).balanceOf(governor2.address, gARTEQ)).to.equal(2500);
        expect(await contract.connect(admin).balanceOf(governor3.address, gARTEQ)).to.equal(3500);
        expect(await contract.connect(admin).balanceOf(trader1.address, gARTEQ)).to.equal(0);
        expect(await contract.connect(admin).profitTokensTransferredToAccounts()).to.equal(0);

        // now, governors exchange gARTEQ tokens
        await contract.connect(governor3).safeTransferFrom(governor3.address, trader1.address, gARTEQ, 500, []);
        expect(await contract.connect(admin).balanceOf(governor1.address, ARTEQ)).to.equal(100 + 8);
        expect(await contract.connect(admin).balanceOf(governor2.address, ARTEQ)).to.equal(200 + 5);
        expect(await contract.connect(admin).balanceOf(governor3.address, ARTEQ)).to.equal(300 + 7);
        expect(await contract.connect(admin).balanceOf(trader1.address, ARTEQ)).to.equal(0);
        expect(await contract.connect(admin).balanceOf(governor1.address, gARTEQ)).to.equal(4000);
        expect(await contract.connect(admin).balanceOf(governor2.address, gARTEQ)).to.equal(2500);
        expect(await contract.connect(admin).balanceOf(governor3.address, gARTEQ)).to.equal(3000);
        expect(await contract.connect(admin).balanceOf(trader1.address, gARTEQ)).to.equal(500);
        expect(await contract.connect(admin).profitTokensTransferredToAccounts()).to.equal(7 + 0);

        // round 2: simulate another deposit from the exchange account (Uniswap V1 compatible contract)
        await contract.connect(exchange).safeTransferFrom(exchange.address, treasury1.address, ARTEQ, 100, []);
        // check the balances
        expect(await contract.connect(admin).allTimeProfit()).to.equal(20 + 20);
        expect(await contract.connect(admin).balanceOf(treasury1.address, ARTEQ)).to.equal(1000 + 80 + 80);
        expect(await contract.connect(admin).profitTokensTransferredToAccounts()).to.equal(7 + 0);

        // check governors' balances
        expect(await contract.connect(admin).balanceOf(governor1.address, ARTEQ)).to.equal(100 + 8 + 8);
        expect(await contract.connect(admin).balanceOf(governor2.address, ARTEQ)).to.equal(200 + 5 + 5);
        expect(await contract.connect(admin).balanceOf(governor3.address, ARTEQ)).to.equal(300 + 7 + 6);
        expect(await contract.connect(admin).balanceOf(trader1.address, ARTEQ)).to.equal(1);
        expect(await contract.connect(admin).balanceOf(governor1.address, gARTEQ)).to.equal(4000);
        expect(await contract.connect(admin).balanceOf(governor2.address, gARTEQ)).to.equal(2500);
        expect(await contract.connect(admin).balanceOf(governor3.address, gARTEQ)).to.equal(3000);
        expect(await contract.connect(admin).balanceOf(trader1.address, gARTEQ)).to.equal(500);
        expect(await contract.connect(admin).profitTokensTransferredToAccounts()).to.equal(7 + 0);

        // again, governors exchange gARTEQ tokens
        await contract.connect(governor3).safeTransferFrom(governor3.address, governor2.address, gARTEQ, 3000, []);
        expect(await contract.connect(admin).balanceOf(governor1.address, ARTEQ)).to.equal(100 + 8 + 8);
        expect(await contract.connect(admin).balanceOf(governor2.address, ARTEQ)).to.equal(200 + 5 + 5);
        expect(await contract.connect(admin).balanceOf(governor3.address, ARTEQ)).to.equal(300 + 7 + 6);
        expect(await contract.connect(admin).balanceOf(trader1.address, ARTEQ)).to.equal(1);
        expect(await contract.connect(admin).balanceOf(governor1.address, gARTEQ)).to.equal(4000);
        expect(await contract.connect(admin).balanceOf(governor2.address, gARTEQ)).to.equal(5500);
        expect(await contract.connect(admin).balanceOf(governor3.address, gARTEQ)).to.equal(0);
        expect(await contract.connect(admin).balanceOf(trader1.address, gARTEQ)).to.equal(500);
        expect(await contract.connect(admin).profitTokensTransferredToAccounts()).to.equal(7 + 0 + 6 + 5 + 5);

        // round 3: simulate another deposit from the exchange account (Uniswap V1 compatible contract)
        await contract.connect(exchange).safeTransferFrom(exchange.address, treasury1.address, ARTEQ, 100, []);
        // check the balances
        expect(await contract.connect(admin).allTimeProfit()).to.equal(20 + 20 + 20);
        expect(await contract.connect(admin).balanceOf(treasury1.address, ARTEQ)).to.equal(1000 + 80 + 80 + 80);
        expect(await contract.connect(admin).profitTokensTransferredToAccounts()).to.equal(7 + 0 + 6 + 5 + 5);

        // check governors' balances
        expect(await contract.connect(admin).balanceOf(governor1.address, ARTEQ)).to.equal(100 + 8 + 8 + 8);
        expect(await contract.connect(admin).balanceOf(governor2.address, ARTEQ)).to.equal(200 + 5 + 5 + 11);
        expect(await contract.connect(admin).balanceOf(governor3.address, ARTEQ)).to.equal(300 + 7 + 6);
        expect(await contract.connect(admin).balanceOf(trader1.address, ARTEQ)).to.equal(1 + 1);
        expect(await contract.connect(admin).balanceOf(governor1.address, gARTEQ)).to.equal(4000);
        expect(await contract.connect(admin).balanceOf(governor2.address, gARTEQ)).to.equal(5500);
        expect(await contract.connect(admin).balanceOf(governor3.address, gARTEQ)).to.equal(0);
        expect(await contract.connect(admin).balanceOf(trader1.address, gARTEQ)).to.equal(500);
        expect(await contract.connect(admin).profitTokensTransferredToAccounts()).to.equal(7 + 0 + 6 + 5 + 5);
    });

    it("[profit distribution] transfer of ARTEQ must trigger the transfer of profit tokens to the involved accounts", async() => {
        // check admin balance
        expect(await contract.connect(admin).balanceOf(admin.address, ARTEQ)).to.equal(10 ** 10);
        // setup treasury account
        await contract.connect(admin).setTreasuryAccount(treasury1.address);
        // check the treasury balance
        expect(await contract.connect(admin).balanceOf(treasury1.address, ARTEQ)).to.equal(0);
        // setup exchange account
        await contract.connect(admin).setExchange1Account(exchange.address);
        // check the treasury balance
        expect(await contract.connect(admin).balanceOf(exchange.address, ARTEQ)).to.equal(0);
        // transfer some tokens to treasury
        await contract.connect(admin).safeTransferFrom(admin.address, treasury1.address, ARTEQ, 1000, []);
        // transfer some tokens to exchange
        await contract.connect(admin).safeTransferFrom(admin.address, exchange.address, ARTEQ, 10000, []);

        // check the balances of governors before any transfer
        expect(await contract.connect(admin).balanceOf(governor1.address, ARTEQ)).to.equal(0);
        expect(await contract.connect(admin).balanceOf(governor2.address, ARTEQ)).to.equal(0);
        expect(await contract.connect(admin).balanceOf(governor3.address, ARTEQ)).to.equal(0);
        expect(await contract.connect(admin).balanceOf(governor1.address, gARTEQ)).to.equal(0);
        expect(await contract.connect(admin).balanceOf(governor2.address, gARTEQ)).to.equal(0);
        expect(await contract.connect(admin).balanceOf(governor3.address, gARTEQ)).to.equal(0);
        // transfer some ARTEQ tokens to governor 1
        await contract.connect(admin).safeTransferFrom(admin.address, governor1.address, ARTEQ, 100, []);
        // transfer some ARTEQ tokens to governor 2
        await contract.connect(admin).safeTransferFrom(admin.address, governor2.address, ARTEQ, 200, []);
        // transfer some ARTEQ tokens to governor 3
        await contract.connect(admin).safeTransferFrom(admin.address, governor3.address, ARTEQ, 300, []);
        // transfer some gARTEQ tokens to governor 1
        await contract.connect(admin).safeTransferFrom(admin.address, governor1.address, gARTEQ, 4000, []);
        // transfer some gARTEQ tokens to governor 2
        await contract.connect(admin).safeTransferFrom(admin.address, governor2.address, gARTEQ, 2500, []);
        // transfer some gARTEQ tokens to governor 3
        await contract.connect(admin).safeTransferFrom(admin.address, governor3.address, gARTEQ, 3500, []);

        // check the balances again
        expect(await contract.connect(admin).totalSupply(ARTEQ)).to.equal(10 ** 10);
        expect(await contract.connect(admin).totalSupply(gARTEQ)).to.equal(10 ** 6);
        expect(await contract.connect(admin).balanceOf(admin.address, ARTEQ)).to.equal(10 ** 10 - 1000 - 10000 - 100 - 200 - 300);
        expect(await contract.connect(admin).balanceOf(treasury1.address, ARTEQ)).to.equal(1000);
        expect(await contract.connect(admin).balanceOf(exchange.address, ARTEQ)).to.equal(10000);
        expect(await contract.connect(admin).balanceOf(governor1.address, ARTEQ)).to.equal(100);
        expect(await contract.connect(admin).balanceOf(governor2.address, ARTEQ)).to.equal(200);
        expect(await contract.connect(admin).balanceOf(governor3.address, ARTEQ)).to.equal(300);
        expect(await contract.connect(admin).balanceOf(admin.address, gARTEQ)).to.equal(10 ** 6 - 4000 - 2500 - 3500);
        expect(await contract.connect(admin).balanceOf(treasury1.address, gARTEQ)).to.equal(0);
        expect(await contract.connect(admin).balanceOf(exchange.address, gARTEQ)).to.equal(0);
        expect(await contract.connect(admin).balanceOf(governor1.address, gARTEQ)).to.equal(4000);
        expect(await contract.connect(admin).balanceOf(governor2.address, gARTEQ)).to.equal(2500);
        expect(await contract.connect(admin).balanceOf(governor3.address, gARTEQ)).to.equal(3500);
        expect(await contract.connect(admin).totalCirculatingGovernanceTokens()).to.equal(4000 + 2500 + 3500);
        expect(await contract.connect(admin).profitTokensTransferredToAccounts()).to.equal(0);

        // round 1: simulate a deposit from the exchange account (Uniswap V1 compatible contract)
        await contract.connect(exchange).safeTransferFrom(exchange.address, treasury1.address, ARTEQ, 100, []);
        // check the balances
        expect(await contract.connect(admin).allTimeProfit()).to.equal(20);
        expect(await contract.connect(admin).balanceOf(treasury1.address, ARTEQ)).to.equal(1000 + 80);
        expect(await contract.connect(admin).profitTokensTransferredToAccounts()).to.equal(0);

        // check governors' balances
        expect(await contract.connect(admin).balanceOf(governor1.address, ARTEQ)).to.equal(100 + 8);
        expect(await contract.connect(admin).balanceOf(governor2.address, ARTEQ)).to.equal(200 + 5);
        expect(await contract.connect(admin).balanceOf(governor3.address, ARTEQ)).to.equal(300 + 7);
        expect(await contract.connect(admin).balanceOf(governor1.address, gARTEQ)).to.equal(4000);
        expect(await contract.connect(admin).balanceOf(governor2.address, gARTEQ)).to.equal(2500);
        expect(await contract.connect(admin).balanceOf(governor3.address, gARTEQ)).to.equal(3500);
        expect(await contract.connect(admin).profitTokensTransferredToAccounts()).to.equal(0);

        // now, governors exchange ARTEQ tokens
        await contract.connect(governor3).safeTransferFrom(governor3.address, governor2.address, ARTEQ, 100, []);
        expect(await contract.connect(admin).balanceOf(governor1.address, ARTEQ)).to.equal(100 + 8);
        expect(await contract.connect(admin).balanceOf(governor2.address, ARTEQ)).to.equal(300 + 5);
        expect(await contract.connect(admin).balanceOf(governor3.address, ARTEQ)).to.equal(200 + 7);
        expect(await contract.connect(admin).balanceOf(governor1.address, gARTEQ)).to.equal(4000);
        expect(await contract.connect(admin).balanceOf(governor2.address, gARTEQ)).to.equal(2500);
        expect(await contract.connect(admin).balanceOf(governor3.address, gARTEQ)).to.equal(3500);
        expect(await contract.connect(admin).profitTokensTransferredToAccounts()).to.equal(5 + 7);

        // change profit percentage
        await contract.setProfitPercentage(45);

        // round 1: simulate a deposit from the exchange account (Uniswap V1 compatible contract)
        await contract.connect(exchange).safeTransferFrom(exchange.address, treasury1.address, ARTEQ, 100, []);
        // check the balances
        expect(await contract.connect(admin).allTimeProfit()).to.equal(20 + 45);
        expect(await contract.connect(admin).balanceOf(treasury1.address, ARTEQ)).to.equal(1000 + 80 + 55);
        expect(await contract.connect(admin).profitTokensTransferredToAccounts()).to.equal(5 + 7);

        // check governors' balances
        expect(await contract.connect(admin).balanceOf(governor1.address, ARTEQ)).to.equal(100 + 8 + 18);
        expect(await contract.connect(admin).balanceOf(governor2.address, ARTEQ)).to.equal(300 + 5 + 11);
        expect(await contract.connect(admin).balanceOf(governor3.address, ARTEQ)).to.equal(200 + 7 + 15);
        expect(await contract.connect(admin).balanceOf(governor1.address, gARTEQ)).to.equal(4000);
        expect(await contract.connect(admin).balanceOf(governor2.address, gARTEQ)).to.equal(2500);
        expect(await contract.connect(admin).balanceOf(governor3.address, gARTEQ)).to.equal(3500);
        expect(await contract.connect(admin).profitTokensTransferredToAccounts()).to.equal(5 + 7);
    });
});
