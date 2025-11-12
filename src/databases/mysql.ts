import mysql from 'mysql2/promise';
import {db} from '../config/config.js';

console.log(`HELP ME (${db.DB_USER}),(${db.DB_PASS})`);
const pool = mysql.createPool({
  host: db.DB_HOST,
  user: db.DB_USER,
  password: db.DB_PASS,
  database: db.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});
pool
  .getConnection()
  .then((connection) => {
    console.log('Database connected successfully');
    connection.release(); // Release the connection back to the pool
  })
  .catch((err) => {
    console.error('Error connecting to database:', err);
  });

export default pool;
