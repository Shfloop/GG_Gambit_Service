import express, {Request, Response, NextFunction} from 'express';
import {updateAllMatchBets} from './jobs/forceBetUpdates.js';
import {checkUpcomingGoneLive} from './jobs/checkForLive.js';
import {checkForLiveConclusions} from './jobs/checkForConcluded.js';
import config from './config/config.js';
// Instantiates a client
export interface PayloadBody {
  for_match_id: number;
  failed_attempts: number;
}
const app = express();
app.enable('trust proxy');

// Set the Content-Type of the Cloud Task to ensure compatibility
// By default, the Content-Type header of the Task request is set to "application/octet-stream"
// see https://cloud.google.com/tasks/docs/reference/rest/v2beta3/projects.locations.queues.tasks#AppEngineHttpRequest
app.use(express.text());

app.get('/', (req: Request, res: Response) => {
  // Basic index to verify app is serving
  res.send('Hello, World!').end();
});

app.post('/log_payload', (req: Request, res: Response) => {
  // Log the request payload
  console.log(`Received task with payload: ${req.body}`);
  res.send(`Printed task payload: ${req.body}`).end();
});
/**
 * Checks for concluded matches
 * only needs to check when their are live matches present in database
 * should be scheduled by match going live
 * inputs expected time and num retries
 */
app.post('/check_for_concluded', async (req: Request, res: Response) => {
  // Log the request payload
  console.log(`Received task with payload: ${req.body}`);
  await checkForLiveConclusions();
  res.send(`Printed task payload: ${req.body}`).end();
});

/**
 * Checks for upcoming matches that have gone live
 * should be scheduled when match is first created in db
 * expects a match id and num retries
 * -1 for running just once
 */
app.post('/check_upcoming_to_live', async (req, res) => {
  try {
    // decode the base64 string
    const decoded = Buffer.from(req.body, 'base64').toString('utf-8');
    const payload = JSON.parse(decoded);

    if (!payload.failed_attempts || !payload.for_match_id) {
      return res.status(400).send(`Error Body is incorrect: ${decoded}`);
    }

    console.log(`Received task with payload:`, payload);

    await checkUpcomingGoneLive(payload.for_match_id, payload.failed_attempts);

    res.send(`Printed task payload: ${JSON.stringify(payload)}`);
  } catch (err) {
    console.error('Error parsing task payload:', err);
    res.status(400).send('Invalid task body');
  }
});
/**
 * Checks for matches that are upcoming
 * Doesnt really need to be used or scheduled
 * just have the backend check and deal with creating matches
 */
app.post('/check_for_upcoming', (req: Request, res: Response) => {
  // Log the request payload

  res.send(`Printed task payload: ${req.body}`).end();
});
/**
 * Force update check for all active bets
 */
app.post('/force_all_bets_update', async (req: Request, res: Response) => {
  // Log the request payload
  console.log(`Received task with payload: ${req.body}`);
  await updateAllMatchBets();
  res.send(`Printed task payload: ${req.body}`).end();
});

app.listen(config.server_port, () => {
  console.log(`App listening on port ${config.server_port}`);
  console.log('Press Ctrl+C to quit.');
});
