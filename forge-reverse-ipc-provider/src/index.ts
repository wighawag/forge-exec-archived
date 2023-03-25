import type {EIP1193ProviderWithoutEvents} from 'eip-1193';
import {ReverseIPCProvider} from './ReverseIPCProvider';

export function execute(func: (provider: EIP1193ProviderWithoutEvents) => Promise<void>) {
	const provider = new ReverseIPCProvider(func);
	provider.serve();
}
