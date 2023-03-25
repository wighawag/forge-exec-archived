// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Vm} from "forge-std/Vm.sol";

// TODO remove
import "forge-std/Script.sol";

library Exec {
    Vm constant vm =
        Vm(address(bytes20(uint160(uint256(keccak256("hevm cheat code"))))));

    function execute(string memory jsModule) internal {
        vm.startBroadcast();

        console.log("start");
        bytes memory init = init1193(jsModule);
        string memory processID = abi.decode(init, (string));

        console.log(string(bytes.concat("processID: ", bytes(processID))));

        // TODO remove, not needed
        // // ABI encoded "gm", as a hex string
        string
            memory response = "0x00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000002676d000000000000000000000000000000000000000000000000000000000000";

        while (true) {
            bytes memory request = call1193(processID, response);

            if (request.length == 0) {
                break;
            }
            // we get the envelop
            (uint256 envelopeType, bytes memory envelopeData) = abi.decode(
                request,
                (uint256, bytes)
            );

            if (envelopeType == 0) {
                break;
            } else if (envelopeType == 1) {
                (bytes memory data, address to, uint256 value) = abi.decode(
                    envelopeData,
                    (bytes, address, uint256)
                );
                if (to != address(0)) {
                    (bool success, ) = to.call{value: value}(data);
                    if (!success) {
                        terminate1193(processID, "CALL_FAILED");
                    }
                } else if (data.length > 0) {
                    address addr;
                    assembly {
                        addr := create(0, add(data, 0x20), mload(data))
                    }
                    if (addr == address(0)) {
                        terminate1193(processID, "FAILED_TO_CREATE_CONTRACT");
                    }
                }
            } else {
                terminate1193(processID, "UNKNOWN_ENVELOPE");
            }
        }

        console.log("end");
        vm.stopBroadcast(); // TODO option to broadcast as we go along
        // TODO return value defined by last envelop (type == 0) (promise value of return)
    }

    // --------------------------------------------------------------------------------------------
    // private
    // --------------------------------------------------------------------------------------------
    function init1193(string memory jsmodule) private returns (bytes memory) {
        string[] memory inputs = new string[](5);
        inputs[0] = "node";
        inputs[1] = "--no-warnings";
        inputs[
            2
        ] = "node_modules/forge-reverse-ipc-provider/dist/esm/executor.js";
        inputs[3] = "init";
        inputs[4] = jsmodule;
        return vm.ffi(inputs);
    }

    function terminate1193(
        string memory id,
        string memory errorMessage
    ) private {
        string[] memory inputs = new string[](6);
        inputs[0] = "node";
        inputs[1] = "--no-warnings";
        inputs[
            2
        ] = "node_modules/forge-reverse-ipc-provider/dist/esm/executor.js";
        inputs[3] = "terminate";
        inputs[4] = id;
        inputs[5] = errorMessage;

        vm.ffi(inputs);
        revert(errorMessage);
    }

    function call1193(
        string memory id,
        string memory value
    ) private returns (bytes memory) {
        string[] memory inputs = new string[](6);
        inputs[0] = "node";
        inputs[1] = "--no-warnings";
        inputs[
            2
        ] = "node_modules/forge-reverse-ipc-provider/dist/esm/executor.js";
        inputs[3] = "exec";
        inputs[4] = id;
        inputs[5] = value;

        return vm.ffi(inputs);
    }
}
