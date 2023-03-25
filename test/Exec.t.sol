// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Test.sol";

import {Exec} from "src/Exec.sol";

contract ExecTest is Test {
    function setUp() public {}

    function testGet() public {
        string memory greeting = Exec.execute();

        assertEq(greeting, "gm");
    }
}
