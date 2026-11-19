$env:NODE_OPTIONS = "--max-old-space-size=4096"
npx tsc --noEmit
exit $LASTEXITCODE
