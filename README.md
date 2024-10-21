# Photomancer WLED Scripts

A loose collection of scripts that I use to make provisioning WLED devices easier.

# Prerequisites

If you don't already have `nvm` installed, you can install it
by running the following command, or visit https://github.com/nvm-sh/nvm

```shell
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
```

From the root of the project, run the following command to install the correct version of node:

```shell
nvm install
nvm use
npm install
```

The `esptool` is used to upload the configuration file to the WLED device.
On macos, install with:

```shell
brew install esptool
```

# Scripts

## configure-wled.ts

The main script used to provision WLED devices. This script will upload the configuration
file to the WLED device via USB.

Basic usage:

```shell
./configure-wled.ts dig2go \
                    --apSsid MyWledDevice \
                    --ledCount 200 \
                    --brightness 255 \
                    --maxMa 2000 \
                    --startupPreset 3
```

The config and preset templates are stored in `data/configs`.
