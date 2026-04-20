const fs = require('fs');
console.log("Checking server.js syntax...");
try {
  const serverCode = fs.readFileSync('backend/server.js', 'utf8');
  // Simple check for eval
  // Actually let's just require it to see if it throws!
  // Wait, requiring it will start the server.
} catch (e) {
  console.log(e);
}
