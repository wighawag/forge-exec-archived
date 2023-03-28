# <h1 align="center"> forge-exec </h1>

**Execute program from forge with a 2-way communication channel between both**

## Installation

Install `forge-exec` as git submodules in your foundry project

```
forge install wighawag/forge-exec
```

Install `forge-ipc-client` on your machine, source code can be found in [forge-ipc-client](./forge-ipc-client/)

```
cargo install forge-ipc-client
```

This tool will allow forge-exec to have a 2-way commincation channel with the program being executed. that was set it apart from basic ffi mechanism.

## Usage

1. Add this import to your script or test:

```solidity
import {Exec} from "forge-exec/Exec.sol";
```

1. Execute an external script:

```solidity
Exec.exexute('./example.js');
```

1. You must enable [ffi](https://book.getfoundry.sh/cheatcodes/ffi.html) in order to use the library. You can either pass the `--ffi` flag to any forge commands you run (e.g. `forge script Script --ffi`), or you can add `ffi = true` to your `foundry.toml` file.

1. In example.js you ll need to create an IPC server to communicate back with forge. We provide a package to handle that for you. You can simply write code like that:

## Javascript

You also need to use [nodejs]()/[npm]() and setup a project

```
npm init
```

and then install `forge-exec-ipc-server` package which will let the script to communicate back with forge

```
npm i -D forge-exec-ipc-server
```

Now you can write your js script this way

```js
import { execute } from "forge-exec-ipc-server";

execute(async (provider) => {
  const response = await provider.request({
    method: "eth_sendTransaction",
    params: [
      {
        from: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        to: "0x0000000000000000000000000000000000000000",
        data: "0x608060405234801561001057600080fd5b5060f78061001f6000396000f3fe6080604052348015600f57600080fd5b5060043610603c5760003560e01c80633fb5c1cb1460415780638381f58a146053578063d09de08a14606d575b600080fd5b6051604c3660046083565b600055565b005b605b60005481565b60405190815260200160405180910390f35b6051600080549080607c83609b565b9190505550565b600060208284031215609457600080fd5b5035919050565b60006001820160ba57634e487b7160e01b600052601160045260246000fd5b506001019056fea2646970667358221220f0cfb2159c518c3da0ad864362bad5dc0715514a9ab679237253d506773a0a1b64736f6c63430008130033",
      },
    ],
  });
  console.log({ response: response });
});
```

for now, only eth_sendTransaction and eth_getBalance is supported

### Example

We have example usage for both [tests](./demo-js/test/Exec.t.sol) and [scripts](./demo-js/script/ExecDemo.s.sol). See [example.js](./demo-js/example.js) in the [demo folder](./demo-js/)

## Rust

`forge-exec` is agnostic to what program you execute, you just need to follow the ipc communication protocol. Here is a very basic example in rust.

## Contributing

Clone this repo and run:

```
forge install
```

Make sure all tests pass, add new ones if needed:

```
forge test
```

## Why?

[Forge scripting](https://book.getfoundry.sh/tutorials/solidity-scripting.html) is becoming more popular. With forge-exec you can run script to deploy contracts and more

## Development

This project uses [Foundry](https://getfoundry.sh). See the [book](https://book.getfoundry.sh/getting-started/installation.html) for instructions on how to install and use Foundry.
