cd $(dirname $0)

function main() {
  ###########################################################################
  # Argument handling

  CONFIG_DIR=$1
  DESIRED_SSID=$2
  DESIRED_EXISTING_SSID=$3

  if  [ -z "$CONFIG_DIR" ] && [ -z "$DESIRED_SSID"]; then
    echo "Usage $0 <config> <new-wifi-name> <existing-wifi-name>"
    echo "Available configs:"
    echo $(ls configs)
    exit
  fi

  INPUT_CONFIG_PATH=configs/$CONFIG_DIR/cfg.json
  INPUT_PRESETS_PATH=configs/$CONFIG_DIR/presets.json

  ###########################################################################
  # Handle desired access point

  if ! [ -z "$DESIRED_EXISTING_SSID" ]; then
    echo "Connecting to network $DESIRED_EXISTING_SSID..."

    if ! connectToAp "$DESIRED_EXISTING_SSID" ; then
      fail "Could not connect"
    fi

    sleep 2
  fi

  ###########################################################################
  # Look for WLED server

  TRY_COUNT=100
  echo
  for i in $(seq 1 $TRY_COUNT); do
    echo -ne "\rLooking for WLED ("$i"s)... "

    if curl -m2 4.3.2.1 &>/dev/null; then
      echo "Success!"
      break
    fi

    sleep 1
  done

  if ! curl -m2 4.3.2.1 &>/dev/null; then
    fail "Can't find WLED"
  fi

  ###########################################################################
  # Upload presets file

  echo "Uploading presets.json..."
  curl 'http://4.3.2.1/upload'\
    -i -X POST \
    -H 'Content-Type: multipart/form-data' \
    -F 'data=@'$INPUT_PRESETS_PATH'; filename="/presets.json"' \
    --compressed \
    --insecure &>/dev/null || fail "Could not upload presets.json"

  ###########################################################################
  # Generate and upload config file

  MODIFIED_CONFIG_PATH=$(mktemp)
  cat $INPUT_CONFIG_PATH | jq '.ap.ssid="'$DESIRED_SSID'"' > $MODIFIED_CONFIG_PATH
  echo $MODIFIED_CONFIG_PATH

  echo "Uploading cfg.json..."
  curl 'http://4.3.2.1/upload'\
    -i -X POST \
    -H 'Content-Type: multipart/form-data' \
    -F 'data=@'$MODIFIED_CONFIG_PATH'; filename="/cfg.json"' \
    --compressed \
    --insecure &>/dev/null || fail "Could not upload cfg.json"

  ###########################################################################
  # Reset and look for new wifi network

  echo "Resetting..."
  curl 'http://4.3.2.1/reset' &>/dev/null || fail "Could not reset"

  # Wait a moment to let the reset take place
  sleep 2

  TRY_COUNT=20
  echo
  for i in $(seq 1 $TRY_COUNT); do

    echo -ne "\rSearching for new network ("$i"s)... "

    # Note the spaces in the grep to match the whole string in the padded output of airport command
    NEW_SSID=$(airport -s | grep " $DESIRED_SSID ")

    if ! [ -z "$NEW_SSID" ]; then
      echo
      echo "SUCCESS!"
      echo
      echo "$(date +"%Y-%m-%d %H:%M:%S"): Programmed a $CONFIG_DIR as $DESIRED_SSID"
      echo "$(date +"%Y-%m-%d %H:%M:%S"): Programmed a $CONFIG_DIR as $DESIRED_SSID" >> lunarglow-programming-log.txt
      echo
      exit 0
    fi

    sleep 1
  done

  echo
  fail "Could not find new network: $DESIRED_SSID"
}

function fail() {
  echo
  echo "Failed: $1"
  echo
  exit 1
}

function connectToAp() {
  AP_NAME=$1
  AP_PASS=$2

  TRY_COUNT=100

  for i in $(seq 1 $TRY_COUNT); do
    CURRENT_AP=$(airport -I | awk -F' SSID: '  '/ SSID: / {print $2}')

    if [ "$CURRENT_AP" == "$AP_NAME" ]; then
      echo "Connected to $AP_NAME"
      return 0
    fi

    networksetup -setairportnetwork en0 "$AP_NAME" "$AP_PASS" 2>&1

    sleep 1
  done

  return -1
}

function scanAccessPoints() {
    AP_LIST=""

    TRY_COUNT=100

    for i in $(seq 1 $TRY_COUNT); do
      AP_LIST=$(airport -s | sed -E 's/ *(.*) +  -.*/\1/' | sed 's/ *$//')

      if ! [ -z "AP_LIST" ]; then
        echo "$AP_LIST"
        return 0
      fi

      sleep 1
    done

    fail "Could not scan wifi networks"
    return -1
}

main "$@"
