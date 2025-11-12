import pool from '../databases/mysql.js';
import {FieldPacket, RowDataPacket} from 'mysql2';

//keeping this extracted means an account can have multiple
//but it would need a uniaue constraitn on simething by doing something like seasons or like fantasy league
//thise should just be used to count totals information
//actual bets should be in a seperate table
export async function createUserBetInfoTable() {
  let query = `CREATE TABLE IF NOT EXISTS user_bet_info(
  id int PRIMARY KEY AUTO_INCREMENT,
  user_id BINARY(16) NOT NULL,
  points int DEFAULT 0 NOT NULL,
  balance FLOAT DEFAULT 20 NOT NULL,
  CONSTRAINT 
   fk_user_bet_info FOREIGN KEY (user_id) REFERENCES users(id)
   ON DELETE CASCADE
)`;
  await pool.query(query);
}
/**
 * Holds the users betting info like how many points the user accumulates
 * or how much gambits the user has to spend
 */
export interface UserBetInfo extends RowDataPacket {
  id: number;
  user_id: Buffer;
  points: number;
  balance: number;
}
let dbUpdateFunction = function () {
  console.log('db update');
};

import events from 'events';
import {PoolConnection} from 'mysql2/promise';
let update_bet_info = new events.EventEmitter();
update_bet_info.on('update', dbUpdateFunction);

async function getInfoByUuid(uuid: Buffer) {
  const [rows] = await pool.query<UserBetInfo[]>(
    'SELECT * FROM user_bet_info WHERE user_id = ?',
    [uuid]
  );
  return rows;
}
async function getLeaderboard(limit: number) {
  const [rows] = await pool.query<UserBetInfo[]>(
    'SELECT * FROM user_bet_info ORDER BY points DESC LIMIT ?',
    [limit]
  );
  return rows;
}
//get info by uuid then update from the primary key id, i think id should be indexed
async function updatePoints(
  add_points: number,
  id: number,
  con?: PoolConnection
) {
  const db = con ?? pool;
  const [rows] = await db.query(
    'UPDATE user_bet_info SET points = ? + points WHERE id = ?',
    [add_points, id]
  );
  return rows;
}
async function addbalance(balance: number, id: number, con?: PoolConnection) {
  const db = con ?? pool;
  if (balance < 0) {
    throw new Error('adding negative numbre');
  }
  const [rows] = await db.query(
    'UPDATE user_bet_info SET balance = balance + ?  WHERE id = ?',
    [balance, id]
  );
  return rows;
}
async function removebalance(balance: number, id: number) {
  if (balance < 0) {
    throw new Error('REmovign negative numbre');
  }
  const [rows] = await pool.query(
    'UPDATE user_bet_info SET balance = balance - ?  WHERE id = ?',
    [balance, id]
  );
  return rows;
}
async function createUserBetInfo(uuid: Buffer) {
  const [result] = await pool.query(
    'INSERT INTO user_bet_info (user_id) VALUES (?)',
    [uuid]
  );
  return result;
}

export default {
  createUserBetInfo,
  updatePoints,
  getInfoByUuid,
  getLeaderboard,
  removebalance,
  addbalance,
};
