const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const EmployeeSchema = new mongoose.Schema({
  name: String,
  email: String,
  department: String,
  accessRole: String
});
const Employee = mongoose.model('Employee', EmployeeSchema);

async function dump() {
  await mongoose.connect(process.env.MONGO_URI);
  const emps = await Employee.find({}, 'name email department accessRole').sort({ department: 1, name: 1 });
  console.log(JSON.stringify(emps, null, 2));
  await mongoose.disconnect();
}
dump();
