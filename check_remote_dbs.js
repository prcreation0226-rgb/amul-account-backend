const mysql = require('mysql2/promise');

async function main() {
  try {
    const connection = await mysql.createConnection({
      host: 'sakura.proxy.rlwy.net',
      port: 36231,
      user: 'root',
      password: 'MclowGzSSfWBJBZlNEuhfaxRqsFsxksF',
    });

    const [rows, fields] = await connection.execute('SHOW DATABASES;');
    console.log("Databases on server:", rows.map(r => r.Database));
    await connection.end();
  } catch (error) {
    console.error("Error:", error);
  }
}

main();
