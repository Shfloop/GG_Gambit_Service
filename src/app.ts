async function main() {
  //   const jobName = process.env.JOB_NAME || process.argv[2];

  //   switch (jobName) {
  //     case 'updateDatabase':
  //       await updateDatabase();
  //       break;
  //     case 'fetchData':
  //       await fetchData();
  //       break;
  //     case 'syncUsers':
  //       await syncUsers();
  //       break;
  //     default:
  //       console.error(`Unknown job: ${jobName}`);
  //       process.exit(1);
  //   }
  console.log('HELLO WORLD');
}
main().catch((err) => {
  console.error('Job failed:', err);
  process.exit(1);
});
