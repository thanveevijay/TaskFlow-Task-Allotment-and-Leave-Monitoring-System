const mongoose = require("mongoose");
const Employee = require("./models/Employee");
require("dotenv").config();

async function restoreNames() {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/taskdb");
  console.log("Connected to MongoDB for restoration...");

  const employees = await Employee.find({});
  let count = 0;

  for (const emp of employees) {
    if (!emp.email || !emp.email.includes("@")) continue;

    // Extract name from email (e.g., nikhil.rao.1@taskflow.io -> Nikhil Rao)
    const handle = emp.email.split("@")[0];
    const parts = handle.split(".").filter(p => isNaN(p)); // Remove the numbers

    if (parts.length >= 2) {
      const firstName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
      const lastName = parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
      const fullName = `${firstName} ${lastName}`;

      await Employee.findByIdAndUpdate(emp._id, { name: fullName });
      count++;
    }
  }

  console.log(`Successfully restored names for ${count} employees!`);
  process.exit(0);
}

restoreNames().catch(err => {
  console.error(err);
  process.exit(1);
});
