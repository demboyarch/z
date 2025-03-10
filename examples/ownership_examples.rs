/// Ownership and Borrowing Examples in Rust
/// 
/// This file demonstrates Rust's ownership model, borrowing, and lifetimes
/// which are core to Rust's memory safety guarantees without garbage collection.

fn main() {
    println!("Rust Ownership and Borrowing Examples");
    
    // Example 1: Basic ownership
    ownership_basics();
    
    // Example 2: Borrowing
    borrowing_examples();
    
    // Example 3: Lifetimes
    lifetime_examples();
    
    // Example 4: Move semantics
    move_semantics();
    
    // Example 5: Smart pointers
    smart_pointer_examples();
}

/// Demonstrates basic ownership rules in Rust
fn ownership_basics() {
    println!("\n=== Ownership Basics ===");
    
    // Rule 1: Each value in Rust has a variable that's called its owner
    let s1 = String::from("hello"); // s1 owns the String
    
    // Rule 2: There can only be one owner at a time
    let s2 = s1; // s1 is moved to s2, s1 is no longer valid
    
    // This would cause a compile error - uncomment to see:
    // println!("s1: {}", s1); // Error: value borrowed after move
    
    println!("s2: {}", s2); // This works fine
    
    // Rule 3: When the owner goes out of scope, the value will be dropped
    {
        let s3 = String::from("scoped string"); // s3 comes into scope
        println!("s3 is valid here: {}", s3);
    } // s3 goes out of scope and is dropped
    
    // This would cause a compile error - uncomment to see:
    // println!("s3: {}", s3); // Error: cannot find value `s3` in this scope
    
    // Clone to avoid moving ownership
    let s4 = String::from("clone me");
    let s5 = s4.clone(); // Creates a deep copy
    
    // Both s4 and s5 are valid
    println!("s4: {}, s5: {}", s4, s5);
}

/// Demonstrates borrowing in Rust
fn borrowing_examples() {
    println!("\n=== Borrowing Examples ===");
    
    // Immutable borrows
    let s = String::from("hello");
    
    // Pass a reference to the function, not ownership
    calculate_length(&s);
    
    // s is still valid here because we only passed a reference
    println!("Original string is still valid: {}", s);
    
    // Multiple immutable references are allowed
    let r1 = &s;
    let r2 = &s;
    println!("Multiple immutable references: {} and {}", r1, r2);
    
    // Mutable borrows
    let mut s = String::from("hello");
    
    // This works because we're passing a mutable reference
    change_string(&mut s);
    println!("After modification: {}", s);
    
    // Restriction: only one mutable reference at a time
    let r1 = &mut s;
    // This would cause a compile error - uncomment to see:
    // let r2 = &mut s; // Error: cannot borrow `s` as mutable more than once
    
    println!("Mutable reference: {}", r1);
    
    // Mutable and immutable references cannot exist at the same time
    let mut s = String::from("hello");
    
    // These immutable references are valid because no mutable reference yet
    let r1 = &s;
    let r2 = &s;
    
    // This would cause a compile error - uncomment to see:
    // let r3 = &mut s; // Error: cannot borrow `s` as mutable because it is also borrowed as immutable
    
    println!("Immutable references: {} and {}", r1, r2);
    
    // Now we can create a mutable reference since r1 and r2 are no longer used
    let r3 = &mut s;
    r3.push_str(" world");
    println!("After mutable borrow: {}", r3);
}

/// Calculate the length of a string without taking ownership
fn calculate_length(s: &String) -> usize {
    s.len() // Return the length of the string
    // s is not dropped here because we don't own it
}

/// Modify a string using a mutable reference
fn change_string(s: &mut String) {
    s.push_str(" world"); // Append to the string
}

/// Demonstrates lifetimes in Rust
fn lifetime_examples() {
    println!("\n=== Lifetime Examples ===");
    
    let string1 = String::from("long string is long");
    
    // Nested scope
    {
        let string2 = String::from("short");
        
        // Result will have the lifetime of the shorter of the two references
        let result = longest(&string1, &string2);
        println!("The longest string is: {}", result);
    } // string2 goes out of scope here
    
    // This works because result's lifetime is tied to string1, which is still valid
    let result = longest(&string1, "even shorter");
    println!("The longest string is still: {}", result);
    
    // Struct with references
    let s1 = String::from("struct with lifetime");
    
    // Create a struct that holds a reference
    let excerpt = StringExcerpt { part: &s1 };
    println!("String excerpt: {}", excerpt.part);
}

