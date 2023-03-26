import * as ipcModule from '@achrinza/node-ipc';
const ipc = ipcModule.default?.default || ipcModule.default || ipcModule; // fix issue with cjs
import fs from 'node:fs';
import {EIP1193ProviderWithoutEvents, EIP1193Request, EIP1193TransactionData} from 'eip-1193';
import {AbiCoder} from 'ethers';

const logPath = './.ipc.log'; // `.ipc_${process.pid}.log`
const access = fs.createWriteStream(logPath, {flags: 'a'});
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

	constructor(protected script: (provider: EIP1193ProviderWithoutEvents) => Promise<void>, socketID: string) {
		this.socketID = socketID;
	}

	serve() {
		setInterval(() => console.log(`!!! pid: ${process.pid}`), 20000);

		ipc.config.logger = (...args) => console.log(`!!!IPC`, ...args);
		// ipc.config.logger = () => {};
		ipc.config.retry = 1500;
		ipc.config.delimiter = '\n';
		ipc.config.rawBuffer = true;

		try {
			ipc.serve(this.socketID, this.onServing.bind(this));
			ipc.server.start();
		} catch (err) {
			console.log(`!!!IPC ERROR`, err);
			process.exit(1);
		}

		ipc.server.on('error', (err) => {
			console.log(`!!!IPC ERROR`, err);
			process.exit(1);
		});
	}

	onServing() {
		console.log(`!!! serving...`);
		ipc.server.on('data', this.onMessage.bind(this));
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
		const data = response.toString('utf8').slice(0, -1);

		console.log(`!!! MESSAGE from client`);

		if (data.startsWith('terminate:')) {
			console.error(`!!! ${data.slice(10)}`);
			process.exit(1);
		} else if (data.startsWith('0x')) {
			if (!this.resolve) {
				this.executeScript();
				// console.error(`!!! ERRRO no request to resolve`);
				// must be the first message, we can execute
			} else {
				console.error('!!! RESOLVING PREVIOUS REQUEST');
				this.resolve(data);
				this.resolve = undefined;
			}
		} else {
			console.error(`!!! invalid response, need to start with "terminate", or "0x": ${data}`);
		}
	}

	stop() {
		if (this.socket) {
			const request = AbiCoder.defaultAbiCoder().encode(['uint256', 'bytes'], [0, '0x']);
			ipc.server.emit(this.socket, request + `\n`);
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
			ipc.server.emit(this.socket, withEnvelope + `\n`);
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
