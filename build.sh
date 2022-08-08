#!/usr/bin/env bash

if ! command -v pnpm > /dev/null; then
  echo "pnpm is not installed. Please install pnpm first (npm i --location=global pnpm)"
  exit 1
fi

rm -rf ./dist/ public/dist/

cd public || exit 1
pnpm install
pnpm run build

cd ..

cd server || exit 1
pnpm install || exit 1

node build.js || exit 1

rm ../dist/uws*.node || exit 1

platform="$(node -p "process.platform")"
echo "platform: $platform"

if [ "$platform" = "linux" ]; then
  suffix=""
elif [ "$platform" = "darwin" ]; then
  suffix=""
elif [ "$platform" = "win32" ]; then
  suffix=".exe"
fi

find ./node_modules -name "uws*$platform*93.node" | sort -u | xargs -I {} cp {} ../dist/

cd ../dist/ || exit 1
TMP_DIR="/tmp/jaaj/"
rm -rf "$TMP_DIR"
mkdir -p "$TMP_DIR"

npx caxa -i . --output "$TMP_DIR"/App"$suffix" -- "{{caxa}}/node_modules/.bin/node" "{{caxa}}/app.mjs"
echo "Deploying to $TMP_DIR"
