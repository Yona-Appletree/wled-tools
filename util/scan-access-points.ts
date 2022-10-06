import { exec } from "child_process";
import * as plist from "plist";

export async function scanAccessPoints(
	includeLikelyEspOnly: boolean = true
): Promise<Array<AccessPointInfo>> {
	return new Promise<Array<AccessPointInfo>>((resolve, reject) => {
		function doScan() {
			exec("airport --xml -s", (error, stdout, stderr) => {
				if (stdout.trim().length === 0) {
					// Sometimes airport cli returns nothing. Just have to try again.
					setTimeout(doScan, 50);
				} else {
					const rawApList = plist.parse(stdout) as unknown as Array<RawAccessPointInfo>;

					resolve(rawApList.map(it => ({
						ssid: it.SSID_STR,
						mac: it.BSSID,
						raw: it,
						isLikelyEsp32: it.RSN_IE?.IE_KEY_RSN_MCIPHER === 2 && it["80211D_IE"]?.IE_KEY_80211D_COUNTRY_CODE === "CN"
					})).filter(it => !includeLikelyEspOnly || it.isLikelyEsp32));
				}
			})
		}

		doScan();
	});
}

export async function connectToAp(
	ssid: string,
	password: string
) {
	return new Promise<boolean>((resolve, reject) => {
		exec(`networksetup -setairportnetwork en0 "${ssid}" "${password}"`, (error, stdout, stderr) => {
			const allOutput = stdout + "\n" + stderr;

			if (allOutput.includes("Could not join")) {
				resolve(false);
			} else {
				resolve(true);
			}
		})
	});
}

export interface AccessPointInfo {
	ssid: string;
	mac: string;
}

interface IEKEY80211DCHANINFOARRAY {
	IE_KEY_80211D_FIRST_CHANNEL: number;
	IE_KEY_80211D_MAX_POWER: number;
	IE_KEY_80211D_NUM_CHANNELS: number;
}

interface _80211DIE {
	IE_KEY_80211D_CHAN_INFO_ARRAY: IEKEY80211DCHANINFOARRAY[];
	IE_KEY_80211D_COUNTRY_CODE: string;
}

interface EXTCAPS {
	BSS_TRANS_MGMT: number;
}

interface MCSSET {
	type: string;
	data: number[];
}

interface HTCAPSIE {
	AMPDU_PARAMS: number;
	ASEL_CAPS: number;
	CAPS: number;
	EXT_CAPS: number;
	MCS_SET: MCSSET;
	TXBF_CAPS: number;
}

interface HTBASICMCSSET {
	type: string;
	data: number[];
}

interface HTIE {
	HT_BASIC_MCS_SET: HTBASICMCSSET;
	HT_DUAL_BEACON: boolean;
	HT_DUAL_CTS_PROT: boolean;
	HT_LSIG_TXOP_PROT_FULL: boolean;
	HT_NON_GF_STAS_PRESENT: boolean;
	HT_OBSS_NON_HT_STAS_PRESENT: boolean;
	HT_OP_MODE: number;
	HT_PCO_ACTIVE: boolean;
	HT_PCO_PHASE: boolean;
	HT_PRIMARY_CHAN: number;
	HT_PSMP_STAS_ONLY: boolean;
	HT_RIFS_MODE: boolean;
	HT_SECONDARY_BEACON: boolean;
	HT_SECONDARY_CHAN_OFFSET: number;
	HT_SERVICE_INT: number;
	HT_STA_CHAN_WIDTH: boolean;
	HT_TX_BURST_LIMIT: boolean;
}

interface IE {
	type: string;
	data: number[];
}

interface RSNIE {
	IE_KEY_RSN_AUTHSELS: number[];
	IE_KEY_RSN_MCIPHER: number;
	IE_KEY_RSN_UCIPHERS: number[];
	IE_KEY_RSN_VERSION: number;
}

interface SSID {
	type: string;
	data: number[];
}

interface SUPPORTEDMCSSET {
	type: string;
	data: number[];
}

interface VHTCAPS {
	INFO: number;
	SUPPORTED_MCS_SET: SUPPORTEDMCSSET;
}

interface VHTOP {
	BASIC_MCS_SET: number;
	CHANNEL_CENTER_FREQUENCY_SEG0: number;
	CHANNEL_CENTER_FREQUENCY_SEG1: number;
	CHANNEL_WIDTH: number;
}

interface RawAccessPointInfo {
	"80211D_IE": _80211DIE;
	AGE: number;
	AP_MODE: number;
	BEACON_INT: number;
	BSSID: string;
	CAPABILITIES: number;
	CHANNEL: number;
	CHANNEL_FLAGS: number;
	EXT_CAPS: EXTCAPS;
	HT_CAPS_IE: HTCAPSIE;
	HT_IE: HTIE;
	IE: IE;
	NOISE: number;
	RATES: number[];
	RSN_IE: RSNIE;
	RSSI: number;
	SSID: SSID;
	SSID_STR: string;
	VHT_CAPS: VHTCAPS;
	VHT_OP: VHTOP;
}
