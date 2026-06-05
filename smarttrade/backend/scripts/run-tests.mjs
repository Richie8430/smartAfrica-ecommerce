import { spawn } from 'child_process';
import { createWriteStream } from 'fs';

const pattern = process.argv[2] ?? 'unit';
const logFile = `logs/${pattern}-test.log`;
const out = createWriteStream(logFile);

const child = spawn('./node_modules/.bin/jest', [
  `--testPathPattern=${pattern}`,
  '--no-coverage',
  '--forceExit',
], { cwd: process.cwd() });

child.stdout.pipe(out);
child.stderr.pipe(out);

child.on('exit', (code) => {
  out.write(`\n\nEXIT_CODE:${code}\n`);
  out.end(() => {
    console.log(`Done. Exit code: ${code}. Log: ${logFile}`);
    process.exit(code ?? 0);
  });
});
