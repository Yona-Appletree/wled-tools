#!/usr/bin/env ./node_modules/.bin/ts-node-esm

import { listSerialPorts } from './util/serial-util';
import { useFirstOrChoose } from './util/console-util';
import { appStep, fail, runShell } from './util/general';
import * as fs from 'fs';
import { WledApiJsonConfig } from './util/wled-config.api';
import {
  UInt8,
  WledStoredPresetInfo,
  WledStoredPresetsFile,
} from './util/wled-preset-api';
import { max } from 'rxjs';

async function main() {
  const configName = process.argv[2];

  const params: Array<{ def: CustomParamDef; value: string | null }> =
    paramDefinitions.map((param) => {
      const index = process.argv.findIndex((it) => it == '--' + param.name);

      return {
        def: param,
        value: index > 0 ? process.argv[index + 1] : null,
      };
    });

  const usageStr =
    `Usage ${process.argv[1]} <config-name>` +
    paramDefinitions
      .filter((it) => it.required)
      .map((it) => `\n\t --${it.name} <value>`)
      .join('') +
    paramDefinitions
      .filter((it) => !it.required)
      .map((it) => `\n\t[--${it.name} <value>]`)
      .join('');

  // Handle missing config name
  if (!configName) {
    fail(usageStr);
  }

  // Check for any invalid parameter names
  process.argv
    .filter(
      (it) =>
        it.startsWith('--') &&
        !paramDefinitions.find((def) => def.name === it.substring(2)),
    )
    .forEach((it) => {
      fail('Unsupported parameter: ' + it);
    });

  // Check parameters are valid
  params.forEach((param) => {
    if (param.def.required && param.value === null) {
      fail(
        'Required parameter not provided: ' +
          param.def.name +
          '\n\n' +
          usageStr,
      );
    }

    if (param.value !== null) {
      const errorMsg = param.def.validate(param.value);

      if (errorMsg) {
        fail('Parameter ' + param.def.name + ' invalid: ' + errorMsg);
      }
    }
  });

  const serialPort = await useFirstOrChoose(
    'Found single serial port',
    'Choose a serial port',
    await listSerialPorts(),
    (it) => it,
  );

  if (!serialPort) {
    fail('No serial port found');
  }

  const configDir = `configs/${configName}`;

  if (!fs.statSync(configDir)?.isDirectory()) {
    fail('Invalid config: ' + configName);
  }

  // =================================================================================================================
  // Read configs

  const configJson = JSON.parse(
    fs.readFileSync(`${configDir}/cfg.json`).toString(),
  ) as WledApiJsonConfig;
  const presetsJson = JSON.parse(
    fs.readFileSync(`${configDir}/presets.json`).toString(),
  ) as WledStoredPresetsFile;

  if (!configJson) {
    fail('Failed to read cfg.json');
  }

  if (!presetsJson) {
    fail('Failed to read presets.json');
  }

  // =================================================================================================================
  // Update configs

  params.forEach((param) => {
    if (param.value !== null) {
      param.def.update(param.value, configJson, Object.values(presetsJson));
    }
  });

  // =================================================================================================================
  // Write configs

  const wifiName =
    params.find((it) => it.def.name === 'ssid')?.value || 'Unknown';

  const buildDir = `./config-builds/${configName}-${wifiName.replaceAll(/[^a-z0-9]/gi, '_')}-${Date.now()}`;

  fs.mkdirSync(buildDir, { recursive: true });

  fs.writeFileSync(`${buildDir}/cfg.json`, JSON.stringify(configJson));
  fs.writeFileSync(`${buildDir}/presets.json`, JSON.stringify(presetsJson));
  fs.writeFileSync(`${buildDir}/wsec.json`, JSON.stringify(wifiSecuritySec()));

  // =================================================================================================================
  // Package littlefs

  await appStep('Packaging littlefs', () =>
    runShell(
      // Note that the size is required on newer versions of WLED apparently. Ran into issues
      // in Dec 2023
      `./mklittlefs/mklittlefs -c "${buildDir}" --size 983040 "${buildDir}/littlefs.bin"`,
    ),
  );

  // =================================================================================================================
  // Upload to board

  await appStep('Uploading littlefs', () =>
    runShell(
      `esptool.py --port "${serialPort}" --baud 115200 --before default_reset --after hard_reset write_flash 0x310000 "${buildDir}/littlefs.bin"`,
    ),
  );
}

