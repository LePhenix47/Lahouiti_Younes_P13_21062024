-- Create Addresses table
CREATE TABLE Addresses (
    AddressID INT PRIMARY KEY AUTO_INCREMENT,
    Street VARCHAR(255) NOT NULL,
    City VARCHAR(100) NOT NULL,
    State VARCHAR(100) NOT NULL,
    ZipCode VARCHAR(20) NOT NULL,
    Country VARCHAR(100) NOT NULL
);

-- Create Clients table with a foreign key to Addresses
CREATE TABLE Clients (
    ClientID INT PRIMARY KEY AUTO_INCREMENT,
    FirstName VARCHAR(100) NOT NULL,
    LastName VARCHAR(100) NOT NULL,
    Email VARCHAR(255) NOT NULL UNIQUE,
    PhoneNumber VARCHAR(20) NOT NULL,
    AddressID INT,
    FOREIGN KEY (AddressID) REFERENCES Addresses(AddressID)
);

-- Create Employees table with a foreign key to Addresses
CREATE TABLE Employees (
    EmployeeID INT PRIMARY KEY AUTO_INCREMENT,
    FirstName VARCHAR(100) NOT NULL,
    LastName VARCHAR(100) NOT NULL,
    Email VARCHAR(255) NOT NULL UNIQUE,
    PhoneNumber VARCHAR(20) NOT NULL,
    JobTitle VARCHAR(100) NOT NULL,
    AddressID INT,
    FOREIGN KEY (AddressID) REFERENCES Addresses(AddressID)
);

-- Create Vehicles table
CREATE TABLE Vehicles (
    VehicleID INT PRIMARY KEY AUTO_INCREMENT,
    Brand VARCHAR(100) NOT NULL,
    Model VARCHAR(100) NOT NULL,
    Year INT NOT NULL,
    LicensePlate VARCHAR(20) NOT NULL UNIQUE,
    VIN VARCHAR(17) NOT NULL UNIQUE,
    ACRISSCode CHAR(4) NOT NULL,
    Status VARCHAR(50) NOT NULL
);

-- Create Agencies table with a foreign key to Addresses
CREATE TABLE Agencies (
    AgencyID INT PRIMARY KEY AUTO_INCREMENT,
    Name VARCHAR(255) NOT NULL,
    AddressID INT,
    FOREIGN KEY (AddressID) REFERENCES Addresses(AddressID)
);

-- Create Rentals table with foreign keys to Clients, Agencies, and Vehicles
CREATE TABLE Rentals (
    RentalID INT PRIMARY KEY AUTO_INCREMENT,
    ClientID INT,
    AgencyID INT,
    VehicleID INT,
    RentalStartDate DATE NOT NULL,
    RentalEndDate DATE NOT NULL,
    TotalAmount DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (ClientID) REFERENCES Clients(ClientID),
    FOREIGN KEY (AgencyID) REFERENCES Agencies(AgencyID),
    FOREIGN KEY (VehicleID) REFERENCES Vehicles(VehicleID)
);

-- Conversations Table
CREATE TABLE Conversations (
    ConversationID INT PRIMARY KEY AUTO_INCREMENT,
    ClientID INT,
    EmployeeID INT,
    ConversationType ENUM('Messaging', 'Chat', 'Videoconference') NOT NULL,
    HasClosed BOOLEAN NOT NULL DEFAULT FALSE,
    RatingGrade INT,
    CHECK (RatingGrade >= 0 AND RatingGrade <= 5),
    FOREIGN KEY (ClientID) REFERENCES Clients(ClientID),
    FOREIGN KEY (EmployeeID) REFERENCES Employees(EmployeeID)
);

-- Messaging Table
CREATE TABLE Messaging_messages (
    MessageID INT PRIMARY KEY AUTO_INCREMENT,
    MessageText TEXT NOT NULL,
    SentDateTime DATETIME NOT NULL,
    SenderType ENUM('Client', 'Employee') NOT NULL,
    MessageLogID INT NOT NULL,
    FOREIGN KEY (MessageLogID) REFERENCES Messaging_logs(MessageLogID)
);

-- Messaging_logs Table
CREATE TABLE Messaging_logs (
    MessageLogID INT PRIMARY KEY AUTO_INCREMENT,
    ConversationID INT NOT NULL,
    StartDateTime DATETIME NOT NULL,
    EndDateTime DATETIME NOT NULL,
    FOREIGN KEY (ConversationID) REFERENCES Conversations(ConversationID)
);

-- Create Chat_messages table to store chat logs for each conversation
CREATE TABLE Chat_messages (
    ChatMessageID INT PRIMARY KEY AUTO_INCREMENT,
    ChatLogID INT,
    MessageText TEXT NOT NULL,
    SentDateTime DATETIME NOT NULL,
    SenderType ENUM('Client', 'Employee') NOT NULL,
    FOREIGN KEY (ChatLogID) REFERENCES Chat_logs(ChatLogID)
);

-- Create Chat_logs table with foreign keys to Conversations
CREATE TABLE Chat_logs (
    ChatLogID INT PRIMARY KEY AUTO_INCREMENT,
    ConversationID INT NOT NULL,
    StartDateTime DATETIME NOT NULL,
    EndDateTime DATETIME NOT NULL,
    FOREIGN KEY (ConversationID) REFERENCES Conversations(ConversationID)
);

-- Create Videoconference_logs table with foreign keys to Conversations
CREATE TABLE Videoconference_logs (
    VideoconferenceLogID INT PRIMARY KEY AUTO_INCREMENT,
    ConversationID INT NOT NULL,
    StartDateTime DATETIME NOT NULL,
    EndDateTime DATETIME NOT NULL,
    Duration INT NOT NULL,
    VideoLink VARCHAR(255) NOT NULL,
    FOREIGN KEY (ConversationID) REFERENCES Conversations(ConversationID)
);