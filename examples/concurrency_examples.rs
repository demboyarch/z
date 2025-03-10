use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

/// This module demonstrates various concurrency patterns in Rust
fn main() {
    println!("Rust Concurrency Examples");
    
    // Example 1: Basic threading
    basic_threading_example();
    
    // Example 2: Shared state
    shared_state_example();
    
    // Example 3: Message passing
    message_passing_example();
    
    // Example 4: Thread pool
    thread_pool_example();
}

/// Demonstrates basic thread creation and joining
fn basic_threading_example() {
    println!("\n=== Basic Threading Example ===");
    
    let mut handles = vec![];
    
    // Spawn 5 threads
    for i in 0..5 {
        // Clone data for the thread
        let handle = thread::spawn(move || {
            println!("Thread {i} starting");
            // Simulate work
            thread::sleep(Duration::from_millis(100 * i));
            println!("Thread {i} finished");
            // Return a value from the thread
            i * 10
        });
        
        handles.push(handle);
    }
    
    // Collect results
    let mut results = vec![];
    for handle in handles {
        // Wait for the thread to finish and get its return value
        let result = handle.join().unwrap();
        results.push(result);
    }
    
    println!("All threads completed with results: {:?}", results);
}

/// Demonstrates sharing state between threads using Mutex and Arc
fn shared_state_example() {
    println!("\n=== Shared State Example ===");
    
    // Create a shared counter
    let counter = Arc::new(Mutex::new(0));
    let mut handles = vec![];
    
    for _ in 0..10 {
        let counter_clone = Arc::clone(&counter);
        let handle = thread::spawn(move || {
            // Lock the mutex to access the data
            let mut num = counter_clone.lock().unwrap();
            *num += 1;
            // The lock is automatically released when num goes out of scope
        });
        handles.push(handle);
    }
    
    // Wait for all threads to finish
    for handle in handles {
        handle.join().unwrap();
    }
    
    println!("Final counter value: {}", *counter.lock().unwrap());
}

/// Demonstrates message passing between threads using channels
fn message_passing_example() {
    println!("\n=== Message Passing Example ===");
    
    // Create a channel
    let (tx, rx) = std::sync::mpsc::channel();
    
    // Spawn a thread that will send messages
    let sender_thread = thread::spawn(move || {
        let messages = vec!["Hello", "from", "the", "other", "thread!"];
        
        for msg in messages {
            tx.send(msg).unwrap();
            thread::sleep(Duration::from_millis(100));
        }
        
        // Signal end of messages
        tx.send("DONE").unwrap();
    });
    
    // In the main thread, receive messages
    loop {
        let received = rx.recv().unwrap();
        println!("Received: {}", received);
        
        if received == "DONE" {
            break;
        }
    }
    
    sender_thread.join().unwrap();
}

/// Demonstrates a simple thread pool implementation
fn thread_pool_example() {
    println!("\n=== Thread Pool Example ===");
    
    // Create a simple thread pool
    let pool = ThreadPool::new(4);
    let results = Arc::new(Mutex::new(vec![]));
    
    // Execute tasks on the pool
    for i in 0..8 {
        let results_clone = Arc::clone(&results);
        pool.execute(move || {
            println!("Task {i} executing on thread {:?}", thread::current().id());
            thread::sleep(Duration::from_millis(100));
            
            // Store the result
            let mut results_vec = results_clone.lock().unwrap();
            results_vec.push(i);
        });
    }
    
    // Wait for all tasks to complete
    pool.wait_completion();
    
    println!("All tasks completed with results: {:?}", *results.lock().unwrap());
}

/// A simple thread pool implementation
struct ThreadPool {
    workers: Vec<Worker>,
    sender: Option<std::sync::mpsc::Sender<Message>>,
}

/// Messages that can be sent to workers
enum Message {
    Task(Box<dyn FnOnce() + Send + 'static>),
    Terminate,
}

impl ThreadPool {
    /// Create a new ThreadPool with the specified number of threads
    fn new(size: usize) -> ThreadPool {
        assert!(size > 0);
        
        let (sender, receiver) = std::sync::mpsc::channel();
        let receiver = Arc::new(Mutex::new(receiver));
        
        let mut workers = Vec::with_capacity(size);
        
        for id in 0..size {
            workers.push(Worker::new(id, Arc::clone(&receiver)));
        }
        
        ThreadPool {
            workers,
            sender: Some(sender),
        }
    }
    
    /// Execute a task on the thread pool
    fn execute<F>(&self, f: F)
    where
        F: FnOnce() + Send + 'static,
    {
        let job = Box::new(f);
        self.sender.as_ref().unwrap().send(Message::Task(job)).unwrap();
    }
    
    /// Wait for all tasks to complete
    fn wait_completion(&self) {
        // Sleep to allow tasks to complete
        // This is a simplistic implementation
        thread::sleep(Duration::from_millis(500));
    }
}

impl Drop for ThreadPool {
    fn drop(&mut self) {
        // Send terminate message to all workers
        for _ in &self.workers {
            self.sender.as_ref().unwrap().send(Message::Terminate).unwrap();
        }
        
        // Wait for all workers to finish
        for worker in &mut self.workers {
            if let Some(thread) = worker.thread.take() {
                thread.join().unwrap();
            }
        }
    }
}

/// A worker in the thread pool
struct Worker {
    id: usize,
    thread: Option<thread::JoinHandle<()>>,
}

impl Worker {
    fn new(id: usize, receiver: Arc<Mutex<std::sync::mpsc::Receiver<Message>>>) -> Worker {
        let thread = thread::spawn(move || loop {
            let message = receiver.lock().unwrap().recv().unwrap();
            
            match message {
                Message::Task(job) => {
                    println!("Worker {id} got a job; executing.");
                    job();
                }
                Message::Terminate => {
                    println!("Worker {id} was told to terminate.");
                    break;
                }
            }
        });
        
        Worker {
            id,
            thread: Some(thread),
        }
    }
} 