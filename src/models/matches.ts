//will have upcoming and live matches from vlr.gg scraper
//needs to be updated every so often
//once match is concluded move it to results db
//cause the vlr scraper cant get out of date results
//will need to do async task to go through upcoming / live and check if they are finished / add new upcoming matches
//this probably wont be very big table and would proabayl juts be redis

import {PoolConnection} from 'mysql2/promise';
import pool from '../databases/mysql.js';
import {FieldPacket, RowDataPacket} from 'mysql2';
//i could maybe just store matches that people placed bets on
// and then only store results from that
//cause the path will be make bet fetches matches you can bet on from the vlr.gg
//placing a bet will add it to this table for reference
//
export async function createMatchesTable() {
  let query = `CREATE TABLE IF NOT EXISTS matches(
  id int PRIMARY KEY ,
  team_a int NOT NULL,
  team_b int NOT NULL,
  odds int NOT NULL,
  status ENUM('LIVE', 'Upcoming') NOT NULL,
  match_start TIMESTAMP NOT NULL
)`;
  await pool.query(query);
}
//only created when a broswer views upcoming matches
//goes through and finds in databse or creates an entry for it
//calculating odds with it for both teams
//how should live games be handled
// i guess just have the server have an api route to show matches and if its live just passthrough the score
// or i could have the browser make a request have the server fetch updates
// i have to make a fetch to vlr to see if a match ended and id be getting the info anyway
// the browser should just get live updates through web scraper

// ithink this is all thats needed to store for matches
//browser request matches
//server checks vlrgg
//checks if any updates are needed in db
//calculates odds if new match is upcoming
//checks for live status change and updates db so no one else can bet on it
//passes through the data and includes the calculated odds
//might also be beneficial to do it in two steps. immidiatly pass through the api request match data from vlr
//then add the odds from out db / newly calculatd ones
//needs to add
/**
 * This table stores upcoming or live matches for out site
 * this is where we place info like what the odds are of the team winning
 * this is used in /api/matches/info
 * This does not retrieve all information on a match
 * just the ids that arent retrived by the vlresports matches api
 */
export interface Match extends RowDataPacket {
  id: number; //vlr.gg key
  team_a: number; //static teams key
  team_b: number;
  odds: number; // likelyhood of a team winning INT 0 is 50/50 - team_1,  + team_b divide by some scalar to get percent
  status: MatchStatus; //LIVE or UPCOMING only bet on upcoming
  match_start: Date;
}
export enum MatchStatus {
  live = 'LIVE',
  upcoming = 'Upcoming',
}

async function getMatchById(id: number) {
  const [rows] = await pool.query<Match[]>(
    'SELECT * FROM matches WHERE id = ?',
    [id]
  );
  return rows;
}
export interface MatchWithTeams extends RowDataPacket {
  match_id: number;
  a_id: number;
  a_name: string;
  a_img: string;
  b_id: number;
  b_name: string;
  b_img: string;
  odds: number;
  status: MatchStatus;
  match_start: Date;
}
async function getMatchWithTeams(id: number) {
  const [rows] = await pool.query<MatchWithTeams[]>(
    `SELECT 
      m.id as match_id,
      ta.id as a_id,
      ta.name as a_name,
      ta.img as a_img,
      tb.id as b_id,
      tb.name as b_name,
      tb.img as b_img,
      m.odds,
      m.status,
      m.match_start
      FROM matches m
      join static_teams ta on m.team_a = ta.id
      join static_teams tb on m.team_b = tb.id
      WHERE m.id = ?
    `,
    [id]
  );
  return rows;
}
async function getAllMatches() {
  const [rows] = await pool.query<Match[]>('SELECT * FROM matches', []);
  return rows;
}
async function getMatchesByStatus(status: MatchStatus) {
  const [rows] = await pool.query<Match[]>(
    'SELECT * FROM matches WHERE status = ? ',
    [status]
  );
  return rows;
}
async function updateMatchStatus(id: number, status: MatchStatus) {
  const [rows] = await pool.query<Match[]>(
    'UPDATE matches SET status = ? WHERE id = ?',
    [status, id]
  );
  return rows;
}
async function updateMatchStart(id: number, match_start: Date) {
  const [rows] = await pool.query<Match[]>(
    'UPDATE matches SET match_start = ? WHERE id = ?',
    [match_start, id]
  );
  return rows;
}

//want more info go through the scraper to get players
async function createMatchRow(options: Match) {
  const [result] = await pool.query(
    'INSERT INTO matches (id, team_a, team_b, odds, status, match_start) VALUES (?,?,?,?,?,?)',
    [
      options.id,
      options.team_a,
      options.team_b,
      options.odds,
      options.status,
      options.match_start,
    ]
  );
  return result;
}
async function removeMatch(id: number, con: PoolConnection) {
  const db = con ?? pool;
  const [result] = await db.query('DELETE FROM matches WHERE id = ?', [id]);
  return result;
}
export default {
  getMatchById,
  createMatchRow,
  updateMatchStatus,
  removeMatch,
  getMatchWithTeams,
  getMatchesByStatus,
  getAllMatches,
  updateMatchStart,
};
