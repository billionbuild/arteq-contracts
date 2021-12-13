require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-vyper");
require('solidity-coverage');

module.exports = {
    solidity: {
        version: "0.8.0",
        settings: {
            optimizer: {
                enabled: true,
                runs: 2000,
                details: {
                    yul: true,
                    yulDetails: {
                        stackAllocation: true,
                        optimizerSteps: "dhfoDgvulfnTUtnIf"
                    }
                }
            }
        }
    },
    vyper: {
        version: "0.1.0b14",
    }
};
