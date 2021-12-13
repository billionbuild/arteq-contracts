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
const { ethers, waffle } = require("hardhat");

const ARTEQ = 1;
const gARTEQ = 2;

const zeroAddress = "0x0000000000000000000000000000000000000000";
const MaxInt = "115792089237316195423570985008687907853269984665640564039457584007913129639935";

describe("ARTEQ", function() {

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
            treasury,
            trader1,
            trader2,
            trader3,
            governor1,
            governor2,
            governor3,
        ] = await ethers.getSigners();

        console.log("------------");
        console.log("deployer: " + deployer.address);
        console.log("admin1: " + admin1.address);
        console.log("admin2: " + admin2.address);
        console.log("admin3: " + admin3.address);
        console.log("admin4: " + admin4.address);
        console.log("admin5: " + admin5.address);
        console.log("admin6: " + admin6.address);
        console.log("treasury: " + treasury.address);
        console.log("trader1: " + trader1.address);
        console.log("trader2: " + trader2.address);
        console.log("trader3: " + trader3.address);
        console.log("governor1: " + governor1.address);
        console.log("governor2: " + governor2.address);
        console.log("governor3: " + governor3.address);

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
        tokensC = await arteQTokensContract.deploy(adminContract.address);
        await tokensC.deployed();
        {
            const taskId = await getApprovedTask();
            await adminContract.addFinalizer(taskId, tokensC.address);
        }

        console.log("tokens contract: " + tokensC.address);

        deployReceipt = await tokensC.deployTransaction.wait();
        expect(deployReceipt.logs.length).to.equal(4);
        await expect(tokensC.deployTransaction).to.emit(tokensC, "URI").withArgs("ipfs://QmfBtH8BSztaYn3QFnz2qvu2ehZgy8AZsNMJDkgr3pdqT8", ARTEQ);
        await expect(tokensC.deployTransaction).to.emit(tokensC, "URI").withArgs("ipfs://QmRAXmU9AymDgtphh37hqx5R2QXSS2ngchQRDFtg6XSD7w", gARTEQ);
        await expect(tokensC.deployTransaction).to.emit(tokensC, "TransferSingle").withArgs(admin3.address, zeroAddress, adminContract.address, ARTEQ, 10 ** 10);
        await expect(tokensC.deployTransaction).to.emit(tokensC, "TransferSingle").withArgs(admin3.address, zeroAddress, adminContract.address, gARTEQ, 10 ** 6);

        expect(await tokensC.connect(trader1).totalSupply(ARTEQ)).to.equal(10 ** 10);
        expect(await tokensC.connect(trader1).balanceOf(adminContract.address, ARTEQ)).to.equal(10 ** 10);

        expect(await tokensC.connect(trader1).totalSupply(gARTEQ)).to.equal(10 ** 6);
        expect(await tokensC.connect(trader1).balanceOf(adminContract.address, gARTEQ)).to.equal(10 ** 6);

        const ARTEQContract = await hre.ethers.getContractFactory("ARTEQ", admin3);
        arteqC = await ARTEQContract.deploy(tokensC.address, adminContract.address);
        await arteqC.deployed();
        {
            const taskId = await getApprovedTask();
            await adminContract.addFinalizer(taskId, arteqC.address);
        }

        console.log("ARTEQ contract: " + arteqC.address);

        const uniswapFactoryContract = await hre.ethers.getContractFactory("uniswap_factory", admin3);
        factoryC = await uniswapFactoryContract.deploy();
        await factoryC.deployed();

        console.log("uniswap factory contract: " + factoryC.address);

        const uniswapExchangeContract = await hre.ethers.getContractFactory("uniswap_exchange", admin3);
        exchangeC = await uniswapExchangeContract.deploy();
        await exchangeC.deployed();

        console.log("uniswap exchange contract: " + exchangeC.address);

        await factoryC.initializeFactory(exchangeC.address);
        expect(await factoryC.exchangeTemplate()).to.equal(exchangeC.address);

        expect(await factoryC.getExchange(arteqC.address)).to.equal(zeroAddress);
        await factoryC.createExchange(arteqC.address);
        tokenExchange = await factoryC.getExchange(arteqC.address);

        console.log("token exchange contract: " + tokenExchange);

        tokenExchangeContract = await hre.ethers.getContractFactory("uniswap_exchange", admin3);
        tokenExchangeC = await tokenExchangeContract.attach(tokenExchange);

        console.log("token exchange contract (2): " + tokenExchangeC.address);
        {
            const taskId = await getApprovedTask();
            await tokensC.connect(admin5).setExchange1Account(taskId, tokenExchangeC.address);
        }
        {
            const taskId = await getApprovedTask();
            await tokensC.connect(admin6).setTreasuryAccount(taskId, treasury.address);
        }

        expect(await factoryC.connect(trader1).getExchange(arteqC.address)).to.equal(tokenExchangeC.address);
        expect(await tokenExchangeC.connect(trader1).tokenAddress()).to.equal(arteqC.address);
        expect(await tokenExchangeC.connect(trader1).factoryAddress()).to.equal(factoryC.address);

        {
            const taskId = await getApprovedTask();
            const call = tokensC.connect(admin2).transferFromAdminContract(taskId, trader1.address, ARTEQ, 10 ** 5);
            const tx = await call;
            const receipt = await tx.wait();
            expect(receipt.logs.length).to.equal(2);
            await expect(call).to.emit(adminContract, "TaskFinalized").withArgs(tokensC.address, admin2.address, taskId);
            await expect(call).to.emit(tokensC, "TransferSingle").withArgs(admin2.address, adminContract.address, trader1.address, ARTEQ, 10 ** 5);
            expect(await arteqC.connect(trader2).balanceOf(adminContract.address)).to.equal(10 ** 10 - 10 ** 5);
            expect(await arteqC.connect(trader2).balanceOf(trader1.address)).to.equal(10 ** 5);
        }
    });

    it("test functions of the token exchange contract and its balance", async () => {
        const provider = waffle.provider;

        expect(await tokenExchangeC.connect(trader1).name()).to.equal("0x556e697377617020563100000000000000000000000000000000000000000000");
        expect(await tokenExchangeC.connect(trader1).symbol()).to.equal("0x554e492d56310000000000000000000000000000000000000000000000000000");
        expect(await tokenExchangeC.connect(trader1).decimals()).to.equal(18);
        expect(await tokenExchangeC.connect(trader1).totalSupply()).to.equal(0);
        expect(await provider.getBalance(tokenExchangeC.address)).to.equal(0);
        expect(await arteqC.connect(trader1).balanceOf(tokenExchangeC.address)).to.equal(0);
        expect(await tokensC.connect(trader1).getTreasuryAccount()).to.equal(treasury.address);
        expect(await tokensC.connect(trader1).getExchange1Account()).to.equal(tokenExchangeC.address);
    });

    it("provide liquidity", async () => {
        const provider = waffle.provider;

        // approve ARTEQ for trader1
        expect(await tokenExchangeC.connect(trader1).totalSupply()).to.equal(0);
        expect(await arteqC.connect(trader1).allowance(trader1.address, tokenExchangeC.address)).to.equal(0);
        await arteqC.connect(trader1).approve(tokenExchangeC.address, 10 ** 5);
        expect(await arteqC.connect(trader1).allowance(trader1.address, tokenExchangeC.address)).to.equal(MaxInt);

        {
            const call = await tokenExchangeC.connect(trader1).addLiquidity(0, 40000, 2640995199, { value: ethers.utils.parseEther("4") });
            const tx = await call;
            receipt = await tx.wait();
            expect(receipt.logs.length).to.equal(4);
            await expect(call).to.emit(tokenExchangeC, "AddLiquidity").withArgs(trader1.address, ethers.utils.parseEther("4"), 40000);
            await expect(call).to.emit(tokenExchangeC, "Transfer").withArgs(zeroAddress, trader1.address, ethers.utils.parseEther("4"));
            await expect(call).to.emit(arteqC, "Transfer").withArgs(trader1.address, tokenExchangeC.address, 40000);
            await expect(call).to.emit(tokensC, "TransferSingle").withArgs(tokenExchangeC.address, trader1.address, tokenExchangeC.address, ARTEQ, 40000);

            expect(await arteqC.connect(trader2).balanceOf(trader1.address)).to.equal(60000);
            expect(await arteqC.connect(trader2).balanceOf(tokenExchangeC.address)).to.equal(40000);
            expect(await provider.getBalance(tokenExchangeC.address)).to.equal(ethers.utils.parseEther("4"));
        }

        {
            const call = await tokenExchangeC.connect(trader1).addLiquidity(1, 22000, 2640995199, { value: ethers.utils.parseEther("2") });
            const tx = await call;
            receipt = await tx.wait();
            expect(receipt.logs.length).to.equal(4);
            await expect(call).to.emit(tokenExchangeC, "AddLiquidity").withArgs(trader1.address, ethers.utils.parseEther("2"), 20001);
            await expect(call).to.emit(tokenExchangeC, "Transfer").withArgs(zeroAddress, trader1.address, ethers.utils.parseEther("2"));
            await expect(call).to.emit(arteqC, "Transfer").withArgs(trader1.address, tokenExchangeC.address, 20001);
            await expect(call).to.emit(tokensC, "TransferSingle").withArgs(tokenExchangeC.address, trader1.address, tokenExchangeC.address, ARTEQ, 20001);

            expect(await arteqC.connect(trader2).balanceOf(trader1.address)).to.equal(39999);
            expect(await arteqC.connect(trader2).balanceOf(tokenExchangeC.address)).to.equal(60001);
            expect(await provider.getBalance(tokenExchangeC.address)).to.equal(ethers.utils.parseEther("6"));
        }
    });

    [1, 2, 3, 4, 5].forEach((i) => {
        it(`treasury buy back scenario on exchange account ${i}`, async () => {
            const provider = waffle.provider;

            // transfer 10 ** 5 token to treasury account
            {
                const taskId = await getApprovedTask();
                const call = tokensC.connect(admin2).transferFromAdminContract(taskId, treasury.address, ARTEQ, 10 ** 5);
                const tx = await call;
                const receipt = await tx.wait();
                expect(receipt.logs.length).to.equal(2);
                await expect(call).to.emit(adminContract, "TaskFinalized").withArgs(tokensC.address, admin2.address, taskId);
                await expect(call).to.emit(tokensC, "TransferSingle").withArgs(admin2.address, adminContract.address, treasury.address, ARTEQ, 10 ** 5);
                expect(await arteqC.connect(trader2).balanceOf(adminContract.address)).to.equal(10 ** 10 - 2 * 10 ** 5);
                expect(await arteqC.connect(trader2).balanceOf(treasury.address)).to.equal(10 ** 5);
            }
            // setup exchange account
            {
                const taskId = await getApprovedTask();
                const call = tokensC.connect(admin4)[`setExchange${i}Account`](taskId, tokenExchangeC.address);
                const tx = await call;
                const receipt = await tx.wait();
                expect(receipt.logs.length).to.equal(2);
                await expect(call).to.emit(adminContract, "TaskFinalized").withArgs(tokensC.address, admin4.address, taskId);
                await expect(call).to.emit(tokensC, `Exchange${i}AccountChanged`).withArgs(tokenExchangeC.address);
                // check the treasury balance
                expect(await tokensC.connect(admin6).balanceOf(tokenExchangeC.address, ARTEQ)).to.equal(0);
            }
            // approve ARTEQ for treasury account
            expect(await tokenExchangeC.connect(trader1).totalSupply()).to.equal(0);
            expect(await arteqC.connect(trader1).allowance(treasury.address, tokenExchangeC.address)).to.equal(0);
            await arteqC.connect(treasury).approve(tokenExchangeC.address, 10 ** 5);
            expect(await arteqC.connect(trader1).allowance(treasury.address, tokenExchangeC.address)).to.equal(MaxInt);
            {
                const call = await tokenExchangeC.connect(treasury).addLiquidity(0, 40000, 3640995199, { value: ethers.utils.parseEther("4") });
                const tx = await call;
                receipt = await tx.wait();
                expect(receipt.logs.length).to.equal(4);
                await expect(call).to.emit(tokenExchangeC, "AddLiquidity").withArgs(treasury.address, ethers.utils.parseEther("4"), 40000);
                await expect(call).to.emit(tokenExchangeC, "Transfer").withArgs(zeroAddress, treasury.address, ethers.utils.parseEther("4"));
                await expect(call).to.emit(arteqC, "Transfer").withArgs(treasury.address, tokenExchangeC.address, 40000);
                await expect(call).to.emit(tokensC, "TransferSingle").withArgs(tokenExchangeC.address, treasury.address, tokenExchangeC.address, ARTEQ, 40000);

                expect(await arteqC.connect(trader2).balanceOf(treasury.address)).to.equal(60000);
                expect(await arteqC.connect(trader2).balanceOf(tokenExchangeC.address)).to.equal(40000);
                expect(await provider.getBalance(tokenExchangeC.address)).to.equal(ethers.utils.parseEther("4"));
            }
            // add more liquidity
            {
                const call = await tokenExchangeC.connect(treasury).addLiquidity(1, 22000, 3640995199, { value: ethers.utils.parseEther("2") });
                const tx = await call;
                receipt = await tx.wait();
                expect(receipt.logs.length).to.equal(4);
                await expect(call).to.emit(tokenExchangeC, "AddLiquidity").withArgs(treasury.address, ethers.utils.parseEther("2"), 20001);
                await expect(call).to.emit(tokenExchangeC, "Transfer").withArgs(zeroAddress, treasury.address, ethers.utils.parseEther("2"));
                await expect(call).to.emit(arteqC, "Transfer").withArgs(treasury.address, tokenExchangeC.address, 20001);
                await expect(call).to.emit(tokensC, "TransferSingle").withArgs(tokenExchangeC.address, treasury.address, tokenExchangeC.address, ARTEQ, 20001);

                expect(await arteqC.connect(trader2).balanceOf(treasury.address)).to.equal(39999);
                expect(await arteqC.connect(trader2).balanceOf(tokenExchangeC.address)).to.equal(60001);
                expect(await provider.getBalance(tokenExchangeC.address)).to.equal(ethers.utils.parseEther("6"));
            }
            // setup governor accounts
            {
                // check the balances of governors before any transfer
                expect(await tokensC.connect(admin1).balanceOf(governor1.address, ARTEQ)).to.equal(0);
                expect(await tokensC.connect(admin1).balanceOf(governor2.address, ARTEQ)).to.equal(0);
                expect(await tokensC.connect(admin1).balanceOf(governor3.address, ARTEQ)).to.equal(0);
                expect(await tokensC.connect(admin1).balanceOf(governor1.address, gARTEQ)).to.equal(0);
                expect(await tokensC.connect(admin1).balanceOf(governor2.address, gARTEQ)).to.equal(0);
                expect(await tokensC.connect(admin1).balanceOf(governor3.address, gARTEQ)).to.equal(0);
                expect(await arteqC.connect(admin1).balanceOf(governor1.address)).to.equal(0);
                expect(await arteqC.connect(admin1).balanceOf(governor2.address)).to.equal(0);
                expect(await arteqC.connect(admin1).balanceOf(governor3.address)).to.equal(0);

                {
                    // transfer some ARTEQ tokens to governor 1
                    const taskId = await getApprovedTask();
                    await tokensC.connect(admin1).transferFromAdminContract(taskId, governor1.address, ARTEQ, 100, []);
                }
                {
                    // transfer some ARTEQ tokens to governor 2
                    const taskId = await getApprovedTask();
                    await tokensC.connect(admin1).transferFromAdminContract(taskId, governor2.address, ARTEQ, 200, []);
                }
                {
                    // transfer some ARTEQ tokens to governor 3
                    const taskId = await getApprovedTask();
                    await tokensC.connect(admin1).transferFromAdminContract(taskId, governor3.address, ARTEQ, 300, []);
                }
                {
                    // transfer some gARTEQ tokens to governor 1
                    const taskId = await getApprovedTask();
                    await tokensC.connect(admin1).transferFromAdminContract(taskId, governor1.address, gARTEQ, 4000, []);
                }
                {
                    // transfer some gARTEQ tokens to governor 2
                    const taskId = await getApprovedTask();
                    await tokensC.connect(admin1).transferFromAdminContract(taskId, governor2.address, gARTEQ, 2500, []);
                }
                {
                    // transfer some gARTEQ tokens to governor 3
                    const taskId = await getApprovedTask();
                    await tokensC.connect(admin1).transferFromAdminContract(taskId, governor3.address, gARTEQ, 3500, []);
                }

                // check the balances again
                expect(await tokensC.connect(admin1).totalSupply(ARTEQ)).to.equal(10 ** 10);
                expect(await tokensC.connect(admin1).totalSupply(gARTEQ)).to.equal(10 ** 6);

                expect(await tokensC.connect(admin1).allTimeProfit()).to.equal(0);

                expect(await tokensC.connect(admin1).balanceOf(adminContract.address, ARTEQ)).to.equal(10 ** 10 - 2 * 10 ** 5 - 100 - 200 - 300);
                expect(await tokensC.connect(admin1).balanceOf(governor1.address, ARTEQ)).to.equal(100);
                expect(await tokensC.connect(admin1).balanceOf(governor2.address, ARTEQ)).to.equal(200);
                expect(await tokensC.connect(admin1).balanceOf(governor3.address, ARTEQ)).to.equal(300);
                expect(await arteqC.connect(admin1).balanceOf(governor1.address)).to.equal(100);
                expect(await arteqC.connect(admin1).balanceOf(governor2.address)).to.equal(200);
                expect(await arteqC.connect(admin1).balanceOf(governor3.address)).to.equal(300);

                expect(await tokensC.connect(admin1).balanceOf(adminContract.address, gARTEQ)).to.equal(10 ** 6 - 4000 - 2500 - 3500);
                expect(await tokensC.connect(admin1).balanceOf(treasury.address, gARTEQ)).to.equal(0);
                expect(await tokensC.connect(admin1).balanceOf(tokenExchangeC.address, gARTEQ)).to.equal(0);
                expect(await tokensC.connect(admin1).balanceOf(governor1.address, gARTEQ)).to.equal(4000);
                expect(await tokensC.connect(admin1).balanceOf(governor2.address, gARTEQ)).to.equal(2500);
                expect(await tokensC.connect(admin1).balanceOf(governor3.address, gARTEQ)).to.equal(3500);
                expect(await tokensC.connect(admin1).totalCirculatingGovernanceTokens()).to.equal(4000 + 2500 + 3500);
                expect(await tokensC.connect(admin1).profitTokensTransferredToAccounts()).to.equal(0);
            }
            // buy back some tokens equal to 0.15 ETH
            {
                const call = await treasury.sendTransaction({
                    to: tokenExchangeC.address,
                    value: ethers.utils.parseEther("0.15"),
                });
                const tx = await call;
                receipt = await tx.wait();
                expect(receipt.logs.length).to.equal(4);
                await expect(call).to.emit(tokenExchangeC, "TokenPurchase").withArgs(treasury.address, ethers.utils.parseEther("0.15"), 1459);
                await expect(call).to.emit(arteqC, "Transfer").withArgs(tokenExchangeC.address, treasury.address, 1459);
                await expect(call).to.emit(tokensC, "TransferSingle").withArgs(tokenExchangeC.address, tokenExchangeC.address, treasury.address, ARTEQ, 1459);
                await expect(call).to.emit(tokensC, "ProfitTokensCollected").withArgs(291);

                expect(await arteqC.connect(trader2).balanceOf(treasury.address)).to.equal(39999 + 1168);
                expect(await arteqC.connect(trader2).balanceOf(tokenExchangeC.address)).to.equal(60001 - 1459);
                expect(await provider.getBalance(tokenExchangeC.address)).to.equal(ethers.utils.parseEther("6.15"));
            }
            // profit must have been distributed
            {
                // check the balances
                expect(await tokensC.connect(admin1).allTimeProfit()).to.equal(291);
                expect(await tokensC.connect(admin1).profitTokensTransferredToAccounts()).to.equal(0);

                // check governors' balances
                expect(await tokensC.connect(admin1).balanceOf(governor1.address, ARTEQ)).to.equal(100 + 116);
                expect(await tokensC.connect(admin1).balanceOf(governor2.address, ARTEQ)).to.equal(200 + 72);
                expect(await tokensC.connect(admin1).balanceOf(governor3.address, ARTEQ)).to.equal(300 + 101);
                expect(await tokensC.connect(admin1).balanceOf(governor1.address, gARTEQ)).to.equal(4000);
                expect(await tokensC.connect(admin1).balanceOf(governor2.address, gARTEQ)).to.equal(2500);
                expect(await tokensC.connect(admin1).balanceOf(governor3.address, gARTEQ)).to.equal(3500);
                expect(await tokensC.connect(admin1).profitTokensTransferredToAccounts()).to.equal(0);
            }
            // now, transfer some tokens
            {
                // now, governors exchange ARTEQ tokens
                const call =  arteqC.connect(governor3).transfer(governor2.address, 100);
                const tx = await call;
                receipt = await tx.wait();
                expect(receipt.logs.length).to.equal(4);
                await expect(call).to.emit(arteqC, "Transfer").withArgs(governor3.address, governor2.address, 100);
                await expect(call).to.emit(tokensC, "TransferSingle").withArgs(governor3.address, governor3.address, governor2.address, ARTEQ, 100);
                await expect(call).to.emit(tokensC, "ProfitTokensDistributed").withArgs(governor2.address, 72);
                await expect(call).to.emit(tokensC, "ProfitTokensDistributed").withArgs(governor3.address, 101);

                expect(await tokensC.connect(admin1).balanceOf(governor1.address, ARTEQ)).to.equal(100 + 116);
                expect(await tokensC.connect(admin1).balanceOf(governor2.address, ARTEQ)).to.equal(300 + 72);
                expect(await tokensC.connect(admin1).balanceOf(governor3.address, ARTEQ)).to.equal(200 + 101);
                expect(await tokensC.connect(admin1).balanceOf(governor1.address, gARTEQ)).to.equal(4000);
                expect(await tokensC.connect(admin1).balanceOf(governor2.address, gARTEQ)).to.equal(2500);
                expect(await tokensC.connect(admin1).balanceOf(governor3.address, gARTEQ)).to.equal(3500);
                expect(await tokensC.connect(admin1).profitTokensTransferredToAccounts()).to.equal(72 + 101);
            }
        });
    });
});
