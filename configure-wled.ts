#!/usr/bin/env npx ts-node --transpile-only

import { listSerialPorts } from './src/util/serial-util.ts';
import { useFirstOrChoose } from './src/util/console-util.ts';
import { appStep, fail, runShell } from './src/util/general.ts';
import * as fs from 'fs';
import { WledApiJsonConfig } from './src/util/wled-config.api.ts';
import {
  UInt8,
  WledStoredPresetInfo,
  WledStoredPresetsFile,
} from './src/util/wled-preset-api.ts';
import { dateFilenamePart } from './src/util/date-filename-part.ts';
import { paths } from './src/util/project-paths.ts';
import path from 'node:path';
import chalk from 'chalk';

async function main() {
  const configName = process.argv[2];

  // ---------------------------------------------------------------------------
  // Parse CLI args

  const params: Array<{ def: CustomParamDef; value: string | null }> =
    paramDefinitions.map((param) => {
      const index = process.argv.findIndex((it) => it == '--' + param.name);

      return {
        def: param,
        value: index > 0 ? process.argv[index + 1] : null,
      };
    });

  const usageStr =
    `Usage ${path.basename(__filename)} <config-name>` +
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
      fail(`Unsupported parameter: ${it}\n\n${usageStr}`);
    });

  // ---------------------------------------------------------------------------
  // Check for esptool.py

  try {
    await runShell('esptool.py --help');
  } catch (e) {
    fail('esptool.py not found. Install on macos with:\n brew install esptool');
  }

  // ---------------------------------------------------------------------------
  // Print config name

  console.info(`${chalk.cyanBright('Using config')}: ${configName}`);

  // ---------------------------------------------------------------------------
  // Select serial port

  const serialPort = await useFirstOrChoose(
    chalk.cyanBright('Using serial port'),
    chalk.cyanBright('Choose a serial port'),
    await listSerialPorts(),
    (it) => it,
  );

  if (!serialPort) {
    fail('No serial port found');
  }

  const configDir = `${paths.configs}/${configName}`;

  if (!fs.statSync(configDir)?.isDirectory()) {
    fail(
      `Invalid config: ${configName}\n` +
        `Must be a directory in ${paths.configs}.\n` +
        `Available configs: ${fs.readdirSync(paths.configs).join(', ')}`,
    );
  }

  // ---------------------------------------------------------------------------
  // Read configs

  const configJson = await readJsonFile<WledApiJsonConfig>(
    `${configDir}/cfg.json`,
  );
  const presetsJson = await readJsonFile<WledStoredPresetsFile>(
    `${configDir}/presets.json`,
  );

  const wsecJson = fs.existsSync(`${configDir}/wsec.json`)
    ? await readJsonFile<WledWsecJson>(`${configDir}/wsec.json`)
    : defaultWifiSecurity();

  const paramContext = {
    config: configJson,
    presets: Object.values(presetsJson),
    wsecJson,
  };

  // ---------------------------------------------------------------------------
  // Validate parameters

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
      const errorMsg = param.def.validate(param.value, paramContext);

      if (errorMsg) {
        fail(`--${param.def.name} ${errorMsg}\nGiven: ${param.value}`);
      }
    }
  });

  // ---------------------------------------------------------------------------
  // Apply parameters

  params.forEach((param) => {
    if (param.value !== null) {
      param.def.update(param.value, paramContext);
    }
  });

  // ---------------------------------------------------------------------------
  // Write configs

  const wifiName =
    params.find((it) => it.def.name === 'apSsid')?.value || 'Unknown';

  const buildDir = path.join(
    paths.configBuilds,
    [
      dateFilenamePart(),
      configName,
      wifiName.replaceAll(/[^a-z0-9]/gi, '_'),
    ].join('-'),
  );

  console.info(
    `${chalk.cyanBright('Build dir')}: ${path.relative('.', buildDir)}`,
  );

  fs.mkdirSync(buildDir, { recursive: true });

  fs.writeFileSync(`${buildDir}/cfg.json`, JSON.stringify(configJson));
  fs.writeFileSync(`${buildDir}/presets.json`, JSON.stringify(presetsJson));
  fs.writeFileSync(`${buildDir}/wsec.json`, JSON.stringify(wsecJson));

  // ---------------------------------------------------------------------------
  // Package littlefs

  await appStep('Packaging littlefs', () =>
    runShell(
      // Note that --size is required for newer versions
      // of WLED, apparently. Ran into issues in Dec 2023
      `./bin/mklittlefs -c "${buildDir}" --size 983040 "${buildDir}/littlefs.bin"`,
    ),
  );

  // ---------------------------------------------------------------------------
  // Upload to board

  await appStep('Uploading littlefs', () =>
    runShell(
      `esptool.py ` +
        `--port "${serialPort}" ` +
        `--baud 115200 ` +
        `--before default_reset ` +
        `--after hard_reset ` +
        `write_flash 0x310000 "${buildDir}/littlefs.bin"`,
    ),
  );

  // ---------------------------------------------------------------------------
  // Done
  console.info();
  console.info(chalk.greenBright('All done, enjoy the glow!'));
  console.info();
}

