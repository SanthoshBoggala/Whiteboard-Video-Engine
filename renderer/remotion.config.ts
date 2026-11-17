import {Config} from "@remotion/cli/config";
import {existsSync} from "node:fs";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);

// Remotion's bundled headless Chrome fails to start on some macOS setups; prefer an installed Chrome.
const mac = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const chrome = process.env.CHROME_PATH || (existsSync(mac) ? mac : undefined);
if (chrome) Config.setBrowserExecutable(chrome);
