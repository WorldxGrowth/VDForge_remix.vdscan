const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: '127.0.0.1',
  user: 'RemixVDscan',
  password: 'Remixvdscan@#2002',
  database: 'remixvdscan',
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

pool.getConnection()
  .then(conn => {
    console.log('✅ MySQL Connected');
    conn.release();
  })
  .catch(err => {
    console.error('❌ MySQL Error:', err.message);
  });

module.exports = pool;
