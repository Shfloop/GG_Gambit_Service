import bet_model, {MatchBet} from '@/models/match_bet.js';
import results_model from '@/models/match_results.js';
import match_model from '@/models/matches.js';
import pool from '@/databases/mysql.js';
import info_model from '@/models/userBetInfo.js';

export async function updateAllMatchBets() {
  console.log('updating all active bets');
  const bets = await bet_model.allActiveBets();
  for (const bet of bets) {
    const result = await results_model.getResultById(bet.match_id);
    if (result.length == 0) {
      const existing_match = await match_model.getMatchById(bet.match_id);
      if (existing_match.length == 0) {
        console.log(
          `bet ${bet.id} does not have a finished match do something about it`
        );
      }

      continue;
    }
    const match = result[0];
    await updateUserBet(bet, match.score_a > match.score_b ? 'a' : 'b');
  }
}

/**
 * This needs to only be run by one task
 * @param bet
 * @param winner
 * @returns
 */
async function updateUserBet(bet: MatchBet, winner: string) {
  if (bet.ended) return; //this shoudlnt happen unless this is called multiple times for a single match which shouldnt happen
  let info = await info_model.getInfoByUuid(bet.user_id);
  const con = await pool.getConnection();
  await con.beginTransaction();

  try {
    var points = bet.payout;
    const bet_won = bet.prediction === winner ? true : false;
    if (bet_won) {
      points *= 2.5;
      await info_model.addbalance(bet.payout, info[0].id, con);
    }
    //move this to the end so if any errors applying the points or balance it doesnt set the bet to ended
    await info_model.updatePoints(Math.round(points), info[0].id, con);
    await bet_model.betConcluded(bet.id, bet_won, points, con);
    await con.commit();
    console.log(`updated bet ${bet.bet}`);
  } catch (err) {
    console.log('rollback');
    console.log(err);
    await con.rollback();
  } finally {
    con.release();
  }
}

export async function endMatchBetUpdates(match_id: number, winner: string) {
  const bets_on_match = await bet_model.getBetsByMatch(match_id);
  for (const bet of bets_on_match) {
    await updateUserBet(bet, winner);
  }
}
