/// Error Handling Examples in Rust
///
/// This file demonstrates various error handling approaches in Rust,
/// including panic, Result, custom errors, and the ? operator.

use std::fs::File;
use std::io::{self, Read};
use std::num::ParseIntError;
use std::error::Error;
use std::fmt;

fn main() -> Result<(), Box<dyn Error>> {
    println!("Rust Error Handling Examples");
    
    // Example 1: Panic and recover
    panic_examples();
    
    // Example 2: Using Result
    result_examples()?;
    
    // Example 3: Custom error types
    match custom_error_examples() {
        Ok(value) => println!("Success, got value: {}", value),
        Err(e) => println!("Custom error: {}", e),
    }
    
    // Example 4: Propagating errors with the ? operator
    let data = propagating_errors("config.txt")?;
    println!("File content length: {}", data.len());
    
    // Example 5: Handling different error types
    let result = handling_different_errors("42");
    println!("Conversion result: {:?}", result);
    
    // Example 6: Fallible functions
    let config = construct_config("127.0.0.1", "8080")?;
    println!("Config created: {:?}", config);
    
    Ok(())
}

/// Demonstrates how to use panic! and handle panic situations
fn panic_examples() {
    println!("\n=== Panic Examples ===");
    
    // Basic panic example - commented out to avoid crashing the program
    // panic!("This is a deliberate panic!");
    
    // Setting up a hook to capture panic information
    std::panic::set_hook(Box::new(|panic_info| {
        if let Some(location) = panic_info.location() {
            println!("Panic occurred in file '{}' at line {}", 
                location.file(), location.line());
        } else {
            println!("Panic occurred but location information is unavailable");
        }
        
        if let Some(message) = panic_info.payload().downcast_ref::<&str>() {
            println!("Panic message: {}", message);
        } else {
            println!("Panic occurred with unknown message");
        }
    }));
    
    // Catching a panic with catch_unwind
    let result = std::panic::catch_unwind(|| {
        println!("This code might panic");
        
        // Uncomment to see the panic handling
        // panic!("Deliberate panic inside catch_unwind");
        
        "Panic didn't occur"
    });
    
    // Handle the result of catch_unwind
    match result {
        Ok(value) => println!("Operation completed successfully: {}", value),
        Err(_) => println!("Caught a panic with catch_unwind"),
    }
    
    // Example of a panic due to array bounds
    let v = vec![1, 2, 3];
    // This would cause a panic - uncomment to see:
    // let item = v[99]; // Panic: index out of bounds
    
    println!("Vector has {} items", v.len());
    
    // Reset the panic hook
    let _ = std::panic::take_hook();
}

/// Demonstrates using the Result type for error handling
fn result_examples() -> Result<(), String> {
    println!("\n=== Result Examples ===");
    
    // Basic Result usage
    let result = divide(10, 2);
    match result {
        Ok(value) => println!("Division successful: {}", value),
        Err(error) => println!("Division failed: {}", error),
    }
    
    // Using unwrap (unsafe, can panic)
    let result = divide(8, 4).unwrap();
    println!("Division with unwrap: {}", result);
    
    // This would panic with unwrap - commented out
    // let panic_result = divide(5, 0).unwrap();
    
    // Using expect for better error messages
    let result = divide(8, 2).expect("Division operation failed");
    println!("Division with expect: {}", result);
    
    // Using unwrap_or to provide a default value
    let result = divide(10, 0).unwrap_or(0);
    println!("Division with unwrap_or: {}", result);
    
    // Using if let for cleaner matching
    if let Ok(value) = divide(12, 3) {
        println!("Division successful with if let: {}", value);
    }
    
    // Using map to transform the success value
    let result = divide(20, 5)
        .map(|value| value * 2)
        .unwrap_or(0);
    println!("Division with map: {}", result);
    
    // Using map_err to transform the error
    let result = divide(8, 0)
        .map_err(|e| format!("Division error: {}", e));
    
    if let Err(e) = result {
        println!("Transformed error: {}", e);
    }
    
    // Chaining operations
    let result = divide(10, 2)
        .and_then(|v| divide(v, 1))
        .and_then(|v| Ok(v + 10));
    
    println!("Chained result: {:?}", result);
    
    Ok(())
}

/// A function that returns a Result
fn divide(a: i32, b: i32) -> Result<i32, String> {
    if b == 0 {
        Err(String::from("Cannot divide by zero"))
    } else {
        Ok(a / b)
    }
}

