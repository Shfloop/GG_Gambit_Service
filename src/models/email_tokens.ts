import pool from '../databases/mysql.js';
import {RowDataPacket} from 'mysql2';

//the hash might not be necessary
//
// but check if the token is still active by if it exists in the table
//then check expiration
//i might also want to assign an account to this not just email
//that way if email changes this isnt still active
export async function createEmailTokensTable() {
  let query = `CREATE TABLE IF NOT EXISTS email_tokens(
  id INT PRIMARY KEY NOT NULL AUTO_INCREMENT,
  user_id BINARY(16) NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  email VARCHAR(64) NOT NULL,
  conformation_type VARCHAR(32) NOT NULL,
  created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(email, conformation_type), 
  CONSTRAINT fk_user_token
   FOREIGN KEY (user_id) REFERENCES users(id)
   ON DELETE CASCADE
  
)`;
  await pool.query(query);
}
/**
 * Used to store JWT token info for any thing that needs email verification
 * password reset, account signpup verification...
 * use email controller to create and verify jwt tokens
 */
export interface EmailUserToken extends RowDataPacket {
  id: string;
  user_id: Buffer; // the
  token_hash: string;
  email: string;
  conformationType: EmailConformationString; // sign in  / email verification, new session/ emaail change? etc
  created: string;
}
export interface TokenOptions {
  userId: Buffer; // the
  token_hash: string;
  email: string;
  conformationType: EmailConformationString;
}
export enum EmailConformationString {
  verify_account = 'verify_account',
  password_reset = 'password_reset',
}

async function createEmailToken(options: TokenOptions) {
  const [result] = await pool.query(
    'INSERT INTO email_tokens (email, conformation_type, token_hash, user_id) VALUES (?, ?, ?, ?)',
    [
      options.email,
      options.conformationType,
      options.token_hash,
      options.userId,
    ]
  );
  return result;
}
async function getTokenByEmail(
  email: string,
  provider: EmailConformationString
) {
  const [rows] = await pool.query<EmailUserToken[]>(
    'SELECT * FROM email_tokens WHERE email = ? AND conformation_type = ?',
    [email, provider]
  );
  return rows;
}
export async function removeAuthByEmail(
  conformation_type: EmailConformationString,
  email: string
) {
  const [rows] = await pool.query(
    'DELETE FROM email_tokens WHERE email = ? AND conformation_type = ?',
    [email, conformation_type]
  );
  return rows;
}
export default {createEmailToken, getTokenByEmail, removeAuthByEmail};