interface CustomParamDef {
  name: string;
  description: string;
  required: boolean;
  validate: (value: string) => null | string;
  update: (
    value: string,
    config: WledApiJsonConfig,
    presets: WledStoredPresetInfo[],
  ) => void;
}

// =====================================================================================================================
// Parameter Definitions

const paramDefinitions: CustomParamDef[] = [
  // -------------------------------------------------------------------------------------------------------------------
  {
    name: 'ledCount',
    required: false,
    description: 'Number of LEDs on the board',
    validate: (value) =>
      isNaN(parseInt(value)) ? 'LED Count must be a number' : null,
    update: (value, config, presets) => {
      const ledCount = parseInt(value);

      presets.forEach((preset, index) => {
        if (preset.seg?.[0]) {
          preset.seg[0].stop = ledCount;
        }
      });

      config.hw.led.ins[0].len = ledCount;
    },
  },

  {
    name: 'ssid',
    required: true,
    description: 'Wifi access point name (SSID)',
    validate: (value) => {
      if (!value) return 'required';
      if (value.length < 2 || value.length > 32)
        return 'must be between 2 and 32 characters';
      return null;
    },
    update: (value, config, presets) => {
      config.ap.ssid = value;
    },
  },

  {
    name: 'brightness',
    required: false,
    description: 'Default brightness for LEDs',

    validate: (value) => {
      const num = parseInt(value);
      if (isNaN(num)) return 'must be a number';

      if (num < 1 || num > 255) return 'must be between 1 and 255';

      return null;
    },
    update: (value, config, presets) => {
      const brightness = parseInt(value);

      presets.forEach((preset, index) => {
        preset.bri = brightness as UInt8;
      });
    },
  },

  {
    name: 'maxMa',
    required: false,
    description: 'Maximum milliamps for current limiter. Zero to disable.',

    validate: (value) => {
      const num = parseInt(value);
      if (isNaN(num)) return 'must be a number';

      return null;
    },
    update: (value, config, presets) => {
      const maxMa = parseInt(value);

      if (maxMa == 0) {
        config.hw.led.ledma = 0;
      } else {
        config.hw.led.ledma = 55;
        config.hw.led.maxpwr = maxMa;
      }
    },
  },

  {
    name: 'pin',
    required: false,
    description: 'GPIO pin for LEDs',

    validate: (value) => {
      const num = parseInt(value);
      if (isNaN(num)) return 'must be a number';

      return null;
    },

    update: (value, config, presets) => {
      const pin = parseInt(value);

      config.hw.led.ins[0].pin = [pin];
    },
  },

  {
    name: 'preset',
    required: false,
    description: 'Preses at startup',

    validate: (value) => {
      const num = parseInt(value);
      if (isNaN(num)) return 'must be a number';

      return null;
    },

    update: (value, config, presets) => {
      const presetIndex = parseInt(value);

      config.def.ps = presetIndex;
    },
  },
];

export function wifiSecuritySec() {
  return {
    nw: {
      ins: [
        {
          psk: '',
        },
      ],
    },
    ap: {
      psk: 'wled1234',
    },
    if: {
      blynk: {
        token: '',
      },
      mqtt: {
        psk: '',
      },
      hue: {
        key: 'api',
      },
    },
    ota: {
      pwd: 'wledota',
      lock: false,
      'lock-wifi': false,
      aota: true,
    },
  };
}

main();
