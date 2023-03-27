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
// console.time('PROCESS');

function exitProcess(errorCode?: number, alwaysInstant?: boolean) {
	if (alwaysInstant) {
		process.exit(errorCode);
	} else {
		// setTimeout(() => process.exit(errorCode), 100);
		process.exit(errorCode);
	}
}

export type ExecuteReturnResult = string | void | {types: string[]; values: any[]};
export type ExecuteFunction<T extends ExecuteReturnResult> = (provider: EIP1193ProviderWithoutEvents) => T | Promise<T>;

export class ReverseIPCProvider<T extends ExecuteReturnResult> {
	socketID: string;
	socket: any;
	resolve: ((response: any) => void) | undefined;

	constructor(protected script: ExecuteFunction<T>, socketID: string) {
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
			exitProcess(1, true);
		}

		ipc.server.on('error', (err) => {
			console.log(`!!!IPC ERROR`, err);
			exitProcess(1, true);
		});
	}

	onServing() {
		console.log(`!!! serving...`);
		ipc.server.on('data', this.onMessage.bind(this));
	}

	abort(err: any) {
		console.error(`!!! AN ERROR HAPPEN IN THE SCRIPT`);
		console.error(`!!! ${err}`);
		console.timeEnd('PROCESS');
		exitProcess(1);
	}

	returnResult(v: T) {
		console.error(`!!! THE SCRIPT ENDED WITH: ${JSON.stringify(v)}`);
		// console.timeEnd('PROCESS');

		if (this.socket) {
			let data = '0x';
			if (v) {
				if (typeof v === 'string') {
					if (!v.startsWith('0x')) {
						throw new Error(
							`if you return a string, it needs to be an hex string (prepended with 0x) that represent abi encoded data.`
						);
					} else {
						data = v;
					}
				} else if (v.types && v.values) {
					data = AbiCoder.defaultAbiCoder().encode(v.types, v.values);
				} else {
					throw new Error(
						`If you do not return a string, you must return a {types, values} object that is used to abi encode.`
					);
				}
			}

			const request = AbiCoder.defaultAbiCoder().encode(['uint256', 'bytes'], [0, data]);
			ipc.server.emit(this.socket, request + `\n`);
			exitProcess();
		} else {
			// TODO error
			console.error(`!!! NO SOCKET`);
			exitProcess(1);
		}
	}

	executeScript() {
		console.error('!!! EXECUTING SCRIPT');
		try {
			const promiseOrResult = this.script(this);
			if (promiseOrResult instanceof Promise) {
				promiseOrResult
					.then((v) => {
						this.returnResult(v);
					})
					.catch((err) => {
						this.abort(err);
					});
			} else {
				this.returnResult(promiseOrResult);
			}
		} catch (err) {
			this.abort(err);
		}
	}

	onMessage(response, socket) {
		this.socket = socket;
		const data = response.toString('utf8').slice(0, -1);

		console.log(`!!! MESSAGE from client`);

		if (data.startsWith('terminate:')) {
			// TODO good terminate ?
			console.error(`!!! TERMINATING: ${data.slice(10)}`);
			exitProcess(1);
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
			console.error(`!!! INVALID RESPONSE, need to start with "terminate", or "0x": ${data}`);
		}
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
