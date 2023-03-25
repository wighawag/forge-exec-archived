import * as ipcModule from '@achrinza/node-ipc';
const ipc = ipcModule.default?.default || ipcModule.default || ipcModule; // fix issue with cjs
import fs from 'node:fs';
import {EIP1193ProviderWithoutEvents, EIP1193Request, EIP1193TransactionData} from 'eip-1193';
import {AbiCoder} from 'ethers';

// import {customAlphabet} from 'nanoid';
// const alphabet = '23456789abcdefghjkmnpqrstuvwxyz';
// const nanoid = customAlphabet(alphabet, 8);
function nanoid() {
	var S4 = function () {
		return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
	};
	return S4() + S4() + '-' + S4() + '-' + S4() + '-' + S4() + '-' + S4() + S4() + S4();
}

const logPath = './.ipc.log'; // `.ipc_${process.pid}.log`
const access = fs.createWriteStream(logPath, {flags: 'a'});
// const oldStdoutWrite = process.stdout.write.bind(process.stdout);
// const oldStderrWrite = process.stdout.write.bind(process.stderr);
if (process.env.FORGE_EXEC_PROCESS_LOGS === '') {
	process.env.FORGE_EXEC_PROCESS_LOGS = undefined;
}
if (!process.env.FORGE_EXEC_PROCESS_LOGS) {
	process.stdout.write = process.stderr.write = access.write.bind(access);
}
console.log(`!!! pid: ${process.pid}`);
console.time('PROCESS');

export class ReverseIPCProvider {
	socketID: string;
	socket: any;
	resolve: ((response: any) => void) | undefined;

	constructor(protected script: (provider: EIP1193ProviderWithoutEvents) => Promise<void>) {
		console.log(`!!! WORLD`);
		this.socketID = 'world'; //nanoid();
		console.log(`!!! socketID: ${this.socketID}`);
	}

	serve() {
		setInterval(() => console.log(`!!! pid: ${process.pid}`), 20000);

		ipc.config.logger = () => {};
		ipc.config.id = this.socketID;
		ipc.config.retry = 1500;

		ipc.serve(this.onServing.bind(this));
		process.send({type: 'acknowledgement'});
		process.on('message', this.onProcessMessage.bind(this));
	}

	onServing() {
		console.log(`!!! serving...`);
		ipc.server.on('message', this.onMessage.bind(this));

		// ipc.server.on('socket.disconnected', function (destroyedSocketID) {
		// 	console.log('!!! client ' + destroyedSocketID + ' has disconnected!');
		// });
		// ipc.server.on('destroy', function (a, b) {
		// 	console.log('!!! destroyed ', a, b);
		// });
		// ipc.server.on('error', function (a, b) {
		// 	console.error('!!! error ', a, b);
		// });
		// ipc.server.on('disconnect', function (a, b) {
		// 	console.log('!!! disconnect ', a, b);
		// });
		// ipc.server.on('data', function (a, b) {
		// 	console.log('!!! data ', a, b);
		// });
	}

	onProcessMessage(parentMessage) {
		console.log(`!!! log messages from parent: ${parentMessage}`);
		const {type} = parentMessage;
		if (type === 'init') {
			ipc.server.start();
			process.send({type: 'init', socket: this.socketID});
		}
	}

	executeScript() {
		console.error('!!! EXECUTING SCRIPT');
		this.script(this)
			.then(() => {
				console.error(`!!! THE SCRIPT ENDED`);
				this.stop();
			})
			.catch((err) => {
				console.error(`!!! AN ERROR HAPPEN IN THE SCRIPT`);
				console.error(`!!! ${err}`);
				console.timeEnd('PROCESS');
				// process.exit(1);
				// give time to log
				setTimeout(() => process.exit(1), 100);
			});
	}

	onMessage(response, socket) {
		this.socket = socket;
		console.log(`!!! MESSAGE from client`, response);

		if (response.type === 'terminate') {
			console.error(`!!! ${response.error}`);
			process.exit(1);
		} else if (response.type === 'response') {
			if (!this.resolve) {
				this.executeScript();
				// console.error(`!!! ERRRO no request to resolve`);
				// must be the first message, we can execute
			} else {
				console.error('!!! RESOLVING PREVIOUS REQUEST');
				this.resolve(response.data);
				this.resolve = undefined;
			}
		} else {
			console.error('!!! invalid responsee');
		}
	}

	stop() {
		if (this.socket) {
			const request = AbiCoder.defaultAbiCoder().encode(['uint256', 'bytes'], [0, '0x']);
			ipc.server.emit(this.socket, 'message', request);
		}

		// console.log(`!!! WE ARE DONE...`);
		console.timeEnd('PROCESS');
		// process.exit();
		// give time to log
		setTimeout(() => process.exit(), 100);
	}

	request(args: EIP1193Request): Promise<any> {
		const promise = new Promise((resolve) => {
			let encodedRequest: {type: number; data: `0x${string}`};
			switch (args.method) {
				case 'eth_sendTransaction':
					encodedRequest = this.eth_sendTransaction(args.params);
					break;
				default:
					throw new Error(`method "${args.method}" not supported`);
			}

			this.resolve = resolve;
			const withEnvelope = AbiCoder.defaultAbiCoder().encode(
				['uint256', 'bytes'],
				[encodedRequest.type, encodedRequest.data]
			);
			ipc.server.emit(this.socket, 'message', withEnvelope);
		});
		return promise;
	}

	eth_sendTransaction([tx]: [EIP1193TransactionData]) {
		const txWithEnvelope = {
			data: AbiCoder.defaultAbiCoder().encode(
				['bytes', 'address', 'uint256'],
				[tx.data, tx.to, tx.value || 0]
			) as `0x${string}`,
			type: 1,
		};
		return txWithEnvelope;
	}
}
