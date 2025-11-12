import {PoolConnection} from 'mysql2/promise';
import pool from '../databases/mysql.js';
import {FieldPacket, RowDataPacket} from 'mysql2';

export async function createMatchBetTable() {
  let query = `CREATE TABLE IF NOT EXISTS match_bet(
  id int PRIMARY KEY AUTO_INCREMENT,
  user_id BINARY(16) NOT NULL,
  match_id int NOT NULL,
  prediction CHAR(1) NOT NULL,
  bet FLOAT NOT NULL,
  payout FLOAT NOT NULL,
  ended boolean NOT NULL DEFAULT 0,
  bet_won boolean Default NULL,
  points_earned int NOT NULL DEFAULT 0,
  created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
)`;
  await pool.query(query);
}
/**
 * A bet a user placed on a match
 * the id is the primary key given to a match by vlr.gg so it can be used on their site too
 *
 */
export interface MatchBet extends RowDataPacket {
  id: number;
  user_id: Buffer;
  match_id: number;
  prediction: string; //char 1
  bet: number;
  payout: number;
  ended: boolean; //tells if it should look in match results
  bet_won: boolean | null; // null if the bet hasnt ended
  points_earned: number;
  created: string;
}
export interface MatchBetOptions {
  user_id: Buffer;
  match_id: number;
  prediction: string; //char 1
  bet: number;
  payout: number;
}

async function getInfoByUuid(uuid: Buffer) {
  const [rows] = await pool.query<MatchBet[]>(
    'SELECT * FROM match_bet WHERE user_id = ?',
    [uuid]
  );
  return rows;
}
async function allActiveBets() {
  const [rows] = await pool.query<MatchBet[]>(
    'SELECT * FROM match_bet WHERE ended = 0',
    []
  );
  return rows;
}
async function getBetsByMatch(match_id: number) {
  const [rows] = await pool.query<MatchBet[]>(
    'SELECT * FROM match_bet WHERE user_id = ?',
    [match_id]
  );
  return rows;
}
async function betConcluded(
  id: number,
  bet_won: boolean,
  points_earned: number,
  con?: PoolConnection
) {
  const [rows] = await pool.query<MatchBet[]>(
    'UPDATE match_bet SET ended = 1, bet_won = ?, points_earned = ? WHERE id = ?',
    [bet_won, points_earned, id]
  );
  return rows;
}
async function createUserBet(options: MatchBetOptions) {
  const [result] = await pool.query(
    'INSERT INTO match_bet(user_id, match_id, prediction, bet, payout) VALUES (?,?,?,?,?)',
    [
      options.user_id,
      options.match_id,
      options.prediction,
      options.bet,
      options.payout,
    ]
  );
  return result;
}

export default {
  createUserBet,
  getInfoByUuid,
  getBetsByMatch,
  betConcluded,
  allActiveBets,
};
