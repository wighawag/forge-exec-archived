// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Test.sol";

import {Exec} from "forge-exec/Exec.sol";

contract ExecTest is Test {
    function setUp() public {
        // we can for example make reuse of a deploy script here and setup our test environment the same way we could do a script, all in js.
        bytes memory test = Exec.execute("./example.js");
        uint256 num = abi.decode(test, (uint256));

        console.log("----");
        console.log(num);
        console.logBytes(test);
        console.log("----");
    }

    function testDeplyment() public view {
        bytes memory code = 0x90193C961A926261B756D1E5bb255e67ff9498A1.code;
        assert(code.length > 0);
    }

    function testDeplymentAgain() public view {
        bytes memory code = 0x90193C961A926261B756D1E5bb255e67ff9498A1.code;
        assert(code.length > 0);
    }

    function testDeplymentAgainAndAgain() public view {
        bytes memory code = 0x90193C961A926261B756D1E5bb255e67ff9498A1.code;
        assert(code.length > 0);
    }

    function testDeplymentAgainAndAgainAndAgain() public view {
        bytes memory code = 0x90193C961A926261B756D1E5bb255e67ff9498A1.code;
        assert(code.length > 0);
    }
}
