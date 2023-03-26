import {AbiCoder} from 'ethers';
import * as ipcModule from '@achrinza/node-ipc';
const ipc = ipcModule.default?.default || ipcModule.default || ipcModule; // fix issue with cjs
import {fork} from 'child_process';
import fs from 'fs';

const logPath = '.executor.log'; // `.executor_${process.pid}.log`
const access = fs.createWriteStream(logPath, {flags: 'a'});
const oldStdoutWrite = process.stdout.write.bind(process.stdout);
// const oldStderrWrite = process.stdout.write.bind(process.stderr);
if (process.env.FORGE_EXECUTOR_LOGS === '') {
	process.env.FORGE_EXECUTOR_LOGS = undefined;
}
if (!process.env.FORGE_EXECUTOR_LOGS) {
	process.stdout.write = process.stderr.write = access.write.bind(access);
}

const args = process.argv.slice(2);

function exitToTest() {
	// oldStdoutWrite(
	// 	'0x00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000002676d000000000000000000000000000000000000000000000000000000000000'
	// );
	oldStdoutWrite(AbiCoder.defaultAbiCoder().encode(Array(args.length).fill('string'), args));
	process.exit();
}

if (args[0] === 'init') {
	console.log('!!! initialization...');
	const socketID = 'world'; // TODO random
	const server = process.env.FORGE_EXECUTOR_LOGS
		? fork(args[1], [socketID])
		: fork(args[1], [socketID], {detached: true, silent: true});
	console.log(`!!! serverPID: ${server.pid}`);
	const encoded = AbiCoder.defaultAbiCoder().encode(['string'], [socketID]);
	// console.log(`!!! ${encoded}`);
	oldStdoutWrite(encoded);
	// console.log(`!!! exiting...`);
	process.exit();
} else {
	ipc.config.logger = (...args) => console.log(`!!!EXECUTOR`, ...args);
	// ipc.config.logger = () => {};
	ipc.config.id = 'executor';
	ipc.config.retry = 1500;
	ipc.config.delimiter = '\n';

	const ipcSocket = args[1];

	if (args[0] === 'exec') {
		ipc.connectTo(ipcSocket, function () {
			ipc.of[ipcSocket].on('connect', function () {
				console.log(`!!! connected to ${ipcSocket}`);
				ipc.of[ipcSocket].emit('message', {type: 'response', data: args[2]});
			});
			ipc.of[ipcSocket].on('disconnect', function () {
				// console.log(`!!! disconnected`);
				// console.error('!!! disconnected from world');
				process.exit(0);
			});
			ipc.of[ipcSocket].on('message', function (encoded) {
				// console.log(`!!! sending encoded data: ${JSON.stringify(encoded)}`);
				oldStdoutWrite(encoded);
				// console.log(`!!! exiting...`);
				process.exit();
			});
		});
	} else if (args[0] === 'terminate') {
		ipc.connectTo(ipcSocket, function () {
			ipc.of[ipcSocket].on('connect', function () {
				ipc.of[ipcSocket].emit('message', {type: 'terminate', error: args[2]});
				oldStdoutWrite('0x');
				process.exit();
			});
			ipc.of[ipcSocket].on('disconnect', function () {
				oldStdoutWrite('failed to terminate');
				process.exit(1);
			});
		});
	} else {
		console.log(`!!! invalid command`);
		process.exit(1);
	}
}
