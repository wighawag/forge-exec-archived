
use std::io::{prelude::*, BufReader};
use std::error::Error;
use std::env;
use std::process::Command;
use std::{thread, time};
use std::str;
use ethabi::{encode, Token};
use hex;

use interprocess::local_socket::{LocalSocketStream, NameTypeSupport};

fn connect<'a>(name: &str, retry: u32, retry_interval: u64) -> LocalSocketStream {
    println!("connecting to {}", name);
    let connection_attempt = LocalSocketStream::connect(name);
    let conn = match connection_attempt {
        Ok(conn) => conn,
        // in case of error we retry 10ms later
        Err(error) => {
            if retry == 0 {
                panic!("Failed to connect: {:?}", error);
            }
            thread::sleep(time::Duration::from_millis(retry_interval));
            println!("retrying...");
            return connect(name, retry -1, retry_interval);
        }
    };
    return conn;
}

fn connect_and_send(name: &str, retry: u32, retry_interval: u64, message_buffer: &[u8]) -> Result<String, Box<dyn Error>>{
    
    // Preemptively allocate a sizeable buffer for reading.
    // This size should be enough and should be easy to find for the allocator.
    let mut buffer = String::with_capacity(128);

    let conn = connect(name, retry, retry_interval);

    // Wrap it into a buffered reader right away so that we could read a single line out of it.
    let mut conn = BufReader::new(conn);

    // Write our message into the stream. This will finish either when the whole message has been
    // writen or if a write operation returns an error. (`.get_mut()` is to get the writer,
    // `BufReader` doesn't implement a pass-through `Write`.)

    conn.get_mut().write_all(message_buffer)?;

    // // We now employ the buffer we allocated prior and read a single line, interpreting a newline
    // // character as an end-of-file (because local sockets cannot be portably shut down), verifying
    // // validity of UTF-8 on the fly.
    conn.read_line(&mut buffer)?;

    return Ok(buffer);
}


fn main() -> Result<(), Box<dyn Error>> {

let args: Vec<String> = env::args().collect();
let command = &args[1];


if command.eq("init") {
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

    let child = Command::new("node")
    .args(["../demo/example.js", name])
    .spawn()
    .expect("failed to execute child");

    // we attempt to connect, we retry 300 times with an interval of 10ms
    // the process has 3 seconds to establish an IPC server
    // this is plenty of time
    connect(name, 300, 10);

    // we could use standard output to let the ipc server give us the name,
    // this is not ideal as standard output can be easily poluted
    // let mut buffer = [0; 12];
    // let mut stdout = child.stdout.take().unwrap();
    // stdout.read(&mut buffer)?; // only read 12 bytes 
    
    // let s = match str::from_utf8(&buffer) {
    //     Ok(v) => v,
    //     Err(e) => panic!("Invalid UTF-8 sequence: {}", e),
    // };    
    // println!("from socket: {}", s);
    
    println!("Hello child! {}", child.id());
    print!("{}", hex::encode(encode(&[Token::String(String::from(name))])));

} else {
    let name = args[2].as_str();
    if command.eq("exec") {
        // TODO
        // let data = args[3].as_str();
        let buffer = connect_and_send(name, 1, 10, b"{\"type\":\"message\",\"data\":{\"type\":\"response\",\"data\":\"0xFF\"}}\n")?;
        
        // // Print out the result, getting the newline for free!
        print!("Server answered: {buffer}");
    } else if command.eq("terminate") {
        // TODO
        // let error_message = args[3].as_str();
        let buffer = connect_and_send(name, 1,10,b"{\"type\":\"message\",\"data\":{\"type\":\"terminate\",\"error\":\"Terminate Now!\"}}\n")?;
        
        // // Print out the result, getting the newline for free!
        print!("Server answered: {buffer}");
    }
}

Ok(())
}