import * as ipcModule from '@achrinza/node-ipc';
const ipc = ipcModule.default?.default || ipcModule.default || ipcModule; // fix issue with cjs
import fs from 'node:fs';
import {encodeAbiParameters} from 'viem';
import type {AbiParameter, AbiParametersToPrimitiveTypes, Narrow} from 'abitype';
import {BalanceRequest, ForgeProvider, ForgeRequest, TransactionRequest} from './types';

const logPath = './.ipc.log'; // `.ipc_${process.pid}.log`
const access = fs.createWriteStream(logPath, {flags: 'a'});
if (process.env.FORGE_EXEC_PROCESS_LOGS === '') {
	process.env.FORGE_EXEC_PROCESS_LOGS = undefined;
}
if (!process.env.FORGE_EXEC_PROCESS_LOGS) {
	process.stdout.write = process.stderr.write = access.write.bind(access);
}
// TODO use LOG for logging debug / error message about ReverseIPCProvider
// then we can have a special console.log / error function to write log into forge

// function LOG(type: 'error' | 'log', message: string, ...extraMessage: string[]) {
// 	const msg = message + extraMessage && extraMessage.length > 0 ? ',' + extraMessage.join(',') : '';
// 	if (process.env.FORGE_EXEC_PROCESS_LOGS) {
// 		console.log(msg);
// 	} else {
// 		access.write(msg);
// 	}
// }
console.log(`!!! pid: ${process.pid}`);
// console.time('PROCESS');

function exitProcess(errorCode?: number, alwaysInstant?: boolean) {
	try {
		ipc.server.stop();
	} catch (err) {
		console.error(err);
	}

	if (alwaysInstant) {
		process.exit(errorCode);
	} else {
		// give time for log to show up in log file
		setTimeout(() => process.exit(errorCode), 100);
		// process.exit(errorCode);
	}
}

process.on('uncaughtException', function (err) {
	console.error(err);
	try {
		ipc.server.stop();
	} catch (err) {
		console.error(err);
	}
	setTimeout(() => process.exit(1), 100);
});

export type ToDecode<TParams extends readonly AbiParameter[] | readonly unknown[]> = {
	types: Narrow<TParams>;
	values: TParams extends readonly AbiParameter[] ? AbiParametersToPrimitiveTypes<TParams> : never;
};
export type ExecuteReturnResult<TParams extends readonly AbiParameter[] | readonly unknown[] = AbiParameter[]> =
	| string
	| void
	| ToDecode<TParams>;

export type ExecuteFunction<T extends ExecuteReturnResult> = (provider: ForgeProvider) => T | Promise<T>;

type ResolveFunction<T = any> = (response: T) => void;

export type EncodedRequest = {type: number; data: `0x${string}`};

export type Handler<T> = {request: EncodedRequest; resolution: (v: string) => Promise<T>};

export type QueueElement<T> = {resolve: ResolveFunction<T>; handler: Handler<T>};

export class ReverseIPCProvider<T extends ExecuteReturnResult> {
	socketID: string;
	socket: any;
	resolveQueue: QueueElement<any>[] | undefined;
	timeout: NodeJS.Timeout | undefined;

	constructor(protected script: ExecuteFunction<T>, socketID: string) {
		this.socketID = socketID;
	}

	onTimeout() {
		console.error(`!!! TIMEOUT`);
		exitProcess(1, true);
	}

	stopTimeout() {
		clearTimeout(this.timeout);
	}
	resetTimeout() {
		if (this.timeout) {
			clearTimeout(this.timeout);
		}
		// 20 second timeout
		// TODO config for debugging purpose might be useful
		this.timeout = setTimeout(this.onTimeout.bind(this), 20000);
	}

