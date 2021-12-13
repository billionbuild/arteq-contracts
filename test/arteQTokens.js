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

const { expect } = require("chai");
const { ethers } = require("hardhat");

const ARTEQ = 1;
const gARTEQ = 2;

const zeroAddress = "0x0000000000000000000000000000000000000000";

describe("arteQ Tokens", function() {

    async function getApprovedTask() {
        const tx = await adminContract.connect(admin1).createTask("ipfs://AaBbCcDdEeFfGgHh");
        const receipt = await tx.wait();
        const taskId = receipt.events[0].args[1].toNumber();
        await adminContract.connect(admin1).approveTask(taskId);
        await adminContract.connect(admin2).approveTask(taskId);
        await adminContract.connect(admin3).approveTask(taskId);
        await adminContract.connect(admin4).approveTask(taskId);
        return taskId;
    }

    beforeEach(async () => {
        [
            deployer,
            admin1,
            admin2,
            admin3,
            admin4,
            admin5,
            admin6,
            treasury1,
            treasury2,
            governor1,
            governor2,
            governor3,
            trader1,
            trader2,
            exchange,
        ] = await ethers.getSigners();

        const arteQAdminContract = await hre.ethers.getContractFactory("arteQAdmin", admin3);
        adminContract = await arteQAdminContract.deploy([
            admin1.address,
            admin2.address,
            admin3.address,
            admin4.address,
            admin5.address,
            admin6.address,
        ]);
        await adminContract.deployed();
        // console.log("admin contract: " + adminContract.address);

        deployReceipt = await adminContract.deployTransaction.wait();
        expect(deployReceipt.logs.length).to.equal(7);
        await expect(adminContract.deployTransaction).to.emit(adminContract, "AdminAdded").withArgs(admin3.address, admin1.address);
        await expect(adminContract.deployTransaction).to.emit(adminContract, "AdminAdded").withArgs(admin3.address, admin2.address);
        await expect(adminContract.deployTransaction).to.emit(adminContract, "AdminAdded").withArgs(admin3.address, admin3.address);
        await expect(adminContract.deployTransaction).to.emit(adminContract, "AdminAdded").withArgs(admin3.address, admin4.address);
        await expect(adminContract.deployTransaction).to.emit(adminContract, "AdminAdded").withArgs(admin3.address, admin5.address);
        await expect(adminContract.deployTransaction).to.emit(adminContract, "AdminAdded").withArgs(admin3.address, admin6.address);
        await expect(adminContract.deployTransaction).to.emit(adminContract, "NewMinRequiredNrOfApprovalsSet").withArgs(admin3.address, 4);

        expect(await adminContract.connect(trader1).minNrOfAdmins()).to.equal(5);
        expect(await adminContract.connect(trader2).maxNrOfAdmins()).to.equal(10);
        expect(await adminContract.connect(trader1).nrOfAdmins()).to.equal(6);
        expect(await adminContract.connect(trader2).minRequiredNrOfApprovals()).to.equal(4);

        const arteQTokensContract = await hre.ethers.getContractFactory("arteQTokens", admin3);
        contract = await arteQTokensContract.deploy(adminContract.address);

        await contract.deployed();

        deployReceipt = await contract.deployTransaction.wait();
        expect(deployReceipt.logs.length).to.equal(4);
        await expect(contract.deployTransaction).to.emit(contract, "URI").withArgs("ipfs://QmfBtH8BSztaYn3QFnz2qvu2ehZgy8AZsNMJDkgr3pdqT8", ARTEQ);
        await expect(contract.deployTransaction).to.emit(contract, "URI").withArgs("ipfs://QmRAXmU9AymDgtphh37hqx5R2QXSS2ngchQRDFtg6XSD7w", gARTEQ);
        await expect(contract.deployTransaction).to.emit(contract, "TransferSingle").withArgs(admin3.address, zeroAddress, adminContract.address, ARTEQ, 10 ** 10);
        await expect(contract.deployTransaction).to.emit(contract, "TransferSingle").withArgs(admin3.address, zeroAddress, adminContract.address, gARTEQ, 10 ** 6);

        expect(await contract.connect(trader1).totalSupply(ARTEQ)).to.equal(10 ** 10);
        expect(await contract.connect(trader1).balanceOf(adminContract.address, ARTEQ)).to.equal(10 ** 10);

        expect(await contract.connect(trader1).totalSupply(gARTEQ)).to.equal(10 ** 6);
        expect(await contract.connect(trader1).balanceOf(adminContract.address, gARTEQ)).to.equal(10 ** 6);

        const taskId = await getApprovedTask();
        await adminContract.addFinalizer(taskId, contract.address);
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

    it("reading total supply of a non-existing token must be zero", async () => {
        const nonExistingTokenId = 3;
        expect(await contract.connect(trader1).exists(nonExistingTokenId)).to.equal(false);
        expect(await contract.connect(trader1).totalSupply(nonExistingTokenId)).to.equal(0);
    });

    it("treasury account can only be changed by the admin account", async() => {
        {
            const taskId = await getApprovedTask();
            await expect(contract.connect(trader1).setTreasuryAccount(taskId, treasury2.address)).to.be.revertedWith("arteQAdmin: not an admin account");
        }
        {
            const taskId = await getApprovedTask();
            const call = contract.connect(admin2).setTreasuryAccount(taskId, treasury2.address);
            const tx = await call;
            const receipt = await tx.wait();
            expect(receipt.logs.length).to.equal(2);
            await expect(call).to.emit(adminContract, "TaskFinalized").withArgs(contract.address, admin2.address, taskId);
            await expect(call).to.emit(contract, "TreasuryAccountChanged").withArgs(treasury2.address);
        }
        {
            const taskId = await getApprovedTask();
            const call = contract.connect(admin3).setTreasuryAccount(taskId, treasury1.address);
            const tx = await call;
            const receipt = await tx.wait();
            expect(receipt.logs.length).to.equal(2);
            await expect(call).to.emit(adminContract, "TaskFinalized").withArgs(contract.address, admin3.address, taskId);
            await expect(call).to.emit(contract, "TreasuryAccountChanged").withArgs(treasury1.address);
        }
    });

    it("treasury account cannot be set to zero address", async () => {
        const taskId = await getApprovedTask();
        await expect(contract.connect(admin1).setTreasuryAccount(taskId, zeroAddress)).to.be.revertedWith("arteQTokens: zero address for treasury account");
    });

    it("exchange account can only be changed by the admin account", async() => {
        {
            const taskId = await getApprovedTask();
            await expect(contract.connect(trader1).setExchange1Account(taskId, treasury2.address)).to.be.revertedWith("arteQAdmin: not an admin account");
        }
        {
            const taskId = await getApprovedTask();
            const call = contract.connect(admin1).setExchange1Account(taskId, exchange.address);
            const tx = await call;
            const receipt = await tx.wait();
            expect(receipt.logs.length).to.equal(2);
            await expect(call).to.emit(adminContract, "TaskFinalized").withArgs(contract.address, admin1.address, taskId);
            await expect(call).to.emit(contract, "Exchange1AccountChanged").withArgs(exchange.address);
        }
    });

    it("exchange account cannot be set to zero address", async () => {
        const taskId = await getApprovedTask();
        await expect(contract.connect(admin1).setExchange1Account(taskId, zeroAddress)).to.be.revertedWith("arteQTokens: zero address for exchange account");
    });

    it("token URIs can only be changed by the admin account", async() => {
        const newURI = "ipfs://AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSs";
        {
            const taskId = await getApprovedTask();
            await expect(contract.connect(trader1).setURI(taskId, ARTEQ, newURI)).to.be.revertedWith("arteQAdmin: not an admin account");
        }
        {
            const taskId = await getApprovedTask();
            const call = contract.connect(admin1).setURI(taskId, ARTEQ, newURI);
            const tx = await call;
            const receipt = await tx.wait();
            expect(receipt.logs.length).to.equal(2);
            await expect(call).to.emit(adminContract, "TaskFinalized").withArgs(contract.address, admin1.address, taskId);
            await expect(call).to.emit(contract, "URI").withArgs(newURI, ARTEQ);

            expect(await contract.connect(trader1).uri(ARTEQ)).to.equal(newURI);
        }
    });

    it("setting the URI for a non-existing token must fail", async() => {
        const nonExistingTokenId = 3;
        const newURI = "ipfs://AaBbCcDdEeFfGgHhIiJjKkLlMmNnOo";
        const taskId = await getApprovedTask();
        const call = contract.connect(admin1).setURI(taskId, nonExistingTokenId, newURI);
        await expect(call).to.be.revertedWith("arteQTokens: non-existing token");
    });

    it("profit percentage can only be changed by admin account", async () => {
        const taskId = await getApprovedTask();
        await expect(contract.connect(trader1).setProfitPercentage(taskId, 23)).to.be.revertedWith("arteQAdmin: not an admin account");
    })

    it("profit percentage min and max values", async () => {
        {
            const taskId = await getApprovedTask();
            await expect(contract.connect(admin1).setProfitPercentage(taskId, 9)).to.be.revertedWith("arteQTokens: invalid value for profit percentage");
        }
        {
            const taskId = await getApprovedTask();
            await contract.connect(admin1).setProfitPercentage(taskId, 10);
        }
        {
            const taskId = await getApprovedTask();
            await contract.connect(admin1).setProfitPercentage(taskId, 23);
        }
        {
            const taskId = await getApprovedTask();
            await contract.connect(admin1).setProfitPercentage(taskId, 50);
        }
        {
            const taskId = await getApprovedTask();
            await expect(contract.connect(admin1).setProfitPercentage(taskId, 51)).to.be.revertedWith("arteQTokens: invalid value for profit percentage");
        }
    });

    it("transfer from admin contract", async() => {
        {
            const taskId = await getApprovedTask();
            await expect(contract.connect(trader1).transferFromAdminContract(taskId, trader2.address, ARTEQ, 100)).to.be.revertedWith("arteQAdmin: not an admin account");
        }
        {
            expect(await contract.connect(trader2).balanceOf(trader2.address, ARTEQ)).to.equal(0);
            const taskId = await getApprovedTask();
            const call = contract.connect(admin4).transferFromAdminContract(taskId, trader2.address, ARTEQ, 100);
            const tx = await call;
            const receipt = await tx.wait();
            expect(receipt.logs.length).to.equal(2);
            await expect(call).to.emit(adminContract, "TaskFinalized").withArgs(contract.address, admin4.address, taskId);
            await expect(call).to.emit(contract, "TransferSingle").withArgs(admin4.address, adminContract.address, trader2.address, ARTEQ, 100);
            expect(await contract.connect(trader2).balanceOf(trader2.address, ARTEQ)).to.equal(100);
        }
    });

    it("[ramp up phase] token distribution can be called only by admin before end of phase (no lock set)", async() => {
        // set time to before end of phase
        await ethers.provider.send("evm_setNextBlockTimestamp", [ 1640985000 ]);
        await ethers.provider.send("evm_mine");

        const taskId = await getApprovedTask();
        const call = contract.connect(trader1).rampUpPhaseDistributeToken(
            taskId,
            [ trader1.address, governor1.address ],
            [ 100, 1000 ],
            [ 0, 0 ],
        );
        await expect(call).to.be.revertedWith("arteQAdmin: not an admin account");
    });

    it("[ramp up phase] token distribution can not have any transfer to treasury and admin accounts before end of phase (no lock set)", async() => {
        {
            const taskId = await getApprovedTask();
            await contract.connect(admin1).setTreasuryAccount(taskId, treasury1.address);
        }
        {
            const taskId = await getApprovedTask();
            await contract.connect(admin1).setExchange1Account(taskId, exchange.address);
        }
        // set time to before end of phase
        await ethers.provider.send("evm_setNextBlockTimestamp", [ 1640985500 ]);
        await ethers.provider.send("evm_mine");
        {
            const taskId = await getApprovedTask();
            const call = contract.connect(admin1).rampUpPhaseDistributeToken(
                taskId,
                [ trader1.address, treasury1.address ],
                [ 100, 1000 ],
                [ 0, 0 ],
            );
            await expect(call).to.be.revertedWith("arteQTokens: cannot transfer to treasury account");
        }
        {
            const taskId = await getApprovedTask();
            const call = contract.connect(admin1).rampUpPhaseDistributeToken(
                taskId,
                [ trader1.address, adminContract.address ],
                [ 100, 1000 ],
                [ 0, 0 ],
            );
            await expect(call).to.be.revertedWith("arteQTokens: cannot transfer to admin contract");
        }
    });

    it("[ramp up phase] correct token distribution before end of phase (no lock set)", async() => {
        // set time to before end of phase
        await ethers.provider.send("evm_setNextBlockTimestamp", [ 1640986000 ]);
        await ethers.provider.send("evm_mine");

        const taskId = await getApprovedTask();
        const call = contract.connect(admin1).rampUpPhaseDistributeToken(
            taskId,
            [ trader1.address, governor1.address ],
            [ 100, 1000 ],
            [ 0, 0 ],
        );
        const tx = await call;
        const receipt = await tx.wait();
        expect(receipt.logs.length).to.equal(5);
        await expect(call).to.emit(adminContract, "TaskFinalized").withArgs(contract.address, admin1.address, taskId);
        await expect(call).to.emit(contract, "TransferSingle").withArgs(admin1.address, adminContract.address, trader1.address, ARTEQ, 100);
        await expect(call).to.emit(contract, "TransferSingle").withArgs(admin1.address, adminContract.address, governor1.address, ARTEQ, 1000);
        await expect(call).to.emit(contract, "RampUpPhaseTokensDistributed").withArgs(trader1.address, 100, 0);
        await expect(call).to.emit(contract, "RampUpPhaseTokensDistributed").withArgs(governor1.address, 1000, 0);

        expect(await contract.connect(trader2).balanceOf(trader1.address, ARTEQ)).to.equal(100);
        expect(await contract.connect(trader2).balanceOf(governor1.address, ARTEQ)).to.equal(1000);
        expect(await contract.connect(trader2).balanceOf(adminContract.address, ARTEQ)).to.equal(10 ** 10 - 100 - 1000);
    });

    it("[ramp up phase] correct token distribution before end of phase (with lock set)", async() => {
        // set time to before end of phase
        await ethers.provider.send("evm_setNextBlockTimestamp", [ 1640986100 ]);
        await ethers.provider.send("evm_mine");

        {
            const taskId = await getApprovedTask();
            const call = contract.connect(admin1).rampUpPhaseDistributeToken(
                taskId,
                [ trader1.address, governor1.address ],
                [ 100, 1000 ],
                [ 0, 1640986500 ],
            );
            const tx = await call;
            const receipt = await tx.wait();
            expect(receipt.logs.length).to.equal(5);
            await expect(call).to.emit(adminContract, "TaskFinalized").withArgs(contract.address, admin1.address, taskId);
            await expect(call).to.emit(contract, "TransferSingle").withArgs(admin1.address, adminContract.address, trader1.address, ARTEQ, 100);
            await expect(call).to.emit(contract, "TransferSingle").withArgs(admin1.address, adminContract.address, governor1.address, ARTEQ, 1000);
            await expect(call).to.emit(contract, "RampUpPhaseTokensDistributed").withArgs(trader1.address, 100, 0);
            await expect(call).to.emit(contract, "RampUpPhaseTokensDistributed").withArgs(governor1.address, 1000, 1640986500);

            expect(await contract.connect(trader2).balanceOf(trader1.address, ARTEQ)).to.equal(100);
            expect(await contract.connect(trader2).balanceOf(governor1.address, ARTEQ)).to.equal(1000);
            expect(await contract.connect(trader2).balanceOf(adminContract.address, ARTEQ)).to.equal(10 ** 10 - 100 - 1000);
        }

        // advance time but don't go beyond the lock period
        await ethers.provider.send("evm_setNextBlockTimestamp", [ 1640986200 ]);
        await ethers.provider.send("evm_mine");

        // trader1 is not locked so it can send tokens
        {
            const call = await contract.connect(trader1).safeTransferFrom(trader1.address, treasury1.address, ARTEQ, 10, []);
            const tx = await call;
            const receipt = await tx.wait();
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
            const taskId = await getApprovedTask();
            const call = await contract.connect(admin1).transferFromAdminContract(taskId, trader1.address, ARTEQ, 10);
            const tx = await call;
            const receipt = await tx.wait();
            expect(receipt.logs.length).to.equal(2);
            await expect(call).to.emit(adminContract, "TaskFinalized").withArgs(contract.address, admin1.address, taskId);
            await expect(call).to.emit(contract, "TransferSingle").withArgs(admin1.address, adminContract.address, trader1.address, ARTEQ, 10);
            expect(await contract.connect(trader2).balanceOf(trader1.address, ARTEQ)).to.equal(100);
            expect(await contract.connect(trader1).balanceOf(adminContract.address, ARTEQ)).to.equal(10 ** 10 - 100 - 1000 - 10);
        }

        // receives are not locked
        {
            const taskId = await getApprovedTask();
            const call = await contract.connect(admin2).transferFromAdminContract(taskId, governor1.address, ARTEQ, 10);
            const tx = await call;
            const receipt = await tx.wait();
            expect(receipt.logs.length).to.equal(2);
            await expect(call).to.emit(adminContract, "TaskFinalized").withArgs(contract.address, admin2.address, taskId);
            await expect(call).to.emit(contract, "TransferSingle").withArgs(admin2.address, adminContract.address, governor1.address, ARTEQ, 10);
            expect(await contract.connect(trader2).balanceOf(governor1.address, ARTEQ)).to.equal(1010);
            expect(await contract.connect(trader1).balanceOf(adminContract.address, ARTEQ)).to.equal(10 ** 10 - 100 - 1000 - 20);
        }

        // advance time and go beyond the lock period
        await ethers.provider.send("evm_setNextBlockTimestamp", [ 1640986600 ]);
        await ethers.provider.send("evm_mine");

        // trader1 is not locked so it can send tokens
        {
            const call = await contract.connect(trader1).safeTransferFrom(trader1.address, treasury1.address, ARTEQ, 10, []);
            const tx = await call;
            const receipt = await tx.wait();
            expect(receipt.logs.length).to.equal(1);
            await expect(call).to.emit(contract, "TransferSingle").withArgs(trader1.address, trader1.address, treasury1.address, ARTEQ, 10);
            expect(await contract.connect(trader2).balanceOf(trader1.address, ARTEQ)).to.equal(90);
            expect(await contract.connect(trader1).balanceOf(treasury1.address, ARTEQ)).to.equal(20);
        }

        // governor1 is locked so it cannot send tokens
        {
            const call = contract.connect(governor1).safeTransferFrom(governor1.address, treasury1.address, ARTEQ, 10, []);
            const tx = await call;
            const receipt = await tx.wait();
            expect(receipt.logs.length).to.equal(1);
            await expect(call).to.emit(contract, "TransferSingle").withArgs(governor1.address, governor1.address, treasury1.address, ARTEQ, 10);
            expect(await contract.connect(trader2).balanceOf(governor1.address, ARTEQ)).to.equal(1000);
            expect(await contract.connect(trader1).balanceOf(treasury1.address, ARTEQ)).to.equal(30);
        }

        // TODO(kam): test approved send
    });

    it("[ramp up phase] token distribution when the phase has finished (no lock set)", async() => {
        // set time to before end of phase
        await ethers.provider.send("evm_setNextBlockTimestamp", [ 1645000000 ]);
        await ethers.provider.send("evm_mine");

        const taskId = await getApprovedTask();
        const call = contract.connect(admin1).rampUpPhaseDistributeToken(
            taskId,
            [ trader1.address, governor1.address ],
            [ 100, 1000 ],
            [ 0, 0 ],
        );
        await expect(call).to.be.revertedWith("arteQTokens: ramp up phase is finished");
    });

    it("[profit distribution] treasury receives some ARTEQ tokens from exchnage account", async() => {
        // check admin balance
        expect(await contract.connect(admin1).balanceOf(adminContract.address, ARTEQ)).to.equal(10 ** 10);
        // setup treasury account
        {
            const taskId = await getApprovedTask();
            await contract.connect(admin1).setTreasuryAccount(taskId, treasury1.address);
            // check the treasury balance
            expect(await contract.connect(admin1).balanceOf(treasury1.address, ARTEQ)).to.equal(0);
        }
        // setup exchange account
        {
            const taskId = await getApprovedTask();
            await contract.connect(admin1).setExchange1Account(taskId, exchange.address);
            // check the treasury balance
            expect(await contract.connect(admin1).balanceOf(exchange.address, ARTEQ)).to.equal(0);
        }
        // transfer some tokens to treasury
        {
            const taskId = await getApprovedTask();
            await contract.connect(admin1).transferFromAdminContract(taskId, treasury1.address, ARTEQ, 1000, []);
        }
        // transfer some tokens to exchange
        {
            const taskId = await getApprovedTask();
            await contract.connect(admin1).transferFromAdminContract(taskId, exchange.address, ARTEQ, 10000, []);
        }
        // check the balances again
        expect(await contract.connect(admin1).balanceOf(adminContract.address, ARTEQ)).to.equal(10 ** 10 - 1000 - 10000);
        expect(await contract.connect(admin1).balanceOf(treasury1.address, ARTEQ)).to.equal(1000);
        expect(await contract.connect(admin1).balanceOf(exchange.address, ARTEQ)).to.equal(10000);

        // simulate a deposit from the exchange account (Uniswap V1 compatible contract)
        await contract.connect(exchange).safeTransferFrom(exchange.address, treasury1.address, ARTEQ, 100, []);
        // check the balances
        expect(await contract.connect(admin1).allTimeProfit()).to.equal(20);
        expect(await contract.connect(admin1).balanceOf(treasury1.address, ARTEQ)).to.equal(1000 + 80);
    });

    it("[profit distribution] treasury receives less than or equal to 5 ARTEQ tokens from exchnage account", async() => {
        // check admin balance
        expect(await contract.connect(admin1).balanceOf(adminContract.address, ARTEQ)).to.equal(10 ** 10);
        // setup treasury account
        {
            const taskId = await getApprovedTask();
            await contract.connect(admin1).setTreasuryAccount(taskId, treasury1.address);
            // check the treasury balance
            expect(await contract.connect(admin1).balanceOf(treasury1.address, ARTEQ)).to.equal(0);
        }
        // setup exchange account
        {
            const taskId = await getApprovedTask();
            await contract.connect(admin1).setExchange1Account(taskId, exchange.address);
            // check the treasury balance
            expect(await contract.connect(admin1).balanceOf(exchange.address, ARTEQ)).to.equal(0);
        }
        // transfer some tokens to treasury
        {
            const taskId = await getApprovedTask();
            await contract.connect(admin1).transferFromAdminContract(taskId, treasury1.address, ARTEQ, 1000, []);
        }
        // transfer some tokens to exchange
        {
            const taskId = await getApprovedTask();
            await contract.connect(admin1).transferFromAdminContract(taskId, exchange.address, ARTEQ, 10000, []);
        }
        // check the balances again
        expect(await contract.connect(admin1).balanceOf(adminContract.address, ARTEQ)).to.equal(10 ** 10 - 1000 - 10000);
        expect(await contract.connect(admin1).balanceOf(treasury1.address, ARTEQ)).to.equal(1000);
        expect(await contract.connect(admin1).balanceOf(exchange.address, ARTEQ)).to.equal(10000);

        // simulate a deposit of less than 5 tokens from the exchange account (Uniswap V1 compatible contract)
        await contract.connect(exchange).safeTransferFrom(exchange.address, treasury1.address, ARTEQ, 4, []);
        // check the balances
        expect(await contract.connect(admin1).allTimeProfit()).to.equal(0); // no profit could be gained
        expect(await contract.connect(admin1).balanceOf(treasury1.address, ARTEQ)).to.equal(1000 + 4);

        // simulate a deposit of exact 5 tokens from the exchange account (Uniswap V1 compatible contract)
        await contract.connect(exchange).safeTransferFrom(exchange.address, treasury1.address, ARTEQ, 5, []);
        // check the balances
        expect(await contract.connect(admin1).allTimeProfit()).to.equal(1); // 1 token profit
        expect(await contract.connect(admin1).balanceOf(treasury1.address, ARTEQ)).to.equal(1000 + 4 + 4);
    });

    it("[profit distribution] treasury receives some ARTEQ tokens from exchnage account and distribute the profit among gARTEQ holders", async() => {
        // check admin balance
        expect(await contract.connect(admin1).balanceOf(adminContract.address, ARTEQ)).to.equal(10 ** 10);
        // setup treasury account
        {
            const taskId = await getApprovedTask();
            await contract.connect(admin1).setTreasuryAccount(taskId, treasury1.address);
            // check the treasury balance
            expect(await contract.connect(admin1).balanceOf(treasury1.address, ARTEQ)).to.equal(0);
        }
        // setup exchange account
        {
            const taskId = await getApprovedTask();
            await contract.connect(admin1).setExchange1Account(taskId, exchange.address);
            // check the treasury balance
            expect(await contract.connect(admin1).balanceOf(exchange.address, ARTEQ)).to.equal(0);
        }
        // transfer some tokens to treasury
        {
            const taskId = await getApprovedTask();
            await contract.connect(admin1).transferFromAdminContract(taskId, treasury1.address, ARTEQ, 1000, []);
        }
        // transfer some tokens to exchange
        {
            const taskId = await getApprovedTask();
            await contract.connect(admin1).transferFromAdminContract(taskId, exchange.address, ARTEQ, 10000, []);
        }
        // check the balances again
        expect(await contract.connect(admin1).balanceOf(adminContract.address, ARTEQ)).to.equal(10 ** 10 - 1000 - 10000);
        expect(await contract.connect(admin1).balanceOf(treasury1.address, ARTEQ)).to.equal(1000);
        expect(await contract.connect(admin1).balanceOf(exchange.address, ARTEQ)).to.equal(10000);

        // check the balances of governors before any transfer
        expect(await contract.connect(admin1).balanceOf(governor1.address, ARTEQ)).to.equal(0);
        expect(await contract.connect(admin1).balanceOf(governor2.address, ARTEQ)).to.equal(0);
        expect(await contract.connect(admin1).balanceOf(governor3.address, ARTEQ)).to.equal(0);
        expect(await contract.connect(admin1).balanceOf(governor1.address, gARTEQ)).to.equal(0);
        expect(await contract.connect(admin1).balanceOf(governor2.address, gARTEQ)).to.equal(0);
        expect(await contract.connect(admin1).balanceOf(governor3.address, gARTEQ)).to.equal(0);

        {
            // transfer some ARTEQ tokens to governor 1
            const taskId = await getApprovedTask();
            await contract.connect(admin1).transferFromAdminContract(taskId, governor1.address, ARTEQ, 100, []);
        }
        {
            // transfer some ARTEQ tokens to governor 2
            const taskId = await getApprovedTask();
            await contract.connect(admin1).transferFromAdminContract(taskId, governor2.address, ARTEQ, 200, []);
        }
        {
            // transfer some ARTEQ tokens to governor 3
            const taskId = await getApprovedTask();
            await contract.connect(admin1).transferFromAdminContract(taskId, governor3.address, ARTEQ, 300, []);
        }
        {
            // transfer some gARTEQ tokens to governor 1
            const taskId = await getApprovedTask();
            await contract.connect(admin1).transferFromAdminContract(taskId, governor1.address, gARTEQ, 4000, []);
        }
        {
            // transfer some gARTEQ tokens to governor 2
            const taskId = await getApprovedTask();
            await contract.connect(admin1).transferFromAdminContract(taskId, governor2.address, gARTEQ, 2500, []);
        }
        {
            // transfer some gARTEQ tokens to governor 3
            const taskId = await getApprovedTask();
            await contract.connect(admin1).transferFromAdminContract(taskId, governor3.address, gARTEQ, 3500, []);
        }

        // check the balances again
        expect(await contract.connect(admin1).totalSupply(ARTEQ)).to.equal(10 ** 10);
        expect(await contract.connect(admin1).totalSupply(gARTEQ)).to.equal(10 ** 6);
        expect(await contract.connect(admin1).balanceOf(adminContract.address, ARTEQ)).to.equal(10 ** 10 - 1000 - 10000 - 100 - 200 - 300);
        expect(await contract.connect(admin1).balanceOf(treasury1.address, ARTEQ)).to.equal(1000);
        expect(await contract.connect(admin1).balanceOf(exchange.address, ARTEQ)).to.equal(10000);
        expect(await contract.connect(admin1).balanceOf(governor1.address, ARTEQ)).to.equal(100);
        expect(await contract.connect(admin1).balanceOf(governor2.address, ARTEQ)).to.equal(200);
        expect(await contract.connect(admin1).balanceOf(governor3.address, ARTEQ)).to.equal(300);
        expect(await contract.connect(admin1).balanceOf(adminContract.address, gARTEQ)).to.equal(10 ** 6 - 4000 - 2500 - 3500);
        expect(await contract.connect(admin1).balanceOf(treasury1.address, gARTEQ)).to.equal(0);
        expect(await contract.connect(admin1).balanceOf(exchange.address, gARTEQ)).to.equal(0);
        expect(await contract.connect(admin1).balanceOf(governor1.address, gARTEQ)).to.equal(4000);
        expect(await contract.connect(admin1).balanceOf(governor2.address, gARTEQ)).to.equal(2500);
        expect(await contract.connect(admin1).balanceOf(governor3.address, gARTEQ)).to.equal(3500);
        expect(await contract.connect(admin1).totalCirculatingGovernanceTokens()).to.equal(4000 + 2500 + 3500);
        expect(await contract.connect(admin1).profitTokensTransferredToAccounts()).to.equal(0);

        // round 1: simulate a small deposit from the exchange account (Uniswap V1 compatible contract)
        await contract.connect(exchange).safeTransferFrom(exchange.address, treasury1.address, ARTEQ, 10, []);
        // check the balances
        expect(await contract.connect(admin1).allTimeProfit()).to.equal(2);
        expect(await contract.connect(admin1).balanceOf(treasury1.address, ARTEQ)).to.equal(1000 + 8);
        expect(await contract.connect(admin1).profitTokensTransferredToAccounts()).to.equal(0);

        // check governors' balances
        expect(await contract.connect(admin1).balanceOf(governor1.address, ARTEQ)).to.equal(100);
        expect(await contract.connect(admin1).balanceOf(governor2.address, ARTEQ)).to.equal(200);
        expect(await contract.connect(admin1).balanceOf(governor3.address, ARTEQ)).to.equal(300);
        expect(await contract.connect(admin1).balanceOf(governor1.address, gARTEQ)).to.equal(4000);
        expect(await contract.connect(admin1).balanceOf(governor2.address, gARTEQ)).to.equal(2500);
        expect(await contract.connect(admin1).balanceOf(governor3.address, gARTEQ)).to.equal(3500);
        expect(await contract.connect(admin1).profitTokensTransferredToAccounts()).to.equal(0);

        // round 2: simulate another bigger deposit from the exchange account (Uniswap V1 compatible contract)
        await contract.connect(exchange).safeTransferFrom(exchange.address, treasury1.address, ARTEQ, 90, []);
        // check the balances
        expect(await contract.connect(admin1).allTimeProfit()).to.equal(2 + 18);
        expect(await contract.connect(admin1).balanceOf(treasury1.address, ARTEQ)).to.equal(1000 + 8 + 72);
        expect(await contract.connect(admin1).profitTokensTransferredToAccounts()).to.equal(0);

        // check governors' balances
        expect(await contract.connect(admin1).balanceOf(governor1.address, ARTEQ)).to.equal(100 + 8);
        expect(await contract.connect(admin1).balanceOf(governor2.address, ARTEQ)).to.equal(200 + 5);
        expect(await contract.connect(admin1).balanceOf(governor3.address, ARTEQ)).to.equal(300 + 7);
        expect(await contract.connect(admin1).balanceOf(governor1.address, gARTEQ)).to.equal(4000);
        expect(await contract.connect(admin1).balanceOf(governor2.address, gARTEQ)).to.equal(2500);
        expect(await contract.connect(admin1).balanceOf(governor3.address, gARTEQ)).to.equal(3500);
        expect(await contract.connect(admin1).profitTokensTransferredToAccounts()).to.equal(0);
    });

    it("[profit distribution] treasury receives some ARTEQ tokens from exchnage account and distribute the profit among gARTEQ holders (2)", async() => {
        // check admin balance
        expect(await contract.connect(admin1).balanceOf(adminContract.address, ARTEQ)).to.equal(10 ** 10);
        // setup treasury account
        {
            const taskId = await getApprovedTask();
            await contract.connect(admin1).setTreasuryAccount(taskId, treasury1.address);
            // check the treasury balance
            expect(await contract.connect(admin1).balanceOf(treasury1.address, ARTEQ)).to.equal(0);
        }
        // setup exchange account
        {
            const taskId = await getApprovedTask();
            await contract.connect(admin1).setExchange1Account(taskId, exchange.address);
            // check the treasury balance
            expect(await contract.connect(admin1).balanceOf(exchange.address, ARTEQ)).to.equal(0);
        }
        // transfer some tokens to treasury
        {
            const taskId = await getApprovedTask();
            await contract.connect(admin1).transferFromAdminContract(taskId, treasury1.address, ARTEQ, 1000, []);
        }
        // transfer some tokens to exchange
        {
            const taskId = await getApprovedTask();
            await contract.connect(admin1).transferFromAdminContract(taskId, exchange.address, ARTEQ, 10000, []);
        }
        // check the balances again
        expect(await contract.connect(admin1).balanceOf(adminContract.address, ARTEQ)).to.equal(10 ** 10 - 1000 - 10000);
        expect(await contract.connect(admin1).balanceOf(treasury1.address, ARTEQ)).to.equal(1000);
        expect(await contract.connect(admin1).balanceOf(exchange.address, ARTEQ)).to.equal(10000);

        // check the balances of governors before any transfer
        expect(await contract.connect(admin1).balanceOf(governor1.address, ARTEQ)).to.equal(0);
        expect(await contract.connect(admin1).balanceOf(governor2.address, ARTEQ)).to.equal(0);
        expect(await contract.connect(admin1).balanceOf(governor3.address, ARTEQ)).to.equal(0);
        expect(await contract.connect(admin1).balanceOf(governor1.address, gARTEQ)).to.equal(0);
        expect(await contract.connect(admin1).balanceOf(governor2.address, gARTEQ)).to.equal(0);
        expect(await contract.connect(admin1).balanceOf(governor3.address, gARTEQ)).to.equal(0);

        {
            // transfer some ARTEQ tokens to governor 1
            const taskId = await getApprovedTask();
            await contract.connect(admin1).transferFromAdminContract(taskId, governor1.address, ARTEQ, 100, []);
        }
        {
            // transfer some ARTEQ tokens to governor 2
            const taskId = await getApprovedTask();
            await contract.connect(admin1).transferFromAdminContract(taskId, governor2.address, ARTEQ, 200, []);
        }
        {
            // transfer some ARTEQ tokens to governor 3
            const taskId = await getApprovedTask();
            await contract.connect(admin1).transferFromAdminContract(taskId, governor3.address, ARTEQ, 300, []);
        }
        {
            // transfer some gARTEQ tokens to governor 1
            const taskId = await getApprovedTask();
            await contract.connect(admin1).transferFromAdminContract(taskId, governor1.address, gARTEQ, 2000, []);
        }
        {
            // transfer some gARTEQ tokens to governor 2
            const taskId = await getApprovedTask();
            await contract.connect(admin1).transferFromAdminContract(taskId, governor2.address, gARTEQ, 1500, []);
        }
        {
            // transfer some gARTEQ tokens to governor 3
            const taskId = await getApprovedTask();
            await contract.connect(admin1).transferFromAdminContract(taskId, governor3.address, gARTEQ, 3500, []);
        }

        // check the balances again
        expect(await contract.connect(admin1).totalSupply(ARTEQ)).to.equal(10 ** 10);
        expect(await contract.connect(admin1).totalSupply(gARTEQ)).to.equal(10 ** 6);
        expect(await contract.connect(admin1).balanceOf(adminContract.address, ARTEQ)).to.equal(10 ** 10 - 1000 - 10000 - 100 - 200 - 300);
        expect(await contract.connect(admin1).balanceOf(treasury1.address, ARTEQ)).to.equal(1000);
        expect(await contract.connect(admin1).balanceOf(exchange.address, ARTEQ)).to.equal(10000);
        expect(await contract.connect(admin1).balanceOf(governor1.address, ARTEQ)).to.equal(100);
        expect(await contract.connect(admin1).balanceOf(governor2.address, ARTEQ)).to.equal(200);
        expect(await contract.connect(admin1).balanceOf(governor3.address, ARTEQ)).to.equal(300);
        expect(await contract.connect(admin1).balanceOf(adminContract.address, gARTEQ)).to.equal(10 ** 6 - 2000 - 1500 - 3500);
        expect(await contract.connect(admin1).balanceOf(treasury1.address, gARTEQ)).to.equal(0);
        expect(await contract.connect(admin1).balanceOf(exchange.address, gARTEQ)).to.equal(0);
        expect(await contract.connect(admin1).balanceOf(governor1.address, gARTEQ)).to.equal(2000);
        expect(await contract.connect(admin1).balanceOf(governor2.address, gARTEQ)).to.equal(1500);
        expect(await contract.connect(admin1).balanceOf(governor3.address, gARTEQ)).to.equal(3500);
        expect(await contract.connect(admin1).totalCirculatingGovernanceTokens()).to.equal(2000 + 1500 + 3500);
        expect(await contract.connect(admin1).profitTokensTransferredToAccounts()).to.equal(0);

        // simulate a deposit from the exchange account (Uniswap V1 compatible contract)
        const call = contract.connect(exchange).safeTransferFrom(exchange.address, treasury1.address, ARTEQ, 79, []);
        const tx = await call;
        const receipt = await tx.wait();
        expect(receipt.logs.length).to.equal(2);
        await expect(call).to.emit(contract, "TransferSingle").withArgs(exchange.address, exchange.address, treasury1.address, ARTEQ, 79);
        await expect(call).to.emit(contract, "ProfitTokensCollected").withArgs(15);
        // check the balances
        expect(await contract.connect(admin1).allTimeProfit()).to.equal(15);
        expect(await contract.connect(admin1).balanceOf(treasury1.address, ARTEQ)).to.equal(1000 + 64);
        expect(await contract.connect(admin1).profitTokensTransferredToAccounts()).to.equal(0);

        // check governors' balances
        expect(await contract.connect(admin1).balanceOf(governor1.address, ARTEQ)).to.equal(100 + 4);
        expect(await contract.connect(admin1).balanceOf(governor2.address, ARTEQ)).to.equal(200 + 3);
        expect(await contract.connect(admin1).balanceOf(governor3.address, ARTEQ)).to.equal(300 + 7);
        expect(await contract.connect(admin1).balanceOf(governor1.address, gARTEQ)).to.equal(2000);
        expect(await contract.connect(admin1).balanceOf(governor2.address, gARTEQ)).to.equal(1500);
        expect(await contract.connect(admin1).balanceOf(governor3.address, gARTEQ)).to.equal(3500);
        expect(await contract.connect(admin1).profitTokensTransferredToAccounts()).to.equal(0);
    });

    it("[profit distribution] transfer of gARTEQ token among governors before and after profit distribution", async() => {
        // check admin balance
        expect(await contract.connect(admin1).balanceOf(adminContract.address, ARTEQ)).to.equal(10 ** 10);
        // setup treasury account
        {
            const taskId = await getApprovedTask();
            await contract.connect(admin1).setTreasuryAccount(taskId, treasury1.address);
            // check the treasury balance
            expect(await contract.connect(admin1).balanceOf(treasury1.address, ARTEQ)).to.equal(0);
        }
        // setup exchange account
        {
            const taskId = await getApprovedTask();
            await contract.connect(admin1).setExchange1Account(taskId, exchange.address);
            // check the treasury balance
            expect(await contract.connect(admin1).balanceOf(exchange.address, ARTEQ)).to.equal(0);
        }
        // transfer some tokens to treasury
        {
            const taskId = await getApprovedTask();
            await contract.connect(admin1).transferFromAdminContract(taskId, treasury1.address, ARTEQ, 1000, []);
        }
        // transfer some tokens to exchange
        {
            const taskId = await getApprovedTask();
            await contract.connect(admin1).transferFromAdminContract(taskId, exchange.address, ARTEQ, 10000, []);
        }
        // check the balances again
        expect(await contract.connect(admin1).balanceOf(adminContract.address, ARTEQ)).to.equal(10 ** 10 - 1000 - 10000);
        expect(await contract.connect(admin1).balanceOf(treasury1.address, ARTEQ)).to.equal(1000);
        expect(await contract.connect(admin1).balanceOf(exchange.address, ARTEQ)).to.equal(10000);

        // check the balances of governors before any transfer
        expect(await contract.connect(admin1).balanceOf(governor1.address, ARTEQ)).to.equal(0);
        expect(await contract.connect(admin1).balanceOf(governor2.address, ARTEQ)).to.equal(0);
        expect(await contract.connect(admin1).balanceOf(governor3.address, ARTEQ)).to.equal(0);
        expect(await contract.connect(admin1).balanceOf(governor1.address, gARTEQ)).to.equal(0);
        expect(await contract.connect(admin1).balanceOf(governor2.address, gARTEQ)).to.equal(0);
        expect(await contract.connect(admin1).balanceOf(governor3.address, gARTEQ)).to.equal(0);

        {
            // transfer some ARTEQ tokens to governor 1
            const taskId = await getApprovedTask();
            await contract.connect(admin1).transferFromAdminContract(taskId, governor1.address, ARTEQ, 100, []);
        }
        {
            // transfer some ARTEQ tokens to governor 2
            const taskId = await getApprovedTask();
            await contract.connect(admin1).transferFromAdminContract(taskId, governor2.address, ARTEQ, 200, []);
        }
        {
            // transfer some ARTEQ tokens to governor 3
            const taskId = await getApprovedTask();
            await contract.connect(admin1).transferFromAdminContract(taskId, governor3.address, ARTEQ, 300, []);
        }
        {
            // transfer some gARTEQ tokens to governor 1
            const taskId = await getApprovedTask();
            await contract.connect(admin1).transferFromAdminContract(taskId, governor1.address, gARTEQ, 4000, []);
        }
        {
            // transfer some gARTEQ tokens to governor 2
            const taskId = await getApprovedTask();
            await contract.connect(admin1).transferFromAdminContract(taskId, governor2.address, gARTEQ, 2500, []);
        }
        {
            // transfer some gARTEQ tokens to governor 3
            const taskId = await getApprovedTask();
            await contract.connect(admin1).transferFromAdminContract(taskId, governor3.address, gARTEQ, 3500, []);
        }

        // check the balances again
        expect(await contract.connect(admin1).totalSupply(ARTEQ)).to.equal(10 ** 10);
        expect(await contract.connect(admin1).totalSupply(gARTEQ)).to.equal(10 ** 6);
        expect(await contract.connect(admin1).balanceOf(adminContract.address, ARTEQ)).to.equal(10 ** 10 - 1000 - 10000 - 100 - 200 - 300);
        expect(await contract.connect(admin1).balanceOf(treasury1.address, ARTEQ)).to.equal(1000);
        expect(await contract.connect(admin1).balanceOf(exchange.address, ARTEQ)).to.equal(10000);
        expect(await contract.connect(admin1).balanceOf(governor1.address, ARTEQ)).to.equal(100);
        expect(await contract.connect(admin1).balanceOf(governor2.address, ARTEQ)).to.equal(200);
        expect(await contract.connect(admin1).balanceOf(governor3.address, ARTEQ)).to.equal(300);
        expect(await contract.connect(admin1).balanceOf(adminContract.address, gARTEQ)).to.equal(10 ** 6 - 4000 - 2500 - 3500);
        expect(await contract.connect(admin1).balanceOf(treasury1.address, gARTEQ)).to.equal(0);
        expect(await contract.connect(admin1).balanceOf(exchange.address, gARTEQ)).to.equal(0);
        expect(await contract.connect(admin1).balanceOf(governor1.address, gARTEQ)).to.equal(4000);
        expect(await contract.connect(admin1).balanceOf(governor2.address, gARTEQ)).to.equal(2500);
        expect(await contract.connect(admin1).balanceOf(governor3.address, gARTEQ)).to.equal(3500);
        expect(await contract.connect(admin1).totalCirculatingGovernanceTokens()).to.equal(4000 + 2500 + 3500);
        expect(await contract.connect(admin1).profitTokensTransferredToAccounts()).to.equal(0);

        // round 1: simulate a deposit from the exchange account (Uniswap V1 compatible contract)
        await contract.connect(exchange).safeTransferFrom(exchange.address, treasury1.address, ARTEQ, 100, []);
        // check the balances
        expect(await contract.connect(admin1).allTimeProfit()).to.equal(20);
        expect(await contract.connect(admin1).balanceOf(treasury1.address, ARTEQ)).to.equal(1000 + 80);
        expect(await contract.connect(admin1).profitTokensTransferredToAccounts()).to.equal(0);

        // check governors' balances
        expect(await contract.connect(admin1).balanceOf(governor1.address, ARTEQ)).to.equal(100 + 8);
        expect(await contract.connect(admin1).balanceOf(governor2.address, ARTEQ)).to.equal(200 + 5);
        expect(await contract.connect(admin1).balanceOf(governor3.address, ARTEQ)).to.equal(300 + 7);
        expect(await contract.connect(admin1).balanceOf(governor1.address, gARTEQ)).to.equal(4000);
        expect(await contract.connect(admin1).balanceOf(governor2.address, gARTEQ)).to.equal(2500);
        expect(await contract.connect(admin1).balanceOf(governor3.address, gARTEQ)).to.equal(3500);
        expect(await contract.connect(admin1).profitTokensTransferredToAccounts()).to.equal(0);

        // now, governors exchange gARTEQ tokens
        await contract.connect(governor3).safeTransferFrom(governor3.address, governor2.address, gARTEQ, 500, []);
        expect(await contract.connect(admin1).balanceOf(governor1.address, ARTEQ)).to.equal(100 + 8);
        expect(await contract.connect(admin1).balanceOf(governor2.address, ARTEQ)).to.equal(200 + 5);
        expect(await contract.connect(admin1).balanceOf(governor3.address, ARTEQ)).to.equal(300 + 7);
        expect(await contract.connect(admin1).balanceOf(governor1.address, gARTEQ)).to.equal(4000);
        expect(await contract.connect(admin1).balanceOf(governor2.address, gARTEQ)).to.equal(3000);
        expect(await contract.connect(admin1).balanceOf(governor3.address, gARTEQ)).to.equal(3000);
        expect(await contract.connect(admin1).profitTokensTransferredToAccounts()).to.equal(5 + 7);

        // round 2: simulate another deposit from the exchange account (Uniswap V1 compatible contract)
        await contract.connect(exchange).safeTransferFrom(exchange.address, treasury1.address, ARTEQ, 100, []);
        // check the balances
        expect(await contract.connect(admin1).allTimeProfit()).to.equal(20 + 20);
        expect(await contract.connect(admin1).balanceOf(treasury1.address, ARTEQ)).to.equal(1000 + 80 + 80);
        expect(await contract.connect(admin1).profitTokensTransferredToAccounts()).to.equal(5 + 7);

        // check governors' balances
        expect(await contract.connect(admin1).balanceOf(governor1.address, ARTEQ)).to.equal(100 + 8 + 8);
        expect(await contract.connect(admin1).balanceOf(governor2.address, ARTEQ)).to.equal(200 + 5 + 6);
        expect(await contract.connect(admin1).balanceOf(governor3.address, ARTEQ)).to.equal(300 + 7 + 6);
        expect(await contract.connect(admin1).balanceOf(governor1.address, gARTEQ)).to.equal(4000);
        expect(await contract.connect(admin1).balanceOf(governor2.address, gARTEQ)).to.equal(3000);
        expect(await contract.connect(admin1).balanceOf(governor3.address, gARTEQ)).to.equal(3000);
        expect(await contract.connect(admin1).profitTokensTransferredToAccounts()).to.equal(5 + 7);
    });

    it("[profit distribution] transfer of gARTEQ token to a new account before and after profit distribution", async() => {
        // check admin balance
        expect(await contract.connect(admin1).balanceOf(adminContract.address, ARTEQ)).to.equal(10 ** 10);
        // setup treasury account
        {
            const taskId = await getApprovedTask();
            await contract.connect(admin1).setTreasuryAccount(taskId, treasury1.address);
            // check the treasury balance
            expect(await contract.connect(admin1).balanceOf(treasury1.address, ARTEQ)).to.equal(0);
        }
        // setup exchange account
        {
            const taskId = await getApprovedTask();
            await contract.connect(admin1).setExchange1Account(taskId, exchange.address);
            // check the treasury balance
            expect(await contract.connect(admin1).balanceOf(exchange.address, ARTEQ)).to.equal(0);
        }
        // transfer some tokens to treasury
        {
            const taskId = await getApprovedTask();
            await contract.connect(admin1).transferFromAdminContract(taskId, treasury1.address, ARTEQ, 1000, []);
        }
        // transfer some tokens to exchange
        {
            const taskId = await getApprovedTask();
            await contract.connect(admin1).transferFromAdminContract(taskId, exchange.address, ARTEQ, 10000, []);
        }
        // check the balances again
        expect(await contract.connect(admin1).balanceOf(adminContract.address, ARTEQ)).to.equal(10 ** 10 - 1000 - 10000);
        expect(await contract.connect(admin1).balanceOf(treasury1.address, ARTEQ)).to.equal(1000);
        expect(await contract.connect(admin1).balanceOf(exchange.address, ARTEQ)).to.equal(10000);

        // check the balances of governors before any transfer
        expect(await contract.connect(admin1).balanceOf(governor1.address, ARTEQ)).to.equal(0);
        expect(await contract.connect(admin1).balanceOf(governor2.address, ARTEQ)).to.equal(0);
        expect(await contract.connect(admin1).balanceOf(governor3.address, ARTEQ)).to.equal(0);
        expect(await contract.connect(admin1).balanceOf(governor1.address, gARTEQ)).to.equal(0);
        expect(await contract.connect(admin1).balanceOf(governor2.address, gARTEQ)).to.equal(0);
        expect(await contract.connect(admin1).balanceOf(governor3.address, gARTEQ)).to.equal(0);

        {
            // transfer some ARTEQ tokens to governor 1
            const taskId = await getApprovedTask();
            await contract.connect(admin1).transferFromAdminContract(taskId, governor1.address, ARTEQ, 100, []);
        }
        {
            // transfer some ARTEQ tokens to governor 2
            const taskId = await getApprovedTask();
            await contract.connect(admin1).transferFromAdminContract(taskId, governor2.address, ARTEQ, 200, []);
        }
        {
            // transfer some ARTEQ tokens to governor 3
            const taskId = await getApprovedTask();
            await contract.connect(admin1).transferFromAdminContract(taskId, governor3.address, ARTEQ, 300, []);
        }
        {
            // transfer some gARTEQ tokens to governor 1
            const taskId = await getApprovedTask();
            await contract.connect(admin1).transferFromAdminContract(taskId, governor1.address, gARTEQ, 4000, []);
        }
        {
            // transfer some gARTEQ tokens to governor 2
            const taskId = await getApprovedTask();
            await contract.connect(admin1).transferFromAdminContract(taskId, governor2.address, gARTEQ, 2500, []);
        }
        {
            // transfer some gARTEQ tokens to governor 3
            const taskId = await getApprovedTask();
            await contract.connect(admin1).transferFromAdminContract(taskId, governor3.address, gARTEQ, 3500, []);
        }

        // check the balances again
        expect(await contract.connect(admin1).totalSupply(ARTEQ)).to.equal(10 ** 10);
        expect(await contract.connect(admin1).totalSupply(gARTEQ)).to.equal(10 ** 6);
        expect(await contract.connect(admin1).balanceOf(adminContract.address, ARTEQ)).to.equal(10 ** 10 - 1000 - 10000 - 100 - 200 - 300);
        expect(await contract.connect(admin1).balanceOf(treasury1.address, ARTEQ)).to.equal(1000);
        expect(await contract.connect(admin1).balanceOf(exchange.address, ARTEQ)).to.equal(10000);
        expect(await contract.connect(admin1).balanceOf(governor1.address, ARTEQ)).to.equal(100);
        expect(await contract.connect(admin1).balanceOf(governor2.address, ARTEQ)).to.equal(200);
        expect(await contract.connect(admin1).balanceOf(governor3.address, ARTEQ)).to.equal(300);
        expect(await contract.connect(admin1).balanceOf(adminContract.address, gARTEQ)).to.equal(10 ** 6 - 4000 - 2500 - 3500);
        expect(await contract.connect(admin1).balanceOf(treasury1.address, gARTEQ)).to.equal(0);
        expect(await contract.connect(admin1).balanceOf(exchange.address, gARTEQ)).to.equal(0);
        expect(await contract.connect(admin1).balanceOf(governor1.address, gARTEQ)).to.equal(4000);
        expect(await contract.connect(admin1).balanceOf(governor2.address, gARTEQ)).to.equal(2500);
        expect(await contract.connect(admin1).balanceOf(governor3.address, gARTEQ)).to.equal(3500);
        expect(await contract.connect(admin1).balanceOf(trader1.address, ARTEQ)).to.equal(0);
        expect(await contract.connect(admin1).balanceOf(trader1.address, gARTEQ)).to.equal(0);
        expect(await contract.connect(admin1).totalCirculatingGovernanceTokens()).to.equal(4000 + 2500 + 3500);
        expect(await contract.connect(admin1).profitTokensTransferredToAccounts()).to.equal(0);

        // round 1: simulate a deposit from the exchange account (Uniswap V1 compatible contract)
        await contract.connect(exchange).safeTransferFrom(exchange.address, treasury1.address, ARTEQ, 100, []);
        // check the balances
        expect(await contract.connect(admin1).allTimeProfit()).to.equal(20);
        expect(await contract.connect(admin1).balanceOf(treasury1.address, ARTEQ)).to.equal(1000 + 80);
        expect(await contract.connect(admin1).profitTokensTransferredToAccounts()).to.equal(0);

        // check governors' balances
        expect(await contract.connect(admin1).balanceOf(governor1.address, ARTEQ)).to.equal(100 + 8);
        expect(await contract.connect(admin1).balanceOf(governor2.address, ARTEQ)).to.equal(200 + 5);
        expect(await contract.connect(admin1).balanceOf(governor3.address, ARTEQ)).to.equal(300 + 7);
        expect(await contract.connect(admin1).balanceOf(trader1.address, ARTEQ)).to.equal(0);
        expect(await contract.connect(admin1).balanceOf(governor1.address, gARTEQ)).to.equal(4000);
        expect(await contract.connect(admin1).balanceOf(governor2.address, gARTEQ)).to.equal(2500);
        expect(await contract.connect(admin1).balanceOf(governor3.address, gARTEQ)).to.equal(3500);
        expect(await contract.connect(admin1).balanceOf(trader1.address, gARTEQ)).to.equal(0);
        expect(await contract.connect(admin1).profitTokensTransferredToAccounts()).to.equal(0);

        // now, governors exchange gARTEQ tokens
        await contract.connect(governor3).safeTransferFrom(governor3.address, trader1.address, gARTEQ, 500, []);
        expect(await contract.connect(admin1).balanceOf(governor1.address, ARTEQ)).to.equal(100 + 8);
        expect(await contract.connect(admin1).balanceOf(governor2.address, ARTEQ)).to.equal(200 + 5);
        expect(await contract.connect(admin1).balanceOf(governor3.address, ARTEQ)).to.equal(300 + 7);
        expect(await contract.connect(admin1).balanceOf(trader1.address, ARTEQ)).to.equal(0);
        expect(await contract.connect(admin1).balanceOf(governor1.address, gARTEQ)).to.equal(4000);
        expect(await contract.connect(admin1).balanceOf(governor2.address, gARTEQ)).to.equal(2500);
        expect(await contract.connect(admin1).balanceOf(governor3.address, gARTEQ)).to.equal(3000);
        expect(await contract.connect(admin1).balanceOf(trader1.address, gARTEQ)).to.equal(500);
        expect(await contract.connect(admin1).profitTokensTransferredToAccounts()).to.equal(7 + 0);

        // round 2: simulate another deposit from the exchange account (Uniswap V1 compatible contract)
        await contract.connect(exchange).safeTransferFrom(exchange.address, treasury1.address, ARTEQ, 100, []);
        // check the balances
        expect(await contract.connect(admin1).allTimeProfit()).to.equal(20 + 20);
        expect(await contract.connect(admin1).balanceOf(treasury1.address, ARTEQ)).to.equal(1000 + 80 + 80);
        expect(await contract.connect(admin1).profitTokensTransferredToAccounts()).to.equal(7 + 0);

        // check governors' balances
        expect(await contract.connect(admin1).balanceOf(governor1.address, ARTEQ)).to.equal(100 + 8 + 8);
        expect(await contract.connect(admin1).balanceOf(governor2.address, ARTEQ)).to.equal(200 + 5 + 5);
        expect(await contract.connect(admin1).balanceOf(governor3.address, ARTEQ)).to.equal(300 + 7 + 6);
        expect(await contract.connect(admin1).balanceOf(trader1.address, ARTEQ)).to.equal(1);
        expect(await contract.connect(admin1).balanceOf(governor1.address, gARTEQ)).to.equal(4000);
        expect(await contract.connect(admin1).balanceOf(governor2.address, gARTEQ)).to.equal(2500);
        expect(await contract.connect(admin1).balanceOf(governor3.address, gARTEQ)).to.equal(3000);
        expect(await contract.connect(admin1).balanceOf(trader1.address, gARTEQ)).to.equal(500);
        expect(await contract.connect(admin1).profitTokensTransferredToAccounts()).to.equal(7 + 0);

        // again, governors exchange gARTEQ tokens
        await contract.connect(governor3).safeTransferFrom(governor3.address, governor2.address, gARTEQ, 3000, []);
        expect(await contract.connect(admin1).balanceOf(governor1.address, ARTEQ)).to.equal(100 + 8 + 8);
        expect(await contract.connect(admin1).balanceOf(governor2.address, ARTEQ)).to.equal(200 + 5 + 5);
        expect(await contract.connect(admin1).balanceOf(governor3.address, ARTEQ)).to.equal(300 + 7 + 6);
        expect(await contract.connect(admin1).balanceOf(trader1.address, ARTEQ)).to.equal(1);
        expect(await contract.connect(admin1).balanceOf(governor1.address, gARTEQ)).to.equal(4000);
        expect(await contract.connect(admin1).balanceOf(governor2.address, gARTEQ)).to.equal(5500);
        expect(await contract.connect(admin1).balanceOf(governor3.address, gARTEQ)).to.equal(0);
        expect(await contract.connect(admin1).balanceOf(trader1.address, gARTEQ)).to.equal(500);
        expect(await contract.connect(admin1).profitTokensTransferredToAccounts()).to.equal(7 + 0 + 6 + 5 + 5);

        // round 3: simulate another deposit from the exchange account (Uniswap V1 compatible contract)
        await contract.connect(exchange).safeTransferFrom(exchange.address, treasury1.address, ARTEQ, 100, []);
        // check the balances
        expect(await contract.connect(admin1).allTimeProfit()).to.equal(20 + 20 + 20);
        expect(await contract.connect(admin1).balanceOf(treasury1.address, ARTEQ)).to.equal(1000 + 80 + 80 + 80);
        expect(await contract.connect(admin1).profitTokensTransferredToAccounts()).to.equal(7 + 0 + 6 + 5 + 5);

        // check governors' balances
        expect(await contract.connect(admin1).balanceOf(governor1.address, ARTEQ)).to.equal(100 + 8 + 8 + 8);
        expect(await contract.connect(admin1).balanceOf(governor2.address, ARTEQ)).to.equal(200 + 5 + 5 + 11);
        expect(await contract.connect(admin1).balanceOf(governor3.address, ARTEQ)).to.equal(300 + 7 + 6);
        expect(await contract.connect(admin1).balanceOf(trader1.address, ARTEQ)).to.equal(1 + 1);
        expect(await contract.connect(admin1).balanceOf(governor1.address, gARTEQ)).to.equal(4000);
        expect(await contract.connect(admin1).balanceOf(governor2.address, gARTEQ)).to.equal(5500);
        expect(await contract.connect(admin1).balanceOf(governor3.address, gARTEQ)).to.equal(0);
        expect(await contract.connect(admin1).balanceOf(trader1.address, gARTEQ)).to.equal(500);
        expect(await contract.connect(admin1).profitTokensTransferredToAccounts()).to.equal(7 + 0 + 6 + 5 + 5);
    });

    [1, 2, 3, 4, 5].forEach((i) => {
        it(`[profit distribution] transfer of ARTEQ must trigger the transfer of profit tokens to the involved accounts (exchange account ${i})`, async() => {
            // check admin balance
            expect(await contract.connect(admin1).balanceOf(adminContract.address, ARTEQ)).to.equal(10 ** 10);
            // setup treasury account
            {
                const taskId = await getApprovedTask();
                await contract.connect(admin1).setTreasuryAccount(taskId, treasury1.address);
                // check the treasury balance
                expect(await contract.connect(admin1).balanceOf(treasury1.address, ARTEQ)).to.equal(0);
            }
            // setup exchange account
            {
                const taskId = await getApprovedTask();
                const call = contract.connect(admin4)[`setExchange${i}Account`](taskId, exchange.address);
                const tx = await call;
                const receipt = await tx.wait();
                expect(receipt.logs.length).to.equal(2);
                await expect(call).to.emit(adminContract, "TaskFinalized").withArgs(contract.address, admin4.address, taskId);
                await expect(call).to.emit(contract, `Exchange${i}AccountChanged`).withArgs(exchange.address);
                // check the treasury balance
                expect(await contract.connect(admin6).balanceOf(exchange.address, ARTEQ)).to.equal(0);
            }
            // transfer some tokens to treasury
            {
                const taskId = await getApprovedTask();
                await contract.connect(admin1).transferFromAdminContract(taskId, treasury1.address, ARTEQ, 1000, []);
            }
            // transfer some tokens to exchange
            {
                const taskId = await getApprovedTask();
                await contract.connect(admin1).transferFromAdminContract(taskId, exchange.address, ARTEQ, 10000, []);
            }
            // check the balances again
            expect(await contract.connect(admin1).balanceOf(adminContract.address, ARTEQ)).to.equal(10 ** 10 - 1000 - 10000);
            expect(await contract.connect(admin1).balanceOf(treasury1.address, ARTEQ)).to.equal(1000);
            expect(await contract.connect(admin1).balanceOf(exchange.address, ARTEQ)).to.equal(10000);

            // check the balances of governors before any transfer
            expect(await contract.connect(admin1).balanceOf(governor1.address, ARTEQ)).to.equal(0);
            expect(await contract.connect(admin1).balanceOf(governor2.address, ARTEQ)).to.equal(0);
            expect(await contract.connect(admin1).balanceOf(governor3.address, ARTEQ)).to.equal(0);
            expect(await contract.connect(admin1).balanceOf(governor1.address, gARTEQ)).to.equal(0);
            expect(await contract.connect(admin1).balanceOf(governor2.address, gARTEQ)).to.equal(0);
            expect(await contract.connect(admin1).balanceOf(governor3.address, gARTEQ)).to.equal(0);

            {
                // transfer some ARTEQ tokens to governor 1
                const taskId = await getApprovedTask();
                await contract.connect(admin1).transferFromAdminContract(taskId, governor1.address, ARTEQ, 100, []);
            }
            {
                // transfer some ARTEQ tokens to governor 2
                const taskId = await getApprovedTask();
                await contract.connect(admin1).transferFromAdminContract(taskId, governor2.address, ARTEQ, 200, []);
            }
            {
                // transfer some ARTEQ tokens to governor 3
                const taskId = await getApprovedTask();
                await contract.connect(admin1).transferFromAdminContract(taskId, governor3.address, ARTEQ, 300, []);
            }
            {
                // transfer some gARTEQ tokens to governor 1
                const taskId = await getApprovedTask();
                await contract.connect(admin1).transferFromAdminContract(taskId, governor1.address, gARTEQ, 4000, []);
            }
            {
                // transfer some gARTEQ tokens to governor 2
                const taskId = await getApprovedTask();
                await contract.connect(admin1).transferFromAdminContract(taskId, governor2.address, gARTEQ, 2500, []);
            }
            {
                // transfer some gARTEQ tokens to governor 3
                const taskId = await getApprovedTask();
                await contract.connect(admin1).transferFromAdminContract(taskId, governor3.address, gARTEQ, 3500, []);
            }

            // check the balances again
            expect(await contract.connect(admin1).totalSupply(ARTEQ)).to.equal(10 ** 10);
            expect(await contract.connect(admin1).totalSupply(gARTEQ)).to.equal(10 ** 6);
            expect(await contract.connect(admin1).balanceOf(adminContract.address, ARTEQ)).to.equal(10 ** 10 - 1000 - 10000 - 100 - 200 - 300);
            expect(await contract.connect(admin1).balanceOf(treasury1.address, ARTEQ)).to.equal(1000);
            expect(await contract.connect(admin1).balanceOf(exchange.address, ARTEQ)).to.equal(10000);
            expect(await contract.connect(admin1).balanceOf(governor1.address, ARTEQ)).to.equal(100);
            expect(await contract.connect(admin1).balanceOf(governor2.address, ARTEQ)).to.equal(200);
            expect(await contract.connect(admin1).balanceOf(governor3.address, ARTEQ)).to.equal(300);
            expect(await contract.connect(admin1).balanceOf(adminContract.address, gARTEQ)).to.equal(10 ** 6 - 4000 - 2500 - 3500);
            expect(await contract.connect(admin1).balanceOf(treasury1.address, gARTEQ)).to.equal(0);
            expect(await contract.connect(admin1).balanceOf(exchange.address, gARTEQ)).to.equal(0);
            expect(await contract.connect(admin1).balanceOf(governor1.address, gARTEQ)).to.equal(4000);
            expect(await contract.connect(admin1).balanceOf(governor2.address, gARTEQ)).to.equal(2500);
            expect(await contract.connect(admin1).balanceOf(governor3.address, gARTEQ)).to.equal(3500);
            expect(await contract.connect(admin1).totalCirculatingGovernanceTokens()).to.equal(4000 + 2500 + 3500);
            expect(await contract.connect(admin1).profitTokensTransferredToAccounts()).to.equal(0);

            // round 1: simulate a deposit from the exchange account (Uniswap V1 compatible contract)
            await contract.connect(exchange).safeTransferFrom(exchange.address, treasury1.address, ARTEQ, 100, []);
            // check the balances
            expect(await contract.connect(admin1).allTimeProfit()).to.equal(20);
            expect(await contract.connect(admin1).balanceOf(treasury1.address, ARTEQ)).to.equal(1000 + 80);
            expect(await contract.connect(admin1).profitTokensTransferredToAccounts()).to.equal(0);

            // check governors' balances
            expect(await contract.connect(admin1).balanceOf(governor1.address, ARTEQ)).to.equal(100 + 8);
            expect(await contract.connect(admin1).balanceOf(governor2.address, ARTEQ)).to.equal(200 + 5);
            expect(await contract.connect(admin1).balanceOf(governor3.address, ARTEQ)).to.equal(300 + 7);
            expect(await contract.connect(admin1).balanceOf(governor1.address, gARTEQ)).to.equal(4000);
            expect(await contract.connect(admin1).balanceOf(governor2.address, gARTEQ)).to.equal(2500);
            expect(await contract.connect(admin1).balanceOf(governor3.address, gARTEQ)).to.equal(3500);
            expect(await contract.connect(admin1).profitTokensTransferredToAccounts()).to.equal(0);

            // now, governors exchange ARTEQ tokens
            await contract.connect(governor3).safeTransferFrom(governor3.address, governor2.address, ARTEQ, 100, []);
            expect(await contract.connect(admin1).balanceOf(governor1.address, ARTEQ)).to.equal(100 + 8);
            expect(await contract.connect(admin1).balanceOf(governor2.address, ARTEQ)).to.equal(300 + 5);
            expect(await contract.connect(admin1).balanceOf(governor3.address, ARTEQ)).to.equal(200 + 7);
            expect(await contract.connect(admin1).balanceOf(governor1.address, gARTEQ)).to.equal(4000);
            expect(await contract.connect(admin1).balanceOf(governor2.address, gARTEQ)).to.equal(2500);
            expect(await contract.connect(admin1).balanceOf(governor3.address, gARTEQ)).to.equal(3500);
            expect(await contract.connect(admin1).profitTokensTransferredToAccounts()).to.equal(5 + 7);

            {
                // change profit percentage
                const taskId = await getApprovedTask();
                await contract.connect(admin1).setProfitPercentage(taskId, 45);
            }

            // round 1: simulate a deposit from the exchange account (Uniswap V1 compatible contract)
            await contract.connect(exchange).safeTransferFrom(exchange.address, treasury1.address, ARTEQ, 100, []);
            // check the balances
            expect(await contract.connect(admin1).allTimeProfit()).to.equal(20 + 45);
            expect(await contract.connect(admin1).balanceOf(treasury1.address, ARTEQ)).to.equal(1000 + 80 + 55);
            expect(await contract.connect(admin1).profitTokensTransferredToAccounts()).to.equal(5 + 7);

            // check governors' balances
            expect(await contract.connect(admin1).balanceOf(governor1.address, ARTEQ)).to.equal(100 + 8 + 18);
            expect(await contract.connect(admin1).balanceOf(governor2.address, ARTEQ)).to.equal(300 + 5 + 11);
            expect(await contract.connect(admin1).balanceOf(governor3.address, ARTEQ)).to.equal(200 + 7 + 15);
            expect(await contract.connect(admin1).balanceOf(governor1.address, gARTEQ)).to.equal(4000);
            expect(await contract.connect(admin1).balanceOf(governor2.address, gARTEQ)).to.equal(2500);
            expect(await contract.connect(admin1).balanceOf(governor3.address, gARTEQ)).to.equal(3500);
            expect(await contract.connect(admin1).profitTokensTransferredToAccounts()).to.equal(5 + 7);
        });
    });

    it("[profit distribution] handle manual ARTEQ buy back event", async() => {
        // check admin balance
        expect(await contract.connect(admin1).balanceOf(adminContract.address, ARTEQ)).to.equal(10 ** 10);
        // setup treasury account
        {
            const taskId = await getApprovedTask();
            await contract.connect(admin1).setTreasuryAccount(taskId, treasury1.address);
            // check the treasury balance
            expect(await contract.connect(admin1).balanceOf(treasury1.address, ARTEQ)).to.equal(0);
        }
        // setup exchange account
        {
            const taskId = await getApprovedTask();
            await contract.connect(admin1).setExchange1Account(taskId, exchange.address);
            // check the treasury balance
            expect(await contract.connect(admin1).balanceOf(exchange.address, ARTEQ)).to.equal(0);
        }
        // transfer some tokens to treasury
        {
            const taskId = await getApprovedTask();
            await contract.connect(admin1).transferFromAdminContract(taskId, treasury1.address, ARTEQ, 1000, []);
        }
        // transfer some tokens to exchange
        {
            const taskId = await getApprovedTask();
            await contract.connect(admin1).transferFromAdminContract(taskId, exchange.address, ARTEQ, 10000, []);
        }
        // check the balances again
        expect(await contract.connect(admin1).balanceOf(adminContract.address, ARTEQ)).to.equal(10 ** 10 - 1000 - 10000);
        expect(await contract.connect(admin1).balanceOf(treasury1.address, ARTEQ)).to.equal(1000);
        expect(await contract.connect(admin1).balanceOf(exchange.address, ARTEQ)).to.equal(10000);

        // check the balances of governors before any transfer
        expect(await contract.connect(admin1).balanceOf(governor1.address, ARTEQ)).to.equal(0);
        expect(await contract.connect(admin1).balanceOf(governor2.address, ARTEQ)).to.equal(0);
        expect(await contract.connect(admin1).balanceOf(governor3.address, ARTEQ)).to.equal(0);
        expect(await contract.connect(admin1).balanceOf(governor1.address, gARTEQ)).to.equal(0);
        expect(await contract.connect(admin1).balanceOf(governor2.address, gARTEQ)).to.equal(0);
        expect(await contract.connect(admin1).balanceOf(governor3.address, gARTEQ)).to.equal(0);

        {
            // transfer some ARTEQ tokens to governor 1
            const taskId = await getApprovedTask();
            await contract.connect(admin1).transferFromAdminContract(taskId, governor1.address, ARTEQ, 100, []);
        }
        {
            // transfer some ARTEQ tokens to governor 2
            const taskId = await getApprovedTask();
            await contract.connect(admin1).transferFromAdminContract(taskId, governor2.address, ARTEQ, 200, []);
        }
        {
            // transfer some ARTEQ tokens to governor 3
            const taskId = await getApprovedTask();
            await contract.connect(admin1).transferFromAdminContract(taskId, governor3.address, ARTEQ, 300, []);
        }
        {
            // transfer some gARTEQ tokens to governor 1
            const taskId = await getApprovedTask();
            await contract.connect(admin1).transferFromAdminContract(taskId, governor1.address, gARTEQ, 4000, []);
        }
        {
            // transfer some gARTEQ tokens to governor 2
            const taskId = await getApprovedTask();
            await contract.connect(admin1).transferFromAdminContract(taskId, governor2.address, gARTEQ, 2500, []);
        }
        {
            // transfer some gARTEQ tokens to governor 3
            const taskId = await getApprovedTask();
            await contract.connect(admin1).transferFromAdminContract(taskId, governor3.address, gARTEQ, 3500, []);
        }

        // check the balances again
        expect(await contract.connect(admin1).totalSupply(ARTEQ)).to.equal(10 ** 10);
        expect(await contract.connect(admin1).totalSupply(gARTEQ)).to.equal(10 ** 6);
        expect(await contract.connect(admin1).balanceOf(adminContract.address, ARTEQ)).to.equal(10 ** 10 - 1000 - 10000 - 100 - 200 - 300);
        expect(await contract.connect(admin1).balanceOf(treasury1.address, ARTEQ)).to.equal(1000);
        expect(await contract.connect(admin1).balanceOf(exchange.address, ARTEQ)).to.equal(10000);
        expect(await contract.connect(admin1).balanceOf(governor1.address, ARTEQ)).to.equal(100);
        expect(await contract.connect(admin1).balanceOf(governor2.address, ARTEQ)).to.equal(200);
        expect(await contract.connect(admin1).balanceOf(governor3.address, ARTEQ)).to.equal(300);
        expect(await contract.connect(admin1).balanceOf(adminContract.address, gARTEQ)).to.equal(10 ** 6 - 4000 - 2500 - 3500);
        expect(await contract.connect(admin1).balanceOf(treasury1.address, gARTEQ)).to.equal(0);
        expect(await contract.connect(admin1).balanceOf(exchange.address, gARTEQ)).to.equal(0);
        expect(await contract.connect(admin1).balanceOf(governor1.address, gARTEQ)).to.equal(4000);
        expect(await contract.connect(admin1).balanceOf(governor2.address, gARTEQ)).to.equal(2500);
        expect(await contract.connect(admin1).balanceOf(governor3.address, gARTEQ)).to.equal(3500);
        expect(await contract.connect(admin1).totalCirculatingGovernanceTokens()).to.equal(4000 + 2500 + 3500);
        expect(await contract.connect(admin1).profitTokensTransferredToAccounts()).to.equal(0);

        // round 1: simulate a very small buy back amount (no profit)
        {
            const taskId = await getApprovedTask();
            const call = contract.connect(admin2).processManualBuyBackEvent(taskId, 1);
            const tx = await call;
            const receipt = await tx.wait();
            expect(receipt.logs.length).to.equal(1);
            await expect(call).to.emit(adminContract, "TaskFinalized").withArgs(contract.address, admin2.address, taskId);
        }
        // check the balances
        expect(await contract.connect(admin1).allTimeProfit()).to.equal(0);
        expect(await contract.connect(admin1).balanceOf(treasury1.address, ARTEQ)).to.equal(1000);
        expect(await contract.connect(admin1).profitTokensTransferredToAccounts()).to.equal(0);

        // round 2: simulate a small buy back amount (small profits)
        {
            const taskId = await getApprovedTask();
            const call = contract.connect(admin2).processManualBuyBackEvent(taskId, 10);
            const tx = await call;
            const receipt = await tx.wait();
            expect(receipt.logs.length).to.equal(3);
            await expect(call).to.emit(adminContract, "TaskFinalized").withArgs(contract.address, admin2.address, taskId);
            await expect(call).to.emit(contract, "ManualBuyBackWithdrawalFromTreasury").withArgs(2);
            await expect(call).to.emit(contract, "ProfitTokensCollected").withArgs(2);
        }
        // check the balances
        expect(await contract.connect(admin1).allTimeProfit()).to.equal(2);
        expect(await contract.connect(admin1).balanceOf(treasury1.address, ARTEQ)).to.equal(998);
        expect(await contract.connect(admin1).profitTokensTransferredToAccounts()).to.equal(0);

        // check governors' balances
        expect(await contract.connect(admin1).balanceOf(governor1.address, ARTEQ)).to.equal(100);
        expect(await contract.connect(admin1).balanceOf(governor2.address, ARTEQ)).to.equal(200);
        expect(await contract.connect(admin1).balanceOf(governor3.address, ARTEQ)).to.equal(300);
        expect(await contract.connect(admin1).balanceOf(governor1.address, gARTEQ)).to.equal(4000);
        expect(await contract.connect(admin1).balanceOf(governor2.address, gARTEQ)).to.equal(2500);
        expect(await contract.connect(admin1).balanceOf(governor3.address, gARTEQ)).to.equal(3500);
        expect(await contract.connect(admin1).profitTokensTransferredToAccounts()).to.equal(0);

        // round 3: simulate another bigger buy back event (bigger profits)
        {
            const taskId = await getApprovedTask();
            const call = contract.connect(admin2).processManualBuyBackEvent(taskId, 90);
            const tx = await call;
            const receipt = await tx.wait();
            expect(receipt.logs.length).to.equal(3);
            await expect(call).to.emit(adminContract, "TaskFinalized").withArgs(contract.address, admin2.address, taskId);
            await expect(call).to.emit(contract, "ManualBuyBackWithdrawalFromTreasury").withArgs(18);
            await expect(call).to.emit(contract, "ProfitTokensCollected").withArgs(18);
        }
        // check the balances
        expect(await contract.connect(admin1).allTimeProfit()).to.equal(2 + 18);
        expect(await contract.connect(admin1).balanceOf(treasury1.address, ARTEQ)).to.equal(980);
        expect(await contract.connect(admin1).profitTokensTransferredToAccounts()).to.equal(0);

        // check governors' balances
        expect(await contract.connect(admin1).balanceOf(governor1.address, ARTEQ)).to.equal(100 + 8);
        expect(await contract.connect(admin1).balanceOf(governor2.address, ARTEQ)).to.equal(200 + 5);
        expect(await contract.connect(admin1).balanceOf(governor3.address, ARTEQ)).to.equal(300 + 7);
        expect(await contract.connect(admin1).balanceOf(governor1.address, gARTEQ)).to.equal(4000);
        expect(await contract.connect(admin1).balanceOf(governor2.address, gARTEQ)).to.equal(2500);
        expect(await contract.connect(admin1).balanceOf(governor3.address, gARTEQ)).to.equal(3500);
        expect(await contract.connect(admin1).profitTokensTransferredToAccounts()).to.equal(0);
    });

    it("tokens are not burnable", async() => {
        // check admin balance
        expect(await contract.connect(admin1).balanceOf(adminContract.address, ARTEQ)).to.equal(10 ** 10);
        // transfer some ARTEQ tokens to trader1
        {
            const taskId = await getApprovedTask();
            await contract.connect(admin1).transferFromAdminContract(taskId, trader1.address, ARTEQ, 1000, []);
        }
        // transfer some gARTEQ tokens to trader1
        {
            const taskId = await getApprovedTask();
            await contract.connect(admin1).transferFromAdminContract(taskId, trader1.address, gARTEQ, 500, []);
        }
        // check the balances again
        expect(await contract.connect(admin1).balanceOf(adminContract.address, ARTEQ)).to.equal(10 ** 10 - 1000);
        expect(await contract.connect(admin1).balanceOf(trader1.address, ARTEQ)).to.equal(1000);
        expect(await contract.connect(admin1).balanceOf(trader1.address, gARTEQ)).to.equal(500);

        // try to burn some ARTEQ tokens
        await expect(contract.connect(trader1).safeTransferFrom(trader1.address, zeroAddress, ARTEQ, 100, [])).to.be.revertedWith("ERC1155: transfer to the zero address");
        // try to burn some gARTEQ tokens
        await expect(contract.connect(trader1).safeTransferFrom(trader1.address, zeroAddress, gARTEQ, 10, [])).to.be.revertedWith("ERC1155: transfer to the zero address");
    });
});