/// A function that returns a reference to one of its parameters
/// We need to use a lifetime parameter 'a to indicate the relationship
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() {
        x
    } else {
        y
    }
}

/// A struct that holds a reference
/// The lifetime parameter 'a specifies that the reference in part
/// cannot outlive the struct itself
struct StringExcerpt<'a> {
    part: &'a str,
}

/// Demonstrates move semantics in Rust
fn move_semantics() {
    println!("\n=== Move Semantics ===");
    
    // Integers are Copy types (stored on the stack)
    let x = 5;
    let y = x; // Copy, not move
    
    // Both x and y are valid
    println!("x: {}, y: {}", x, y);
    
    // String is not a Copy type
    let s1 = String::from("move me");
    let s2 = s1; // s1 is moved to s2
    
    // s1 is no longer valid, only s2 is
    println!("s2: {}", s2);
    
    // Function calls transfer ownership
    let s = String::from("hello");
    takes_ownership(s); // s is moved into the function
    
    // This would cause a compile error - uncomment to see:
    // println!("s: {}", s); // Error: value borrowed after move
    
    // Return values also transfer ownership
    let s3 = gives_ownership(); // Ownership moves from function to s3
    println!("s3: {}", s3);
    
    // Taking and returning ownership
    let s4 = String::from("takeback");
    let s5 = takes_and_gives_back(s4); // s4 is moved, then a new value is returned to s5
    println!("s5: {}", s5);
}

/// This function takes ownership of the parameter
fn takes_ownership(s: String) {
    println!("Taking ownership of: {}", s);
} // s goes out of scope and is dropped

/// This function returns ownership of a new string
fn gives_ownership() -> String {
    let s = String::from("given"); // Create a new string
    s // Return ownership to the caller
}

/// This function takes and returns ownership
fn takes_and_gives_back(s: String) -> String {
    s // Return the same string to the caller
}

/// Demonstrates smart pointers in Rust
fn smart_pointer_examples() {
    println!("\n=== Smart Pointer Examples ===");
    
    // Box<T> - simple heap allocation
    let b = Box::new(5);
    println!("Box contains: {}", b);
    
    // Create a recursive type with a Box
    let list = ConsList::Cons(1, Box::new(ConsList::Cons(2, 
        Box::new(ConsList::Cons(3, Box::new(ConsList::Nil))))));
    println!("Created a cons list");
    
    // Rc<T> - reference counted smart pointer
    use std::rc::Rc;
    
    // Create a reference counted string
    let s1 = Rc::new(String::from("shared data"));
    println!("Created rc with count: {}", Rc::strong_count(&s1));
    
    // Clone the Rc pointer (not the data)
    let s2 = Rc::clone(&s1);
    println!("After first clone, count: {}", Rc::strong_count(&s1));
    
    let s3 = Rc::clone(&s1);
    println!("After second clone, count: {}", Rc::strong_count(&s1));
    
    // All pointers can access the same data
    println!("s1: {}, s2: {}, s3: {}", s1, s2, s3);
    
    // RefCell<T> - interior mutability
    use std::cell::RefCell;
    
    let data = RefCell::new(5);
    
    // We can borrow mutably even though data is not declared mut
    *data.borrow_mut() += 10;
    
    // And we can borrow immutably too
    println!("RefCell value: {}", *data.borrow());
    
    // Example combining Rc and RefCell
    let shared_data = Rc::new(RefCell::new(String::from("shared mutable data")));
    
    // Create multiple references to the same mutable data
    let reference1 = Rc::clone(&shared_data);
    let reference2 = Rc::clone(&shared_data);
    
    // Modify through one reference
    reference1.borrow_mut().push_str(" - modified");
    
    // See the change through all references
    println!("After modification: {}", shared_data.borrow());
    println!("Reference2 sees: {}", reference2.borrow());
}

/// A recursive cons list using Box
enum ConsList {
    Cons(i32, Box<ConsList>),
    Nil,
} 