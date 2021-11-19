.PHONY: install
install:
	npm install

.PHONY: build
build:
	npx hardhat compile

.PHONY: test
test:
	npx hardhat test test/arteQTokens.js
	npx hardhat test test/ARTEQ.js
	npx hardhat test test/uniswap.js


