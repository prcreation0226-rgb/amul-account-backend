const bcrypt = require('bcryptjs');

async function main() {
  const isMatch = await bcrypt.compare('123456', '$2b$10$fdWXl3J2a8dOJb4WB1vDwOj25U5T78Mk8prBl7pzOCzC9Fwu6auty');
  console.log('Does 123456 match?', isMatch);
}

main();
