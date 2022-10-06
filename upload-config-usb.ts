#!/usr/bin/env ./node_modules/.bin/ts-node-esm

import { listSerialPorts } from "./util/serial-util";
import { useFirstOrChoose } from "./util/console-util";
import { appStep, fail, runShell } from "./util/general";
import * as fs from "fs";
import { WledApiJsonConfig } from "./util/wled-config.api";
import { WledStoredPresetsFile } from "./util/wled-preset-api";

(async () => {
    const configName = process.argv[2];
    const wifiName = process.argv[3];
    const ledCount = parseInt(process.argv[4]) || 200;

    if (! configName || ! wifiName || ! ledCount) {
        fail(`Usage ${process.argv[0]} <config-name> <wifi-name> <led-count>`);
    }

    const serialPort = await useFirstOrChoose(
        "Found single serial port",
        "Choose a serial port",
        await listSerialPorts(),
        it => it
    );

    const configDir = `configs/${configName}`;

    if (! fs.statSync(configDir)?.isDirectory()) {
        fail("Invalid config: " + configName);
    }

    // =================================================================================================================
    // Read configs

    const configJson = JSON.parse(fs.readFileSync(`${configDir}/cfg.json`).toString()) as WledApiJsonConfig;
    const presetsJson = JSON.parse(fs.readFileSync(`${configDir}/presets.json`).toString()) as WledStoredPresetsFile;

    if (! configJson) {
        fail("Failed to read cfg.json");
    }

    if (! presetsJson) {
        fail("Failed to read presets.json");
    }

    // =================================================================================================================
    // Update configs

    configJson.ap.ssid = wifiName;
    console.info(`Updated wifi name to "${wifiName}"`);

    Object.keys(presetsJson).forEach(presetId => {
        const preset = presetsJson[presetId];
        if (preset.seg?.[0]) {
            console.info(`Updated preset ${presetId} led count to ` + ledCount);
            preset.seg[0].len = ledCount;
        }
    });

    configJson.hw.led.ins[0].len = ledCount;
    console.info(`Updated led output 0 led count to ${ledCount}`);

    // =================================================================================================================
    // Write configs

    const buildDir = `./config-builds/${configName}-${wifiName.replaceAll(/[^a-z0-9]/gi, "_")}-${Date.now()}`

    fs.mkdirSync(buildDir, { recursive: true });

    fs.writeFileSync(`${buildDir}/cfg.json`, JSON.stringify(configJson));
    fs.writeFileSync(`${buildDir}/presets.json`, JSON.stringify(presetsJson));
    fs.writeFileSync(`${buildDir}/wsec.json`, JSON.stringify(wifiSecuritySec()))

    // =================================================================================================================
    // Package littlefs

    await appStep(
        "Packaging littlefs",
        () => runShell(
            `./mklittlefs/mklittlefs -c "${buildDir}" "${buildDir}/littlefs.bin"`
        ),
    );

    // =================================================================================================================
    // Upload to board

    await appStep(
        "Uploading littlefs",
        () => runShell(
            `esptool/bin/esptool.py --port "${serialPort}" --baud 115200 --before default_reset --after hard_reset write_flash 0x310000 "${buildDir}/littlefs.bin"`
        ),
    );
})();

export function wifiSecuritySec() {
    return {
        "nw": {
            "ins": [
                {
                    "psk": ""
                }
            ]
        },
        "ap": {
            "psk": "wled1234"
        },
        "if": {
            "blynk": {
                "token": ""
            },
            "mqtt": {
                "psk": ""
            },
            "hue": {
                "key": "api"
            }
        },
        "ota": {
            "pwd": "wledota",
            "lock": false,
            "lock-wifi": false,
            "aota": true
        }
    };
}
