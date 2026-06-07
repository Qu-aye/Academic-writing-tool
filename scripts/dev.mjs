import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function createDevProcess(workspace) {
  const cwd = path.join(repoRoot, 'apps', workspace);

  if (process.platform === 'win32') {
    return spawn(
      process.env.comspec ?? 'cmd.exe',
      ['/d', '/s', '/c', 'npm run dev'],
      {
        cwd,
        stdio: 'inherit',
      },
    );
  }

  return spawn('npm', ['run', 'dev'], {
    cwd,
    stdio: 'inherit',
  });
}

const children = [
  {
    name: 'server',
    process: createDevProcess('server'),
  },
  {
    name: 'client',
    process: createDevProcess('client'),
  },
];

let isShuttingDown = false;

function shutdown(exitCode = 0) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  for (const child of children) {
    if (!child.process.killed) {
      child.process.kill();
    }
  }

  process.exit(exitCode);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

for (const child of children) {
  child.process.on('exit', (code) => {
    if (isShuttingDown) {
      return;
    }

    if (code && code !== 0) {
      console.error(`${child.name} dev process exited with code ${code}`);
      shutdown(code);
      return;
    }

    shutdown(0);
  });
}
