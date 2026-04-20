const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();
const Employee = require("./models/Employee");

async function checkDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/taskdb");
    console.log("Connected to MongoDB.");
    
    const count = await Employee.countDocuments();
    
    if (count === 0) {
      console.log("DATABASE IS EMPTY! seedIfEmpty hasn't run or couldn't insert.");
      process.exit(0);
    }

    const employees = await Employee.find().select("email accessRole password").limit(10);
    const testDoc = employees[0];
    const isMatchDemo = await bcrypt.compare("demo", testDoc.password);
    const isMatchDemo123 = await bcrypt.compare("demo123", testDoc.password);
    console.log(`\nTesting 'demo' password against ${testDoc.email}: ${isMatchDemo ? "SUCCESS!" : "FAILED"}`);
    console.log(`Testing 'demo123' password against ${testDoc.email}: ${isMatchDemo123 ? "SUCCESS!" : "FAILED"}`);
    
  } catch (err) {
    console.error("Error connecting to DB or checking:", err);
  } finally {
    mongoose.connection.close();
  }
}

checkDB();
