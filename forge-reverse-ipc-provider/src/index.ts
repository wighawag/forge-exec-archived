import type {EIP1193ProviderWithoutEvents} from 'eip-1193';
import {ReverseIPCProvider} from './ReverseIPCProvider';

const args = process.argv.slice(2);
const socketID = args[0];

console.log(`socketID: ${socketID}`);
console.log(`args: "${args.join('" "')}"`);

export function execute(func: (provider: EIP1193ProviderWithoutEvents) => Promise<void>) {
	const provider = new ReverseIPCProvider(func, socketID);
	provider.serve();
}
