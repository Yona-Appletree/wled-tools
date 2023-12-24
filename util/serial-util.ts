import * as fs from "fs";
import { promisify } from "util";


export async function listSerialPorts() {
    return (await promisify(fs.readdir)("/dev"))
        .filter(it => it.includes("cu.wchusbserial") || it.includes("cu.usbserial") || it.includes("cu.usbmodem"))
        .map(it => "/dev/" + it);
}
