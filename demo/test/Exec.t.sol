// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Test.sol";

import {Exec} from "forge-exec/Exec.sol";

contract ExecTest is Test {
    function setUp() public {}

    function testGet() public {
        Exec.execute("./example.js");
    }
}
