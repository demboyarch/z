use std::collections::{HashMap, HashSet};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};
// Define error types for our application
#[derive(Debug)]
enum AppError {
    InvalidInput(String),
    ProcessingFailed(String),
    DatabaseError(String),
    NetworkError(String),
}
ы
// Define a struct to represent a user in our system
#[derive(Debug, Clone)]
struct User {
    id: u64,
    username: String,
    email: String,
    created_at: Instant,
    last_login: Option<Instant>,
    permissions: HashSet<String>,
}

impl User {
    fn new(id: u64, username: &str, email: &str) -> Self {
        User {
            id,
            username: username.to_string(),
            email: email.to_string(),
            created_at: Instant::now(),
            last_login: None,
            permissions: HashSet::new(),
        }
    }

    fn add_permission(&mut self, permission: &str) {
        self.permissions.insert(permission.to_string());
    }

    fn has_permission(&self, permission: &str) -> bool {
        self.permissions.contains(permission)
    }

    fn login(&mut self) {
        self.last_login = Some(Instant::now());
    }
}

// Define a message type for our message processing system
#[derive(Debug, Clone)]
struct Message {
    id: u64,
    sender_id: u64,
    recipient_id: Option<u64>,
    content: String,
    timestamp: Instant,
    is_read: bool,
}

// Define a database abstraction
struct Database {
    users: HashMap<u64, User>,
    messages: Vec<Message>,
    next_user_id: u64,
    next_message_id: u64,
}

impl Database {
    fn new() -> Self {
        Database {
            users: HashMap::new(),
            messages: Vec::new(),
            next_user_id: 1,
            next_message_id: 1,
        }
    }

    fn add_user(&mut self, username: &str, email: &str) -> Result<User, AppError> {
        // Validate input
        if username.is_empty() {
            return Err(AppError::InvalidInput("Username cannot be empty".to_string()));
        }
        if !email.contains('@') {
            return Err(AppError::InvalidInput("Invalid email format".to_string()));
        }

        // Check if username already exists
        for user in self.users.values() {
            if user.username == username {
                return Err(AppError::InvalidInput("Username already taken".to_string()));
            }
            if user.email == email {
                return Err(AppError::InvalidInput("Email already registered".to_string()));
            }
        }

        let id = self.next_user_id;
        self.next_user_id += 1;

        let user = User::new(id, username, email);
        self.users.insert(id, user.clone());
        
        Ok(user)
    }

    fn get_user(&self, user_id: u64) -> Option<&User> {
        self.users.get(&user_id)
    }

    fn get_user_mut(&mut self, user_id: u64) -> Option<&mut User> {
        self.users.get_mut(&user_id)
    }

    fn add_message(&mut self, sender_id: u64, recipient_id: Option<u64>, content: &str) -> Result<u64, AppError> {
        // Validate sender exists
        if !self.users.contains_key(&sender_id) {
            return Err(AppError::InvalidInput("Sender does not exist".to_string()));
        }

        // Validate recipient if specified
        if let Some(recipient_id) = recipient_id {
            if !self.users.contains_key(&recipient_id) {
                return Err(AppError::InvalidInput("Recipient does not exist".to_string()));
            }
        }

        let message_id = self.next_message_id;
        self.next_message_id += 1;

        let message = Message {
            id: message_id,
            sender_id,
            recipient_id,
            content: content.to_string(),
            timestamp: Instant::now(),
            is_read: false,
        };

        self.messages.push(message);
        Ok(message_id)
    }

    fn get_messages_for_user(&self, user_id: u64) -> Vec<&Message> {
        self.messages
            .iter()
            .filter(|msg| msg.recipient_id == Some(user_id) || msg.sender_id == user_id)
            .collect()
    }
}

// Application service layer
struct MessageService {
    db: Arc<Mutex<Database>>,
}

impl MessageService {
    fn new(db: Arc<Mutex<Database>>) -> Self {
        MessageService { db }
    }

    fn register_user(&self, username: &str, email: &str) -> Result<User, AppError> {
        let mut db = self.db.lock().unwrap();
        db.add_user(username, email)
    }

    fn send_message(&self, sender_id: u64, recipient_id: Option<u64>, content: &str) -> Result<u64, AppError> {
        let mut db = self.db.lock().unwrap();
        db.add_message(sender_id, recipient_id, content)
    }

    fn get_user_messages(&self, user_id: u64) -> Result<Vec<Message>, AppError> {
        let db = self.db.lock().unwrap();
        
        if !db.users.contains_key(&user_id) {
            return Err(AppError::InvalidInput("User does not exist".to_string()));
        }
        
        let messages = db.get_messages_for_user(user_id)
            .iter()
            .map(|&msg| msg.clone())
            .collect();
            
        Ok(messages)
    }

    fn login_user(&self, user_id: u64) -> Result<(), AppError> {
        let mut db = self.db.lock().unwrap();
        
        if let Some(user) = db.get_user_mut(user_id) {
            user.login();
            Ok(())
        } else {
            Err(AppError::InvalidInput("User does not exist".to_string()))
        }
    }
}

// Background worker for processing messages
struct MessageProcessor {
    db: Arc<Mutex<Database>>,
    running: Arc<Mutex<bool>>,
}

impl MessageProcessor {
    fn new(db: Arc<Mutex<Database>>) -> Self {
        MessageProcessor {
            db,
            running: Arc::new(Mutex::new(true)),
        }
    }

    fn start(&self) -> thread::JoinHandle<()> {
        let db_clone = self.db.clone();
        let running_clone = self.running.clone();
        
        thread::spawn(move || {
            while *running_clone.lock().unwrap() {
                // Process messages (e.g., mark as delivered, send notifications)
                {
                    let mut db = db_clone.lock().unwrap();
                    for message in &mut db.messages {
                        if !message.is_read {
                            // Simulate some processing work
                            thread::sleep(Duration::from_millis(10));
                        }
                    }
                }
                
                // Sleep before next processing cycle
                thread::sleep(Duration::from_secs(1));
            }
        })
    }

    fn stop(&self) {
        let mut running = self.running.lock().unwrap();
        *running = false;
    }
}

// Example of how to use the system
fn run_example() {
    let db = Arc::new(Mutex::new(Database::new()));
    let message_service = MessageService::new(db.clone());
    let processor = MessageProcessor::new(db.clone());
    
    // Start background processing
    let processor_handle = processor.start();
    
    // Register some users
    let alice = message_service.register_user("alice", "alice@example.com").unwrap();
    let bob = message_service.register_user("bob", "bob@example.com").unwrap();
    
    // Send messages
    message_service.send_message(alice.id, Some(bob.id), "Hello Bob!").unwrap();
    message_service.send_message(bob.id, Some(alice.id), "Hi Alice!").unwrap();
    
    // Login users
    message_service.login_user(alice.id).unwrap();
    message_service.login_user(bob.id).unwrap();
    
    // Get messages
    let alice_messages = message_service.get_user_messages(alice.id).unwrap();
    let bob_messages = message_service.get_user_messages(bob.id).unwrap();
    
    println!("Alice has {} messages", alice_messages.len());
    println!("Bob has {} messages", bob_messages.len());
    
    // Stop background processing
    processor.stop();
    processor_handle.join().unwrap();
}
