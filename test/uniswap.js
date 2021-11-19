const { expect } = require("chai");
const { ethers, waffle } = require("hardhat");

const ARTEQ = 1;
const gARTEQ = 2;

const zeroAddress = "0x0000000000000000000000000000000000000000";
const MaxInt = "115792089237316195423570985008687907853269984665640564039457584007913129639935";

let tokenExchangeContract;

let factoryC;
let tokensC;
let arteqC;
let exchangeC;
let tokenExchange;
let tokenExchangeC;
let admin;
let treasury;
let trader1;
let trader2;
let trader3;
let governor1;
let governor2;
let governor3;

describe("ARTEQ", function() {

    beforeEach(async () => {

        [
            admin,
            treasury,
            trader1,
            trader2,
            trader3,
            governor1,
            governor2,
            governor3,
        ] = await ethers.getSigners();

        console.log("------------");
        console.log("admin: " + admin.address);
        console.log("admin: " + treasury.address);
        console.log("trader1: " + trader1.address);
        console.log("trader2: " + trader2.address);
        console.log("trader3: " + trader3.address);

        const arteQTokensContract = await hre.ethers.getContractFactory("arteQTokens", admin);
        tokensC = await arteQTokensContract.deploy();
        await tokensC.deployed();

        console.log("tokens contract: " + tokensC.address);

        deployReceipt = await tokensC.deployTransaction.wait();
        expect(deployReceipt.logs.length).to.equal(4);
        await expect(tokensC.deployTransaction).to.emit(tokensC, "URI").withArgs("ipfs://QmfBtH8BSztaYn3QFnz2qvu2ehZgy8AZsNMJDkgr3pdqT8", ARTEQ);
        await expect(tokensC.deployTransaction).to.emit(tokensC, "URI").withArgs("ipfs://QmRAXmU9AymDgtphh37hqx5R2QXSS2ngchQRDFtg6XSD7w", gARTEQ);
        await expect(tokensC.deployTransaction).to.emit(tokensC, "TransferSingle").withArgs(admin.address, zeroAddress, admin.address, ARTEQ, 10 ** 10);
        await expect(tokensC.deployTransaction).to.emit(tokensC, "TransferSingle").withArgs(admin.address, zeroAddress, admin.address, gARTEQ, 10 ** 6);

        expect(await tokensC.connect(trader1).totalSupply(ARTEQ)).to.equal(10 ** 10);
        expect(await tokensC.connect(trader1).balanceOf(admin.address, ARTEQ)).to.equal(10 ** 10);

        expect(await tokensC.connect(trader1).totalSupply(gARTEQ)).to.equal(10 ** 6);
        expect(await tokensC.connect(trader1).balanceOf(admin.address, gARTEQ)).to.equal(10 ** 6);

        const ARTEQContract = await hre.ethers.getContractFactory("ARTEQ", admin);
        arteqC = await ARTEQContract.deploy(tokensC.address);
        await arteqC.deployed();

        console.log("ARTEQ contract: " + arteqC.address);

        const uniswapFactoryContract = await hre.ethers.getContractFactory("uniswap_factory", admin);
        factoryC = await uniswapFactoryContract.deploy();
        await factoryC.deployed();

        console.log("uniswap factory contract: " + factoryC.address);

        const uniswapExchangeContract = await hre.ethers.getContractFactory("uniswap_exchange", admin);
        exchangeC = await uniswapExchangeContract.deploy();
        await exchangeC.deployed();

        console.log("uniswap exchange contract: " + exchangeC.address);

        await factoryC.initializeFactory(exchangeC.address);
        expect(await factoryC.exchangeTemplate()).to.equal(exchangeC.address);

        expect(await factoryC.getExchange(arteqC.address)).to.equal(zeroAddress);
        await factoryC.createExchange(arteqC.address);
        tokenExchange = await factoryC.getExchange(arteqC.address);

        console.log("token exchange contract: " + tokenExchange);

        tokenExchangeContract = await hre.ethers.getContractFactory("uniswap_exchange", admin);
        tokenExchangeC = await tokenExchangeContract.attach(tokenExchange);

        console.log("token exchange contract (2): " + tokenExchangeC.address);

        await tokensC.setExchange1Account(tokenExchangeC.address);
        await tokensC.setTreasuryAccount(treasury.address);

        expect(await factoryC.connect(trader1).getExchange(arteqC.address)).to.equal(tokenExchangeC.address);
        expect(await tokenExchangeC.connect(trader1).tokenAddress()).to.equal(arteqC.address);
        expect(await tokenExchangeC.connect(trader1).factoryAddress()).to.equal(factoryC.address);
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

        await arteqC.connect(admin).transfer(trader1.address, 10 ** 5);
        expect(await arteqC.connect(trader1).balanceOf(trader1.address)).to.equal(10 ** 5);
        expect(await arteqC.connect(trader1).balanceOf(admin.address)).to.equal(10 ** 10 - 10 ** 5);
        expect(await provider.getBalance(tokenExchangeC.address)).to.equal(0);
        expect(await provider.getBalance(trader1.address)).to.equal(ethers.utils.parseEther("10000"));

        expect(await tokenExchangeC.connect(trader1).totalSupply()).to.equal(0);
        expect(await arteqC.connect(trader1).allowance(trader1.address, tokenExchangeC.address)).to.equal(0);
        await arteqC.connect(trader1).approve(tokenExchangeC.address, 10 ** 5);
        expect(await arteqC.connect(trader1).allowance(trader1.address, tokenExchangeC.address)).to.equal(MaxInt);

        {
            const call = await tokenExchangeC.connect(trader1).addLiquidity(0, 40000, 1640995199, { value: ethers.utils.parseEther("4") });
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
            const call = await tokenExchangeC.connect(trader1).addLiquidity(1, 22000, 1640995199, { value: ethers.utils.parseEther("2") });
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

    it("treasury buy back scenario", async () => {
        const provider = waffle.provider;

        await arteqC.connect(admin).transfer(treasury.address, 10 ** 5);
        expect(await arteqC.connect(trader1).balanceOf(treasury.address)).to.equal(10 ** 5);
        expect(await arteqC.connect(trader1).balanceOf(admin.address)).to.equal(10 ** 10 - 10 ** 5);
        expect(await provider.getBalance(tokenExchangeC.address)).to.equal(0);
        expect(await provider.getBalance(treasury.address)).to.equal(ethers.utils.parseEther("10000"));

        expect(await tokenExchangeC.connect(trader1).totalSupply()).to.equal(0);
        expect(await arteqC.connect(trader1).allowance(treasury.address, tokenExchangeC.address)).to.equal(0);
        await arteqC.connect(treasury).approve(tokenExchangeC.address, 10 ** 5);
        expect(await arteqC.connect(trader1).allowance(treasury.address, tokenExchangeC.address)).to.equal(MaxInt);

        {
            const call = await tokenExchangeC.connect(treasury).addLiquidity(0, 40000, 1640995199, { value: ethers.utils.parseEther("4") });
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

        {
            const call = await tokenExchangeC.connect(treasury).addLiquidity(1, 22000, 1640995199, { value: ethers.utils.parseEther("2") });
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
            expect(await tokensC.connect(admin).balanceOf(governor1.address, ARTEQ)).to.equal(0);
            expect(await tokensC.connect(admin).balanceOf(governor2.address, ARTEQ)).to.equal(0);
            expect(await tokensC.connect(admin).balanceOf(governor3.address, ARTEQ)).to.equal(0);
            expect(await tokensC.connect(admin).balanceOf(governor1.address, gARTEQ)).to.equal(0);
            expect(await tokensC.connect(admin).balanceOf(governor2.address, gARTEQ)).to.equal(0);
            expect(await tokensC.connect(admin).balanceOf(governor3.address, gARTEQ)).to.equal(0);
            expect(await arteqC.connect(admin).balanceOf(governor1.address)).to.equal(0);
            expect(await arteqC.connect(admin).balanceOf(governor2.address)).to.equal(0);
            expect(await arteqC.connect(admin).balanceOf(governor3.address)).to.equal(0);

            // transfer some ARTEQ tokens to governor 1
            await tokensC.connect(admin).safeTransferFrom(admin.address, governor1.address, ARTEQ, 100, []);
            // transfer some ARTEQ tokens to governor 2
            await tokensC.connect(admin).safeTransferFrom(admin.address, governor2.address, ARTEQ, 200, []);
            // transfer some ARTEQ tokens to governor 3
            await tokensC.connect(admin).safeTransferFrom(admin.address, governor3.address, ARTEQ, 300, []);
            // transfer some gARTEQ tokens to governor 1
            await tokensC.connect(admin).safeTransferFrom(admin.address, governor1.address, gARTEQ, 4000, []);
            // transfer some gARTEQ tokens to governor 2
            await tokensC.connect(admin).safeTransferFrom(admin.address, governor2.address, gARTEQ, 2500, []);
            // transfer some gARTEQ tokens to governor 3
            await tokensC.connect(admin).safeTransferFrom(admin.address, governor3.address, gARTEQ, 3500, []);

            // check the balances again
            expect(await tokensC.connect(admin).totalSupply(ARTEQ)).to.equal(10 ** 10);
            expect(await tokensC.connect(admin).totalSupply(gARTEQ)).to.equal(10 ** 6);

            expect(await tokensC.connect(admin).allTimeProfit()).to.equal(0);

            expect(await tokensC.connect(admin).balanceOf(admin.address, ARTEQ)).to.equal(10 ** 10 - 10 ** 5 - 100 - 200 - 300);
            expect(await tokensC.connect(admin).balanceOf(governor1.address, ARTEQ)).to.equal(100);
            expect(await tokensC.connect(admin).balanceOf(governor2.address, ARTEQ)).to.equal(200);
            expect(await tokensC.connect(admin).balanceOf(governor3.address, ARTEQ)).to.equal(300);
            expect(await arteqC.connect(admin).balanceOf(governor1.address)).to.equal(100);
            expect(await arteqC.connect(admin).balanceOf(governor2.address)).to.equal(200);
            expect(await arteqC.connect(admin).balanceOf(governor3.address)).to.equal(300);

            expect(await tokensC.connect(admin).balanceOf(admin.address, gARTEQ)).to.equal(10 ** 6 - 4000 - 2500 - 3500);
            expect(await tokensC.connect(admin).balanceOf(treasury.address, gARTEQ)).to.equal(0);
            expect(await tokensC.connect(admin).balanceOf(tokenExchangeC.address, gARTEQ)).to.equal(0);
            expect(await tokensC.connect(admin).balanceOf(governor1.address, gARTEQ)).to.equal(4000);
            expect(await tokensC.connect(admin).balanceOf(governor2.address, gARTEQ)).to.equal(2500);
            expect(await tokensC.connect(admin).balanceOf(governor3.address, gARTEQ)).to.equal(3500);
            expect(await tokensC.connect(admin).totalCirculatingGovernanceTokens()).to.equal(4000 + 2500 + 3500);
            expect(await tokensC.connect(admin).profitTokensTransferredToAccounts()).to.equal(0);
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
            expect(await tokensC.connect(admin).allTimeProfit()).to.equal(291);
            expect(await tokensC.connect(admin).profitTokensTransferredToAccounts()).to.equal(0);

            // check governors' balances
            expect(await tokensC.connect(admin).balanceOf(governor1.address, ARTEQ)).to.equal(100 + 116);
            expect(await tokensC.connect(admin).balanceOf(governor2.address, ARTEQ)).to.equal(200 + 72);
            expect(await tokensC.connect(admin).balanceOf(governor3.address, ARTEQ)).to.equal(300 + 101);
            expect(await tokensC.connect(admin).balanceOf(governor1.address, gARTEQ)).to.equal(4000);
            expect(await tokensC.connect(admin).balanceOf(governor2.address, gARTEQ)).to.equal(2500);
            expect(await tokensC.connect(admin).balanceOf(governor3.address, gARTEQ)).to.equal(3500);
            expect(await tokensC.connect(admin).profitTokensTransferredToAccounts()).to.equal(0);
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

            expect(await tokensC.connect(admin).balanceOf(governor1.address, ARTEQ)).to.equal(100 + 116);
            expect(await tokensC.connect(admin).balanceOf(governor2.address, ARTEQ)).to.equal(300 + 72);
            expect(await tokensC.connect(admin).balanceOf(governor3.address, ARTEQ)).to.equal(200 + 101);
            expect(await tokensC.connect(admin).balanceOf(governor1.address, gARTEQ)).to.equal(4000);
            expect(await tokensC.connect(admin).balanceOf(governor2.address, gARTEQ)).to.equal(2500);
            expect(await tokensC.connect(admin).balanceOf(governor3.address, gARTEQ)).to.equal(3500);
            expect(await tokensC.connect(admin).profitTokensTransferredToAccounts()).to.equal(72 + 101);
        }
    });
});
