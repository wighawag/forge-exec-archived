import type {EIP1193ProviderWithoutEvents} from 'eip-1193';
import {ExecuteReturnResult, ReverseIPCProvider} from './ReverseIPCProvider';

const args = process.argv.slice(2);
const socketID = args[0];

console.log(`socketID: ${socketID}`);
console.log(`args: "${args.join('" "')}"`);

export function execute<T extends ExecuteReturnResult>(
	func: (provider: EIP1193ProviderWithoutEvents) => T | Promise<T>
) {
	const provider = new ReverseIPCProvider(func, socketID);
	provider.serve();
}
