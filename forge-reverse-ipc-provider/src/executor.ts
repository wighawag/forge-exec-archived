import {AbiCoder} from 'ethers';
import ipc from 'node-ipc';
import {fork} from 'child_process';
import fs from 'fs';

const logPath = '.executor.log'; // `.executor_${process.pid}.log`
const access = fs.createWriteStream(logPath);
const oldStdoutWrite = process.stdout.write.bind(process.stdout);
// const oldStderrWrite = process.stdout.write.bind(process.stderr);
if (!process.env.FORGE_EIP_1193_LOGS) {
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
	// console.log('!!! initialization...');
	const server = fork(args[1], {detached: true, silent: true}); // OPTION
	console.log(`!!! serverPID: ${server.pid}`);
	server.on('message', (childMessage: {type: string; socket: string}) => {
		if (childMessage.type === 'acknowledgement') {
			// console.log(`!!! fork acknowledged`);
			server.send({type: 'init'});
		} else if (childMessage.type === 'init') {
			const socketID = childMessage.socket;
			console.log(`!!! connected to ${socketID} !`);
			const encoded = AbiCoder.defaultAbiCoder().encode(['string'], [socketID]);
			// console.log(`!!! ${encoded}`);
			oldStdoutWrite(encoded);
			// console.log(`!!! exiting...`);
			process.exit();
		}
	});
} else {
	ipc.config.logger = () => {};
	ipc.config.id = 'executor';
	ipc.config.retry = 1500;

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
