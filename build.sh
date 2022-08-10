#!/usr/bin/env bash
# BUILD.sh

if ! [ -x "$(command -v node)" ]; then
  echo "Error: Node.js is not installed. Please install Node v16.x."
  exit 1
fi

if ! node -v | grep -q "v16"; then
  echo "Node.js version is not >= 16. Please upgrade node first."
  exit 1
fi

if ! command -v pnpm > /dev/null; then
  echo "pnpm is not installed. Please install pnpm first (npm i --location=global pnpm)"
  exit 1
fi

# Clean dist directories
rm -rf ./dist/ public/dist/

cd public || exit 1

# Install dependencies (public)
pnpm install || exit 1
pnpm run build || exit 1

cd ../server/ || exit 1

# Install dependencies (server)
pnpm install || exit 1

# Create a .mjs file
node build.js || exit 1

# Fix uws library
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

# Build package
npx --yes caxa -i . --output "$TMP_DIR"/App"$suffix" -- "{{caxa}}/node_modules/.bin/node" "{{caxa}}/app.mjs"
echo "Deploying to $TMP_DIR"
