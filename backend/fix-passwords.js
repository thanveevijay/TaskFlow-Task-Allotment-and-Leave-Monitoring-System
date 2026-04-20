const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();
const Employee = require("./models/Employee");

async function fixPasswords() {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/taskdb");
    console.log("Connected to MongoDB. Resetting all passwords to 'demo123'...");
    
    // Create the correct hash for demo123 (using standard 10 salt rounds)
    const newHash = await bcrypt.hash("demo123", 10);
    
    const result = await Employee.updateMany({}, { $set: { password: newHash } });
    console.log(`Successfully forced ${result.modifiedCount} accounts to use password 'demo123'!`);
    
  } catch (err) {
    console.error("Error connecting to DB or fixing passwords:", err);
  } finally {
    mongoose.connection.close();
  }
}

fixPasswords();
