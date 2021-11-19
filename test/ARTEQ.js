const { expect } = require("chai");
const { ethers } = require("hardhat");

const ARTEQ = 1;
const gARTEQ = 2;

const zeroAddress = "0x0000000000000000000000000000000000000000";
const MaxInt = "115792089237316195423570985008687907853269984665640564039457584007913129639935";

let contract;
let innerContract;
let admin;
let trader1;
let trader2;
let trader3;

describe("ARTEQ", function() {

    beforeEach(async () => {
        [
            admin,
            trader1,
            trader2,
            trader3,
        ] = await ethers.getSigners();

        // console.log("admin: " + admin.address);
        // console.log("trader1: " + trader1.address);
        // console.log("trader2: " + trader2.address);
        // console.log("trader3: " + trader3.address);

        const arteQTokensContract = await hre.ethers.getContractFactory("arteQTokens", admin);
        innerContract = await arteQTokensContract.deploy();
        await innerContract.deployed();

        // console.log("inner contract: " + innerContract.address);

        deployReceipt = await innerContract.deployTransaction.wait();
        expect(deployReceipt.logs.length).to.equal(4);
        await expect(innerContract.deployTransaction).to.emit(innerContract, "URI").withArgs("ipfs://QmfBtH8BSztaYn3QFnz2qvu2ehZgy8AZsNMJDkgr3pdqT8", ARTEQ);
        await expect(innerContract.deployTransaction).to.emit(innerContract, "URI").withArgs("ipfs://QmRAXmU9AymDgtphh37hqx5R2QXSS2ngchQRDFtg6XSD7w", gARTEQ);
        await expect(innerContract.deployTransaction).to.emit(innerContract, "TransferSingle").withArgs(admin.address, zeroAddress, admin.address, ARTEQ, 10 ** 10);
        await expect(innerContract.deployTransaction).to.emit(innerContract, "TransferSingle").withArgs(admin.address, zeroAddress, admin.address, gARTEQ, 10 ** 6);

        expect(await innerContract.connect(trader1).totalSupply(ARTEQ)).to.equal(10 ** 10);
        expect(await innerContract.connect(trader1).balanceOf(admin.address, ARTEQ)).to.equal(10 ** 10);

        expect(await innerContract.connect(trader1).totalSupply(gARTEQ)).to.equal(10 ** 6);
        expect(await innerContract.connect(trader1).balanceOf(admin.address, gARTEQ)).to.equal(10 ** 6);

        const ARTEQContract = await hre.ethers.getContractFactory("ARTEQ", admin);
        contract = await ARTEQContract.deploy(innerContract.address);
        await contract.deployed();

        // console.log("contract: " + contract.address);
    });

    it("should not accept ether", async() => {
        await expect(trader1.sendTransaction({
            to: contract.address,
            value: ethers.utils.parseEther("1"),
        })).to.be.revertedWith("ARTEQ: cannot accept ether");
    });

    it("should be able to read total supply and balance of admin", async () => {
        expect(await contract.connect(trader1).totalSupply()).to.equal(10 ** 10);
        expect(await contract.connect(trader1).balanceOf(admin.address)).to.equal(10 ** 10);
    });

    it("transfer ARTEQ tokens", async () => {
        const call = contract.connect(admin).transfer(trader1.address, 1000);
        const tx = await call;
        receipt = await tx.wait();
        expect(receipt.logs.length).to.equal(2);
        await expect(call).to.emit(innerContract, "TransferSingle").withArgs(admin.address, admin.address, trader1.address, ARTEQ, 1000);
        await expect(call).to.emit(contract, "Transfer").withArgs(admin.address, trader1.address, 1000);

        expect(await contract.connect(trader2).balanceOf(admin.address)).to.equal(10 ** 10 - 1000);
        expect(await contract.connect(trader2).balanceOf(trader1.address)).to.equal(1000);
    });

    it("transfer ARTEQ tokens with approval", async () => {
        await contract.connect(admin).transfer(trader1.address, 1000);

        await expect(contract.connect(admin).transferFrom(trader1.address, trader2.address, 400)).to.be.revertedWith("arteQTokens: caller is not owner nor approved");
        expect(await contract.connect(trader2).allowance(trader1.address, admin.address)).to.equal(0);

        {
            const call = contract.connect(trader1).approve(admin.address, 200); // any positive value should work (the underlying contract is an ERC-1155 contract)
            const tx = await call;
            receipt = await tx.wait();
            expect(receipt.logs.length).to.equal(2);
            await expect(call).to.emit(innerContract, "ApprovalForAll").withArgs(trader1.address, admin.address, true);
            await expect(call).to.emit(contract, "Approval").withArgs(trader1.address, admin.address, 200);
            expect(await contract.connect(trader2.address).allowance(trader1.address, admin.address)).to.equal(MaxInt);
        }

        {
            const call = contract.connect(admin).transferFrom(trader1.address, trader2.address, 400);
            const tx = await call;
            receipt = await tx.wait();
            expect(receipt.logs.length).to.equal(2);
            await expect(call).to.emit(innerContract, "TransferSingle").withArgs(admin.address, trader1.address, trader2.address, ARTEQ, 400);
            await expect(call).to.emit(contract, "Transfer").withArgs(trader1.address, trader2.address, 400);

            expect(await contract.connect(trader2).balanceOf(trader1.address)).to.equal(600);
            expect(await contract.connect(trader2).balanceOf(trader2.address)).to.equal(400);
        }
    });
});
