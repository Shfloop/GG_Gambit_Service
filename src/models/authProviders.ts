//database calls for users

import pool from '../databases/mysql.js';
import {RowDataPacket} from 'mysql2';
import {UnverifiedUser} from './unverifiedUser.js';

export async function createAuthProvidersTable() {
  let query = `CREATE TABLE IF NOT EXISTS auth_providers(
  id int PRIMARY KEY AUTO_INCREMENT,
  user_id BINARY(16) NOT NULL,
  email VARCHAR(64) NOT NULL,
  provider_name VARCHAR(32) NOT NULL,
  provider_id VARCHAR(128) NOT NULL,
  hash VARCHAR(255),
  salt VARCHAR(32),
  created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE( provider_name, provider_id),
  CONSTRAINT 
   fk_user FOREIGN KEY (user_id) REFERENCES users(id)
   ON DELETE CASCADE
)`;
  await pool.query(query);
}
/**
 * Auth Provider is a table that stores authentication info for a user
 * It is linked to the users table and is deleted when a user is removed
 * a user can have multiple AuthProviders but only one from each type
 * ie have a LocalAuth email password and then link google sign in to the account
 */
export interface AuthProvider extends RowDataPacket {
  id: number;
  user_id: Buffer; // not url safe 16 byte binary data references User
  email: string; //email is not null it will use the email from the oauth2 sign in
  provider_name: string; //password, google, other oath2 sign in
  provider_id: string;
  hash: string | null;
  salt: string | null; //might just want to convert the hash and salt into the linux format of hashtype:salt:hash
  created: string;
  updated: string;
}
export interface AuthOptions {
  user_id: Buffer;
  email: string; //email is not null it will use the email from the oauth2 sign in
  provider_name: string; //password, google, other oath2 sign in
  provider_id: string;
  hash: string | null;
  salt: string | null; //might just want to convert the hash and salt into the linux format of hashtype:salt:hash
}
export enum AuthProvidersStrings {
  LocalAuth = 'LocalAuth',
  Google = 'Google',
}
//use Pick<> Omit<> and Partial to get variations

async function getAuthByProviderId(
  provider_id: string,
  provider: AuthProvidersStrings
) {
  const [rows] = await pool.query<AuthProvider[]>(
    'SELECT * FROM auth_providers WHERE provider_id = ? AND provider_name = ?',
    [provider_id, provider]
  );
  return rows;
}
async function getAuthByEmail(email: string, provider: AuthProvidersStrings) {
  const [rows] = await pool.query<AuthProvider[]>(
    'SELECT * FROM auth_providers WHERE email = ? AND provider_name = ?',
    [email, provider]
  );
  return rows;
}
async function getAnyAuthByEmail(email: string) {
  const [rows] = await pool.query<AuthProvider[]>(
    'SELECT * FROM auth_providers WHERE email = ?',
    [email]
  );
  return rows;
}

async function getUserByEmail(email: string) {
  const [rows] = await pool.query<AuthProvider[]>(
    'SELECT * FROM auth_providers WHERE email = ?',
    [email]
  );
  return rows;
}
async function getByIndexedEmail<K extends keyof AuthProvider>(
  email: string,
  columns: K[]
): Promise<Pick<AuthProvider, K>[]> {
  const cols = columns.join(', ');
  const sql = 'SELECT ${cols} FROM auth_providers WHERE email = ?';
  const [rows] = await pool.query<AuthProvider[]>(sql, [email]);
  return rows as Pick<AuthProvider, K>[];
}

async function createAuthEntry(auth_options: AuthOptions) {
  const [result] = await pool.query(
    'INSERT INTO auth_providers (user_id, email, provider_name, provider_id, hash, salt) VALUES (?, ?, ?, ?, ?, ?);',
    [
      auth_options.user_id,
      auth_options.email,
      auth_options.provider_name,
      auth_options.provider_id,
      auth_options.hash,
      auth_options.salt,
    ]
  );
  return result;
}
//remove only gives the number of affected rows not the row deleted
async function removeAuthByProviderID(
  provider_name: AuthProvidersStrings,
  provider_id: string
) {
  const [rows] = await pool.query(
    'DELETE FROM auth_providers WHERE provider_id = ? AND provider_name = ?',
    [provider_id, provider_name]
  );
  return rows;
}

export default {
  getAuthByProviderId,
  getUserByEmail,
  createAuthEntry,
  removeAuthByProviderID,
  getAuthByEmail,
  getAnyAuthByEmail,
};