/// Custom error type example
#[derive(Debug)]
enum AppError {
    InvalidInput(String),
    Calculation(String),
    NotFound(String),
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            AppError::InvalidInput(msg) => write!(f, "Invalid input: {}", msg),
            AppError::Calculation(msg) => write!(f, "Calculation error: {}", msg),
            AppError::NotFound(msg) => write!(f, "Not found: {}", msg),
        }
    }
}

impl Error for AppError {}

/// Demonstrates custom error types
fn custom_error_examples() -> Result<i32, AppError> {
    println!("\n=== Custom Error Examples ===");
    
    // Simulate validation
    let input = -5;
    if input < 0 {
        return Err(AppError::InvalidInput("Value must be positive".to_string()));
    }
    
    // Simulate calculation
    let calculation_result = complex_calculation(input)?;
    
    // Simulate lookup
    let lookup_result = lookup_value(calculation_result)?;
    
    Ok(lookup_result)
}

fn complex_calculation(value: i32) -> Result<i32, AppError> {
    // Some complex computation
    let result = value * 2;
    
    if result > 100 {
        Err(AppError::Calculation("Result too large".to_string()))
    } else {
        Ok(result)
    }
}

fn lookup_value(key: i32) -> Result<i32, AppError> {
    // Lookup the value in some storage
    let values = [
        (0, 10),
        (2, 20),
        (4, 40),
        (6, 60),
    ];
    
    for (k, v) in values.iter() {
        if *k == key {
            return Ok(*v);
        }
    }
    
    Err(AppError::NotFound(format!("No value found for key {}", key)))
}

/// Demonstrates error propagation with the ? operator
fn propagating_errors(filename: &str) -> Result<String, io::Error> {
    println!("\n=== Error Propagation Examples ===");
    
    // Open a file - this could return an error which is propagated
    let mut file = File::open(filename)?;
    
    // Read the file's contents
    let mut contents = String::new();
    file.read_to_string(&mut contents)?;
    
    // If we got here, all operations succeeded
    Ok(contents)
}

/// Demonstrates handling different error types
fn handling_different_errors(text: &str) -> Result<i32, String> {
    println!("\n=== Handling Different Errors Example ===");
    
    // Try to parse the text as a number
    let parsed = text.parse::<i32>()
        .map_err(|e| format!("Parse error: {}", e))?;
    
    // Try to perform division
    let result = divide(100, parsed)
        .map_err(|e| format!("Division error: {}", e))?;
    
    Ok(result)
}

/// Demonstrates using Result in a fallible constructor
#[derive(Debug)]
struct Config {
    host: String,
    port: u16,
}

impl Config {
    fn new(host: &str, port: &str) -> Result<Config, String> {
        if host.is_empty() {
            return Err("Host cannot be empty".to_string());
        }
        
        let port = port.parse::<u16>()
            .map_err(|e| format!("Invalid port: {}", e))?;
        
        Ok(Config {
            host: host.to_string(),
            port,
        })
    }
}

/// Create a Config or return an error
fn construct_config(host: &str, port: &str) -> Result<Config, String> {
    println!("\n=== Fallible Construction Example ===");
    
    let config = Config::new(host, port)?;
    println!("Created config with host {} and port {}", config.host, config.port);
    
    Ok(config)
}

/// A more complex error conversion example
#[derive(Debug)]
enum WrappedError {
    Io(io::Error),
    Parse(ParseIntError),
    Other(String),
}

impl fmt::Display for WrappedError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            WrappedError::Io(e) => write!(f, "IO error: {}", e),
            WrappedError::Parse(e) => write!(f, "Parse error: {}", e),
            WrappedError::Other(msg) => write!(f, "Other error: {}", msg),
        }
    }
}

impl Error for WrappedError {}

impl From<io::Error> for WrappedError {
    fn from(error: io::Error) -> Self {
        WrappedError::Io(error)
    }
}

impl From<ParseIntError> for WrappedError {
    fn from(error: ParseIntError) -> Self {
        WrappedError::Parse(error)
    }
}

// This function uses the From trait to convert errors automatically
fn _convert_errors(filename: &str) -> Result<i32, WrappedError> {
    let mut file = File::open(filename)?; // io::Error converted to WrappedError
    
    let mut contents = String::new();
    file.read_to_string(&mut contents)?;
    
    let number = contents.trim().parse::<i32>()?; // ParseIntError converted
    
    if number < 0 {
        return Err(WrappedError::Other("Number cannot be negative".to_string()));
    }
    
    Ok(number * 2)
} 