#!/bin/bash
set -e
cd -- "$(dirname -- "$0")"
if command -v code >/dev/null 2>&1; then
  code --new-window --extensionDevelopmentPath="$PWD" "$PWD"
elif [ -x '/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code' ]; then
  '/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code' --new-window --extensionDevelopmentPath="$PWD" "$PWD"
else
  echo 'Install Visual Studio Code from https://code.visualstudio.com, then try again.'
  read -r -p 'Press Return to close. '
  exit 1
fi
