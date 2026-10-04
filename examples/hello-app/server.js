// Minimal app used by the smoke tests and the example Dockerfile.
// `node server.js --once` prints a greeting and exits; without it, the app serves HTTP on PORT.
import { createServer } from 'node:http';

const greeting = 'hello from js-ci-runner';

if (process.argv.includes('--once')) {
  console.log(greeting);
} else {
  const port = Number(process.env.PORT ?? 3000);
  createServer((_request, response) => response.end(`${greeting}\n`)).listen(port, () => {
    console.log(`listening on ${port}`);
  });
}
