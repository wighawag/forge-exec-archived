
use std::io::{prelude::*, BufReader};
use std::error::Error;
use std::env;

use std::process::Command;

use interprocess::local_socket::{LocalSocketStream, NameTypeSupport};



fn main() -> Result<(), Box<dyn Error>> {

let args: Vec<String> = env::args().collect();
let command = &args[1];
let command_data = &args[2];
println!("Hello, world! {} {}", command, command_data);

// if let Ok(Fork::Child) = daemon(false, false) {
//     Command::new("node")
//         .arg("../demo/example.js")
//         .output()
//         .expect("failed to execute process");
// }

// let output = Command::new("echo")
//                      .arg("Hello world")
//                      .output()
//                      .expect("Failed to execute command");


let child = Command::new("bash")
    .args(["-c", "sleep 3s; echo hello!"])
    .spawn()
    .expect("failed to execute child");

// let child = Command::new("node")
//     .args(["../demo/example.js"])
//     .spawn()
//     .expect("failed to execute child");


println!("Hello child! {}", child.id());

// Pick a name. There isn't a helper function for this, mostly because it's largely unnecessary:
// in Rust, `match` is your concise, readable and expressive decision making construct.
let name = {
     // This scoping trick allows us to nicely contain the import inside the `match`, so that if
     // any imports of variants named `Both` happen down the line, they won't collide with the
     // enum we're working with here. Maybe someone should make a macro for this.
     use NameTypeSupport::*;
     match NameTypeSupport::query() {
         OnlyPaths | Both => "/tmp/app.world",
         OnlyNamespaced => "@app.world",
     }
};

println!("connecting to {}", name);

// Preemptively allocate a sizeable buffer for reading.
// This size should be enough and should be easy to find for the allocator.
let mut buffer = String::with_capacity(128);

// Create our connection. This will block until the server accepts our connection, but will fail
// immediately if the server hasn't even started yet; somewhat similar to how happens with TCP,
// where connecting to a port that's not bound to any server will send a "connection refused"
// response, but that will take twice the ping, the roundtrip time, to reach the client.
let conn = LocalSocketStream::connect(name)?;
// Wrap it into a buffered reader right away so that we could read a single line out of it.
let mut conn = BufReader::new(conn);

// Write our message into the stream. This will finish either when the whole message has been
// writen or if a write operation returns an error. (`.get_mut()` is to get the writer,
// `BufReader` doesn't implement a pass-through `Write`.)
// conn.get_mut().write_all(b"{\"type\":\"message\",\"data\":{\"type\":\"response\",\"data\":\"0xFF\"}}\n")?; // \f = \x0c
conn.get_mut().write_all(b"{\"type\":\"message\",\"data\":{\"type\":\"terminate\",\"error\":\"Terminate Now!\"}}\n")?; // \f = \x0c

// // We now employ the buffer we allocated prior and read a single line, interpreting a newline
// // character as an end-of-file (because local sockets cannot be portably shut down), verifying
// // validity of UTF-8 on the fly.
conn.read_line(&mut buffer)?;

// // Print out the result, getting the newline for free!
print!("Server answered: {buffer}");

Ok(())
}