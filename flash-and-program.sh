#!/usr/bin/env bash

BOARD_TYPE=$1
CONFIG_DIR=$2
DESIRED_SSID=$3
EXISTING_SSID=$4

if [ -z "$BOARD_TYPE" ] || [ -z "$CONFIG_DIR" ] || [ -z "$DESIRED_SSID" ] || [ -z "$EXISTING_SSID" ]; then
  echo "Usage $0 <esp32|d1_mini> <config> <new-wifi-name> <existing-wifi-name>"
  echo "Available configs:"
  echo $(ls configs)
  exit
fi

cd $(dirname $0)

pushd ~/devel/opensource/WLED
export PLATFORMIO_UPLOAD_PORT="/dev/$(ls /dev | grep cu.wch)"
pio run -e $BOARD_TYPE -t upload || exit 1
popd

if [ -z "EXISTING_SSID" ]; then
  EXISTING_SSID="WLED-AP"
fi

sleep 4

./upload-config-network.sh "$CONFIG_DIR" "$DESIRED_SSID" "$EXISTING_SSID"
