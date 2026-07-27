const fs = require('fs');

const path = 'C:\\Users\\kiaan\\Desktop\\os -booking\\account backend\\prisma\\schema.prisma';
let content = fs.readFileSync(path, 'utf8');

// Regex to find @relation(fields: [companyId], references: [id]) without onDelete: Cascade
const regex = /@relation\(\s*fields:\s*\[companyId\],\s*references:\s*\[id\]\s*\)(?!\s*,\s*onDelete:\s*Cascade)/g;

content = content.replace(regex, '@relation(fields: [companyId], references: [id], onDelete: Cascade)');

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully updated schema.prisma');
