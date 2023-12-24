#!/usr/bin/env sh

NAME=$1

# Abort if no name given
if [ -z "$NAME" ]
then
    echo "No name given"
    exit 1
fi

# Make the directory
mkdir -p $NAME

# Generate the filename
FILENAME="$NAME/dumped.bin"

# Do the read
esptool.py --baud 115200 --before default_reset --after hard_reset read_flash 0x310000 0xF0000 $FILENAME

# Decode the file
mklittlefs/mklittlefs -u "$NAME/contents" "$FILENAME"