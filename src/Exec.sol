// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Vm} from "forge-std/Vm.sol";

library Exec {
    Vm constant vm =
        Vm(address(bytes20(uint160(uint256(keccak256("hevm cheat code"))))));

    function execute(string memory jsModule) internal {
        vm.startBroadcast();

        // ./forge-ipc-client init node ./example.js && ./forge-ipc-client exec /tmp/app.world 0x && ./forge-ipc-client exec /tmp/app.world 0xFF && ./forge-ipc-client exec /tmp/app.world 0xFF && ./forge-ipc-client exec /tmp/app.world 0xFF
        bytes memory init = init1193(jsModule);
        string memory processID = abi.decode(init, (string));

        string memory response = "0x"; // the first response
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
        vm.stopBroadcast(); // TODO option to broadcast as we go along
        // TODO return value defined by last envelop (type == 0) (promise value of return)
    }

    // --------------------------------------------------------------------------------------------
    // private
    // --------------------------------------------------------------------------------------------
    // function init1193(string memory jsmodule) private returns (bytes memory) {
    //     string[] memory inputs = new string[](4);
    //     inputs[0] = "npx";
    //     inputs[1] = "forge-exec";
    //     inputs[2] = "init";
    //     inputs[3] = jsmodule;
    //     return vm.ffi(inputs);
    // }

    // function terminate1193(
    //     string memory id,
    //     string memory errorMessage
    // ) private {
    //     string[] memory inputs = new string[](5);
    //     inputs[0] = "npx";
    //     inputs[1] = "forge-exec";
    //     inputs[2] = "terminate";
    //     inputs[3] = id;
    //     inputs[4] = errorMessage;

    //     vm.ffi(inputs);
    //     revert(errorMessage);
    // }

    // function call1193(
    //     string memory id,
    //     string memory value
    // ) private returns (bytes memory) {
    //     string[] memory inputs = new string[](5);
    //     inputs[0] = "npx";
    //     inputs[1] = "forge-exec";
    //     inputs[2] = "exec";
    //     inputs[3] = id;
    //     inputs[4] = value;

    //     return vm.ffi(inputs);
    // }

    function init1193(string memory jsmodule) private returns (bytes memory) {
        string[] memory inputs = new string[](4);
        inputs[0] = "./forge-ipc-client";
        inputs[1] = "init";
        inputs[2] = "node";
        inputs[3] = jsmodule;
        return vm.ffi(inputs);
    }

    function terminate1193(
        string memory id,
        string memory errorMessage
    ) private {
        string[] memory inputs = new string[](4);
        inputs[0] = "./forge-ipc-client";
        inputs[1] = "terminate";
        inputs[2] = id;
        inputs[3] = errorMessage;

        vm.ffi(inputs);
        revert(errorMessage);
    }

    function call1193(
        string memory id,
        string memory value
    ) private returns (bytes memory) {
        string[] memory inputs = new string[](4);
        inputs[0] = "./forge-ipc-client";
        inputs[1] = "exec";
        inputs[2] = id;
        inputs[3] = value;

        return vm.ffi(inputs);
    }
}
