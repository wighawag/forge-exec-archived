
use std::io::{prelude::*, BufReader};
use std::error::Error;
use std::{env, str};
use std::process::{Command, Stdio};
use std::{thread, time};
use ethabi::{encode, Token};
use hex;
use rand::prelude::*;

#[cfg(debug_assertions)]
use std::fs::OpenOptions;


use interprocess::local_socket::{LocalSocketStream, NameTypeSupport};

fn connect<'a>(name: &str, retry: u32, retry_interval: u64) -> LocalSocketStream {
    // println!("connecting to {}", name);
    let connection_attempt = LocalSocketStream::connect(name);
    let conn = match connection_attempt {
        Ok(conn) => conn,
        // in case of error we retry 10ms later
        Err(error) => {
            if retry == 0 {
                panic!("Failed to connect: {:?}", error);
            }
            thread::sleep(time::Duration::from_millis(retry_interval));
            // println!("retrying...");
            return connect(name, retry -1, retry_interval);
        }
    };
    return conn;
}

fn connect_and_send(name: &str, retry: u32, retry_interval: u64, message_buffer: &[u8]) -> Result<String, Box<dyn Error>>{
    let mut buffer = String::with_capacity(128);

    let conn = connect(name, retry, retry_interval);
    // Wrap it into a buffered reader right away so that we could read a single line out of it.
    let mut conn = BufReader::new(conn);

    conn.get_mut().write_all(message_buffer)?;
    conn.get_mut().write_all(b"\n")?;

    
    conn.read_line(&mut buffer)?;

    let mut str = buffer.chars();
    str.next_back();
    return Ok(String::from(str.as_str()));
}


fn main() -> Result<(), Box<dyn Error>> {

#[cfg(debug_assertions)]
let mut file = OpenOptions::new()
.append(true)
.open(".rust-executor.log")
.unwrap();

    
let args: Vec<String> = env::args().collect();
let command = &args[1];

#[cfg(debug_assertions)]
writeln!(file, "{}", args.join(","))?;

if command.eq("init") {
    
    let mut rng = rand::thread_rng();
    let y: u32 = rng.gen();
    let name = {
        use NameTypeSupport::*;
        match NameTypeSupport::query() {
            OnlyPaths | Both => format!("/tmp/app.world-{}", y),
            OnlyNamespaced => format!("@app.world-{}", y),
        }
    }.to_string();

    let program = &args[2];
    let mut program_args = Vec::with_capacity(args[3 .. ].len() + 1);
    for i in 3..args.len() {
        program_args.push(&args[i]);
    }
    program_args.push(&name);

    #[cfg(debug_assertions)]
    writeln!(file, "spawn {}", program)?;

    Command::new(program)
        // .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
    .args(program_args)
    .spawn()
    .expect("failed to execute child");

    // #[cfg(debug_assertions)]
    // writeln!(file, "child PID {}", child.id())?;

    // we attempt to connect, we retry 300 times with an interval of 10ms
    // the process has 3 seconds to establish an IPC server
    // this is plenty of time
    connect(&name, 300, 10);

    #[cfg(debug_assertions)]
    writeln!(file, "connected!")?;
    
    print!("0x{}", hex::encode(encode(&[Token::String(String::from(name))])));

    #[cfg(debug_assertions)]
    writeln!(file,"------------------ INIT ------------------")?;
} else {
    let name = args[2].as_str();
    if command.eq("exec") {
        let data = args[3].as_str();
        // print!("{}", data);
        let request = connect_and_send(name, 0, 10, data.as_bytes())?;
        print!("{}", request);

        #[cfg(debug_assertions)]
        writeln!(file,"NEW REQUEST: {}", request)?;
        #[cfg(debug_assertions)]
        writeln!(file,"------------------ EXEC ------------------")?;
    } else if command.eq("terminate") {
        let error_message = match args.len() > 3 {
            true => args[3].as_str(),
            false => "termination",
        };
         
        let mut msg: String = "terminate:".to_owned();
        msg.push_str(error_message);
        connect_and_send(name, 0,10,msg.as_bytes())?;
        print!("0x");

        #[cfg(debug_assertions)]
        writeln!(file,"------------------ TERMINATE ------------------")?;
    } else {
        #[cfg(debug_assertions)]
        writeln!(file,"------------------ UNKNOWN ------------------")?;
    }
}

Ok(())
}