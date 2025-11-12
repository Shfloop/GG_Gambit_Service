//database calls for users

import pool from '../databases/mysql.js';
import {FieldPacket, RowDataPacket} from 'mysql2';
import {UnverifiedUser} from './unverifiedUser.js';

export async function createUserTable() {
  let query = `CREATE TABLE IF NOT EXISTS users(
  id BINARY(16) PRIMARY KEY,
  email VARCHAR(64) NOT NULL,
  username VARCHAR(32) UNIQUE NOT NULL,
  display_name VARCHAR(32),
  avatar VARCHAR(32),
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP

)`;
  await pool.query(query);
}
/**
 * All information about a user account and profile
 * does not include information relating to bets
 * This is the primary table for users that authProvider relies on
 */
export interface User extends RowDataPacket {
  id: Buffer; //16 byte number  i think keeping it as a string is fine just not url safe
  email: string;
  username: string;
  display_name: string | null; // show username if undefined
  avatar: string | null; //the file id 32 bit number hashed back to file path
  email_verified: boolean; //just move this here instaed of making a whole new table it only needs to be checked when creating a session
  created: string;
  updated: string;
}

export interface UserOptions {
  email: string;
  username: string;
  display_name: string | null; // show username if undefined
  avatar: string | null; //the file id 32 bit number hashed back to file path
}

// import {v4 as uuidv4} from 'uuid';
// export function generateUUIDBuffer(): Buffer {
//   const uuid = uuidv4().replace(/-/g, '');
//   return Buffer.from(uuid, 'hex');
// }
async function getUserByEmail(email: string) {
  const [rows] = await pool.query<User[]>(
    'SELECT * FROM users WHERE email = ?',
    [email]
  );
  return rows;
}
async function getUserByUuid(id: Buffer) {
  const [rows] = await pool.query<User[]>('SELECT * FROM users WHERE id = ?', [
    id,
  ]);
  return rows;
}
export async function getUserByUsername(username: string) {
  const [rows] = await pool.query<User[]>(
    'SELECT * FROM users WHERE username = ?',
    [username]
  );
  return rows;
}
async function createUser(user_options: UserOptions) {
  const [result] = await pool.query(
    'INSERT INTO users (id, email, username, display_name, avatar) VALUES (UUID_TO_BIN(UUID()), ?, ?, ?, ?)',
    [
      user_options.email,
      user_options.username,
      user_options.display_name,
      user_options.avatar,
    ]
  );
  return result;
}
async function createUserWithUUID(user_options: UserOptions, uuid: Buffer) {
  const [result] = await pool.query(
    'INSERT INTO users (id, email, username, display_name, avatar) VALUES (?, ?, ?, ?, ?)',
    [
      uuid,
      user_options.email,
      user_options.username,
      user_options.display_name,
      user_options.avatar,
    ]
  );
  return result;
}
interface UUID extends RowDataPacket {
  id: Buffer;
}

async function updateUserEmailVerification(
  email_verified: boolean,
  id: Buffer
) {
  const [rows] = await pool.query(
    'UPDATE users SET email_verified = ? WHERE id = ?',
    [email_verified, id]
  );
  return rows;
}
async function updateUsername(username: string, id: Buffer) {
  const [rows] = await pool.query(
    'UPDATE users SET username = ? WHERE id = ?',
    [username, id]
  );
  return rows;
}
async function updateDisplayName(display_name: string, id: Buffer) {
  const [rows] = await pool.query(
    'UPDATE users SET display_name = ? WHERE id = ?',
    [display_name, id]
  );
  return rows;
}
async function updateAvatar(avatar: string, id: Buffer) {
  const [rows] = await pool.query('UPDATE users SET avatar = ? WHERE id = ?', [
    avatar,
    id,
  ]);
  return rows;
}
async function removeUserByUUID(uuid: Buffer) {
  const [result] = await pool.query('DELETE FROM users WHERE id = ?', [uuid]);
  return result;
}

export default {
  getUserByEmail,
  getUserByUuid,
  createUserWithUUID,
  updateUserEmailVerification,
  removeUserByUUID,
  getUserByUsername,
  updateAvatar,
  updateDisplayName,
  updateUsername,
};
