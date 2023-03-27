// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Vm} from "forge-std/Vm.sol";

library Exec {
    Vm constant vm =
        Vm(address(bytes20(uint160(uint256(keccak256("hevm cheat code"))))));

    function execute(
        string memory jsModule
    ) internal returns (bytes memory result) {
        vm.startBroadcast();

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

            // STOP
            if (envelopeType == 0) {
                result = envelopeData;
                break;
            }
            // eth_sendTransaction
            else if (envelopeType == 1) {
                (bytes memory data, address payable to, uint256 value) = abi
                    .decode(envelopeData, (bytes, address, uint256));
                if (to != address(0)) {
                    if (data.length == 0) {
                        (bool success, ) = to.call{value: value}(data);
                        response = success ? "0x01" : "0x00";
                    } else {
                        bool success = to.send(value);
                        response = success ? "0x01" : "0x00";
                    }
                } else {
                    address addr;
                    assembly {
                        addr := create(0, add(data, 0x20), mload(data))
                    }
                    response = vm.toString(addr);
                }
            }
            // balance
            else if (envelopeType == 0x31) {
                address account = abi.decode(envelopeData, (address));
                response = vm.toString(abi.encode(account.balance));
            } else {
                terminate1193(processID, "UNKNOWN_ENVELOPE");
            }
        }
        vm.stopBroadcast();
    }

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
