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
            trader1,
            trader2,
            trader3,
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
        innerContract = await arteQTokensContract.deploy(adminContract.address);
        await innerContract.deployed();
        {
            const taskId = await getApprovedTask();
            await adminContract.addFinalizer(taskId, innerContract.address);
        }

        // console.log("inner contract: " + innerContract.address);

        deployReceipt = await innerContract.deployTransaction.wait();
        expect(deployReceipt.logs.length).to.equal(4);
        await expect(innerContract.deployTransaction).to.emit(innerContract, "URI").withArgs("ipfs://QmfBtH8BSztaYn3QFnz2qvu2ehZgy8AZsNMJDkgr3pdqT8", ARTEQ);
        await expect(innerContract.deployTransaction).to.emit(innerContract, "URI").withArgs("ipfs://QmRAXmU9AymDgtphh37hqx5R2QXSS2ngchQRDFtg6XSD7w", gARTEQ);
        await expect(innerContract.deployTransaction).to.emit(innerContract, "TransferSingle").withArgs(admin3.address, zeroAddress, adminContract.address, ARTEQ, 10 ** 10);
        await expect(innerContract.deployTransaction).to.emit(innerContract, "TransferSingle").withArgs(admin3.address, zeroAddress, adminContract.address, gARTEQ, 10 ** 6);

        expect(await innerContract.connect(trader1).totalSupply(ARTEQ)).to.equal(10 ** 10);
        expect(await innerContract.connect(trader1).balanceOf(adminContract.address, ARTEQ)).to.equal(10 ** 10);

        expect(await innerContract.connect(trader1).totalSupply(gARTEQ)).to.equal(10 ** 6);
        expect(await innerContract.connect(trader1).balanceOf(adminContract.address, gARTEQ)).to.equal(10 ** 6);

        const ARTEQContract = await hre.ethers.getContractFactory("ARTEQ", admin1);
        contract = await ARTEQContract.deploy(innerContract.address, adminContract.address);
        await contract.deployed();
        {
            const taskId = await getApprovedTask();
            await adminContract.addFinalizer(taskId, contract.address);
        }

        // console.log("contract: " + contract.address);

        {
            const taskId = await getApprovedTask();
            const call = innerContract.connect(admin2).transferFromAdminContract(taskId, trader1.address, ARTEQ, 5000);
            const tx = await call;
            const receipt = await tx.wait();
            expect(receipt.logs.length).to.equal(2);
            await expect(call).to.emit(adminContract, "TaskFinalized").withArgs(innerContract.address, admin2.address, taskId);
            await expect(call).to.emit(innerContract, "TransferSingle").withArgs(admin2.address, adminContract.address, trader1.address, ARTEQ, 5000);
            expect(await contract.connect(trader2).balanceOf(adminContract.address)).to.equal(10 ** 10 - 5000);
            expect(await contract.connect(trader2).balanceOf(trader1.address)).to.equal(5000);
        }
    });

    it("should not accept ether", async() => {
        await expect(trader1.sendTransaction({
            to: contract.address,
            value: ethers.utils.parseEther("1"),
        })).to.be.revertedWith("ARTEQ: cannot accept ether");
    });

    it("should be able to read total supply and balance of admin", async () => {
        expect(await contract.connect(trader1).totalSupply()).to.equal(10 ** 10);
        expect(await contract.connect(trader1).balanceOf(adminContract.address)).to.equal(10 ** 10 - 5000);
    });

    it("transfer ARTEQ tokens", async () => {
        const call = contract.connect(trader1).transfer(trader2.address, 1000);
        const tx = await call;
        const receipt = await tx.wait();
        expect(receipt.logs.length).to.equal(2);
        await expect(call).to.emit(innerContract, "TransferSingle").withArgs(trader1.address, trader1.address, trader2.address, ARTEQ, 1000);
        await expect(call).to.emit(contract, "Transfer").withArgs(trader1.address, trader2.address, 1000);

        expect(await contract.connect(trader2).balanceOf(trader1.address)).to.equal(5000 - 1000);
        expect(await contract.connect(trader2).balanceOf(trader2.address)).to.equal(1000);
    });

    it("transfer ARTEQ tokens with approval", async () => {
        await expect(contract.connect(trader3).transferFrom(trader1.address, trader2.address, 400)).to.be.revertedWith("arteQTokens: caller is not owner nor approved");
        expect(await contract.connect(trader2).allowance(trader1.address, trader3.address)).to.equal(0);

        {
            const call = contract.connect(trader1).approve(trader3.address, 200); // any positive value should work (the underlying contract is an ERC-1155 contract)
            const tx = await call;
            receipt = await tx.wait();
            expect(receipt.logs.length).to.equal(2);
            await expect(call).to.emit(innerContract, "ApprovalForAll").withArgs(trader1.address, trader3.address, true);
            await expect(call).to.emit(contract, "Approval").withArgs(trader1.address, trader3.address, 200);
            expect(await contract.connect(trader2.address).allowance(trader1.address, trader3.address)).to.equal(MaxInt);
        }

        {
            const call = contract.connect(trader3).transferFrom(trader1.address, trader2.address, 400);
            const tx = await call;
            receipt = await tx.wait();
            expect(receipt.logs.length).to.equal(2);
            await expect(call).to.emit(innerContract, "TransferSingle").withArgs(trader3.address, trader1.address, trader2.address, ARTEQ, 400);
            await expect(call).to.emit(contract, "Transfer").withArgs(trader1.address, trader2.address, 400);

            expect(await contract.connect(trader2).balanceOf(trader1.address)).to.equal(4600);
            expect(await contract.connect(trader2).balanceOf(trader2.address)).to.equal(400);
            expect(await contract.connect(trader2).balanceOf(trader3.address)).to.equal(0);
        }
    });
});
