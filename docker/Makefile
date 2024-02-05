.PHONEY: gridql-test db-events-test queue-events-test test build

gridql-test:
	$(MAKE) -C gridql test

db-events-test:
	$(MAKE) -C db-events test

queue-events-test:
	$(MAKE) -C queue-events test

test: gridql-test db-events-test

