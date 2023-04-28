#!/usr/bin/env node
const fs = require('fs');
if (fs.existsSync("node_modules/forge-exec-ipc-client")) {
    fs.chmodSync("node_modules/forge-exec-ipc-client/bin/forge-exec-ipc-client", 0764);
    fs.mkdirSync("node_modules/.bin", {recursive: true});
    fs.copyFileSync("node_modules/forge-exec-ipc-client/bin/forge-exec-ipc-client", "node_modules/.bin")
    fs.chmodSync("node_modules/.bin/forge-exec-ipc-client", 0764);
} else {
    console.error(`Please install "forge-exec-ipc-client", this contains the executable needed for forge-exec to operate`)
}