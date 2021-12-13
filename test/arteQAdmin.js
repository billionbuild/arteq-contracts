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

const zeroAddress = "0x0000000000000000000000000000000000000000";
const MaxInt = "115792089237316195423570985008687907853269984665640564039457584007913129639935";

describe("arteQAdmin deployments", function() {
    it("cannoe deploy admin contract with zero initial admins", async() => {
        const [
            deployer,
        ] = await ethers.getSigners();

        console.log("deployer: " + deployer.address);

        const arteQAdminContract = await hre.ethers.getContractFactory("arteQAdmin", deployer);
        await expect(arteQAdminContract.deploy([])).to.be.revertedWith("arteQAdmin: not enough inital admins");
    });
    it("cannoe deploy admin contract with 1 initial admins", async() => {
        const [
            deployer,
            admin01,
        ] = await ethers.getSigners();

        console.log("deployer: " + deployer.address);
        console.log("admin [01]: " + admin01.address);

        const arteQAdminContract = await hre.ethers.getContractFactory("arteQAdmin", deployer);
        await expect(arteQAdminContract.deploy([
            admin01.address,
        ])).to.be.revertedWith("arteQAdmin: not enough inital admins");
    });
    it("cannoe deploy admin contract with 2 initial admins", async() => {
        const [
            deployer,
            admin01,
            admin02,
        ] = await ethers.getSigners();

        console.log("deployer: " + deployer.address);
        console.log("admin [01]: " + admin01.address);
        console.log("admin [02]: " + admin02.address);

        const arteQAdminContract = await hre.ethers.getContractFactory("arteQAdmin", deployer);
        await expect(arteQAdminContract.deploy([
            admin01.address,
            admin02.address,
        ])).to.be.revertedWith("arteQAdmin: not enough inital admins");
    });
    it("cannoe deploy admin contract with 3 initial admins", async() => {
        const [
            deployer,
            admin01,
            admin02,
            admin03,
        ] = await ethers.getSigners();

        console.log("deployer: " + deployer.address);
        console.log("admin [01]: " + admin01.address);
        console.log("admin [02]: " + admin02.address);
        console.log("admin [03]: " + admin03.address);

        const arteQAdminContract = await hre.ethers.getContractFactory("arteQAdmin", deployer);
        await expect(arteQAdminContract.deploy([
            admin01.address,
            admin02.address,
            admin03.address,
        ])).to.be.revertedWith("arteQAdmin: not enough inital admins");
    });
    it("cannoe deploy admin contract with 4 initial admins", async() => {
        const [
            deployer,
            admin01,
            admin02,
            admin03,
            admin04,
        ] = await ethers.getSigners();

        console.log("deployer: " + deployer.address);
        console.log("admin [01]: " + admin01.address);
        console.log("admin [02]: " + admin02.address);
        console.log("admin [03]: " + admin03.address);
        console.log("admin [04]: " + admin04.address);

        const arteQAdminContract = await hre.ethers.getContractFactory("arteQAdmin", deployer);
        await expect(arteQAdminContract.deploy([
            admin01.address,
            admin02.address,
            admin03.address,
            admin04.address,
        ])).to.be.revertedWith("arteQAdmin: not enough inital admins");
    });
    it("deploy admin contract with 5 initial admins", async() => {
        const [
            deployer,
            admin01,
            admin02,
            admin03,
            admin04,
            admin05,
        ] = await ethers.getSigners();

        /*console.log("deployer: " + deployer.address);
        console.log("admin [01]: " + admin01.address);
        console.log("admin [02]: " + admin02.address);
        console.log("admin [03]: " + admin03.address);
        console.log("admin [04]: " + admin04.address);
        console.log("admin [05]: " + admin05.address);*/

        const arteQAdminContract = await hre.ethers.getContractFactory("arteQAdmin", deployer);
        const contract = await arteQAdminContract.deploy([
            admin01.address,
            admin02.address,
            admin03.address,
            admin04.address,
            admin05.address,
        ])
        console.log("contract: " + contract.address);
        deployReceipt = await contract.deployTransaction.wait();
        expect(deployReceipt.logs.length).to.equal(6);

        expect(await contract.connect(deployer).minNrOfAdmins()).to.equal(5);
        expect(await contract.connect(deployer).maxNrOfAdmins()).to.equal(10);
        expect(await contract.connect(deployer).nrOfAdmins()).to.equal(5);
        expect(await contract.connect(deployer).minRequiredNrOfApprovals()).to.equal(3);
    });
    it("deploy admin contract with 6 initial admins", async() => {
        const [
            deployer,
            admin01,
            admin02,
            admin03,
            admin04,
            admin05,
            admin06,
        ] = await ethers.getSigners();

        /*console.log("deployer: " + deployer.address);
        console.log("admin [01]: " + admin01.address);
        console.log("admin [02]: " + admin02.address);
        console.log("admin [03]: " + admin03.address);
        console.log("admin [04]: " + admin04.address);
        console.log("admin [05]: " + admin05.address);
        console.log("admin [06]: " + admin06.address);*/

        const arteQAdminContract = await hre.ethers.getContractFactory("arteQAdmin", deployer);
        const contract = await arteQAdminContract.deploy([
            admin01.address,
            admin02.address,
            admin03.address,
            admin04.address,
            admin05.address,
            admin06.address,
        ])
        console.log("contract: " + contract.address);
        deployReceipt = await contract.deployTransaction.wait();
        expect(deployReceipt.logs.length).to.equal(7);

        expect(await contract.connect(deployer).minNrOfAdmins()).to.equal(5);
        expect(await contract.connect(deployer).maxNrOfAdmins()).to.equal(10);
        expect(await contract.connect(deployer).nrOfAdmins()).to.equal(6);
        expect(await contract.connect(deployer).minRequiredNrOfApprovals()).to.equal(4);
    });
    it("deploy admin contract with 7 initial admins", async() => {
        const [
            deployer,
            admin01,
            admin02,
            admin03,
            admin04,
            admin05,
            admin06,
            admin07,
        ] = await ethers.getSigners();

        /*console.log("deployer: " + deployer.address);
        console.log("admin [01]: " + admin01.address);
        console.log("admin [02]: " + admin02.address);
        console.log("admin [03]: " + admin03.address);
        console.log("admin [04]: " + admin04.address);
        console.log("admin [05]: " + admin05.address);
        console.log("admin [06]: " + admin06.address);
        console.log("admin [07]: " + admin07.address);*/

        const arteQAdminContract = await hre.ethers.getContractFactory("arteQAdmin", deployer);
        const contract = await arteQAdminContract.deploy([
            admin01.address,
            admin02.address,
            admin03.address,
            admin04.address,
            admin05.address,
            admin06.address,
            admin07.address,
        ])
        console.log("contract: " + contract.address);
        deployReceipt = await contract.deployTransaction.wait();
        expect(deployReceipt.logs.length).to.equal(8);

        expect(await contract.connect(deployer).minNrOfAdmins()).to.equal(5);
        expect(await contract.connect(deployer).maxNrOfAdmins()).to.equal(10);
        expect(await contract.connect(deployer).nrOfAdmins()).to.equal(7);
        expect(await contract.connect(deployer).minRequiredNrOfApprovals()).to.equal(4);
    });
    it("deploy admin contract with 8 initial admins", async() => {
        const [
            deployer,
            admin01,
            admin02,
            admin03,
            admin04,
            admin05,
            admin06,
            admin07,
            admin08,
        ] = await ethers.getSigners();

        /*console.log("deployer: " + deployer.address);
        console.log("admin [01]: " + admin01.address);
        console.log("admin [02]: " + admin02.address);
        console.log("admin [03]: " + admin03.address);
        console.log("admin [04]: " + admin04.address);
        console.log("admin [05]: " + admin05.address);
        console.log("admin [06]: " + admin06.address);
        console.log("admin [07]: " + admin07.address);
        console.log("admin [08]: " + admin08.address);*/

        const arteQAdminContract = await hre.ethers.getContractFactory("arteQAdmin", deployer);
        const contract = await arteQAdminContract.deploy([
            admin01.address,
            admin02.address,
            admin03.address,
            admin04.address,
            admin05.address,
            admin06.address,
            admin07.address,
            admin08.address,
        ])
        console.log("contract: " + contract.address);
        deployReceipt = await contract.deployTransaction.wait();
        expect(deployReceipt.logs.length).to.equal(9);

        expect(await contract.connect(deployer).minNrOfAdmins()).to.equal(5);
        expect(await contract.connect(deployer).maxNrOfAdmins()).to.equal(10);
        expect(await contract.connect(deployer).nrOfAdmins()).to.equal(8);
        expect(await contract.connect(deployer).minRequiredNrOfApprovals()).to.equal(5);
    });
    it("deploy admin contract with 9 initial admins", async() => {
        const [
            deployer,
            admin01,
            admin02,
            admin03,
            admin04,
            admin05,
            admin06,
            admin07,
            admin08,
            admin09,
        ] = await ethers.getSigners();

        /*console.log("deployer: " + deployer.address);
        console.log("admin [01]: " + admin01.address);
        console.log("admin [02]: " + admin02.address);
        console.log("admin [03]: " + admin03.address);
        console.log("admin [04]: " + admin04.address);
        console.log("admin [05]: " + admin05.address);
        console.log("admin [06]: " + admin06.address);
        console.log("admin [07]: " + admin07.address);
        console.log("admin [08]: " + admin08.address);
        console.log("admin [09]: " + admin09.address);*/

        const arteQAdminContract = await hre.ethers.getContractFactory("arteQAdmin", deployer);
        const contract = await arteQAdminContract.deploy([
            admin01.address,
            admin02.address,
            admin03.address,
            admin04.address,
            admin05.address,
            admin06.address,
            admin07.address,
            admin08.address,
            admin09.address,
        ])
        console.log("contract: " + contract.address);
        deployReceipt = await contract.deployTransaction.wait();
        expect(deployReceipt.logs.length).to.equal(10);

        expect(await contract.connect(deployer).minNrOfAdmins()).to.equal(5);
        expect(await contract.connect(deployer).maxNrOfAdmins()).to.equal(10);
        expect(await contract.connect(deployer).nrOfAdmins()).to.equal(9);
        expect(await contract.connect(deployer).minRequiredNrOfApprovals()).to.equal(5);
    });
    it("deploy admin contract with 10 initial admins", async() => {
        const [
            deployer,
            admin01,
            admin02,
            admin03,
            admin04,
            admin05,
            admin06,
            admin07,
            admin08,
            admin09,
            admin10,
        ] = await ethers.getSigners();

        /*console.log("deployer: " + deployer.address);
        console.log("admin [01]: " + admin01.address);
        console.log("admin [02]: " + admin02.address);
        console.log("admin [03]: " + admin03.address);
        console.log("admin [04]: " + admin04.address);
        console.log("admin [05]: " + admin05.address);
        console.log("admin [06]: " + admin06.address);
        console.log("admin [07]: " + admin07.address);
        console.log("admin [08]: " + admin08.address);
        console.log("admin [09]: " + admin09.address);
        console.log("admin [10]: " + admin10.address);*/

        const arteQAdminContract = await hre.ethers.getContractFactory("arteQAdmin", deployer);
        const contract = await arteQAdminContract.deploy([
            admin01.address,
            admin02.address,
            admin03.address,
            admin04.address,
            admin05.address,
            admin06.address,
            admin07.address,
            admin08.address,
            admin09.address,
            admin10.address,
        ])
        console.log("contract: " + contract.address);
        deployReceipt = await contract.deployTransaction.wait();
        expect(deployReceipt.logs.length).to.equal(11);

        expect(await contract.connect(deployer).minNrOfAdmins()).to.equal(5);
        expect(await contract.connect(deployer).maxNrOfAdmins()).to.equal(10);
        expect(await contract.connect(deployer).nrOfAdmins()).to.equal(10);
        expect(await contract.connect(deployer).minRequiredNrOfApprovals()).to.equal(6);
    });
    it("admin deploy admin contract with 11+ initial admins", async() => {
        const [
            deployer,
            admin01,
            admin02,
            admin03,
            admin04,
            admin05,
            admin06,
            admin07,
            admin08,
            admin09,
            admin10,
            admin11,
        ] = await ethers.getSigners();

        /*console.log("deployer: " + deployer.address);
        console.log("admin [01]: " + admin01.address);
        console.log("admin [02]: " + admin02.address);
        console.log("admin [03]: " + admin03.address);
        console.log("admin [04]: " + admin04.address);
        console.log("admin [05]: " + admin05.address);
        console.log("admin [06]: " + admin06.address);
        console.log("admin [07]: " + admin07.address);
        console.log("admin [08]: " + admin08.address);
        console.log("admin [09]: " + admin09.address);
        console.log("admin [10]: " + admin10.address);
        console.log("admin [11]: " + admin11.address);*/

        const arteQAdminContract = await hre.ethers.getContractFactory("arteQAdmin", deployer);
        await expect(arteQAdminContract.deploy([
            admin01.address,
            admin02.address,
            admin03.address,
            admin04.address,
            admin05.address,
            admin06.address,
            admin07.address,
            admin08.address,
            admin09.address,
            admin10.address,
            admin11.address,
        ])).to.be.revertedWith("arteQAdmin: max nr of admins exceeded");
    });
});

