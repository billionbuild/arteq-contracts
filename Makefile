.PHONY: build
build:
	npx hardhat compile

.PHONY: test
test:
	npx hardhat test

.PHONY: coverage
coverage:
	npx hardhat coverage

.PHONY: clean
clean:
	rm -rf cache
	rm -rf artifacts

.PHONY: node
node:
	npx hardhat node

.PHONY: deploy-localhost
deploy-localhost:
	npx hardhat --network localhost run scripts/deploy-arteq-col1.js

.PHONY: deploy-rinkeby
deploy-rinkeby:
	npx hardhat --network rinkeby run scripts/deploy-arteq-col1.js
