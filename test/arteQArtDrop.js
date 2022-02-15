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

const LOCKED_STAGE = 0;
const WHITELISTING_STAGE = 2;
const RESERVATION_STAGE = 3;
const DISTRIBUTION_STAGE = 4;

describe("arteQ ArtDrop", function() {

    const getNextStage = (stage) => {
        let newStage = parseInt(stage) + 1;
        if (newStage == 5) {
            newStage = 0;
        } else if (newStage == 1) {
            newStage = 2;
        }
        return newStage;
    }

    const getPreviousStage = (stage) => {
        let newStage = parseInt(stage) - 1;
        if (newStage == -1) {
            newStage = 4;
        } else if (newStage == 1) {
            newStage = 0;
        }
        return newStage;
    }

    const getApprovedTask = async () => {
        const tx = await adminContract.connect(admin1).createTask("ipfs://AaBbCcDdEeFfGgHh");
        const receipt = await tx.wait();
        const taskId = receipt.events[0].args[1].toNumber();
        await adminContract.connect(admin1).approveTask(taskId);
        await adminContract.connect(admin2).approveTask(taskId);
        await adminContract.connect(admin3).approveTask(taskId);
        await adminContract.connect(admin4).approveTask(taskId);
        return taskId;
    }

    const advanceStage = async () => {
        const oldStage = await contract.connect(user1).stage();
        const taskId = await getApprovedTask();
        const call = contract.connect(admin4).advanceStage(taskId);
        const tx = await call;
        const receipt = await tx.wait();
        expect(receipt.logs.length).to.equal(2);
        await expect(call).to.emit(adminContract, "TaskFinalized").withArgs(contract.address, admin4.address, taskId);
        await expect(call).to.emit(contract, "StageChanged").withArgs(admin4.address, taskId, oldStage, getNextStage(oldStage));
    }

    const retreatStage = async () => {
        const oldStage = await contract.connect(user1).stage();
        const taskId = await getApprovedTask();
        const call = contract.connect(admin4).retreatStage(taskId);
        const tx = await call;
        const receipt = await tx.wait();
        expect(receipt.logs.length).to.equal(2);
        await expect(call).to.emit(adminContract, "TaskFinalized").withArgs(contract.address, admin4.address, taskId);
        await expect(call).to.emit(contract, "StageChanged").withArgs(admin4.address, taskId, oldStage, getPreviousStage(oldStage));
    }

    const goToStage = async (stage) => {
        while(await contract.connect(user1).stage() != stage) {
            await advanceStage();
        }
        expect(await contract.connect(user1).stage()).to.equal(stage);
    }

    const makeOperator = async (account) => {
        expect(await contract.connect(user1).isOperator(account.address)).to.equal(false);
        const taskId = await getApprovedTask();
        const call = contract.connect(admin1).addOperator(taskId, account.address);
        const tx = await call;
        const receipt = await tx.wait();
        expect(receipt.logs.length).to.equal(2);
        await expect(call).to.emit(adminContract, "TaskFinalized").withArgs(contract.address, admin1.address, taskId);
        await expect(call).to.emit(contract, "OperatorAdded").withArgs(admin1.address, taskId, account.address);
        expect(await contract.connect(user1).isOperator(account.address)).to.equal(true);
    }

    const whitelistAccountAndReturnOperator = async (account, nrTokens) => {
        await goToStage(WHITELISTING_STAGE);
        if (!(await contract.connect(user1).isOperator(user3.address))) {
            await makeOperator(user3);
        }
        const nr = await contract.connect(user4).nrOfWhitelistedAccounts();
        expect(await contract.connect(user3).whitelistedNrOfTokens(account.address)).to.equal(0);
        await contract.connect(user3).addToWhitelistedAccounts([account.address], [nrTokens]);
        expect(await contract.connect(user3).whitelistedNrOfTokens(account.address)).to.equal(nrTokens);
        expect(await contract.connect(user4).nrOfWhitelistedAccounts()).to.equal(parseInt(nr) + 1);
        return user3;
    }

    beforeEach(async () => {
        const provider = waffle.provider;

        [
            deployer,
            admin1,
            admin2,
            admin3,
            admin4,
            admin5,
            admin6,
            user1,
            user2,
            user3,
            user4,
            user5,
            museum,
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

        expect(await adminContract.connect(user1).minNrOfAdmins()).to.equal(5);
        expect(await adminContract.connect(user2).maxNrOfAdmins()).to.equal(10);
        expect(await adminContract.connect(user1).nrOfAdmins()).to.equal(6);
        expect(await adminContract.connect(user2).minRequiredNrOfApprovals()).to.equal(4);

        const arteQArtDropContract = await hre.ethers.getContractFactory("arteQArtDrop", admin3);
        contract = await arteQArtDropContract.deploy(
            adminContract.address,
            "The Kiss by Belvedere & arteQ",
            "TheKiss",
            ethers.utils.parseEther("0.45"),
            ethers.utils.parseEther("0.05"),
            "ipfs://link-to-default-json-blob",
            "ipfs://link-to-genesis-json-blob"
        );

        await contract.deployed();

        deployReceipt = await contract.deployTransaction.wait();
        expect(deployReceipt.logs.length).to.equal(9);
        await expect(contract.deployTransaction).to.emit(contract, "PricePerTokenChanged").withArgs(admin3.address, 0, 0, ethers.utils.parseEther("0.45"));
        await expect(contract.deployTransaction).to.emit(contract, "ServiceFeeChanged").withArgs(admin3.address, 0, 0, ethers.utils.parseEther("0.05"));
        await expect(contract.deployTransaction).to.emit(contract, "DefaultTokenURIChanged").withArgs(admin3.address, 0, "ipfs://link-to-default-json-blob");
        await expect(contract.deployTransaction).to.emit(contract, "StageChanged").withArgs(admin3.address, 0, 0, LOCKED_STAGE);
        await expect(contract.deployTransaction).to.emit(contract, "Transfer").withArgs(zeroAddress, contract.address, 0);
        await expect(contract.deployTransaction).to.emit(contract, "GenesisTokenURIChanged").withArgs(admin3.address, 0, "ipfs://link-to-genesis-json-blob");
        await expect(contract.deployTransaction).to.emit(contract, "RoyaltyPercentageChanged").withArgs(admin3.address, 0, 10);
        await expect(contract.deployTransaction).to.emit(contract, "RoyaltyWalletChanged").withArgs(admin3.address, 0, contract.address);
        await expect(contract.deployTransaction).to.emit(contract, "CanReserveWithoutBeingWhitelistedChanged").withArgs(admin3.address, 0, false);

        expect(await contract.connect(user1).ownerOf(0)).to.equal(contract.address);
        expect(await contract.connect(user1).balanceOf(contract.address)).to.equal(1);
        expect(await provider.getBalance(contract.address)).to.equal(0);
        expect(await contract.connect(user1).stage()).to.equal(LOCKED_STAGE);
        expect(await contract.connect(user1).pricePerToken()).to.equal(ethers.utils.parseEther("0.45"));
        expect(await contract.connect(user1).serviceFee()).to.equal(ethers.utils.parseEther("0.05"));
        expect(await contract.connect(user1).defaultTokenURI()).to.equal("ipfs://link-to-default-json-blob");
        expect(await contract.connect(user1).canReserveWithoutBeingWhitelisted()).to.equal(false);
        expect(await contract.connect(user1).tokenURI(0)).to.equal("ipfs://link-to-genesis-json-blob");
        expect(await contract.connect(user1).nrPreMintedTokens()).to.equal(0);

        const taskId = await getApprovedTask();
        await adminContract.addFinalizer(taskId, contract.address);

        const TestERC20Contract = await hre.ethers.getContractFactory("TestERC20", admin3);
        testERC20Contract = await TestERC20Contract.deploy();
        await testERC20Contract.deployed();
    });

    it("should not accept ether", async() => {
        await expect(user1.sendTransaction({
            to: contract.address,
            value: ethers.utils.parseEther("1"),
        })).to.be.revertedWith("arteQArtDrop: cannot accept ether");
    });

    it("should support these interfaces: ERC-721, ERC-2981", async() => {
        expect(await contract.connect(user1).supportsInterface(0xaabbccdd)).to.equal(false); // unknown interface
        expect(await contract.connect(user1).supportsInterface(0x80ac58cd)).to.equal(true); // ERC-721
        expect(await contract.connect(user1).supportsInterface(0x2a55205a)).to.equal(true); // ERC-2981
    });

    [{ stage: LOCKED_STAGE,       stageName: 'locked'       },
     { stage: WHITELISTING_STAGE, stageName: 'whitelisting' },
     { stage: RESERVATION_STAGE,  stageName: 'reservation'  },
     { stage: DISTRIBUTION_STAGE, stageName: 'distribution' }
    ].forEach((test) => {
        it(`[preMint] must failed if called by a non-operator account in '${test.stageName}' stage`, async () => {
            await expect(contract.connect(user1).preMint(100)).to.be.revertedWith("arteQArtDrop: not an operator account");
        });

        it(`[preMint] must succeed in '${test.stageName}' stage`, async () => {
            expect(await contract.connect(user1).nrPreMintedTokens()).to.equal(0);
            for (let i = 1; i <= 123; i++) {
              await expect(contract.connect(user1).tokenURI(i)).to.be.revertedWith("arteQArtDrop: token id does not exist");
            }
            await makeOperator(user3);
            const call = contract.connect(user3).preMint(123);
            const tx = await call;
            const receipt = await tx.wait();
            expect(receipt.logs.length).to.equal(123);
            expect(await contract.connect(user1).balanceOf(contract.address)).to.equal(124);
            for (let i = 1; i <= 123; i++) {
                expect(await contract.connect(user1).tokenURI(i)).to.equal("ipfs://link-to-default-json-blob");
                await expect(call).to.emit(contract, "Transfer").withArgs(zeroAddress, contract.address, i);
            }
            expect(await contract.connect(user1).nrPreMintedTokens()).to.equal(123);
        });
    });

    [{ stage: LOCKED_STAGE,       stageName: 'locked'       },
     { stage: WHITELISTING_STAGE, stageName: 'whitelisting' },
     { stage: RESERVATION_STAGE,  stageName: 'reservation'  },
     { stage: DISTRIBUTION_STAGE, stageName: 'distribution' }
    ].forEach((test) => {
        it(`[setRoyaltyPercentage] must fail when a value above 75 is about to get set in '${test.stageName}' stage`, async () => {
            const taskId = await getApprovedTask();
            await expect(contract.connect(admin1).setRoyaltyPercentage(taskId, 76)).to.be.revertedWith("arteQArtDrop: invalid royalty percentage");
        });
        it(`[setRoyaltyPercentage] success scenario when changing the royalty percentage in '${test.stageName}' stage`, async () => {
            {
                const taskId = await getApprovedTask();
                const call = contract.connect(admin1).setRoyaltyPercentage(taskId, 23);
                const tx = await call;
                const receipt = await tx.wait();
                expect(receipt.logs.length).to.equal(2);
                await expect(call).to.emit(adminContract, "TaskFinalized").withArgs(contract.address, admin1.address, taskId);
                await expect(call).to.emit(contract, "RoyaltyPercentageChanged").withArgs(admin1.address, taskId, 23);
            }
            {
                const result = await contract.connect(user3).royaltyInfo(100, ethers.utils.parseEther("200"));
                expect(result[0]).to.equal(contract.address);
                expect(result[1]).to.equal(ethers.utils.parseEther("46"));
            }
        });
    });

    [{ stage: LOCKED_STAGE,       stageName: 'locked'       },
     { stage: WHITELISTING_STAGE, stageName: 'whitelisting' },
     { stage: RESERVATION_STAGE,  stageName: 'reservation'  },
     { stage: DISTRIBUTION_STAGE, stageName: 'distribution' }
    ].forEach((test) => {
        it(`[setRoyaltyWallet] must fail when zero address is about to get set in '${test.stageName}' stage`, async () => {
            const taskId = await getApprovedTask();
            await expect(contract.connect(admin1).setRoyaltyWallet(taskId, zeroAddress)).to.be.revertedWith("arteQArtDrop: invalid royalty wallet");
        });
        it(`[setRoyaltyWallet] success scenario when changing the royalty wallet in '${test.stageName}' stage`, async () => {
            {
                const taskId = await getApprovedTask();
                const call = contract.connect(admin1).setRoyaltyWallet(taskId, admin4.address);
                const tx = await call;
                const receipt = await tx.wait();
                expect(receipt.logs.length).to.equal(2);
                await expect(call).to.emit(adminContract, "TaskFinalized").withArgs(contract.address, admin1.address, taskId);
                await expect(call).to.emit(contract, "RoyaltyWalletChanged").withArgs(admin1.address, taskId, admin4.address);
            }
            {
                const result = await contract.connect(user3).royaltyInfo(100, ethers.utils.parseEther("200"));
                expect(result[0]).to.equal(admin4.address);
                expect(result[1]).to.equal(ethers.utils.parseEther("20"));
            }
        });
    });

    it("[setStage] change stages", async() => {
        expect(await contract.connect(user1).stage()).to.equal(LOCKED_STAGE);
        {
            await advanceStage();
            expect(await contract.connect(user1).stage()).to.equal(WHITELISTING_STAGE);
        }
        {
            await advanceStage();
            expect(await contract.connect(user1).stage()).to.equal(RESERVATION_STAGE);
        }
        {
            await advanceStage();
            expect(await contract.connect(user1).stage()).to.equal(DISTRIBUTION_STAGE);
        }
        // now, advancing further should return us back to the locked stage
        {
            await advanceStage();
            expect(await contract.connect(user1).stage()).to.equal(LOCKED_STAGE);
        }
        // now, let's go backwards
        {
            await retreatStage();
            expect(await contract.connect(user1).stage()).to.equal(DISTRIBUTION_STAGE);
        }
        {
            await retreatStage();
            expect(await contract.connect(user1).stage()).to.equal(RESERVATION_STAGE);
        }
        {
            await retreatStage();
            expect(await contract.connect(user1).stage()).to.equal(WHITELISTING_STAGE);
        }
        {
            await retreatStage();
            expect(await contract.connect(user1).stage()).to.equal(LOCKED_STAGE);
        }
        // finally, retreaing further puts us back to the distribution stage
        {
            await retreatStage();
            expect(await contract.connect(user1).stage()).to.equal(DISTRIBUTION_STAGE);
        }
    });

    it("[setPricePerToken] try to change the price-per-token must fail in locked stage", async () => {
        expect(await contract.connect(user1).stage()).to.equal(LOCKED_STAGE);
        const taskId = await getApprovedTask();
        const call = contract.connect(admin2).setPricePerToken(taskId, ethers.utils.parseEther("0.6"));
        await expect(call).to.be.revertedWith("arteQArtDrop: only callable in not-locked stages");
    });

    it("[setPricePerToken] try to change the price-per-token must fail in reservation stage", async () => {
        expect(await contract.connect(user1).stage()).to.equal(LOCKED_STAGE);
        await advanceStage();
        await advanceStage();
        expect(await contract.connect(user1).stage()).to.equal(RESERVATION_STAGE);
        const taskId = await getApprovedTask();
        const call = contract.connect(admin2).setPricePerToken(taskId, ethers.utils.parseEther("0.6"));
        await expect(call).to.be.revertedWith("arteQArtDrop: only callable in a non-reservation stage");
    });

    [{ stage: WHITELISTING_STAGE, stageName: 'whitelisting' },
     { stage: DISTRIBUTION_STAGE, stageName: 'distribution' }
    ].forEach((test) => {
        it(`[setPricePerToken] change the price-per-token in '${test.stageName}' stage`, async () => {
            expect(await contract.connect(user1).stage()).to.equal(LOCKED_STAGE);
            await goToStage(test.stage);
            const taskId = await getApprovedTask();
            await contract.connect(admin2).setPricePerToken(taskId, ethers.utils.parseEther("0.6"));
            expect(await contract.connect(user1).pricePerToken()).to.equal(ethers.utils.parseEther("0.6"));
        });
    });

    it("[setServiceFee] try to change the service fee must fail in locked stage", async () => {
        expect(await contract.connect(user1).stage()).to.equal(LOCKED_STAGE);
        const taskId = await getApprovedTask();
        const call = contract.connect(admin2).setServiceFee(taskId, ethers.utils.parseEther("0.04"));
        await expect(call).to.be.revertedWith("arteQArtDrop: only callable in not-locked stages");
    });

    it("[setServiceFee] try to change the service fee must fail in reservation stage", async () => {
        expect(await contract.connect(user1).stage()).to.equal(LOCKED_STAGE);
        await advanceStage();
        await advanceStage();
        expect(await contract.connect(user1).stage()).to.equal(RESERVATION_STAGE);
        const taskId = await getApprovedTask();
        const call = contract.connect(admin2).setServiceFee(taskId, ethers.utils.parseEther("0.04"));
        await expect(call).to.be.revertedWith("arteQArtDrop: only callable in a non-reservation stage");
    });

    [{ stage: WHITELISTING_STAGE, stageName: 'whitelisting' },
     { stage: DISTRIBUTION_STAGE, stageName: 'distribution' }
    ].forEach((test) => {
        it(`[setServiceFee] change the service fee in '${test.stageName}' stage`, async () => {
            expect(await contract.connect(user1).stage()).to.equal(LOCKED_STAGE);
            await goToStage(test.stage);
            const taskId = await getApprovedTask();
            const call = contract.connect(admin2).setServiceFee(taskId, ethers.utils.parseEther("0.04"));
            const tx = await call;
            const receipt = await tx.wait();
            expect(receipt.logs.length).to.equal(2);
            await expect(call).to.emit(adminContract, "TaskFinalized").withArgs(contract.address, admin2.address, taskId);
            await expect(call).to.emit(contract, "ServiceFeeChanged").withArgs(admin2.address, taskId,
                ethers.utils.parseEther("0.05"), ethers.utils.parseEther("0.04"));
            expect(await contract.connect(user1).serviceFee()).to.equal(ethers.utils.parseEther("0.04"));
        });
    });

    it("[setDefaulTokenURI] try to change the default token URI must fail in locked stage", async () => {
        expect(await contract.connect(user1).stage()).to.equal(LOCKED_STAGE);
        const taskId = await getApprovedTask();
        const call = contract.connect(admin2).setDefaultTokenURI(taskId, "ipfs://another-link");
        await expect(call).to.be.revertedWith("arteQArtDrop: only callable in not-locked stages");
    });

    it("[setDefaultTokenURI] try to change the default token URI must fail in reservation stage", async () => {
        expect(await contract.connect(user1).stage()).to.equal(LOCKED_STAGE);
        await advanceStage();
        await advanceStage();
        expect(await contract.connect(user1).stage()).to.equal(RESERVATION_STAGE);
        const taskId = await getApprovedTask();
        const call = contract.connect(admin2).setDefaultTokenURI(taskId, "ipfs://another-link");
        await expect(call).to.be.revertedWith("arteQArtDrop: only callable in a non-reservation stage");
    });

    [{ stage: WHITELISTING_STAGE, stageName: 'whitelisting' },
     { stage: DISTRIBUTION_STAGE, stageName: 'distribution' }
    ].forEach((test) => {
        it(`[setDefaultTokenURI] change the default token URI in '${test.stageName}' stage`, async () => {
            expect(await contract.connect(user1).stage()).to.equal(LOCKED_STAGE);
            await goToStage(test.stage);
            const taskId = await getApprovedTask();
            const call = contract.connect(admin2).setDefaultTokenURI(taskId, "ipfs://another-link");
            const tx = await call;
            const receipt = await tx.wait();
            expect(receipt.logs.length).to.equal(2);
            await expect(call).to.emit(adminContract, "TaskFinalized").withArgs(contract.address, admin2.address, taskId);
            await expect(call).to.emit(contract, "DefaultTokenURIChanged").withArgs(admin2.address, taskId, "ipfs://another-link");
            expect(await contract.connect(user1).defaultTokenURI()).to.equal("ipfs://another-link");
        });
    });

    it("[setGenesisTokenURI] changing the genesis token's URI only works in locked stage", async () => {
        expect(await contract.connect(user1).stage()).to.equal(LOCKED_STAGE);
        const taskId = await getApprovedTask();
        const call = contract.connect(admin2).setGenesisTokenURI(taskId, "ipfs://another-link-for-genesis");
        const tx = await call;
        const receipt = await tx.wait();
        expect(receipt.logs.length).to.equal(2);
        await expect(call).to.emit(adminContract, "TaskFinalized").withArgs(contract.address, admin2.address, taskId);
        await expect(call).to.emit(contract, "GenesisTokenURIChanged").withArgs(admin2.address, taskId, "ipfs://another-link-for-genesis");
    });

    [{ stage: WHITELISTING_STAGE, stageName: 'whitelisting' },
     { stage: RESERVATION_STAGE,  stageName: 'reservation'  },
     { stage: DISTRIBUTION_STAGE, stageName: 'distribution' }
    ].forEach((test) => {
        it(`[setGenesisTokenURI] try to change the genesis token's URI in '${test.stageName}' stage must fail`, async () => {
            expect(await contract.connect(user1).stage()).to.equal(LOCKED_STAGE);
            await goToStage(test.stage);
            const taskId = await getApprovedTask();
            const call = contract.connect(admin2).setGenesisTokenURI(taskId, "ipfs://another-link-for-genesis");
            await expect(call).to.be.revertedWith("arteQArtDrop: only callable in locked stage");
        });
    });

    [{ stage: LOCKED_STAGE,       stageName: 'locked'       },
     { stage: WHITELISTING_STAGE, stageName: 'whitelisting' },
     { stage: RESERVATION_STAGE,  stageName: 'reservation'  },
     { stage: DISTRIBUTION_STAGE, stageName: 'distribution' }
    ].forEach((test) => {
        it(`[addOperator] add a new operator in '${test.stageName}' stage`, async () => {
            expect(await contract.connect(user1).stage()).to.equal(LOCKED_STAGE);
            await goToStage(test.stage);
            expect(await contract.connect(user1).isOperator(user2.address)).to.equal(false);
            {
                const taskId = await getApprovedTask();
                const call = contract.connect(admin5).addOperator(taskId, user2.address);
                const tx = await call;
                const receipt = await tx.wait();
                expect(receipt.logs.length).to.equal(2);
                await expect(call).to.emit(adminContract, "TaskFinalized").withArgs(contract.address, admin5.address, taskId);
                await expect(call).to.emit(contract, "OperatorAdded").withArgs(admin5.address, taskId, user2.address);
                expect(await contract.connect(user1).isOperator(user2.address)).to.equal(true);
            }
            // should fail if we try to add the same operator again
            {
                const taskId = await getApprovedTask();
                const call = contract.connect(admin3).addOperator(taskId, user2.address);
                await expect(call).to.be.revertedWith("arteQArtDrop: already an operator");
            }
        });
    });

    [{ stage: LOCKED_STAGE,       stageName: 'locked'       },
     { stage: WHITELISTING_STAGE, stageName: 'whitelisting' },
     { stage: RESERVATION_STAGE,  stageName: 'reservation'  },
     { stage: DISTRIBUTION_STAGE, stageName: 'distribution' }
    ].forEach((test) => {
        it(`[removeOperator] remove an operator in '${test.stageName}' stage`, async () => {
            expect(await contract.connect(user1).stage()).to.equal(LOCKED_STAGE);
            await goToStage(test.stage);
            // try to remove a non-operator address must fail
            {
                const taskId = await getApprovedTask();
                const call = contract.connect(admin5).removeOperator(taskId, user2.address);
                await expect(call).to.be.revertedWith("arteQArtDrop: not an operator");
            }
            expect(await contract.connect(user1).isOperator(user2.address)).to.equal(false);
            // adding a new operator
            {
                const taskId = await getApprovedTask();
                await contract.connect(admin5).addOperator(taskId, user2.address);
            }
            // should be able to remove the operator
            {
                expect(await contract.connect(user1).isOperator(user2.address)).to.equal(true);
                const taskId = await getApprovedTask();
                const call = contract.connect(admin5).removeOperator(taskId, user2.address);
                const tx = await call;
                const receipt = await tx.wait();
                expect(receipt.logs.length).to.equal(2);
                await expect(call).to.emit(adminContract, "TaskFinalized").withArgs(contract.address, admin5.address, taskId);
                await expect(call).to.emit(contract, "OperatorRemoved").withArgs(admin5.address, taskId, user2.address);
                expect(await contract.connect(user1).isOperator(user2.address)).to.equal(false);
            }
        });
    });

    it('[addToWhitelistdAccounts] method cannot be called by a non-operator wallet', async () => {
        const call = contract.connect(user1).addToWhitelistedAccounts([user5.address], [2]);
        await expect(call).to.be.revertedWith("arteQArtDrop: not an operator");
    });

    [{ stage: LOCKED_STAGE,       stageName: 'locked'       },
     { stage: RESERVATION_STAGE,  stageName: 'reservation'  },
     { stage: DISTRIBUTION_STAGE, stageName: 'distribution' }
    ].forEach((test) => {
        it(`[addToWhitelistdAccounts] must fail in ${test.stageName} stage`, async () => {
            expect(await contract.connect(user1).stage()).to.equal(LOCKED_STAGE);
            await goToStage(test.stage);
            await makeOperator(user3);
            const call = contract.connect(user3).addToWhitelistedAccounts([user5.address], [2]);
            await expect(call).to.be.revertedWith("arteQArtDrop: only callable in whitelisting stage");
        });
    });

    it('[addToWhitelistdAccounts] must fail with empty arrays', async () => {
        expect(await contract.connect(user1).stage()).to.equal(LOCKED_STAGE);
        await advanceStage();
        expect(await contract.connect(user1).stage()).to.equal(WHITELISTING_STAGE);
        await makeOperator(user3);
        let call = contract.connect(user3).addToWhitelistedAccounts([], []);
        await expect(call).to.be.revertedWith("arteQArtDrop: zero length");
        call = contract.connect(user3).addToWhitelistedAccounts([user4.address], []);
        await expect(call).to.be.revertedWith("arteQArtDrop: zero length");
        call = contract.connect(user3).addToWhitelistedAccounts([], [2]);
        await expect(call).to.be.revertedWith("arteQArtDrop: zero length");
    });

    it('[addToWhitelistdAccounts] must fail with zero number of tokens', async () => {
        expect(await contract.connect(user1).stage()).to.equal(LOCKED_STAGE);
        await advanceStage();
        expect(await contract.connect(user1).stage()).to.equal(WHITELISTING_STAGE);
        await makeOperator(user3);
        const call = contract.connect(user3).addToWhitelistedAccounts(
            [user4.address, user5.address, user1.address],
            [3, 0, 2]
        );
        await expect(call).to.be.revertedWith("arteQArtDrop: invalid nr of tokens to obtain");
    });

    it('[addToWhitelistdAccounts] must fail with too many number of tokens', async () => {
        expect(await contract.connect(user1).stage()).to.equal(LOCKED_STAGE);
        await advanceStage();
        expect(await contract.connect(user1).stage()).to.equal(WHITELISTING_STAGE);
        await makeOperator(user3);
        const call = contract.connect(user3).addToWhitelistedAccounts(
            [user4.address, user5.address, user1.address],
            [3, 1, 7]
        );
        await expect(call).to.be.revertedWith("arteQArtDrop: invalid nr of tokens to obtain");
    });

    it('[addToWhitelistdAccounts] must fail with arrays having different lengths', async () => {
        expect(await contract.connect(user1).stage()).to.equal(LOCKED_STAGE);
        await advanceStage();
        expect(await contract.connect(user1).stage()).to.equal(WHITELISTING_STAGE);
        await makeOperator(user3);
        const call = contract.connect(user3).addToWhitelistedAccounts(
            [user4.address, user5.address, user1.address],
            [3, 7]
        );
        await expect(call).to.be.revertedWith("arteQArtDrop: different lengths");
    });

    it('[addToWhitelistdAccounts] must fail with zero address', async () => {
        expect(await contract.connect(user1).stage()).to.equal(LOCKED_STAGE);
        await advanceStage();
        expect(await contract.connect(user1).stage()).to.equal(WHITELISTING_STAGE);
        await makeOperator(user3);
        const call = contract.connect(user3).addToWhitelistedAccounts(
            [user4.address, zeroAddress, user1.address],
            [3, 1, 2]
        );
        await expect(call).to.be.revertedWith("arteQArtDrop: cannot whitelist zero address");
    });

    it('[addToWhitelistdAccounts] must fail with a contract account', async () => {
        expect(await contract.connect(user1).stage()).to.equal(LOCKED_STAGE);
        await advanceStage();
        expect(await contract.connect(user1).stage()).to.equal(WHITELISTING_STAGE);
        await makeOperator(user3);
        const call = contract.connect(user3).addToWhitelistedAccounts(
            [user4.address, testERC20Contract.address, user1.address],
            [3, 1, 2]
        );
        await expect(call).to.be.revertedWith("arteQArtDrop: cannot whitelist a contract");
    });

    it('[addToWhitelistdAccounts] should succeed with all conditions met', async () => {
        expect(await contract.connect(user1).stage()).to.equal(LOCKED_STAGE);
        await advanceStage();
        expect(await contract.connect(user1).stage()).to.equal(WHITELISTING_STAGE);
        // a non-operator user can call whitelistedNrOfTokens(...) method
        {
            expect(await contract.connect(user3).whitelistedNrOfTokens(user2.address)).to.equal(0);
        }
        await makeOperator(user3);
        {
            expect(await contract.connect(user3).whitelistedNrOfTokens(user2.address)).to.equal(0);
            expect(await contract.connect(user3).whitelistedNrOfTokens(user1.address)).to.equal(0);
            expect(await contract.connect(user3).whitelistedNrOfTokens(user3.address)).to.equal(0);
        }
        {
            expect(await contract.connect(user4).nrOfWhitelistedAccounts()).to.equal(0);
            expect(await contract.connect(user4).nrOfReservedTokens()).to.equal(0);
        }
        const call = contract.connect(user3).addToWhitelistedAccounts(
            [user2.address, user1.address, user3.address],
            [3, 1, 2]
        );
        const tx = await call;
        const receipt = await tx.wait();
        expect(receipt.logs.length).to.equal(3);
        await expect(call).to.emit(contract, "WhitelistedAccountAdded").withArgs(user3.address, user2.address, 3);
        await expect(call).to.emit(contract, "WhitelistedAccountAdded").withArgs(user3.address, user1.address, 1);
        await expect(call).to.emit(contract, "WhitelistedAccountAdded").withArgs(user3.address, user3.address, 2);
        {
            expect(await contract.connect(user3).whitelistedNrOfTokens(user2.address)).to.equal(3);
            expect(await contract.connect(user3).whitelistedNrOfTokens(user1.address)).to.equal(1);
            expect(await contract.connect(user3).whitelistedNrOfTokens(user3.address)).to.equal(2);
            expect(await contract.connect(user4).nrOfWhitelistedAccounts()).to.equal(3);
            expect(await contract.connect(user4).nrOfReservedTokens()).to.equal(0);
        }
        // trying to whitelist an already whitelisted wallet must fail
        {
            const call = contract.connect(user3).addToWhitelistedAccounts(
                [user1.address],
                [1]
            );
            await expect(call).to.be.revertedWith("arteQArtDrop: already whitelisted");
        }
    });

    it('[removeFromWhitelistdAccounts] method cannot be called by a non-operator wallet', async () => {
        const call = contract.connect(user1).removeFromWhitelistedAccounts([user5.address]);
        await expect(call).to.be.revertedWith("arteQArtDrop: not an operator");
    });

    [{ stage: LOCKED_STAGE,       stageName: 'locked'       },
     { stage: RESERVATION_STAGE,  stageName: 'reservation'  },
     { stage: DISTRIBUTION_STAGE, stageName: 'distribution' }
    ].forEach((test) => {
        it(`[removeFromWhitelistdAccounts] must fail in ${test.stageName} stage`, async () => {
            expect(await contract.connect(user1).stage()).to.equal(LOCKED_STAGE);
            await goToStage(test.stage);
            await makeOperator(user3);
            const call = contract.connect(user3).removeFromWhitelistedAccounts([user5.address]);
            await expect(call).to.be.revertedWith("arteQArtDrop: only callable in whitelisting stage");
        });
    });

    it('[removeFromWhitelistdAccounts] must fail with an empty array argument', async () => {
        expect(await contract.connect(user1).stage()).to.equal(LOCKED_STAGE);
        await advanceStage();
        expect(await contract.connect(user1).stage()).to.equal(WHITELISTING_STAGE);
        await makeOperator(user3);
        const call = contract.connect(user3).removeFromWhitelistedAccounts([]);
        await expect(call).to.be.revertedWith("arteQArtDrop: zero length");
    });

    it('[removeFromWhitelistdAccounts] must fail with zero address', async () => {
        expect(await contract.connect(user1).stage()).to.equal(LOCKED_STAGE);
        await advanceStage();
        expect(await contract.connect(user1).stage()).to.equal(WHITELISTING_STAGE);
        await makeOperator(user3);
        const call = contract.connect(user3).removeFromWhitelistedAccounts([zeroAddress, user5.address]);
        await expect(call).to.be.revertedWith("arteQArtDrop: cannot remove zero address");
    });

    it('[removeFromWhitelistdAccounts] must fail when removing a non-whitelisted account', async () => {
        expect(await contract.connect(user1).stage()).to.equal(LOCKED_STAGE);
        await advanceStage();
        expect(await contract.connect(user1).stage()).to.equal(WHITELISTING_STAGE);
        await makeOperator(user3);
        const call = contract.connect(user3).removeFromWhitelistedAccounts([user5.address]);
        await expect(call).to.be.revertedWith("arteQArtDrop: account is not whitelisted");
    });

    it('[removeFromWhitelistdAccounts] should succeed when all conditions met', async () => {
        expect(await contract.connect(user1).stage()).to.equal(LOCKED_STAGE);
        await advanceStage();
        expect(await contract.connect(user1).stage()).to.equal(WHITELISTING_STAGE);
        await makeOperator(user3);

        expect(await contract.connect(user4).nrOfWhitelistedAccounts()).to.equal(0);
        expect(await contract.connect(user4).nrOfReservedTokens()).to.equal(0);

        expect(await contract.connect(user3).whitelistedNrOfTokens(user5.address)).to.equal(0);
        expect(await contract.connect(user3).whitelistedNrOfTokens(user1.address)).to.equal(0);
        await contract.connect(user3).addToWhitelistedAccounts([user5.address, user1.address], [3, 4]);
        expect(await contract.connect(user3).whitelistedNrOfTokens(user5.address)).to.equal(3);
        expect(await contract.connect(user3).whitelistedNrOfTokens(user1.address)).to.equal(4);

        expect(await contract.connect(user4).nrOfWhitelistedAccounts()).to.equal(2);
        expect(await contract.connect(user4).nrOfReservedTokens()).to.equal(0);

        const call = contract.connect(user3).removeFromWhitelistedAccounts([user5.address]);
        const tx = await call;
        const receipt = await tx.wait();
        expect(receipt.logs.length).to.equal(1);
        await expect(call).to.emit(contract, "WhitelistedAccountRemoved").withArgs(user3.address, user5.address);
        expect(await contract.connect(user3).whitelistedNrOfTokens(user5.address)).to.equal(0);
        expect(await contract.connect(user3).whitelistedNrOfTokens(user1.address)).to.equal(4);

        expect(await contract.connect(user4).nrOfWhitelistedAccounts()).to.equal(1);
        expect(await contract.connect(user4).nrOfReservedTokens()).to.equal(0);

        //should be able to whitelist again
        await contract.connect(user3).addToWhitelistedAccounts([user5.address], [2]);
        expect(await contract.connect(user3).whitelistedNrOfTokens(user5.address)).to.equal(2);
        expect(await contract.connect(user3).whitelistedNrOfTokens(user1.address)).to.equal(4);

        expect(await contract.connect(user4).nrOfWhitelistedAccounts()).to.equal(2);
        expect(await contract.connect(user4).nrOfReservedTokens()).to.equal(0);
    });

    it('[whitelistAccountAndReturnOperator] can be called twice', async () => {
        const operator1 = await whitelistAccountAndReturnOperator(user1, 4);
        const operator2 = await whitelistAccountAndReturnOperator(user2, 2);
        expect(user3.address).to.equal(operator1.address);
        expect(operator1.address).to.equal(operator2.address);
    });

    it('[reserveTokens] must fail when called by a non-whitelisted account', async () => {
        await goToStage(RESERVATION_STAGE);
        const call = contract.connect(user1).reserveTokens(2, { value: ethers.utils.parseEther("2") });
        await expect(call).to.be.revertedWith("arteQArtDrop: not a whitelisted account");
    });

    [{ stage: LOCKED_STAGE,       stageName: 'locked'       },
     { stage: WHITELISTING_STAGE, stageName: 'whitelisting' }
    ].forEach((test) => {
        it(`[reserveTokens] must fail when called in ${test.stageName} stage`, async () => {
            const operator = await whitelistAccountAndReturnOperator(user1, 4);
            await goToStage(test.stage);
            const call = contract.connect(user1).reserveTokens(2, { value: ethers.utils.parseEther("2") });
            await expect(call).to.be.revertedWith("arteQArtDrop: only callable in reservation and distribution stage");
        });
    });

    [{ stage: RESERVATION_STAGE,  stageName: 'reservation'  },
     { stage: DISTRIBUTION_STAGE, stageName: 'distribution' }
    ].forEach((test) => {
      it(`[reserveTokens] must fail when no ether is sent (${test.stageName} stage)`, async () => {
          await whitelistAccountAndReturnOperator(user1, 4);
          await goToStage(test.stage);
          const call = contract.connect(user1).reserveTokens(2);
          await expect(call).to.be.revertedWith("arteQArtDrop: zero funds");
      });

      it(`[reserveTokens] must fail when zero is passed as argument (${test.stageName} stage)`, async () => {
          await whitelistAccountAndReturnOperator(user1, 4);
          await goToStage(test.stage);
          const call = contract.connect(user1).reserveTokens(0, { value: ethers.utils.parseEther("1") });
          await expect(call).to.be.revertedWith("arteQArtDrop: zero tokens to reserve");
      });

      it(`[reserveTokens] must fail when more than the whitelisted nr of tokens is asked to be reserved (${test.stageName} stage)`, async () => {
          await whitelistAccountAndReturnOperator(user1, 4);
          await goToStage(test.stage);
          const call = contract.connect(user1).reserveTokens(5, { value: ethers.utils.parseEther("1") });
          await expect(call).to.be.revertedWith("arteQArtDrop: exceeding the reservation allowance");
      });

      it(`[reserveTokens] must fail when not enough ether has not been sent (${test.stageName} stage)`, async () => {
          await whitelistAccountAndReturnOperator(user1, 4);
          await goToStage(test.stage);
          expect(await contract.connect(user1).pricePerToken()).to.equal(ethers.utils.parseEther("0.45"));
          const call = contract.connect(user1).reserveTokens(2, { value: ethers.utils.parseEther("0.7") }); // 0.7 < 2 * 0.45
          await expect(call).to.be.revertedWith("arteQArtDrop: insufficient funds");
      });

      it(`[reserveTokens] success scenario with exact amount of ethereum needed (zero remainder) (${test.stageName} stage)`, async () => {
          const provider = waffle.provider;

          const operator = await whitelistAccountAndReturnOperator(user1, 4);
          await contract.connect(operator).preMint(2);
          expect(await contract.connect(user1).balanceOf(contract.address)).to.equal(3);
          expect(await contract.connect(user5).tokenURI(1)).to.equal("ipfs://link-to-default-json-blob");
          expect(await contract.connect(user5).tokenURI(2)).to.equal("ipfs://link-to-default-json-blob");
          await expect(contract.connect(user5).tokenURI(3)).to.be.revertedWith("arteQArtDrop: token id does not exist");

          await goToStage(test.stage);
          expect(await contract.connect(user3).whitelistedNrOfTokens(user1.address)).to.equal(4);
          expect(await contract.connect(user1).pricePerToken()).to.equal(ethers.utils.parseEther("0.45"));
          expect(await contract.connect(user1).serviceFee()).to.equal(ethers.utils.parseEther("0.05"));
          expect(await contract.connect(user4).nrOfReservedTokens()).to.equal(0);
          const oldBalance = await provider.getBalance(user1.address);
          const oldContractBalance = await provider.getBalance(contract.address);
          const exactValue = ethers.utils.parseEther(`1.4`);
          const call = contract.connect(user1).reserveTokens(3, { value: exactValue });
          const tx = await call;
          const receipt = await tx.wait();
          expect(receipt.logs.length).to.equal(5);
          await expect(call).to.emit(contract, "Deposited")
              .withArgs(user1.address, ethers.utils.parseEther('1.35'), ethers.utils.parseEther('0.05'), exactValue);
          await expect(call).to.emit(contract, "Transfer").withArgs(contract.address, user1.address, 1);
          await expect(call).to.emit(contract, "Transfer").withArgs(contract.address, user1.address, 2);
          await expect(call).to.emit(contract, "Transfer").withArgs(contract.address, user1.address, 3);
          await expect(call).to.emit(contract, "TokensReserved").withArgs(user1.address, user1.address, 3);
          expect(await contract.connect(user4).nrOfReservedTokens()).to.equal(3);
          const newBalance = await provider.getBalance(user1.address);
          const newContractBalance = await provider.getBalance(contract.address);
          const balanceDiff = oldBalance.sub(newBalance);
          const contractBalanceDiff = newContractBalance.sub(oldContractBalance);
          expect(balanceDiff.sub(exactValue).abs()).to.be.below(ethers.utils.parseEther('0.003')); // because of gas fees
          expect(contractBalanceDiff).to.equal(exactValue);
          expect(await contract.connect(user5).tokenURI(1)).to.equal("ipfs://link-to-default-json-blob");
          expect(await contract.connect(user5).tokenURI(2)).to.equal("ipfs://link-to-default-json-blob");
          expect(await contract.connect(user5).tokenURI(3)).to.equal("ipfs://link-to-default-json-blob");
          expect(await contract.connect(user1).balanceOf(contract.address)).to.equal(1);

          // trying to reserve more than the remenant must fail
          {
              expect(await contract.connect(user3).whitelistedNrOfTokens(user1.address)).to.equal(1);
              const call = contract.connect(user1).reserveTokens(2, { value: ethers.utils.parseEther("1") });
              await expect(call).to.be.revertedWith("arteQArtDrop: exceeding the reservation allowance");
          }
          // this should succeed
          {
              await expect(contract.connect(user5).tokenURI(4)).to.be.revertedWith("arteQArtDrop: token id does not exist");
              expect(await contract.connect(user3).whitelistedNrOfTokens(user1.address)).to.equal(1);
              const call = contract.connect(user1).reserveTokens(1, { value: ethers.utils.parseEther("1.12") });
              const tx = await call;
              const receipt = await tx.wait();
              expect(receipt.logs.length).to.equal(4);
              await expect(call).to.emit(contract, "Deposited")
                  .withArgs(user1.address, ethers.utils.parseEther('0.45'), ethers.utils.parseEther('0.05'), ethers.utils.parseEther('0.5'));
              await expect(call).to.emit(contract, "Returned").withArgs(user1.address, user1.address, ethers.utils.parseEther('0.62'));
              await expect(call).to.emit(contract, "Transfer").withArgs(contract.address, user1.address, 4);
              await expect(call).to.emit(contract, "TokensReserved").withArgs(user1.address, user1.address, 1);
              expect(await contract.connect(user5).tokenURI(4)).to.equal("ipfs://link-to-default-json-blob");
              expect(await contract.connect(user4).nrOfReservedTokens()).to.equal(4);
              expect(await contract.connect(user1).balanceOf(contract.address)).to.equal(1);
          }
      });

      it(`[reserveTokens] success scenario with extra amount of ethereum needed (non-zero remainder) (${test.stageName} stage)`, async () => {
          const provider = waffle.provider;

          const operator = await whitelistAccountAndReturnOperator(user1, 4);
          await contract.connect(operator).preMint(2);
          expect(await contract.connect(user5).tokenURI(1)).to.equal("ipfs://link-to-default-json-blob");
          expect(await contract.connect(user5).tokenURI(2)).to.equal("ipfs://link-to-default-json-blob");
          await expect(contract.connect(user5).tokenURI(3)).to.be.revertedWith("arteQArtDrop: token id does not exist");

          await goToStage(test.stage);
          expect(await contract.connect(user3).whitelistedNrOfTokens(user1.address)).to.equal(4);
          expect(await contract.connect(user1).pricePerToken()).to.equal(ethers.utils.parseEther("0.45"));
          expect(await contract.connect(user3).nrOfWhitelistedAccounts()).to.equal(1);
          expect(await contract.connect(user1).serviceFee()).to.equal(ethers.utils.parseEther("0.05"));
          expect(await contract.connect(user4).nrOfReservedTokens()).to.equal(0);
          const oldBalance = await provider.getBalance(user1.address);
          const oldContractBalance = await provider.getBalance(contract.address);
          const exactValue = ethers.utils.parseEther(`1.4`);
          const sendingValue = ethers.utils.parseEther(`1.567`);
          const call = contract.connect(user1).reserveTokens(3, { value: sendingValue });
          const tx = await call;
          const receipt = await tx.wait();
          expect(receipt.logs.length).to.equal(6);
          await expect(call).to.emit(contract, "Deposited")
              .withArgs(user1.address, ethers.utils.parseEther('1.35'), ethers.utils.parseEther('0.05'), exactValue);
          await expect(call).to.emit(contract, "Returned").withArgs(user1.address, user1.address, ethers.utils.parseEther('0.167'));
          await expect(call).to.emit(contract, "Transfer").withArgs(contract.address, user1.address, 1);
          await expect(call).to.emit(contract, "Transfer").withArgs(contract.address, user1.address, 2);
          await expect(call).to.emit(contract, "Transfer").withArgs(contract.address, user1.address, 3);
          await expect(call).to.emit(contract, "TokensReserved").withArgs(user1.address, user1.address, 3);
          expect(await contract.connect(user3).whitelistedNrOfTokens(user1.address)).to.equal(1);
          expect(await contract.connect(user3).nrOfWhitelistedAccounts()).to.equal(1);
          expect(await contract.connect(user4).nrOfReservedTokens()).to.equal(3);
          const newBalance = await provider.getBalance(user1.address);
          const newContractBalance = await provider.getBalance(contract.address);
          const balanceDiff = oldBalance.sub(newBalance);
          const contractBalanceDiff = newContractBalance.sub(oldContractBalance);
          expect(balanceDiff.sub(exactValue).abs()).to.be.below(ethers.utils.parseEther('0.003')); // because of gas fees
          expect(contractBalanceDiff).to.equal(exactValue);
          expect(await contract.connect(user5).tokenURI(1)).to.equal("ipfs://link-to-default-json-blob");
          expect(await contract.connect(user5).tokenURI(2)).to.equal("ipfs://link-to-default-json-blob");
          expect(await contract.connect(user5).tokenURI(3)).to.equal("ipfs://link-to-default-json-blob");
      });

      it(`[reserveTokens] success scenario when whitelisting condition is lifted (${test.stageName} stage)`, async () => {
          const provider = waffle.provider;

          await makeOperator(user5);
          const operator = user5;
          await contract.connect(operator).preMint(2);

          await goToStage(test.stage);
          // must fail as the user is not whitelisted
          {
              expect(await contract.connect(user3).nrOfWhitelistedAccounts()).to.equal(0);
              expect(await contract.connect(user4).nrOfReservedTokens()).to.equal(0);
              expect(await contract.connect(user1).canReserveWithoutBeingWhitelisted()).to.equal(false);
              expect(await contract.connect(user3).whitelistedNrOfTokens(user2.address)).to.equal(0);
              await expect(contract.connect(user2).reserveTokens(3, { value: ethers.utils.parseEther("2") })).to.be.revertedWith("arteQArtDrop: not a whitelisted account");
          }
          // lifting the whitelisting condition
          {
              const taskId = await getApprovedTask();
              const call = contract.connect(admin1).setCanReserveWithoutBeingWhitelisted(taskId, true);
              const tx = await call;
              const receipt = await tx.wait();
              expect(receipt.logs.length).to.equal(2);
              await expect(call).to.emit(adminContract, "TaskFinalized").withArgs(contract.address, admin1.address, taskId);
              await expect(call).to.emit(contract, "CanReserveWithoutBeingWhitelistedChanged").withArgs(admin1.address, taskId, true);
              expect(await contract.connect(user1).canReserveWithoutBeingWhitelisted()).to.equal(true);
          }
          // now it must succeed
          {
              expect(await contract.connect(user5).tokenURI(1)).to.equal("ipfs://link-to-default-json-blob");
              expect(await contract.connect(user5).tokenURI(2)).to.equal("ipfs://link-to-default-json-blob");
              await expect(contract.connect(user5).tokenURI(3)).to.be.revertedWith("arteQArtDrop: token id does not exist");
              expect(await contract.connect(user3).nrOfWhitelistedAccounts()).to.equal(0);
              expect(await contract.connect(user4).nrOfReservedTokens()).to.equal(0);
              expect(await contract.connect(user1).canReserveWithoutBeingWhitelisted()).to.equal(true);
              expect(await contract.connect(user3).whitelistedNrOfTokens(user2.address)).to.equal(5);
              await contract.connect(user2).reserveTokens(3, { value: ethers.utils.parseEther("2") });
              expect(await contract.connect(user3).nrOfWhitelistedAccounts()).to.equal(0);
              expect(await contract.connect(user4).nrOfReservedTokens()).to.equal(3);
              expect(await contract.connect(user3).whitelistedNrOfTokens(user2.address)).to.equal(2);
              expect(await contract.connect(user5).tokenURI(1)).to.equal("ipfs://link-to-default-json-blob");
              expect(await contract.connect(user5).tokenURI(2)).to.equal("ipfs://link-to-default-json-blob");
              expect(await contract.connect(user5).tokenURI(3)).to.equal("ipfs://link-to-default-json-blob");
          }
          // must fail when asking for another 3 drops
          {
              await expect(contract.connect(user2).reserveTokens(3, { value: ethers.utils.parseEther("2") })).to.be.revertedWith("arteQArtDrop: exceeding the reservation allowance");
          }
          // now it must succeed
          {
              await expect(contract.connect(user5).tokenURI(4)).to.be.revertedWith("arteQArtDrop: token id does not exist");
              await expect(contract.connect(user5).tokenURI(5)).to.be.revertedWith("arteQArtDrop: token id does not exist");
              expect(await contract.connect(user3).nrOfWhitelistedAccounts()).to.equal(0);
              expect(await contract.connect(user4).nrOfReservedTokens()).to.equal(3);
              expect(await contract.connect(user3).whitelistedNrOfTokens(user2.address)).to.equal(2);
              await contract.connect(user2).reserveTokens(2, { value: ethers.utils.parseEther("2") });
              expect(await contract.connect(user3).nrOfWhitelistedAccounts()).to.equal(0);
              expect(await contract.connect(user4).nrOfReservedTokens()).to.equal(5);
              expect(await contract.connect(user3).whitelistedNrOfTokens(user2.address)).to.equal(5); // the wallet is allowed to buy again
              expect(await contract.connect(user5).tokenURI(4)).to.equal("ipfs://link-to-default-json-blob");
              expect(await contract.connect(user5).tokenURI(5)).to.equal("ipfs://link-to-default-json-blob");
          }
      });
    });


    it('[reserveTokensForAccounts] must fail when called by a non-operator account', async () => {
        const call = contract.connect(user1).reserveTokensForAccounts([user5.address], [2]);
        await expect(call).to.be.revertedWith("arteQArtDrop: not an operator account");
    });

    [{ stage: LOCKED_STAGE,       stageName: 'locked'       },
     { stage: WHITELISTING_STAGE, stageName: 'whitelisting' },
    ].forEach((test) => {
        it(`[reserveTokensForAccounts] must fail when called in ${test.stageName} stage`, async () => {
            await makeOperator(user1);
            await goToStage(test.stage);
            const call = contract.connect(user1).reserveTokensForAccounts([user5.address], [2]);
            await expect(call).to.be.revertedWith("arteQArtDrop: only callable in reservation and distribution stage");
        });
    });

    [{ stage: RESERVATION_STAGE,  stageName: 'reservation'  },
     { stage: DISTRIBUTION_STAGE, stageName: 'distribution' }
    ].forEach((test) => {
      it(`[reserveTokensForAccounts] must fail when empty arrays are passed (${test.stageName} stage)`, async () => {
          await makeOperator(user1);
          await goToStage(test.stage);
          let call = contract.connect(user1).reserveTokensForAccounts([], []);
          await expect(call).to.be.revertedWith("arteQArtDrop: zero length");
          call = contract.connect(user1).reserveTokensForAccounts([user5.address], []);
          await expect(call).to.be.revertedWith("arteQArtDrop: zero length");
          call = contract.connect(user1).reserveTokensForAccounts([], [2]);
          await expect(call).to.be.revertedWith("arteQArtDrop: zero length");
      });

      it(`[reserveTokensForAccounts] must fail when arrays having different lengths are passed (${test.stageName} stage)`, async () => {
          await makeOperator(user1);
          await goToStage(test.stage);
          const call = contract.connect(user1).reserveTokensForAccounts([user2.address, user3.address], [1, 3, 2]);
          await expect(call).to.be.revertedWith("arteQArtDrop: different lengths");
      });

      it(`[reserveTokensForAccounts] must fail when one of the accounts is zero address (${test.stageName} stage)`, async () => {
          const operator = await whitelistAccountAndReturnOperator(user1, 4);
          await goToStage(test.stage);
          expect(await contract.connect(operator).whitelistedNrOfTokens(user1.address)).to.equal(4);
          const call = contract.connect(operator).reserveTokensForAccounts([user1.address, zeroAddress], [4, 3]);
          await expect(call).to.be.revertedWith("arteQArtDrop: cannot be zero address");
      });

      it(`[reserveTokensForAccounts] must fail when one of the accounts is not whitelisted (${test.stageName} stage)`, async () => {
          const operator = await whitelistAccountAndReturnOperator(user1, 4);
          await goToStage(test.stage);
          const call = contract.connect(operator).reserveTokensForAccounts([user1.address, user2.address], [4, 3]);
          await expect(call).to.be.revertedWith("arteQArtDrop: not a whitelisted account");
      });

      it(`[reserveTokensForAccounts] success scenario (${test.stageName} stage)`, async () => {
          await whitelistAccountAndReturnOperator(user1, 4);
          const operator = await whitelistAccountAndReturnOperator(user4, 2);

          await contract.connect(operator).preMint(2);
          expect(await contract.connect(user5).tokenURI(1)).to.equal("ipfs://link-to-default-json-blob");
          expect(await contract.connect(user5).tokenURI(2)).to.equal("ipfs://link-to-default-json-blob");
          await expect(contract.connect(user5).tokenURI(3)).to.be.revertedWith("arteQArtDrop: token id does not exist");
          await expect(contract.connect(user5).tokenURI(4)).to.be.revertedWith("arteQArtDrop: token id does not exist");

          await goToStage(test.stage);

          expect(await contract.connect(operator).whitelistedNrOfTokens(user1.address)).to.equal(4);
          expect(await contract.connect(operator).whitelistedNrOfTokens(user4.address)).to.equal(2);
          expect(await contract.connect(user3).nrOfReservedTokens()).to.equal(0);

          const call = contract.connect(operator).reserveTokensForAccounts([user1.address, user4.address], [2, 2]);
          const tx = await call;
          const receipt = await tx.wait();
          expect(receipt.logs.length).to.equal(6);
          await expect(call).to.emit(contract, "Transfer").withArgs(contract.address, user1.address, 1);
          await expect(call).to.emit(contract, "Transfer").withArgs(contract.address, user1.address, 2);
          await expect(call).to.emit(contract, "TokensReserved").withArgs(operator.address, user1.address, 2);
          await expect(call).to.emit(contract, "Transfer").withArgs(contract.address, user4.address, 3);
          await expect(call).to.emit(contract, "Transfer").withArgs(contract.address, user4.address, 4);
          await expect(call).to.emit(contract, "TokensReserved").withArgs(operator.address, user4.address, 2);

          expect(await contract.connect(operator).whitelistedNrOfTokens(user1.address)).to.equal(2);
          expect(await contract.connect(operator).whitelistedNrOfTokens(user4.address)).to.equal(0);
          expect(await contract.connect(user3).nrOfReservedTokens()).to.equal(4);
          expect(await contract.connect(user5).tokenURI(1)).to.equal("ipfs://link-to-default-json-blob");
          expect(await contract.connect(user5).tokenURI(2)).to.equal("ipfs://link-to-default-json-blob");
          expect(await contract.connect(user5).tokenURI(3)).to.equal("ipfs://link-to-default-json-blob");
          expect(await contract.connect(user5).tokenURI(4)).to.equal("ipfs://link-to-default-json-blob");

          {
              const call = contract.connect(operator).reserveTokensForAccounts([user1.address], [3]);
              await expect(call).to.be.revertedWith("arteQArtDrop: exceeding the reservation allowance");
          }
          {
              await expect(contract.connect(user5).tokenURI(5)).to.be.revertedWith("arteQArtDrop: token id does not exist");
              await expect(contract.connect(user5).tokenURI(6)).to.be.revertedWith("arteQArtDrop: token id does not exist");
              expect(await contract.connect(operator).whitelistedNrOfTokens(user1.address)).to.equal(2);
              const call = contract.connect(operator).reserveTokensForAccounts([user1.address], [2]);
              const tx = await call;
              const receipt = await tx.wait();
              expect(receipt.logs.length).to.equal(3);
              await expect(call).to.emit(contract, "Transfer").withArgs(contract.address, user1.address, 5);
              await expect(call).to.emit(contract, "Transfer").withArgs(contract.address, user1.address, 6);
              await expect(call).to.emit(contract, "TokensReserved").withArgs(operator.address, user1.address, 2);
              expect(await contract.connect(operator).whitelistedNrOfTokens(user1.address)).to.equal(0);
              expect(await contract.connect(user3).nrOfReservedTokens()).to.equal(6);
              expect(await contract.connect(user5).tokenURI(5)).to.equal("ipfs://link-to-default-json-blob");
              expect(await contract.connect(user5).tokenURI(6)).to.equal("ipfs://link-to-default-json-blob");
          }
      });

      it(`[reserveTokensForAccounts] success scenario when whitelisting condition is lifted (${test.stageName} stage)`, async () => {
          const provider = waffle.provider;

          await makeOperator(user1);
          const operator = user1;

          await contract.connect(operator).preMint(2);
          expect(await contract.connect(user5).tokenURI(1)).to.equal("ipfs://link-to-default-json-blob");
          expect(await contract.connect(user5).tokenURI(2)).to.equal("ipfs://link-to-default-json-blob");
          await expect(contract.connect(user5).tokenURI(3)).to.be.revertedWith("arteQArtDrop: token id does not exist");
          await expect(contract.connect(user5).tokenURI(4)).to.be.revertedWith("arteQArtDrop: token id does not exist");
          await expect(contract.connect(user5).tokenURI(5)).to.be.revertedWith("arteQArtDrop: token id does not exist");

          await goToStage(test.stage);
          // must fail as the user is not whitelisted
          {
              expect(await contract.connect(user3).nrOfWhitelistedAccounts()).to.equal(0);
              expect(await contract.connect(user4).nrOfReservedTokens()).to.equal(0);
              expect(await contract.connect(user1).canReserveWithoutBeingWhitelisted()).to.equal(false);
              expect(await contract.connect(user3).whitelistedNrOfTokens(user2.address)).to.equal(0);
              await expect(contract.connect(operator).reserveTokensForAccounts([user2.address], [3])).to.be.revertedWith("arteQArtDrop: not a whitelisted account");
          }
          // lifting the whitelisting condition
          {
              const taskId = await getApprovedTask();
              const call = contract.connect(admin1).setCanReserveWithoutBeingWhitelisted(taskId, true);
              const tx = await call;
              const receipt = await tx.wait();
              expect(receipt.logs.length).to.equal(2);
              await expect(call).to.emit(adminContract, "TaskFinalized").withArgs(contract.address, admin1.address, taskId);
              await expect(call).to.emit(contract, "CanReserveWithoutBeingWhitelistedChanged").withArgs(admin1.address, taskId, true);
              expect(await contract.connect(user1).canReserveWithoutBeingWhitelisted()).to.equal(true);
          }
          // now it must succeed
          {
              expect(await contract.connect(user3).nrOfWhitelistedAccounts()).to.equal(0);
              expect(await contract.connect(user4).nrOfReservedTokens()).to.equal(0);
              expect(await contract.connect(user1).canReserveWithoutBeingWhitelisted()).to.equal(true);
              expect(await contract.connect(user3).whitelistedNrOfTokens(user2.address)).to.equal(5);
              await contract.connect(operator).reserveTokensForAccounts([user2.address], [3]);
              expect(await contract.connect(user3).nrOfWhitelistedAccounts()).to.equal(0);
              expect(await contract.connect(user4).nrOfReservedTokens()).to.equal(3);
              expect(await contract.connect(user3).whitelistedNrOfTokens(user2.address)).to.equal(2);
              expect(await contract.connect(user5).tokenURI(1)).to.equal("ipfs://link-to-default-json-blob");
              expect(await contract.connect(user5).tokenURI(2)).to.equal("ipfs://link-to-default-json-blob");
              expect(await contract.connect(user5).tokenURI(3)).to.equal("ipfs://link-to-default-json-blob");
          }
          // must fail when asking for another 3 drops
          {
              await expect(contract.connect(operator).reserveTokensForAccounts([user2.address], [3])).to.be.revertedWith("arteQArtDrop: exceeding the reservation allowance");
          }
          // now it must succeed
          {
              await expect(contract.connect(user5).tokenURI(4)).to.be.revertedWith("arteQArtDrop: token id does not exist");
              await expect(contract.connect(user5).tokenURI(5)).to.be.revertedWith("arteQArtDrop: token id does not exist");
              expect(await contract.connect(user3).nrOfWhitelistedAccounts()).to.equal(0);
              expect(await contract.connect(user4).nrOfReservedTokens()).to.equal(3);
              expect(await contract.connect(user3).whitelistedNrOfTokens(user2.address)).to.equal(2);
              await contract.connect(operator).reserveTokensForAccounts([user2.address], [2]);
              expect(await contract.connect(user3).nrOfWhitelistedAccounts()).to.equal(0);
              expect(await contract.connect(user4).nrOfReservedTokens()).to.equal(5);
              expect(await contract.connect(user3).whitelistedNrOfTokens(user2.address)).to.equal(5); // the wallet is allowed to buy again
              expect(await contract.connect(user5).tokenURI(4)).to.equal("ipfs://link-to-default-json-blob");
              expect(await contract.connect(user5).tokenURI(5)).to.equal("ipfs://link-to-default-json-blob");
          }
      });
    });

    it('[updateTokenURIs] must fail when called by a non-operator account', async () => {
        const call = contract.connect(user1).updateTokenURIs([1], ['ipfs://new-link-for-token-1']);
        await expect(call).to.be.revertedWith("arteQArtDrop: not an operator account");
    });

    [{ stage: LOCKED_STAGE,       stageName: 'locked'       },
     { stage: WHITELISTING_STAGE, stageName: 'whitelisting' },
     { stage: RESERVATION_STAGE,  stageName: 'reservation'  }
    ].forEach((test) => {
        it(`[updateTokenURIs] must fail when called in ${test.stageName} stage`, async () => {
            await makeOperator(user1);
            await goToStage(test.stage);
            const call = contract.connect(user1).updateTokenURIs([1], ['ipfs://new-link-for-token-1']);
            await expect(call).to.be.revertedWith("arteQArtDrop: only callable in distribution stage");
        });
    });

    it('[updateTokenURIs] must fail when empty arrays are passed', async () => {
        await makeOperator(user1);
        await goToStage(DISTRIBUTION_STAGE);
        let call = contract.connect(user1).updateTokenURIs([], []);
        await expect(call).to.be.revertedWith("arteQArtDrop: zero length");
        call = contract.connect(user1).updateTokenURIs([1], []);
        await expect(call).to.be.revertedWith("arteQArtDrop: zero length");
        call = contract.connect(user1).updateTokenURIs([], ['ipfs://link']);
        await expect(call).to.be.revertedWith("arteQArtDrop: zero length");
    });

    it('[updateTokenURIs] must fail when arrays having different lengths are passed', async () => {
        await makeOperator(user1);
        await goToStage(DISTRIBUTION_STAGE);
        const call = contract.connect(user1).updateTokenURIs([1, 2], ['ipfs://link']);
        await expect(call).to.be.revertedWith("arteQArtDrop: different lengths");
    });

    it('[updateTokenURIs] must fail when token id 0 is used', async () => {
        await whitelistAccountAndReturnOperator(user1, 4);
        const operator = await whitelistAccountAndReturnOperator(user4, 2);
        await goToStage(RESERVATION_STAGE);
        await contract.connect(operator).reserveTokensForAccounts([user1.address, user4.address], [4, 2]);
        await goToStage(DISTRIBUTION_STAGE);
        const call = contract.connect(operator).updateTokenURIs(
            [1, 2, 0, 3],
            ['ipfs://link1', 'ipfs://link2', 'ipfs://link3', 'ipfs://link4']
        );
        await expect(call).to.be.revertedWith("arteQArtDrop: cannot alter genesis token");
    });

    it('[updateTokenURIs] must fail when an empty uri is specified', async () => {
        await whitelistAccountAndReturnOperator(user1, 4);
        const operator = await whitelistAccountAndReturnOperator(user4, 2);
        await goToStage(RESERVATION_STAGE);
        await contract.connect(operator).reserveTokensForAccounts([user1.address, user4.address], [4, 2]);
        await goToStage(DISTRIBUTION_STAGE);
        const call = contract.connect(operator).updateTokenURIs(
            [1, 2, 5, 3],
            ['ipfs://link1', '', 'ipfs://link3', 'ipfs://link4']
        );
        await expect(call).to.be.revertedWith("arteQArtDrop: empty string");
    });

    it('[updateTokenURIs] success scenario', async () => {
        await whitelistAccountAndReturnOperator(user1, 4);
        const operator = await whitelistAccountAndReturnOperator(user4, 2);

        await contract.connect(operator).preMint(2);
        expect(await contract.connect(user5).tokenURI(1)).to.equal("ipfs://link-to-default-json-blob");
        expect(await contract.connect(user5).tokenURI(2)).to.equal("ipfs://link-to-default-json-blob");
        await expect(contract.connect(user5).tokenURI(3)).to.be.revertedWith("arteQArtDrop: token id does not exist");
        await expect(contract.connect(user5).tokenURI(4)).to.be.revertedWith("arteQArtDrop: token id does not exist");

        await goToStage(RESERVATION_STAGE);
        await contract.connect(operator).reserveTokensForAccounts([user1.address, user4.address], [4, 2]);
        await goToStage(DISTRIBUTION_STAGE);
        expect(await contract.connect(user5).tokenURI(1)).to.equal("ipfs://link-to-default-json-blob");
        expect(await contract.connect(user5).tokenURI(2)).to.equal("ipfs://link-to-default-json-blob");
        expect(await contract.connect(user5).tokenURI(3)).to.equal("ipfs://link-to-default-json-blob");
        expect(await contract.connect(user5).tokenURI(4)).to.equal("ipfs://link-to-default-json-blob");
        expect(await contract.connect(user5).tokenURI(5)).to.equal("ipfs://link-to-default-json-blob");
        const call = contract.connect(operator).updateTokenURIs(
            [1, 2, 5, 3],
            ['ipfs://link1', 'ipfs://link2', 'ipfs://link5', 'ipfs://link3']
        );
        const tx = await call;
        const receipt = await tx.wait();
        expect(receipt.logs.length).to.equal(4);
        await expect(call).to.emit(contract, "TokenURIChanged").withArgs(operator.address, 1, 'ipfs://link1');
        await expect(call).to.emit(contract, "TokenURIChanged").withArgs(operator.address, 2, 'ipfs://link2');
        await expect(call).to.emit(contract, "TokenURIChanged").withArgs(operator.address, 5, 'ipfs://link5');
        await expect(call).to.emit(contract, "TokenURIChanged").withArgs(operator.address, 3, 'ipfs://link3');
        expect(await contract.connect(user5).tokenURI(1)).to.equal("ipfs://link1");
        expect(await contract.connect(user5).tokenURI(2)).to.equal("ipfs://link2");
        expect(await contract.connect(user5).tokenURI(3)).to.equal("ipfs://link3");
        expect(await contract.connect(user5).tokenURI(4)).to.equal("ipfs://link-to-default-json-blob");
        expect(await contract.connect(user5).tokenURI(5)).to.equal("ipfs://link5");
    });

    it('[transferTo] must fail when the amount is zero', async () => {
        const operator = await whitelistAccountAndReturnOperator(user1, 4);
        const call = contract.connect(operator).transferTo(museum.address, 0);
        await expect(call).to.be.revertedWith("arteQArtDrop: cannot transfer zero");
    });

    it('[transferTo] must fail when the address is zero', async () => {
        const operator = await whitelistAccountAndReturnOperator(user1, 4);
        const call = contract.connect(operator).transferTo(zeroAddress, ethers.utils.parseEther("0.1"));
        await expect(call).to.be.revertedWith("arteQArtDrop: target cannot be zero");
    });

    it('[transferTo] must fail when the amount is exceeding the balance', async () => {
        const operator = await whitelistAccountAndReturnOperator(user1, 4);
        await goToStage(RESERVATION_STAGE);
        await contract.connect(user1).reserveTokens(1, { value: ethers.utils.parseEther("0.6") });
        {
            const call = contract.connect(operator).transferTo(museum.address, ethers.utils.parseEther("0.6000001"));
            await expect(call).to.be.revertedWith("arteQArtDrop: transfer more than balance");
        }
        {
            const call = contract.connect(operator).transferTo(museum.address, ethers.utils.parseEther("0.7"));
            await expect(call).to.be.revertedWith("arteQArtDrop: transfer more than balance");
        }
    });

    [{ stage: LOCKED_STAGE       , stageName: 'locked'       },
     { stage: WHITELISTING_STAGE , stageName: 'whitelisting' },
     { stage: RESERVATION_STAGE  , stageName: 'reservation'  },
     { stage: DISTRIBUTION_STAGE , stageName: 'distribution' },
    ].forEach((test) => {
        it(`[transferTo] success scenario in ${test.stageName} stage`, async () => {
            const provider = waffle.provider;

            const operator = await whitelistAccountAndReturnOperator(user1, 4);
            await goToStage(RESERVATION_STAGE);
            const oldContractBalance = await provider.getBalance(contract.address);
            await contract.connect(user1).reserveTokens(1, { value: ethers.utils.parseEther("0.6") });

            const newContractBalance = await provider.getBalance(contract.address);
            const contractBalanceDiff = newContractBalance.sub(oldContractBalance);
            expect(contractBalanceDiff).to.equal(ethers.utils.parseEther("0.5"));

            await goToStage(test.stage);

            {
                const oldMuseumBalance = await provider.getBalance(museum.address);

                const taskId = await getApprovedTask();
                const call = contract.connect(operator).transferTo(museum.address, ethers.utils.parseEther("0.35"));
                const tx = await call;
                const receipt = await tx.wait();
                expect(receipt.logs.length).to.equal(1);
                await expect(call).to.emit(contract, "Withdrawn").withArgs(operator.address, museum.address, ethers.utils.parseEther("0.35"));

                const newMuseumBalance = await provider.getBalance(museum.address);
                const museumBalanceDiff = newMuseumBalance.sub(oldMuseumBalance);
                expect(museumBalanceDiff).to.equal(ethers.utils.parseEther("0.35"));

                const newContractBalance = await provider.getBalance(contract.address);
                const contractBalanceDiff = newContractBalance.sub(oldContractBalance);
                expect(contractBalanceDiff).to.equal(ethers.utils.parseEther("0.15"));
            }
        });
    });
});
