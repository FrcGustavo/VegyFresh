.DEFAULT_GOAL := help
UNIT := $(abspath $(dir $(lastword $(MAKEFILE_LIST))))
DOTNET := docker run --rm -v "$(UNIT):/src" -v vegyfresh-dotnet-nuget:/root/.nuget -w /src mcr.microsoft.com/dotnet/sdk:10.0 dotnet
CLI := dotnet/Cli/Microsip.Sync.csproj
TESTS := dotnet/Tests/Microsip.Sync.Tests.csproj
HOST := dotnet/NativeHost/Microsip.NativeHost.csproj
DESKTOP := dotnet/Desktop/Microsip.Sync.Desktop.csproj
.PHONY: help install build lint check-types test check run publish-windows publish-desktop-windows diagnostic-build reference-check
help:
	@printf '%s\n' 'Targets: install build lint check-types test check run publish-windows publish-desktop-windows diagnostic-build reference-check' 'run: ARGS="once --config sync.local.json"'
install:
	$(DOTNET) restore $(CLI)
	$(DOTNET) restore $(DESKTOP)
build check-types:
	$(DOTNET) build $(CLI) -c Release
	$(DOTNET) build $(DESKTOP) -c Release
lint:
	$(DOTNET) format $(CLI) --verify-no-changes --verbosity quiet
	$(DOTNET) format $(TESTS) --verify-no-changes --verbosity quiet
	$(DOTNET) format $(HOST) --verify-no-changes --verbosity quiet
	$(DOTNET) format $(DESKTOP) --verify-no-changes --verbosity quiet
test:
	$(DOTNET) run --project $(TESTS) -c Release
check: lint check-types test build
run:
	docker run --rm -v "$(UNIT):/src" -v vegyfresh-dotnet-nuget:/root/.nuget -v vegyfresh-microsip-locks:/microsip-locks -e MICROSIP_SYNC_LOCK_DIR=/microsip-locks -e MICROSIP_SYNC_API_TOKEN -e MICROSIP_SYNC_TOKEN_FILE -w /src mcr.microsoft.com/dotnet/sdk:10.0 dotnet run --project $(CLI) -- $(ARGS)
publish-windows: publish-desktop-windows
	$(DOTNET) publish $(CLI) -c Release -r win-x86 --self-contained true -o /src/artifacts/win-x86/sync
	$(DOTNET) publish $(HOST) -c Release -o /src/artifacts/win-x86/native
	$(DOTNET) publish diagnostic/Microsip.Diagnostic.csproj -c Release -o /src/artifacts/win-x86/diagnostic
publish-desktop-windows:
	mkdir -p "$(UNIT)/artifacts/win-x86"
	@cd "$(UNIT)" && set -eu; \
		stage=$$(mktemp -d artifacts/win-x86/.desktop.XXXXXX); \
		trap 'rm -rf "$$stage"' EXIT; \
		$(DOTNET) publish $(DESKTOP) -c Release -r win-x86 --self-contained true -o "/src/$$stage/app"; \
		cp catalog-import.example.json catalog-snapshot.example.json README.md "$$stage/app/"; \
		(cd "$$stage/app" && zip -qr ../Microsip.Sync.Desktop-win-x86.zip .); \
		mv "$$stage/Microsip.Sync.Desktop-win-x86.zip" artifacts/win-x86/
diagnostic-build:
	$(DOTNET) publish diagnostic/Microsip.Diagnostic.csproj -c Release -o /src/artifacts/win-x86/diagnostic
reference-check:
	$(MAKE) -f Makefile.reference check
