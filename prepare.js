#!/usr/bin/env node
const fs = require('fs');
if (fs.existsSync("node_modules/forge-exec-ipc-client")) {
    fs.chmodSync("node_modules/forge-exec-ipc-client/bin/forge-exec-ipc-client", "u+x");
} else {
    console.error(`Please install "forge-exec-ipc-client", this contains the executable needed for forge-exec to operate`)
}