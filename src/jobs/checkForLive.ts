import {MatchStatus} from '@/models/matches.js';
import {DirectResponse, DirectVlrMatch, VlrMatches} from './index.js';
import match_model from '@/models/matches.js';
import config from '@/config/config.js';
import {createAnonymousTask, createTask} from './createTask.js';
import {PayloadBody} from '@/app.js';

/**
 *
 * @param vlr_match the new match info from vlr webscrapper
 * @param match our databse representation of a match
 * @returns true if the match is live or updated to live, false if not
 */
export async function updateMatch(
  for_match_id: number,
  failed_attempts: number
) {
  const match_p = match_model.getMatchById(for_match_id);
  const response = await fetch(
    `${config.scraper_url}/api/v1/matches/${for_match_id}`
  )
    .then((res1) => {
      if (!res1.ok) {
        console.log(res1);
        throw new Error('Failed to fetch scraper api matches');
      }
      return res1.json();
    })
    .then((res1) => {
      return res1 as DirectResponse;
    });

  //match date should now always be when the match should start so base reschedules off of it
  //unless Date.now is greater than match_start
  let now = new Date(Date.now());

  const match_date = new Date(response.data.utcDate);
  let year = now.getFullYear();
  if (now.getMonth() < match_date.getMonth()) {
    //if current month is less than match_date
    //it means its in the previous year
    //
    year -= 1;
  } else if (now.getMonth() > match_date.getMonth()) {
    year += 1;
    //if the current month is greater than the match date than its in the next year now december match in january
  }
  match_date.setFullYear(year);
  const [match] = await match_p; //juts get first element
  if (!match) {
    console.log(`match was not found canceling update ${for_match_id}`);
    return;
  }
  if (match_date && match.match_start.getTime() !== match_date.getTime()) {
    console.log(
      `match_start for match ${match.id} changed to ${match_date.toISOString()}`
    );
    failed_attempts = 0; //reset failed attempts if the time changes
    await match_model.updateMatchStart(match.id, match_date);
    //this needs to reschedule for a different time potentially
    //match.match_start.setTime(match_date.getTime()); // this match object doesnt persist so changing it is okay
    //
  }
  if (match.status === MatchStatus.live) {
    //the match is already live continue to next
    //but we need to make sure we stop propogating schedule checks
    return;
  }
  if ((response.status as MatchStatus) === MatchStatus.live) {
    await match_model.updateMatchStatus(match.id, MatchStatus.live);
    console.log(`updating match status to live ${match.id}`);
    //schedule a check for when we think the match would end
    //i think most matches are best of 3 so like hour and a half maybe

    const payload = {
      for_match_id: for_match_id,
      failed_attempts: 0,
    } as PayloadBody;
    await createTask(
      new Date(Math.max(match_date.getTime(), Date.now()) + 324000000),
      '/check_for_concluded',
      JSON.stringify(payload) //just include the match id even though its not used
    );
    return;
  }
  //if match status is not live yet reschedule to run again
  if (for_match_id < 0 || failed_attempts < 0) {
    return; //call was intended to run once and immedietly
  }
  if (failed_attempts > 20) {
    console.log(
      `Match ${for_match_id} Failed to update to live do somethign about it`
    );
    return;
  }
  //check if the match_start changed
  const base_time =
    match_date.getTime() < Date.now() ? Date.now() : match_date.getTime();
  //this is needed if its rescheduled
  //if the match still hasnt starter and now has passes use now
  let execution_time = new Date(
    base_time + 60000 + Math.pow(2, Math.min(failed_attempts, 5)) * 10000 //6 minute updates after 5 attempts
  ); // add a minute and try again
  const payload = {
    for_match_id: for_match_id,
    failed_attempts: failed_attempts + 1,
  } as PayloadBody;
  try {
    await createAnonymousTask(
      execution_time,
      '/check_upcoming_to_live',
      JSON.stringify(payload)
    );
  } catch (err) {
    console.log(err);
  }
}
