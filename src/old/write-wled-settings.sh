/opt/homebrew/Cellar/esptool/3.2_1/bin/esptool.py --chip esp32 --baud 230400 --before default_reset --after hard_reset write_flash 0x300000 $1
