import {MatchStatus} from '@/models/matches.js';
import {VlrMatches} from './index.js';
import match_model from '@/models/matches.js';
import config from '@/config/config.js';
import {createTask} from './createTask.js';
import {PayloadBody} from '@/app.js';

/**
 * Checks all of our database upcoming matches and checks vlr to see if they started
 */
export async function checkAllUpcomingMatches() {
  await checkUpcomingGoneLive(-1, 0);
}
/**
 * Used inside a schedule
 * Goes through vlr_matches and updates any in our database that are upcoming but should be live
 * this should just check vlr.gg for the specific match id but wed need to build a scraper for that
 * so for now it juts checks every match
 * @param for_match_id  Match id its inteded to search for. -1  for a search that doesnt propogate
 * @param failed_attempts
 * @returns
 */
export async function checkUpcomingGoneLive(
  for_match_id: number,
  failed_attempts: number
) {
  //funciton used for checking if a match is not live
  //should be run in background task scheduled at the timestart of the match + a minute
  //this can also be used in a route incase someone wants to refreshs to get better updates
  //this should check vlr matches and move a match into live status
  //i dont need to worry about double writes in case a con job and route try to do the same thing

  //this should also just use a single match api but it would need to be made
  //but i dont care enough to make it so just scedule this whenever a new upcoming match entry is made
  console.log(`running update check ${for_match_id}`);
  const response = await fetch(`${config.scraper_url}/api/v1/matches`)
    .then((res1) => res1.json())
    .then((res1) => {
      return res1 as VlrMatches;
    });
  let match_updated = false;
  for (const match of response.data) {
    const team_a = match.teams[0];
    const team_b = match.teams[1];
    if (team_a.name === 'TBD' || team_b.name === 'TBD') continue; //some of them after still have names
    //find match in database from vlr id
    if ((match.status as MatchStatus) != MatchStatus.live) continue;
    //only do checks if its  alive match
    const id = parseInt(match.id);
    const existing_matches = await match_model.getMatchWithTeams(id);
    if (existing_matches.length != 0) {
      if (existing_matches[0].status === MatchStatus.live) {
        //the match is already live continue to next
        //but we need to make sure we stop propogating schedule checks
        if (existing_matches[0].match_id === for_match_id) {
          match_updated = true;
        }
        continue;
      }

      await match_model.updateMatchStatus(
        existing_matches[0].id,
        MatchStatus.live
      );
      //schedule match end checks an hour from finding out the game is live
      let execution_time = new Date(
        Math.round((Date.now() + 3600000) / 300000) * 300000
      ); // schedule for an hour in the 5 min timeslot timeslots of 5 minutes for retries so multiple requests can be supported

      await createTask(execution_time, '/check_for_concluded');
      if (id === for_match_id) match_updated = true;
    }
  }
  //if the match didnt go live at the expected time retry in a minute
  if (!match_updated) {
    if (for_match_id == -1) {
      return; //call was intended to run once and immedietly
    }
    if (failed_attempts > 20) {
      console.log(
        `Match ${for_match_id} Failed to update to live do somethign about it`
      );
      return;
    }
    let execution_time = new Date(Date.now() + 60000 * (failed_attempts + 1)); // add a minute and try again
    //do exponential backoff until failed
    const payload = {
      for_match_id: for_match_id,
      failed_attempts: failed_attempts + 1,
    } as PayloadBody;
    createTask(execution_time, JSON.stringify(payload));
  }
}
//i should populate matches but i guess i dont really want to populate database if noone ever checks what bets we have available
//so i guess leave inserting new Matches up to backend matches/info for now
// async function insertNewMatch() {
//   if (!match.timestamp) {
//     console.log('NO TIMESTAMP');
//     continue;
//   }
//   let a_id = await findTeamId(team_a.name, team_a.country);
//   let b_id = await findTeamId(team_b.name, team_b.country);

//   if (!a_id || !b_id) {
//     console.log(`COULD NOT FIND TEAM ID ${team_a.name}`);
//     continue;
//   }

//   let new_match: Match = {
//     id: parseInt(match.id),
//     team_a: a_id.id,
//     team_b: b_id.id,
//     odds: randomInt(-1024, 1024),
//     status: match.status as MatchStatus,
//     match_start: new Date(match.timestamp * 1000), //this needs to be in miliseconds and i think timestamp is in seconds
//   } as Match;
//   console.log(`created match ${match.id}, ${match.event}`);
//   await match_model.createMatchRow(new_match);
//   let te = await match_model.getMatchWithTeams(new_match.id);
//   if (te.length == 0) {
//     console.log('INSERTION ERROR');
//     continue;
//   }
//   if (te[0].status === MatchStatus.upcoming) {
//     let executionTime = new Date(
//       new_match.match_start.getTime() + 20000 // plus 20 seconds so its more likely that we dont have to check again
//     );
//     startUpcomingMatchSchedule(new_match.id, executionTime);
//   }
// }
