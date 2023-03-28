# forge-ipc-client

Execute a program as a separate process and connect to it via IPC.

Used by forge-exec to establish a 2-way communication channel with [forge](https://github.com/foundry-rs/foundry/tree/master/forge)

Because forge expect ffi output to be given to stdout after program exit, `forge-ipc-client` is executed for every message pair and exit on each reply from the program.

## how does it work?

[forge-exec](https://github.com/wighawag/forge-exec) is used in your forge project and will do the following

- will ffi execute `forge-ipc-client init <program> [...<args>]`
- `forge-ipc-client` (this package) will then execute the program along with the provided argument and create a new process for it
- When doing so it will also apend a randonly generated socket/named-pipe path/name, that we call the `socketID` (prefixed with `ipc:`)
- the program will thus be called via `<program> [...<args>] ipc:<socketID>`
- That program need to create an ipc server to listen on the given `socketID` as soon as it can.
- `forge-ipc-client` will then attempt to connect to that socket/named-pipe for 3 seconds and upon success will print to `stdout` the `socketID` as an abi encoded string and exit.
- forge will pick that up and `forge-exec` will now perform a new ffi call : `forge-ipc-client exec <socketID> 0x`
- `forge-ipc-client` will detect an `exec` as first argument and connect to the ipc server created by the `program`
- Once connected it will send the data argument to it (first call is always `0x`)
- This means that the `program` can (and need to) stay alive and listen for these call
- Upon receiveing the first call `0x` the program should start executing its user code.
- When it need to make a request back to forge it will simply have to reply on the ipc socket established with abi encoded data (see [format](#format) below)
- `forge-ipc-client` will write that to `stdin` on reception and exit immediatly (the `program` continue to run though, unless it execute its last reply (termination))
- `forge-exec` will pick up the data and interpret it as a request. One of this request is to terminate and can include an data the `program` may wish to return.
- if the data was not a termination request, `forge-exec` will execute the request (currently only send_transaction and getBalance is supported) and send that data back
- It send the data back via `forge-ipc-client exec <socketID> <data>`
- this get repeated until the program send the termination request
- On some error case `forge-exec` can also call the `terminate` request to ask the program to stop, this will cause a revert on forge side.
- Currently abi decoding can fails on `forge-exec` side and the program will not be abel to be notified. As such the program should handle a timeout case to stop its ipc server to not hang on os resources.

## ipc-server implementations

While you could write the ipc handling yourself in the program executed by `forge-ipc-client` it is likely you want that abstracted.

There is currentlty one implemented in typescript which abstract away the flow and let you write the following:

```js
import { execute } from "forge-reverse-ipc-provider";
execute(async (provider) => {
  const address = await provider.request({
    method: "eth_sendTransaction",
    params: [
      {
        from: "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF",
        to: "0x0000000000000000000000000000000000000000",
        data: "0x608060405234801561001057600080fd5b5060f78061001f6000396000f3fe6080604052348015600f57600080fd5b5060043610603c5760003560e01c80633fb5c1cb1460415780638381f58a146053578063d09de08a14606d575b600080fd5b6051604c3660046083565b600055565b005b605b60005481565b60405190815260200160405180910390f35b6051600080549080607c83609b565b9190505550565b600060208284031215609457600080fd5b5035919050565b60006001820160ba57634e487b7160e01b600052601160045260246000fd5b506001019056fea2646970667358221220f0cfb2159c518c3da0ad864362bad5dc0715514a9ab679237253d506773a0a1b64736f6c63430008130033",
      },
    ],
  });

  return {
    types: [{ type: "address" }],
    values: [address],
  };
});
```

`forge-reverse-ipc-provider` also handle timeout.

Note that while nodejs has a startup overhead, once the program is executed it stay alive and so long complicate script are possible.

## format

The format of communication between the ipc client and server is as follow:

// TODO
