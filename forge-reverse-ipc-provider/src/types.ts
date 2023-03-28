import type {AbiParameterToPrimitiveType} from 'abitype';

export type TransactionRequest = {
	from: AbiParameterToPrimitiveType<{type: 'address'}>;
	to?: AbiParameterToPrimitiveType<{type: 'address'}>;
	data?: AbiParameterToPrimitiveType<{type: 'bytes'}>;
	value?: AbiParameterToPrimitiveType<{type: 'uint256'}>;
};

export type BalanceRequest = {
	account: AbiParameterToPrimitiveType<{type: 'address'}>;
};

export type ForgeRequest =
	// | {
	// 		type: 'terminate';
	// 		data: AbiParameterToPrimitiveType<{type: 'bytes'}>;
	//   }
	| {
			type: 'transaction';
			data: TransactionRequest;
	  }
	| {
			type: 'balance';
			data: BalanceRequest;
	  };

export type ForgeProvider = {
	request(request: ForgeRequest): Promise<unknown>;
};
