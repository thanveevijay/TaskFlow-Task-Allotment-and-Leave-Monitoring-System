const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();
const Employee = require("./models/Employee");

async function checkDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/taskdb");
    console.log("Connected to MongoDB.");
    
    const count = await Employee.countDocuments();
    console.log(`Total Employees in DB: ${count}`);
    
    if (count === 0) {
      console.log("DATABASE IS EMPTY! seedIfEmpty hasn't run or couldn't insert.");
      process.exit(0);
    }

    const employees = await Employee.find().select("email accessRole password");
    console.log("\n--- List of Emails in DB ---");
    employees.slice(0, 10).forEach(e => {
      console.log(`Email: ${e.email} | Role: ${e.accessRole} | PasswordHash: ${e.password ? e.password.substring(0, 15) + "..." : "Missing!"}`);
    });
    if (employees.length > 10) console.log(`... and ${employees.length - 10} more`);

    // Test password check
    const testDoc = employees[0];
    const isMatch = await bcrypt.compare("demo", testDoc.password);
    console.log(`\nTesting 'demo' password against ${testDoc.email}: ${isMatch ? "SUCCESS!" : "FAILED - does not match 'demo'"}`);
    
    if (!isMatch && testDoc.password === "demo") {
         console.log("WAIT! The password is saved as plain text 'demo' without hash!");
    }
  } catch (err) {
    console.error("Error connecting to DB or checking:", err);
  } finally {
    mongoose.connection.close();
  }
}

checkDB();
