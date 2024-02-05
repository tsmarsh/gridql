.PHONY: check-tools install-lerna install-yarn install test coverage

check-tools: install-lerna install-yarn install-husky
	@echo "All necessary tools are installed."

install-lerna:
	@which lerna > /dev/null || (echo "Installing Lerna..." && npm install -g lerna)

install-yarn:
	@which yarn > /dev/null || (echo "Installing Yarn..." && npm install -g yarn)

install-husky:
	@which husky > /dev/null || (echo "Installing Husky..." && npm install -g husky)

install: node_modules

test: node_modules

coverage: .nyc_output

node_modules: check-tools yarn.lock
	yarn install
	@touch node_modules

.nyc_output: test
	yarn coverage:merge
	@touch node_modules