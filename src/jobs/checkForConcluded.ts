import bet_model, {MatchBet} from '@/models/match_bet.js';
import results_model, {ResultOptions} from '@/models/match_results.js';
import match_model, {Match, MatchStatus} from '@/models/matches.js';
import pool from '@/databases/mysql.js';
import info_model from '@/models/userBetInfo.js';
import config from '@/config/config.js';
import {VlrMatches} from './index.js';
import {endMatchBetUpdates} from './forceBetUpdates.js';
import {createTask} from './createTask.js';
/**
 * Checks if any current live matches exists if not it means its ended
 * Queries vlr results to get end info and moves the match from matches to results table
 * Emits an event with the match id so a system can update bets
 * @param live_matches Matches in matches table that have MachStatus Live
 * @param matches All vlr_match ids returned from api/v1/matches
 * @returns
 */
//need to test for orphaned match data somewhere else if we have a match in matches table that doesnt exist in results but it should be finished
export async function checkForLiveConclusions() {
  //this should really just be checking a single match but then id have to make an scraping api for a single match
  //for each live match check if it exists in number
  //number is only like 40 long so just do array although in javascript im not sure how well that would translate

  //make the promise here so the web fetch can start aswell

  const live_matches_promise = match_model.getAllMatches();
  const live_matches = await live_matches_promise;
  if (live_matches.length == 0) return;
  console.log('checking for ended matches');
  const response = await fetch(`${config.scraper_url}/api/v1/results`)
    .then((res) => res.json())
    .then((res) => {
      return res as VlrMatches;
    });
  //go through matches scheduled or live
  //this restarts if there are any live matches in our database that havent been in the response
  let should_retry: boolean = false;
  for (const match of live_matches) {
    //vlr results should only have finished matches
    should_retry = should_retry || (await findMatchingResult(match, response));
  }
  if (should_retry) {
    let execution_time = new Date(
      Math.round((Date.now() + 300000) / 300000) * 300000
    ); // add 5 minutes and try again only allow timeslots of 5 minutes for retries so multiple requests can be supported
    try {
      await createTask(execution_time, '/check_for_concluded');
    } catch (err) {
      console.log(err);
    }
  }
}
async function findMatchingResult(
  match: Match,
  response: VlrMatches
): Promise<boolean> {
  for (const vlr_result of response.data) {
    if (parseInt(vlr_result.id) !== match.id) continue;
    //found a match in results
    //remove the entry from the matches and put it into results with updated info
    let a = vlr_result.teams[0].score;
    let b = vlr_result.teams[1].score;
    if (a == null || b == null) {
      console.log('return result equals');
      console.log(match);
      console.log(vlr_result);
      continue;
    }
    //use a transaction so we dont lose any match data if anything fails
    let options: ResultOptions = {
      score_a: parseInt(a),
      score_b: parseInt(b),
      event: vlr_result.event,
      tournament: vlr_result.tournament,
      img: vlr_result.img,
    };
    const con = await pool.getConnection();
    await con.beginTransaction();
    try {
      await match_model.removeMatch(match.id, con);

      await results_model.createResultRow(match, options, con);
      await con.commit();
    } catch (err) {
      console.log('rollback');
      console.log(err);
      await con.rollback();
    } finally {
      con.release();
    }
    //todo emit an event for updating peoples bets
    //or just do it here since this is being run async in schedule
    console.log(`match ${match.id} ended updaing bets for it`);
    await endMatchBetUpdates(
      match.id,
      options.score_a > options.score_b ? 'a' : 'b'
    );
    return false;
  }
  //if a live match exists and a match wasnt found in results
  //return true to let the func know it needs to check again in the next timeslot
  if (match.status === MatchStatus.live) {
    return true;
  }
  return false;
}
