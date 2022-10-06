import * as fs from "fs";
import { promisify } from "util";


export async function listSerialPorts() {
    return (await promisify(fs.readdir)("/dev"))
        .filter(it => it.includes("cu.wchusbserial"))
        .map(it => "/dev/" + it);
}
