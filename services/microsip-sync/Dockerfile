FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY services/microsip-sync/dotnet ./dotnet
RUN dotnet publish dotnet/Cli/Microsip.Sync.csproj -c Release -o /app --no-self-contained
FROM mcr.microsoft.com/dotnet/runtime:10.0
WORKDIR /app
COPY --from=build /app ./
ENV MICROSIP_SYNC_LOCK_DIR=/microsip-locks
ENTRYPOINT ["dotnet", "Microsip.Sync.dll"]
CMD ["run", "--config", "/config/sync.json"]
