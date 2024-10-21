#!/usr/bin/env ./node_modules/.bin/ts-node-esm --experimental-specifier-resolution=node

import { connectToAp, scanAccessPoints } from './util/scan-access-points';
import { appStep, fail } from './util/general';
import * as inquirer from 'inquirer';
import { lookForWled } from './util/wled-util';
import { exec } from 'child_process';

(async () => {
  const aps = await appStep(
    'Scanning APs',
    async () => {
      const aps = await scanAccessPoints();

      if (aps.length === 0) {
        fail('No WLED access points found');
      }

      return aps;
    },
    (aps) => `Found ${aps.length}`,
  );

  // console.info(JSON.stringify(
  //     aps,
  //     (key: string, value: any) => value?.["type"] === "Buffer" ? undefined : value,
  //     2
  // ));

  const selectedAp =
    aps[
      aps.length === 1
        ? 0
        : (
            await inquirer.prompt([
              {
                type: 'list',
                name: 'ssidIndex',
                message: 'Select access point',
                choices: aps.map((it, index) => ({
                  value: index,
                  name: it.ssid,
                })),
              },
            ])
          ).ssidIndex
    ];

  await appStep(
    'Connecting to ' + selectedAp.ssid,
    async () =>
      (await connectToAp(selectedAp.ssid, 'wled1234')) ||
      fail('Could not connect'),
  );

  await appStep(
    'Looking for WLED',
    async () => (await lookForWled()) || fail('Could not connect'),
  );

  await appStep('Opening browser', async () => exec('open 4.3.2.1'));

  console.info('');
})();
