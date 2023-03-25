# <h1 align="center"> forge-exec </h1>

**Execute program using a reverse IPC service from Solidity scripts/tests**

## Installation

```
forge install wighawag/forge-exec
```

## Usage

1. Add this import to your script or test:

```solidity
import {Exec} from "forge-exec/Exec.sol";
```

1. Execute an external script:

```solidity
(string memory data) = Exec.exexute();
```

4. You must enable [ffi](https://book.getfoundry.sh/cheatcodes/ffi.html) in order to use the library. You can either pass the `--ffi` flag to any forge commands you run (e.g. `forge script Script --ffi`), or you can add `ffi = true` to your `foundry.toml` file.

## Example

We have example usage for both [tests](./test/Exec.t.sol) and [scripts](./script/ExecDemo.s.sol).

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