describe("arteQAdmin", function() {

    beforeEach(async () => {
        [
            deployer,
            admin01,
            admin02,
            admin03,
            admin04,
            admin05,
            admin06,
            admin07,
            admin08,
            admin09,
            trader1,
            trader2,
            trader3,
        ] = await ethers.getSigners();

        /*console.log("deployer: " + deployer.address);
        console.log("admin [01]: " + admin01.address);
        console.log("admin [02]: " + admin02.address);
        console.log("admin [03]: " + admin03.address);
        console.log("admin [04]: " + admin04.address);
        console.log("admin [05]: " + admin05.address);
        console.log("admin [06]: " + admin06.address);
        console.log("admin [07]: " + admin07.address);
        console.log("admin [08]: " + admin08.address);
        console.log("admin [09]: " + admin09.address);
        console.log("trader1: " + trader1.address);
        console.log("trader2: " + trader2.address);
        console.log("trader3: " + trader3.address);*/

        const arteQAdminContract = await hre.ethers.getContractFactory("arteQAdmin", deployer);
        contract = await arteQAdminContract.deploy([
            admin01.address,
            admin02.address,
            admin03.address,
            admin04.address,
            admin05.address,
            admin06.address,
        ]);
        await contract.deployed();
        // console.log("contract: " + contract.address);

        deployReceipt = await contract.deployTransaction.wait();
        expect(deployReceipt.logs.length).to.equal(7);
        await expect(contract.deployTransaction).to.emit(contract, "AdminAdded").withArgs(deployer.address, admin01.address);
        await expect(contract.deployTransaction).to.emit(contract, "AdminAdded").withArgs(deployer.address, admin02.address);
        await expect(contract.deployTransaction).to.emit(contract, "AdminAdded").withArgs(deployer.address, admin03.address);
        await expect(contract.deployTransaction).to.emit(contract, "AdminAdded").withArgs(deployer.address, admin04.address);
        await expect(contract.deployTransaction).to.emit(contract, "AdminAdded").withArgs(deployer.address, admin05.address);
        await expect(contract.deployTransaction).to.emit(contract, "AdminAdded").withArgs(deployer.address, admin06.address);
        await expect(contract.deployTransaction).to.emit(contract, "NewMinRequiredNrOfApprovalsSet" ).withArgs(deployer.address, 4);

        expect(await contract.connect(trader1).minNrOfAdmins()).to.equal(5);
        expect(await contract.connect(trader2).maxNrOfAdmins()).to.equal(10);
        expect(await contract.connect(trader1).nrOfAdmins()).to.equal(6);
        expect(await contract.connect(trader3).minRequiredNrOfApprovals()).to.equal(4);
    });

    it("should not accept ether", async() => {
        await expect(trader1.sendTransaction({
            to: contract.address,
            value: ethers.utils.parseEther("1"),
        })).to.be.revertedWith("arteQAdmin: cannot accept ether");
    });

    it("min and max nr of admins", async() => {
        expect(await contract.connect(trader1).minNrOfAdmins()).to.equal(5);
        expect(await contract.connect(trader3).maxNrOfAdmins()).to.equal(10);
    });

    it("min required nr of approvals with 6 admins must be 4", async() => {
        expect(await contract.connect(trader1).minRequiredNrOfApprovals()).to.equal(4);
    });

    it("non-admin account cannot create a task", async() => {
        const detailsURI = "ipfs://AaBbCcDdEeFfGgHh";
        await expect(contract.connect(trader1).createTask(detailsURI)).to.be.revertedWith("arteQAdmin: not an admin account");
        await expect(contract.connect(admin08).createTask(detailsURI)).to.be.revertedWith("arteQAdmin: not an admin account");
    });

    it("an admin account creates a task", async() => {
        const detailsURI = "ipfs://AaBbCcDdEeFfGgHh";
        const call = contract.connect(admin02).createTask(detailsURI);
        const tx = await call;
        receipt = await tx.wait();
        expect(receipt.logs.length).to.equal(1);
        await expect(call).to.emit(contract, "TaskCreated").withArgs(admin02.address, 1, detailsURI);
        // any admin account can read the task details URI
        expect(await contract.connect(admin04).taskURI(1)).to.equal(detailsURI);
        expect(await contract.connect(admin01).taskURI(1)).to.equal(detailsURI);
        expect(await contract.connect(admin03).nrOfApprovals(1)).to.equal(0);
        // non-admin accounts cannot read task details URI
        await expect(contract.connect(trader1).taskURI(1)).to.be.revertedWith("arteQAdmin: not an admin account");
        // any account can read number of approvals
        expect(await contract.connect(admin01).nrOfApprovals(1)).to.equal(0);
        // non-admin accounts cannot read nr of approvals
        await expect(contract.connect(trader2).nrOfApprovals(1)).to.be.revertedWith("arteQAdmin: not an admin account");
    });

    it("reading detials URI of a non-existing task fails but with different revert messages for admin and non-admin accounts", async() => {
        await expect(contract.connect(trader1).taskURI(1)).to.be.revertedWith("arteQAdmin: not an admin account");
        await expect(contract.connect(admin02).taskURI(1)).to.be.revertedWith("arteQAdmin: task does not exist");
    });

    it("a non-admin account cannot approve any task", async() => {
        await expect(contract.connect(trader1).approveTask(1)).to.be.revertedWith("arteQAdmin: not an admin account");
    });

    it("an admin cannot approve a non-existing task", async() => {
        await expect(contract.connect(admin01).approveTask(1)).to.be.revertedWith("arteQAdmin: task does not exist");
    });

    it("a non-admin account cannot approve an existing task", async() => {
        const detailsURI = "ipfs://AaBbCcDdEeFfGgHh";
        await contract.connect(admin02).createTask(detailsURI);
        expect(await contract.connect(admin04).taskURI(1)).to.equal(detailsURI);
        await expect(contract.connect(trader1).approveTask(1)).to.be.revertedWith("arteQAdmin: not an admin account");
    });

    it("an admin account approves a task", async() => {
        const detailsURI = "ipfs://AaBbCcDdEeFfGgHh";
        await contract.connect(admin02).createTask(detailsURI);
        expect(await contract.connect(admin04).taskURI(1)).to.equal(detailsURI);
        const call = contract.connect(admin05).approveTask(1);
        const tx = await call;
        receipt = await tx.wait();
        expect(receipt.logs.length).to.equal(1);
        await expect(call).to.emit(contract, "TaskApproved").withArgs(admin05.address, 1);
        // admin accounts can read nr of approvals
        expect(await contract.connect(admin01).nrOfApprovals(1)).to.equal(1);
        // non-admin accounts cannot read nr of approvals
        await expect(contract.connect(trader1).nrOfApprovals(1)).to.be.revertedWith("arteQAdmin: not an admin account");
    });

    it("an admin cannot approve the same task twice", async() => {
        const detailsURI = "ipfs://AaBbCcDdEeFfGgHh";
        await contract.connect(admin02).createTask(detailsURI);
        expect(await contract.connect(admin04).taskURI(1)).to.equal(detailsURI);
        await contract.connect(admin05).approveTask(1);
        // this must fail
        await expect(contract.connect(admin05).approveTask(1)).to.be.revertedWith("arteQAdmin: already approved");
        // but not this one
        await contract.connect(admin02).approveTask(1);
        // admin accounts can read nr of approvals
        expect(await contract.connect(admin01).nrOfApprovals(1)).to.equal(2);
        // non-admin accounts cannot read nr of approvals
        await expect(contract.connect(trader1).nrOfApprovals(1)).to.be.revertedWith("arteQAdmin: not an admin account");
    });

    it("a non-admin account cannot call cancel", async() => {
        const detailsURI = "ipfs://AaBbCcDdEeFfGgHh";
        await contract.connect(admin02).createTask(detailsURI);
        await expect(contract.connect(trader1).cancelTaskApproval(1)).to.be.revertedWith("arteQAdmin: not an admin account");
    });

    it("an admin account cannot cancel a non-existing task approval", async() => {
        const detailsURI = "ipfs://AaBbCcDdEeFfGgHh";
        await contract.connect(admin02).createTask(detailsURI);
        await expect(contract.connect(admin04).cancelTaskApproval(1)).to.be.revertedWith("arteQAdmin: no approval to cancel");
    });

    it("an admin account cancels an already given approval", async() => {
        const detailsURI = "ipfs://AaBbCcDdEeFfGgHh";
        await contract.connect(admin02).createTask(detailsURI);
        await contract.connect(admin04).approveTask(1);
        expect(await contract.connect(admin01).nrOfApprovals(1)).to.equal(1);
        await contract.connect(admin03).approveTask(1);
        expect(await contract.connect(admin01).nrOfApprovals(1)).to.equal(2);
        const call = contract.connect(admin04).cancelTaskApproval(1);
        const tx = await call;
        receipt = await tx.wait();
        expect(receipt.logs.length).to.equal(1);
        await expect(call).to.emit(contract, "TaskApprovalCancelled").withArgs(admin04.address, 1);
        expect(await contract.connect(admin06).nrOfApprovals(1)).to.equal(1);
    });

    it("a non-admin account cannot add a finalizer", async() => {
        await expect(contract.connect(trader3).addFinalizer(1, trader1.address)).to.be.revertedWith("arteQAdmin: not an admin");
    });

    it("an admin account cannot use a non-exsiting task to add a finalizer", async() => {
        await expect(contract.connect(admin01).addFinalizer(1, trader1.address)).to.be.revertedWith("arteQAdmin: task does not exist");
    });

    it("an admin account cannot use a non-approved task to add a finalizer", async() => {
        const detailsURI = "ipfs://AaBbCcDdEeFfGgHh";
        await contract.connect(admin02).createTask(detailsURI);
        await contract.connect(admin04).approveTask(1);
        expect(await contract.connect(admin01).nrOfApprovals(1)).to.equal(1);
        await contract.connect(admin03).approveTask(1);
        expect(await contract.connect(admin01).nrOfApprovals(1)).to.equal(2);
        await expect(contract.connect(admin01).addFinalizer(1, trader1.address)).to.be.revertedWith("arteQAdmin: task is not approved");
    });

    it("an admin account adds a finalizer", async() => {
        const detailsURI = "ipfs://AaBbCcDdEeFfGgHh";
        await contract.connect(admin02).createTask(detailsURI);
        await contract.connect(admin04).approveTask(1);
        expect(await contract.connect(admin01).nrOfApprovals(1)).to.equal(1);
        await contract.connect(admin03).approveTask(1);
        expect(await contract.connect(admin01).nrOfApprovals(1)).to.equal(2);
        await contract.connect(admin01).approveTask(1);
        expect(await contract.connect(admin01).nrOfApprovals(1)).to.equal(3);
        await contract.connect(admin06).approveTask(1);
        expect(await contract.connect(admin01).nrOfApprovals(1)).to.equal(4);
        // for a non-admin account, the call must fail
        await expect(contract.connect(trader1).isFinalizer(trader2.address)).to.be.revertedWith("arteQAdmin: not an admin account");
        // for an admin account, the call works
        expect(await contract.connect(admin06).isFinalizer(trader2.address)).to.equal(false);
        const call = contract.connect(admin01).addFinalizer(1, trader2.address);
        const tx = await call;
        receipt = await tx.wait();
        expect(receipt.logs.length).to.equal(2);
        await expect(call).to.emit(contract, "FinalizerAdded").withArgs(admin01.address, trader2.address);
        await expect(call).to.emit(contract, "TaskFinalized").withArgs(admin01.address, admin01.address, 1);
        expect(await contract.connect(admin04).isFinalizer(trader2.address)).to.equal(true);
    });

    it("a non-admin account cannot remove a finalizer", async() => {
        await expect(contract.connect(trader3).removeFinalizer(1, trader1.address)).to.be.revertedWith("arteQAdmin: not an admin account");
    });

    it("an admin account cannot use a non-exsiting task to remove a finalizer", async() => {
        await expect(contract.connect(admin01).removeFinalizer(1, trader1.address)).to.be.revertedWith("arteQAdmin: task does not exist");
    });

    it("an admin account cannot use a non-approved task to remove a finalizer", async() => {
        const detailsURI = "ipfs://AaBbCcDdEeFfGgHh";
        await contract.connect(admin02).createTask(detailsURI);
        await contract.connect(admin04).approveTask(1);
        expect(await contract.connect(admin01).nrOfApprovals(1)).to.equal(1);
        await contract.connect(admin03).approveTask(1);
        expect(await contract.connect(admin01).nrOfApprovals(1)).to.equal(2);
        await expect(contract.connect(admin01).removeFinalizer(1, trader1.address)).to.be.revertedWith("arteQAdmin: task is not approved");
    });

    it("an admin account removes a finalizer", async() => {
        // make trader2 a finalizer
        {
            const detailsURI = "ipfs://AaBbCcDdEeFfGgHh";
            await contract.connect(admin02).createTask(detailsURI);
            await contract.connect(admin04).approveTask(1);
            expect(await contract.connect(admin01).nrOfApprovals(1)).to.equal(1);
            await contract.connect(admin03).approveTask(1);
            expect(await contract.connect(admin01).nrOfApprovals(1)).to.equal(2);
            await contract.connect(admin01).approveTask(1);
            expect(await contract.connect(admin01).nrOfApprovals(1)).to.equal(3);
            await contract.connect(admin06).approveTask(1);
            expect(await contract.connect(admin01).nrOfApprovals(1)).to.equal(4);
            expect(await contract.connect(admin04).isFinalizer(trader2.address)).to.equal(false);
            await contract.connect(admin01).addFinalizer(1, trader2.address);
            expect(await contract.connect(admin03).isFinalizer(trader2.address)).to.equal(true);
        }
        // remove the finalizer
        {
            const detailsURI = "ipfs://AaBbCcDdEeFfGgHh";
            await contract.connect(admin02).createTask(detailsURI);
            await contract.connect(admin04).approveTask(2);
            expect(await contract.connect(admin01).nrOfApprovals(2)).to.equal(1);
            await contract.connect(admin03).approveTask(2);
            expect(await contract.connect(admin01).nrOfApprovals(2)).to.equal(2);
            await contract.connect(admin01).approveTask(2);
            expect(await contract.connect(admin01).nrOfApprovals(2)).to.equal(3);
            await contract.connect(admin06).approveTask(2);
            expect(await contract.connect(admin01).nrOfApprovals(2)).to.equal(4);
            expect(await contract.connect(admin02).isFinalizer(trader2.address)).to.equal(true);
            const call = contract.connect(admin01).removeFinalizer(2, trader2.address);
            const tx = await call;
            receipt = await tx.wait();
            expect(receipt.logs.length).to.equal(2);
            await expect(call).to.emit(contract, "FinalizerRemoved").withArgs(admin01.address, trader2.address);
            await expect(call).to.emit(contract, "TaskFinalized").withArgs(admin01.address, admin01.address, 2);
            expect(await contract.connect(admin05).isFinalizer(trader2.address)).to.equal(false);
        }
    });

    it("a non-approved task cannot be finalized by a non-finalizer account", async() => {
        const detailsURI = "ipfs://AaBbCcDdEeFfGgHh";
        await contract.connect(admin02).createTask(detailsURI);
        await contract.connect(admin04).approveTask(1);
        expect(await contract.connect(admin03).nrOfApprovals(1)).to.equal(1);
        await contract.connect(admin03).approveTask(1);
        expect(await contract.connect(admin05).nrOfApprovals(1)).to.equal(2);
        // task is not approved since it has only 2 approvals
        await expect(contract.connect(trader3).finalizeTask(admin01.address, 1)).to.be.revertedWith("arteQAdmin: not a finalizer account");
    });

    it("an approved task cannot only be finalized by a non-finalizer account", async() => {
        const detailsURI = "ipfs://AaBbCcDdEeFfGgHh";
        await contract.connect(admin02).createTask(detailsURI);
        await contract.connect(admin04).approveTask(1);
        expect(await contract.connect(admin06).nrOfApprovals(1)).to.equal(1);
        await contract.connect(admin03).approveTask(1);
        expect(await contract.connect(admin04).nrOfApprovals(1)).to.equal(2);
        await contract.connect(admin05).approveTask(1);
        expect(await contract.connect(admin02).nrOfApprovals(1)).to.equal(3);
        await contract.connect(admin01).approveTask(1);
        expect(await contract.connect(admin06).nrOfApprovals(1)).to.equal(4);
        await expect(contract.connect(trader2).finalizeTask(admin02.address, 1)).to.be.revertedWith("arteQAdmin: not a finalizer account");
    });

    it("a non-approved task cannot be finalized", async() => {
        // make trader2 a finalizer
        {
            const detailsURI = "ipfs://AaBbCcDdEeFfGgHh";
            await contract.connect(admin02).createTask(detailsURI);
            await contract.connect(admin04).approveTask(1);
            expect(await contract.connect(admin01).nrOfApprovals(1)).to.equal(1);
            await contract.connect(admin03).approveTask(1);
            expect(await contract.connect(admin01).nrOfApprovals(1)).to.equal(2);
            await contract.connect(admin01).approveTask(1);
            expect(await contract.connect(admin01).nrOfApprovals(1)).to.equal(3);
            await contract.connect(admin06).approveTask(1);
            expect(await contract.connect(admin01).nrOfApprovals(1)).to.equal(4);
            expect(await contract.connect(admin04).isFinalizer(trader2.address)).to.equal(false);
            await contract.connect(admin01).addFinalizer(1, trader2.address);
            expect(await contract.connect(admin03).isFinalizer(trader2.address)).to.equal(true);
        }
        {
            const detailsURI = "ipfs://AaBbCcDdEeFfGgHh";
            await contract.connect(admin02).createTask(detailsURI);
            await contract.connect(admin04).approveTask(2);
            expect(await contract.connect(admin03).nrOfApprovals(2)).to.equal(1);
            await contract.connect(admin03).approveTask(2);
            expect(await contract.connect(admin05).nrOfApprovals(2)).to.equal(2);
            // task is not approved since it has only 2 approvals
            await expect(contract.connect(trader2).finalizeTask(admin03.address, 2)).to.be.revertedWith("arteQAdmin: task is not approved");
        }
    });

    it("an approved task can be finalized by a finalizer", async() => {
        // make trader2 a finalizer
        {
            const detailsURI = "ipfs://AaBbCcDdEeFfGgHh";
            await contract.connect(admin02).createTask(detailsURI);
            await contract.connect(admin04).approveTask(1);
            expect(await contract.connect(admin01).nrOfApprovals(1)).to.equal(1);
            await contract.connect(admin03).approveTask(1);
            expect(await contract.connect(admin01).nrOfApprovals(1)).to.equal(2);
            await contract.connect(admin01).approveTask(1);
            expect(await contract.connect(admin01).nrOfApprovals(1)).to.equal(3);
            await contract.connect(admin06).approveTask(1);
            expect(await contract.connect(admin01).nrOfApprovals(1)).to.equal(4);
            expect(await contract.connect(admin04).isFinalizer(trader2.address)).to.equal(false);
            await contract.connect(admin01).addFinalizer(1, trader2.address);
            expect(await contract.connect(admin03).isFinalizer(trader2.address)).to.equal(true);
        }
        // finalize a task
        {
            const detailsURI = "ipfs://AaBbCcDdEeFfGgHh";
            await contract.connect(admin02).createTask(detailsURI);
            await contract.connect(admin04).approveTask(2);
            expect(await contract.connect(admin06).nrOfApprovals(2)).to.equal(1);
            await contract.connect(admin03).approveTask(2);
            expect(await contract.connect(admin04).nrOfApprovals(2)).to.equal(2);
            await contract.connect(admin05).approveTask(2);
            expect(await contract.connect(admin02).nrOfApprovals(2)).to.equal(3);
            await contract.connect(admin01).approveTask(2);
            expect(await contract.connect(admin06).nrOfApprovals(2)).to.equal(4);
            await expect(contract.connect(trader2).finalizeTask(trader2.address, 2)).to.be.revertedWith("arteQAdmin: not an admin account");
            // this mimics the situation where a contract calls finalizeTask with msg.sender
            const call = contract.connect(trader2).finalizeTask(admin02.address, 2);
            const tx = await call;
            receipt = await tx.wait();
            expect(receipt.logs.length).to.equal(1);
            await expect(call).to.emit(contract, "TaskFinalized").withArgs(trader2.address, admin02.address, 2);
            // reading the same task must fail
            await expect(contract.connect(admin02).nrOfApprovals(2)).to.be.revertedWith("arteQAdmin: task does not exist");
        }
    });

    it("a non-admin account cannot check whether it is an admin or not", async() => {
        await expect(contract.connect(trader3).isAdmin(trader1.address)).to.be.revertedWith("arteQAdmin: not an admin account");
        await expect(contract.connect(admin08).isAdmin(trader1.address)).to.be.revertedWith("arteQAdmin: not an admin account");
    });

    it("an admin account cannot check any account for being admin", async() => {
        expect(await contract.connect(admin01).isAdmin(deployer.address)).to.equal(false);
        expect(await contract.connect(admin01).isAdmin(trader1.address)).to.equal(false);
        expect(await contract.connect(admin01).isAdmin(trader2.address)).to.equal(false);
        expect(await contract.connect(admin02).isAdmin(trader3.address)).to.equal(false);
        expect(await contract.connect(admin01).isAdmin(admin01.address)).to.equal(true);
        expect(await contract.connect(admin01).isAdmin(admin02.address)).to.equal(true);
        expect(await contract.connect(admin01).isAdmin(admin03.address)).to.equal(true);
        expect(await contract.connect(admin01).isAdmin(admin05.address)).to.equal(true);
        expect(await contract.connect(admin01).isAdmin(admin04.address)).to.equal(true);
        expect(await contract.connect(admin01).isAdmin(admin06.address)).to.equal(true);
        expect(await contract.connect(admin01).isAdmin(admin07.address)).to.equal(false);
        expect(await contract.connect(admin01).isAdmin(admin08.address)).to.equal(false);
        expect(await contract.connect(admin01).isAdmin(admin09.address)).to.equal(false);
    });

    it("a non-admin account cannot add a new admin", async() => {
        await expect(contract.connect(trader1).addAdmin(100, trader3.address)).to.be.revertedWith("arteQAdmin: not an admin account");
    });

    it("a non-admin account cannot replace an admin", async() => {
        await expect(contract.connect(trader1).replaceAdmin(100, admin02.address, trader3.address)).to.be.revertedWith("arteQAdmin: not an admin account");
    });

    it("a non-admin account cannot remove an admin", async() => {
        await expect(contract.connect(trader3).removeAdmin(100, admin01.address)).to.be.revertedWith("arteQAdmin: not an admin account");
    });

    it("a non-admin account cannot set a new min required nr of approvals", async() => {
        await expect(contract.connect(trader2).setMinRequiredNrOfApprovals(100, 3)).to.be.revertedWith("arteQAdmin: not an admin account");
    });

    it("add a new admin fails when using a non-existing task", async() => {
        await expect(contract.connect(admin03).addAdmin(1, trader3.address)).to.be.revertedWith("arteQAdmin: task does not exist");
    });

    it("add a new admin fails when using a non-approved task", async() => {
        const detailsURI = "ipfs://AaBbCcDdEeFfGgHh";
        await contract.connect(admin02).createTask(detailsURI);
        await contract.connect(admin04).approveTask(1);
        expect(await contract.connect(admin06).nrOfApprovals(1)).to.equal(1);
        await contract.connect(admin03).approveTask(1);
        expect(await contract.connect(admin04).nrOfApprovals(1)).to.equal(2);
        await expect(contract.connect(admin03).addAdmin(1, trader3.address)).to.be.revertedWith("arteQAdmin: task is not approved");
    });

    it("add an existing admin", async() => {
        const detailsURI = "ipfs://AaBbCcDdEeFfGgHh";
        await contract.connect(admin02).createTask(detailsURI);
        await contract.connect(admin04).approveTask(1);
        expect(await contract.connect(admin06).nrOfApprovals(1)).to.equal(1);
        await contract.connect(admin03).approveTask(1);
        expect(await contract.connect(admin04).nrOfApprovals(1)).to.equal(2);
        await contract.connect(admin01).approveTask(1);
        expect(await contract.connect(admin06).nrOfApprovals(1)).to.equal(3);
        await contract.connect(admin06).approveTask(1);
        expect(await contract.connect(admin01).nrOfApprovals(1)).to.equal(4);
        await expect(contract.connect(admin03).addAdmin(1, admin01.address)).to.be.revertedWith("arteQAdmin: already an admin");
    });

    it("add a new admin", async() => {
        // add the first admin
        {
            const detailsURI = "ipfs://AaBbCcDdEeFfGgHh";
            await contract.connect(admin02).createTask(detailsURI);
            await contract.connect(admin04).approveTask(1);
            expect(await contract.connect(admin06).nrOfApprovals(1)).to.equal(1);
            await contract.connect(admin03).approveTask(1);
            expect(await contract.connect(admin04).nrOfApprovals(1)).to.equal(2);
            await contract.connect(admin01).approveTask(1);
            expect(await contract.connect(admin06).nrOfApprovals(1)).to.equal(3);
            await contract.connect(admin06).approveTask(1);
            expect(await contract.connect(admin01).nrOfApprovals(1)).to.equal(4);
            expect(await contract.connect(admin06).isAdmin(trader3.address)).to.equal(false);
            const call = contract.connect(admin03).addAdmin(1, trader3.address);
            const tx = await call;
            receipt = await tx.wait();
            expect(receipt.logs.length).to.equal(2);
            await expect(call).to.emit(contract, "AdminAdded").withArgs(admin03.address, trader3.address);
            await expect(call).to.emit(contract, "TaskFinalized").withArgs(admin03.address, admin03.address, 1);
            expect(await contract.connect(trader2).nrOfAdmins()).to.equal(7);
            expect(await contract.connect(trader2).minRequiredNrOfApprovals()).to.equal(4);
            expect(await contract.connect(admin06).isAdmin(trader3.address)).to.equal(true);
        }
        // add the second admin
        {
            const detailsURI = "ipfs://AaBbCcDdEeFfGgHh";
            await contract.connect(admin02).createTask(detailsURI);
            await contract.connect(admin04).approveTask(2);
            expect(await contract.connect(admin06).nrOfApprovals(2)).to.equal(1);
            await contract.connect(admin03).approveTask(2);
            expect(await contract.connect(admin04).nrOfApprovals(2)).to.equal(2);
            await contract.connect(admin01).approveTask(2);
            expect(await contract.connect(admin06).nrOfApprovals(2)).to.equal(3);
            await contract.connect(admin06).approveTask(2);
            expect(await contract.connect(admin01).nrOfApprovals(2)).to.equal(4);
            expect(await contract.connect(admin06).isAdmin(trader2.address)).to.equal(false);
            const call = contract.connect(admin03).addAdmin(2, trader2.address);
            const tx = await call;
            receipt = await tx.wait();
            expect(receipt.logs.length).to.equal(3);
            await expect(call).to.emit(contract, "AdminAdded").withArgs(admin03.address, trader2.address);
            await expect(call).to.emit(contract, "TaskFinalized").withArgs(admin03.address, admin03.address, 2);
            await expect(call).to.emit(contract, "NewMinRequiredNrOfApprovalsSet").withArgs(admin03.address, 5);
            expect(await contract.connect(trader1).nrOfAdmins()).to.equal(8);
            expect(await contract.connect(trader1).minRequiredNrOfApprovals()).to.equal(5);
            expect(await contract.connect(admin06).isAdmin(trader2.address)).to.equal(true);
        }
    });

    it("replace an admin fails when using a non-existing task", async() => {
        await expect(contract.connect(admin03).replaceAdmin(1, admin05.address, admin09.address)).to.be.revertedWith("arteQAdmin: task does not exist");
    });

    it("replace an admin fails when using a non-approved task", async() => {
        const detailsURI = "ipfs://AaBbCcDdEeFfGgHh";
        await contract.connect(admin02).createTask(detailsURI);
        await contract.connect(admin04).approveTask(1);
        expect(await contract.connect(admin06).nrOfApprovals(1)).to.equal(1);
        await contract.connect(admin03).approveTask(1);
        expect(await contract.connect(admin04).nrOfApprovals(1)).to.equal(2);
        await expect(contract.connect(admin03).replaceAdmin(1, admin05.address, admin09.address)).to.be.revertedWith("arteQAdmin: task is not approved");
    });

    it("replace a non-existing admin", async() => {
        const detailsURI = "ipfs://AaBbCcDdEeFfGgHh";
        await contract.connect(admin02).createTask(detailsURI);
        await contract.connect(admin04).approveTask(1);
        expect(await contract.connect(admin06).nrOfApprovals(1)).to.equal(1);
        await contract.connect(admin03).approveTask(1);
        expect(await contract.connect(admin04).nrOfApprovals(1)).to.equal(2);
        await contract.connect(admin01).approveTask(1);
        expect(await contract.connect(admin06).nrOfApprovals(1)).to.equal(3);
        await contract.connect(admin06).approveTask(1);
        expect(await contract.connect(admin01).nrOfApprovals(1)).to.equal(4);
        await expect(contract.connect(admin03).replaceAdmin(1, admin08.address, admin09.address)).to.be.revertedWith("arteQAdmin: no admin account found");
    });

    it("replace an existing admin with another existing admin", async() => {
        const detailsURI = "ipfs://AaBbCcDdEeFfGgHh";
        await contract.connect(admin02).createTask(detailsURI);
        await contract.connect(admin04).approveTask(1);
        expect(await contract.connect(admin06).nrOfApprovals(1)).to.equal(1);
        await contract.connect(admin03).approveTask(1);
        expect(await contract.connect(admin04).nrOfApprovals(1)).to.equal(2);
        await contract.connect(admin01).approveTask(1);
        expect(await contract.connect(admin06).nrOfApprovals(1)).to.equal(3);
        await contract.connect(admin06).approveTask(1);
        expect(await contract.connect(admin01).nrOfApprovals(1)).to.equal(4);
        await expect(contract.connect(admin03).replaceAdmin(1, admin05.address, admin01.address)).to.be.revertedWith("arteQAdmin: already an admin");
    });

    it("replace an admin", async() => {
        const detailsURI = "ipfs://AaBbCcDdEeFfGgHh";
        await contract.connect(admin02).createTask(detailsURI);
        await contract.connect(admin04).approveTask(1);
        expect(await contract.connect(admin06).nrOfApprovals(1)).to.equal(1);
        await contract.connect(admin03).approveTask(1);
        expect(await contract.connect(admin04).nrOfApprovals(1)).to.equal(2);
        await contract.connect(admin01).approveTask(1);
        expect(await contract.connect(admin06).nrOfApprovals(1)).to.equal(3);
        await contract.connect(admin06).approveTask(1);
        expect(await contract.connect(admin01).nrOfApprovals(1)).to.equal(4);
        expect(await contract.connect(admin06).isAdmin(admin05.address)).to.equal(true);
        expect(await contract.connect(admin06).isAdmin(trader2.address)).to.equal(false);
        const call = contract.connect(admin03).replaceAdmin(1, admin05.address, trader2.address);
        const tx = await call;
        receipt = await tx.wait();
        expect(receipt.logs.length).to.equal(2);
        await expect(call).to.emit(contract, "AdminReplaced").withArgs(admin03.address, admin05.address, trader2.address);
        await expect(call).to.emit(contract, "TaskFinalized").withArgs(admin03.address, admin03.address, 1);
        expect(await contract.connect(trader1).nrOfAdmins()).to.equal(6);
        expect(await contract.connect(trader1).minRequiredNrOfApprovals()).to.equal(4);
        expect(await contract.connect(trader2).isAdmin(admin05.address)).to.equal(false);
        expect(await contract.connect(admin06).isAdmin(trader2.address)).to.equal(true);
    });

    it("remove an admin fails when using a non-existing task", async() => {
        await expect(contract.connect(admin03).removeAdmin(1, admin05.address)).to.be.revertedWith("arteQAdmin: task does not exist");
    });

    it("remove an admin fails when using a non-approved task", async() => {
        const detailsURI = "ipfs://AaBbCcDdEeFfGgHh";
        await contract.connect(admin02).createTask(detailsURI);
        await contract.connect(admin04).approveTask(1);
        expect(await contract.connect(admin06).nrOfApprovals(1)).to.equal(1);
        await contract.connect(admin03).approveTask(1);
        expect(await contract.connect(admin04).nrOfApprovals(1)).to.equal(2);
        await expect(contract.connect(admin03).removeAdmin(1, admin05.address)).to.be.revertedWith("arteQAdmin: task is not approved");
    });

    it("remove a non-existing admin", async() => {
        const detailsURI = "ipfs://AaBbCcDdEeFfGgHh";
        await contract.connect(admin02).createTask(detailsURI);
        await contract.connect(admin04).approveTask(1);
        expect(await contract.connect(admin06).nrOfApprovals(1)).to.equal(1);
        await contract.connect(admin03).approveTask(1);
        expect(await contract.connect(admin04).nrOfApprovals(1)).to.equal(2);
        await contract.connect(admin01).approveTask(1);
        expect(await contract.connect(admin06).nrOfApprovals(1)).to.equal(3);
        await contract.connect(admin06).approveTask(1);
        expect(await contract.connect(admin01).nrOfApprovals(1)).to.equal(4);
        await expect(contract.connect(admin03).removeAdmin(1, admin08.address)).to.be.revertedWith("arteQAdmin: no admin account found");
    });

    it("remove an admin", async() => {
        const detailsURI = "ipfs://AaBbCcDdEeFfGgHh";
        await contract.connect(admin02).createTask(detailsURI);
        await contract.connect(admin04).approveTask(1);
        expect(await contract.connect(admin06).nrOfApprovals(1)).to.equal(1);
        await contract.connect(admin03).approveTask(1);
        expect(await contract.connect(admin04).nrOfApprovals(1)).to.equal(2);
        await contract.connect(admin01).approveTask(1);
        expect(await contract.connect(admin06).nrOfApprovals(1)).to.equal(3);
        await contract.connect(admin06).approveTask(1);
        expect(await contract.connect(admin01).nrOfApprovals(1)).to.equal(4);
        expect(await contract.connect(admin06).isAdmin(admin05.address)).to.equal(true);
        const call = contract.connect(admin03).removeAdmin(1, admin05.address);
        const tx = await call;
        receipt = await tx.wait();
        expect(receipt.logs.length).to.equal(2);
        await expect(call).to.emit(contract, "AdminRemoved").withArgs(admin03.address, admin05.address);
        await expect(call).to.emit(contract, "TaskFinalized").withArgs(admin03.address, admin03.address, 1);
        expect(await contract.connect(trader1).nrOfAdmins()).to.equal(5);
        expect(await contract.connect(trader1).minRequiredNrOfApprovals()).to.equal(4);
        expect(await contract.connect(admin06).isAdmin(admin05.address)).to.equal(false);
    });

    it("setting a new min required nr of approvals fails when using a non-existing task", async() => {
        await expect(contract.connect(admin03).setMinRequiredNrOfApprovals(1, 5)).to.be.revertedWith("arteQAdmin: task does not exist");
    });

    it("setting a new min required nr of approvals fails when using a non-approved task", async() => {
        const detailsURI = "ipfs://AaBbCcDdEeFfGgHh";
        await contract.connect(admin02).createTask(detailsURI);
        await contract.connect(admin04).approveTask(1);
        expect(await contract.connect(admin06).nrOfApprovals(1)).to.equal(1);
        await contract.connect(admin03).approveTask(1);
        expect(await contract.connect(admin04).nrOfApprovals(1)).to.equal(2);
        await expect(contract.connect(admin03).setMinRequiredNrOfApprovals(1, 5)).to.be.revertedWith("arteQAdmin: task is not approved");
    });

    it("set a small value for min required nr of approvals", async() => {
        const detailsURI = "ipfs://AaBbCcDdEeFfGgHh";
        await contract.connect(admin02).createTask(detailsURI);
        await contract.connect(admin04).approveTask(1);
        expect(await contract.connect(admin06).nrOfApprovals(1)).to.equal(1);
        await contract.connect(admin03).approveTask(1);
        expect(await contract.connect(admin04).nrOfApprovals(1)).to.equal(2);
        await contract.connect(admin01).approveTask(1);
        expect(await contract.connect(admin06).nrOfApprovals(1)).to.equal(3);
        await contract.connect(admin06).approveTask(1);
        expect(await contract.connect(admin01).nrOfApprovals(1)).to.equal(4);
        // we have 6 admins, so we can not go below 4.
        await expect(contract.connect(admin03).setMinRequiredNrOfApprovals(1, 3)).to.be.revertedWith("arteQAdmin: value is too low");
    });

    it("set a big value for min required nr of approvals", async() => {
        const detailsURI = "ipfs://AaBbCcDdEeFfGgHh";
        await contract.connect(admin02).createTask(detailsURI);
        await contract.connect(admin04).approveTask(1);
        expect(await contract.connect(admin06).nrOfApprovals(1)).to.equal(1);
        await contract.connect(admin03).approveTask(1);
        expect(await contract.connect(admin04).nrOfApprovals(1)).to.equal(2);
        await contract.connect(admin01).approveTask(1);
        expect(await contract.connect(admin06).nrOfApprovals(1)).to.equal(3);
        await contract.connect(admin06).approveTask(1);
        expect(await contract.connect(admin01).nrOfApprovals(1)).to.equal(4);
        // we have 6 admins, so we can not go above 6
        await expect(contract.connect(admin03).setMinRequiredNrOfApprovals(1, 7)).to.be.revertedWith("arteQAdmin: value is too high");
    });

    it("cannot set the same value for min required nr of approvals", async() => {
        const detailsURI = "ipfs://AaBbCcDdEeFfGgHh";
        await contract.connect(admin02).createTask(detailsURI);
        await contract.connect(admin04).approveTask(1);
        expect(await contract.connect(admin06).nrOfApprovals(1)).to.equal(1);
        await contract.connect(admin03).approveTask(1);
        expect(await contract.connect(admin04).nrOfApprovals(1)).to.equal(2);
        await contract.connect(admin01).approveTask(1);
        expect(await contract.connect(admin06).nrOfApprovals(1)).to.equal(3);
        await contract.connect(admin06).approveTask(1);
        expect(await contract.connect(admin01).nrOfApprovals(1)).to.equal(4);
        const currentValue = await contract.connect(trader1).minRequiredNrOfApprovals();
        await expect(contract.connect(admin03).setMinRequiredNrOfApprovals(1, currentValue)).to.be.revertedWith("arteQAdmin: same value");
    });

    it("set a new min required nr of approvals", async() => {
        const detailsURI = "ipfs://AaBbCcDdEeFfGgHh";
        await contract.connect(admin02).createTask(detailsURI);
        await contract.connect(admin04).approveTask(1);
        expect(await contract.connect(admin06).nrOfApprovals(1)).to.equal(1);
        await contract.connect(admin03).approveTask(1);
        expect(await contract.connect(admin04).nrOfApprovals(1)).to.equal(2);
        await contract.connect(admin01).approveTask(1);
        expect(await contract.connect(admin06).nrOfApprovals(1)).to.equal(3);
        await contract.connect(admin06).approveTask(1);
        expect(await contract.connect(admin01).nrOfApprovals(1)).to.equal(4);
        const call = contract.connect(admin03).setMinRequiredNrOfApprovals(1, 5);
        const tx = await call;
        receipt = await tx.wait();
        expect(receipt.logs.length).to.equal(2);
        await expect(call).to.emit(contract, "NewMinRequiredNrOfApprovalsSet").withArgs(admin03.address, 5);
        await expect(call).to.emit(contract, "TaskFinalized").withArgs(admin03.address, admin03.address, 1);
        expect(await contract.connect(trader1).minRequiredNrOfApprovals()).to.equal(5);
    });

    it("set min required nr of approvals to max and remove an admin", async() => {
        {
            const detailsURI = "ipfs://AaBbCcDdEeFfGgHh";
            await contract.connect(admin02).createTask(detailsURI);
            await contract.connect(admin04).approveTask(1);
            expect(await contract.connect(admin06).nrOfApprovals(1)).to.equal(1);
            await contract.connect(admin03).approveTask(1);
            expect(await contract.connect(admin04).nrOfApprovals(1)).to.equal(2);
            await contract.connect(admin01).approveTask(1);
            expect(await contract.connect(admin06).nrOfApprovals(1)).to.equal(3);
            await contract.connect(admin06).approveTask(1);
            expect(await contract.connect(admin01).nrOfApprovals(1)).to.equal(4);
            await contract.connect(admin03).setMinRequiredNrOfApprovals(1, 6);
            expect(await contract.connect(trader1).minRequiredNrOfApprovals()).to.equal(6);
        }
        // remove an admin
        {
            // now, all admins must approve
            const detailsURI = "ipfs://AaBbCcDdEeFfGgHh";
            await contract.connect(admin02).createTask(detailsURI);
            await contract.connect(admin01).approveTask(2);
            await contract.connect(admin02).approveTask(2);
            await contract.connect(admin03).approveTask(2);
            await contract.connect(admin04).approveTask(2);
            await contract.connect(admin05).approveTask(2);
            await contract.connect(admin06).approveTask(2);
            expect(await contract.connect(admin01).nrOfApprovals(2)).to.equal(6);
            expect(await contract.connect(admin06).isAdmin(admin04.address)).to.equal(true);
            const call = contract.connect(admin03).removeAdmin(2, admin04.address);
            const tx = await call;
            receipt = await tx.wait();
            expect(receipt.logs.length).to.equal(3);
            await expect(call).to.emit(contract, "AdminRemoved").withArgs(admin03.address, admin04.address);
            await expect(call).to.emit(contract, "TaskFinalized").withArgs(admin03.address, admin03.address, 2);
            await expect(call).to.emit(contract, "NewMinRequiredNrOfApprovalsSet").withArgs(admin03.address, 5);
            expect(await contract.connect(trader1).nrOfAdmins()).to.equal(5);
            expect(await contract.connect(trader1).minRequiredNrOfApprovals()).to.equal(5);
            expect(await contract.connect(admin06).isAdmin(admin04.address)).to.equal(false);
        }
    });
});
