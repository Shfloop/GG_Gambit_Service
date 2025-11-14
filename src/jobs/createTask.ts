import {CloudTasksClient, protos} from '@google-cloud/tasks';
import {task_queue} from '@/config/config.js';
const client = new CloudTasksClient();
// const {protos} = client;
export async function createTask(
  date: Date,
  relative_uri: string,
  payload?: string
) {
  // TODO(developer): Uncomment these lines and replace with your values.
  const project = task_queue.project;
  const queue = task_queue.queue;
  const location = task_queue.location;

  // Construct the fully qualified queue name.
  const parent = client.queuePath(project, location, queue);
  const time_seconds = Math.ceil(date.getTime() / 30000) * 30;
  const formated_id =
    relative_uri.replace(/[^\w]/g, '-') + time_seconds.toString();
  const formated_name = `projects/${project}/locations/${location}/queues/${queue}/tasks/${formated_id}`;
  console.log(formated_name);
  const task = {
    httpRequest: {
      headers: {
        'Content-Type': 'text/plain', // Set content type to ensure compatibility your application's request parsing
      },
      httpMethod: protos.google.cloud.tasks.v2.HttpMethod.POST,
      url: task_queue.task_run_url + relative_uri,
      body: payload ? Buffer.from(payload).toString('base64') : null,
    },
    name: formated_name,
    scheduleTime: {seconds: time_seconds},
  };

  // if (payload && task.httpRequest) {
  //   task.httpRequest.body = Buffer.from(payload).toString('base64');
  // }

  // task.scheduleTime = {
  //   seconds: time,
  // };

  console.log('Sending task:');
  console.log(task);

  // Send create task request.
  const request = {parent: parent, task: task};
  const [response] = await client.createTask(request);
  const name = response.name;
  console.log(`Created task ${name}`);
}
