// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {Exec} from "src/Exec.sol";

contract ExecDemoScript is Script {
    function setUp() public {}

    function run() public {
        string memory data = Exec.execute();
        console.log("msg", data);
    }
}
