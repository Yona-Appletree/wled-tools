#!/usr/bin/env ./node_modules/.bin/ts-node-esm

import { listSerialPorts } from './src/util/serial-util';
import { useFirstOrChoose } from './src/util/console-util';
import { appStep, fail, runShell } from './src/util/general';
import * as fs from 'fs';

(async () => {
  const configName = process.argv[2];

  if (!configName) {
    fail(`Usage ${process.argv[0]} <config-name>`);
  }

  const serialPort = await useFirstOrChoose(
    'Found single serial port',
    'Choose a serial port',
    await listSerialPorts(),
    (it) => it,
  );

  const configDir = `configs/${configName}`;
  fs.mkdirSync(configDir, { recursive: true });

  await appStep('Dumping littlefs', () =>
    runShell(
      `esptool/bin/esptool.py --port "${serialPort}" --baud 115200 --before default_reset --after hard_reset read_flash 0x310000 0xF0000 "${configDir}/wled_littlefs.bin"`,
    ),
  );

  await appStep('Extracting littlefs', () =>
    runShell(
      `bin/mklittlefs -u "${configDir}/fs" "${configDir}/wled_littlefs.bin"`,
    ),
  );
})();
