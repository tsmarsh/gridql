.PHONY: check-tools install-lerna install-yarn install test coverage release-target queue-events-release db-events-release

VERSION := $(shell node -pe "require('./lerna.json').version")
NAMESPACE := tsmarsh

check-version-exists:
	@curl -s -o /dev/null -w "%{http_code}" https://hub.docker.com/v2/repositories/$(NAMESPACE)/$(REPO)/tags/$(VERSION)/ | grep 404 > /dev/null || echo "Version $(VERSION) already exists on Docker Hub"

check-tools: install-lerna install-yarn install-husky
	@echo "All necessary tools are installed."

install-lerna:
	@which lerna > /dev/null || (echo "Installing Lerna..." && npm install -g lerna)

install-yarn:
	@which yarn > /dev/null || (echo "Installing Yarn..." && npm install -g yarn)

install-husky:
	@which husky > /dev/null || (echo "Installing Husky..." && npm install -g husky)

install: check-tools node_modules

test: install
	yarn test

coverage: .nyc_output

node_modules: check-tools yarn.lock
	yarn install
	@touch node_modules

.nyc_output: test
	yarn coverage:merge
	@touch node_modules

queue-events-test:
	$(MAKE) -C docker queue-events-test

db-events-test:
	$(MAKE) -C docker db-events-test

gridql-test:
	$(MAKE) -C docker gridql-test

release-target:
	docker buildx build --platform linux/amd64,linux/arm64 --file docker/(TARGET)/Dockerfile -t tsmarsh/$(TARGET):$(VERSION) --push .

queue-events-release: queue-events-test
	$(MAKE) release-target TARGET=queue-events

db-events-release: db-events-test
	$(MAKE) release-target TARGET=db-events

gridql-release: gridql-test
	$(MAKE) release-target TARGET=gridql

docker-test: gridql-test db-events-test

docker-release: gridql-test db-events-test gridql-release db-events-release