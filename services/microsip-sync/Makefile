.DEFAULT_GOAL := help
UNIT := $(abspath $(dir $(lastword $(MAKEFILE_LIST))))
DOTNET := docker run --rm -v "$(UNIT):/src" -v vegyfresh-dotnet-nuget:/root/.nuget -w /src mcr.microsoft.com/dotnet/sdk:10.0 dotnet
CLI := dotnet/Cli/Microsip.Sync.csproj
TESTS := dotnet/Tests/Microsip.Sync.Tests.csproj
.PHONY: help install build lint check-types test check run reference-check
help:
	@printf '%s\n' 'Targets: install build lint check-types test check run reference-check' 'run: ARGS="once --config sync.local.json"'
install:
	$(DOTNET) restore $(CLI)
build check-types:
	$(DOTNET) build $(CLI) -c Release
lint:
	$(DOTNET) format $(CLI) --verify-no-changes --verbosity quiet
	$(DOTNET) format $(TESTS) --verify-no-changes --verbosity quiet
test:
	$(DOTNET) run --project $(TESTS) -c Release
check: lint check-types test build
run:
	docker run --rm -v "$(UNIT):/src" -v vegyfresh-dotnet-nuget:/root/.nuget -v vegyfresh-microsip-locks:/microsip-locks -e MICROSIP_SYNC_LOCK_DIR=/microsip-locks -e MICROSIP_SYNC_API_TOKEN -e MICROSIP_SYNC_TOKEN_FILE -w /src mcr.microsoft.com/dotnet/sdk:10.0 dotnet run --project $(CLI) -- $(ARGS)
reference-check:
	$(MAKE) -f Makefile.reference check