// =============================================================================
// Parameter Definitions

const paramDefinitions: CustomParamDef[] = [
  // ---------------------------------------------------------------------------
  // LED Count
  {
    name: 'ledCount',
    required: false,
    description: 'Number of LEDs on the board',
    validate: (value) => {
      const parsed = parseInt(value);

      if (isNaN(parsed)) return 'LED Count must be a number';
      if (parsed < 1) return 'LED Count must be greater than 0';

      return null;
    },
    update: (value, { config, presets }) => {
      const ledCount = parseInt(value);

      presets.forEach((preset, index) => {
        if (preset.seg?.[0]) {
          preset.seg[0].stop = ledCount;
        }
      });

      config.hw.led.ins[0].len = ledCount;
    },
  },

  // ---------------------------------------------------------------------------
  // Wifi SSID
  {
    name: 'apSsid',
    required: true,
    description: 'Wifi access point name (SSID)',
    validate: (value) => {
      if (!value) return 'required';
      if (value.length < 2 || value.length > 32)
        return 'must be between 2 and 32 characters';
      return null;
    },
    update: (value, { config, presets }) => {
      config.ap.ssid = value;
    },
  },

  // ---------------------------------------------------------------------------
  // Wifi Password
  {
    name: 'apPassword',
    required: false,
    description: 'Wifi access point password',
    validate: (value) => {
      if (!value) return 'required';
      if (value.length < 8 || value.length > 63)
        return 'must be >= 8 and <= 63 characters';
      return null;
    },
    update: (value, { config, presets, wsecJson }) => {
      wsecJson.ap ??= { psk: value };
      wsecJson.ap.psk = value;
    },
  },

  // ---------------------------------------------------------------------------
  // LED Brightness
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
    update: (value, { config, presets }) => {
      const brightness = parseInt(value);

      presets.forEach((preset, index) => {
        preset.bri = brightness as UInt8;
      });
    },
  },

  // ---------------------------------------------------------------------------
  // Max power in milliamps
  {
    name: 'maxMa',
    required: false,
    description: 'Maximum milliamps for current limiter. Zero to disable.',

    validate: (value) => {
      const num = parseInt(value);
      if (isNaN(num)) return 'must be a number';

      return null;
    },
    update: (value, { config, presets }) => {
      const maxMa = parseInt(value);

      if (maxMa == 0) {
        config.hw.led.ledma = 0;
      } else {
        config.hw.led.ledma = 55;
        config.hw.led.maxpwr = maxMa;
      }
    },
  },

  // ---------------------------------------------------------------------------
  // Hardware pin for LEDs
  {
    name: 'pin',
    required: false,
    description: 'GPIO pin for LEDs',

    validate: (value) => {
      const num = parseInt(value);
      if (isNaN(num)) return 'must be a number';

      return null;
    },

    update: (value, { config, presets }) => {
      const pin = parseInt(value);

      config.hw.led.ins[0].pin = [pin];
    },
  },

  // ---------------------------------------------------------------------------
  // Startup preset
  {
    name: 'startupPreset',
    required: false,
    description: 'Preset to use at startup',

    validate: (value, { presets }) => {
      const num = parseInt(value);
      if (isNaN(num)) return 'must be a number';

      if (num < 1) return 'must be >= 1';
      if (num > presets.length) return 'must be <= ' + presets.length;

      return null;
    },

    update: (value, { config, presets }) => {
      const presetIndex = parseInt(value);

      config.def.ps = presetIndex;
    },
  },
];

interface ParamContext {
  config: WledApiJsonConfig;
  presets: WledStoredPresetInfo[];
  wsecJson: WledWsecJson;
}

interface CustomParamDef {
  name: string;
  description: string;
  required: boolean;
  validate: (value: string, context: ParamContext) => null | string;
  update: (value: string, context: ParamContext) => void;
}

// =============================================================================
// Utility Functions

async function readJsonFile<
  T extends object | string | number | null | boolean,
>(path: string): Promise<T> {
  if (!(await fs.promises.stat(path)).isFile()) {
    fail(`File not found: ${path}`);
  }

  try {
    return JSON.parse(fs.readFileSync(path).toString());
  } catch (e) {
    fail(`Failed to parse ${path}: ${(e as any)?.message}`);
  }
}

export function defaultWifiSecurity(): WledWsecJson {
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

interface WledWsecJson {
  nw?: {
    ins: {
      psk: string;
    }[];
  };
  ap?: {
    psk: string;
  };
  if?: {
    blynk?: {
      token: string;
    };
    mqtt?: {
      psk: string;
    };
    hue?: {
      key: string;
    };
  };
  ota: {
    pwd: string;
    lock: boolean;
    'lock-wifi': boolean;
    aota: boolean;
  };
}

// =============================================================================
// Main invocation

main();
