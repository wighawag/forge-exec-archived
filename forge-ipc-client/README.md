# forge-ipc-client

ipc client that let forge connect to an ipc server while executing solidity.

## how does it work?

`forge-exec` is used in your forge project and will do the following

- will ffi execute `forge-ipc-client init <program> [...<args>]`
- `forge-ipc-client` (this package) will then execute the program along with the provided argument and create a new process for it
- When doing so it will also apend a randonly generated socket/named-pipe path/name, that we call the `socketID` (prefixed with `ipc:`)
- the program will thus be called via `<program> [...<args>] ipc:<socketID>`
- That program need to create an ipc server to listen on the given `socketID` as soon as it can.
- `forge-ipc-client` will then attempt to connect to that socket/named-pipe for 3 seconds and upon success will print to `stdin` the `socketID` as an abi encoded string and exit.
- forge will pick that up and `forge-exec` will now perform a new ffi call : `forge-ipc-client exec <socketID> 0x`
- `forge-ipc-client` will detect an `exec` as first argument and connect to the ipc server created by the `program`
- Once connected it will send the data argument to it (first call is always `0x`)
- the `program` need to be thus stay alive and listen for these call
- Upon receiveing the first call `0x` the program should start executing its user code.
- When it need to make a request back to forge it will simply have to reply on the ipc socket established with abi encoded data (see format below)
- `forge-ipc-client` will write that to `stdin` on reception and exit immediatly (`program` continue to run)
- `forge-exec` will pick up the data and interpret it as a request. One of this request is to terminate and can include an data the `program` may wish to return.
- if the data was not a termination request, `forge-exec` will execute the request (currently only send_transaction and getBalance is supported) and send that data back
- It send the data back via `forge-ipc-client exec <socketID> <data>`
- this get repeated until the program send the terminate request

## format
