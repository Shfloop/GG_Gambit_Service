import {
  CloudTasksClient,
  protos,
} from '../../node_modules/@google-cloud/tasks/build/esm/src/index.js';
import {task_queue} from '@/config/config.js';
const client = new CloudTasksClient();

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
  const time = Math.ceil(date.getSeconds() / 30) * 30;
  const task = {
    appEngineHttpRequest: {
      headers: {
        'Content-Type': 'text/plain', // Set content type to ensure compatibility your application's request parsing
      },
      httpMethod: 'POST',
      relativeUri: relative_uri,
      body: null,
      name: relative_uri + time.toString(),
    },
  } as protos.google.cloud.tasks.v2.ITask;

  if (payload && task.appEngineHttpRequest) {
    task.appEngineHttpRequest.body = Buffer.from(payload).toString('base64');
  }

  task.scheduleTime = {
    seconds: time,
  };

  console.log('Sending task:');
  console.log(task);

  // Send create task request.
  const request = {parent: parent, task: task};
  const [response] = await client.createTask(request);
  const name = response.name;
  console.log(`Created task ${name}`);
}