	serve() {
		// we start the timeout on start
		this.resetTimeout();

		setInterval(() => console.log(`!!! pid: ${process.pid}`), 20000);

		ipc.config.logger = (...args) => console.log(`!!!IPC`, ...args);
		// ipc.config.logger = () => {};
		ipc.config.retry = 1500;
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
			let data: `0x${string}` = '0x';
			if (v) {
				if (typeof v === 'string') {
					if (!v.startsWith('0x')) {
						throw new Error(
							`if you return a string, it needs to be an hex string (prepended with 0x) that represent abi encoded data.`
						);
					} else {
						data = v as `0x${string}`;
					}
				} else if (v.types && v.values) {
					data = encodeAbiParameters(v.types, v.values);
				} else {
					throw new Error(
						`If you do not return a string, you must return a {types, values} object that is used to abi encode.`
					);
				}
			}

			const request = encodeAbiParameters([{type: 'uint256'}, {type: 'bytes'}], [0n, data]);
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

	async resolvePendingRequest(data: any) {
		if (!this.resolveQueue || this.resolveQueue.length === 0) {
			console.error(`RESOLUTION QUEUE IS EMPTY`);
			exitProcess(1, true);
		} else {
			console.log('!!! RESOLVING PREVIOUS REQUEST');
			const next = this.resolveQueue.shift();
			const transformedData = await next.handler.resolution(data);
			next.resolve(transformedData);
			if (this.resolveQueue.length >= 1) {
				this.processPendingRequest();
			}
		}
	}

	processPendingRequest() {
		const next = this.resolveQueue[0];
		const request = encodeAbiParameters(
			[{type: 'uint32'}, {type: 'bytes'}],
			[next.handler.request.type, next.handler.request.data]
		);
		// we restart the timeout
		this.resetTimeout();
		ipc.server.emit(this.socket, request + `\n`);
	}

	onMessage(response, socket) {
		// we stop the timeout on each message we receive.
		// we will restart it on the request made , see
		this.stopTimeout();

		this.socket = socket;
		const data = response.toString('utf8').slice(0, -1);

		console.log(`!!! MESSAGE from client`);

		if (data.startsWith('terminate:')) {
			// TODO good terminate ?
			console.error(`!!! TERMINATING: ${data.slice(10)}`);
			exitProcess(1);
		} else if (data.startsWith('response:')) {
			if (!this.resolveQueue) {
				this.resolveQueue = [];
				this.executeScript();
				// console.error(`!!! ERRRO no request to resolve`);
				// must be the first message, we can execute
			} else {
				this.resolvePendingRequest(data.slice(9));
			}
		} else {
			console.error(`!!! INVALID RESPONSE, need to start with "terminate:", or "response:": ${data}`);
			exitProcess(1);
		}
	}

	request(args: ForgeRequest): Promise<any> {
		const promise = new Promise((resolve) => {
			let handler: Handler<any>;
			switch (args.type) {
				case 'transaction':
					handler = this.eth_sendTransaction(args.data);
					break;
				case 'balance':
					handler = this.eth_getBalance(args.data);
					break;
				default:
					throw new Error(`method "${(args as any).type}" not supported`);
			}

			this.resolveQueue.push({resolve, handler});
			if (this.resolveQueue.length == 1) {
				this.processPendingRequest();
			}
		});
		return promise;
	}

	eth_sendTransaction(tx: TransactionRequest): Handler<any> {
		if (!tx.from) {
			throw new Error(`no from specified ${JSON.stringify(tx)}`);
		}
		const request = {
			data: encodeAbiParameters(
				[{type: 'address'}, {type: 'bytes'}, {type: 'address'}, {type: 'uint256'}],
				[tx.from, tx.data || '0x', tx.to || '0x0000000000000000000000000000000000000000', BigInt(tx.value || 0)]
			) as `0x${string}`,
			type: 1,
		};
		return {
			request,
			resolution: async (v) => {
				// TODO handle normal tx
				if (v === '0x0000000000000000000000000000000000000000') {
					throw new Error(`Could not create contract`);
				}
				return v;
			},
		};
	}

	eth_getBalance(params: BalanceRequest): Handler<any> {
		const request = {
			data: encodeAbiParameters([{type: 'address'}], [params.account]),
			type: 31,
		};
		return {
			request,
			resolution: async (v) => v,
		};
	}
}
