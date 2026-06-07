import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function runBuild(workspace) {
  const cwd = path.join(repoRoot, 'apps', workspace);

  if (process.platform === 'win32') {
    return spawnSync(
      process.env.comspec ?? 'cmd.exe',
      ['/d', '/s', '/c', 'npm run build'],
      {
        cwd,
        stdio: 'inherit',
      },
    );
  }

  return spawnSync('npm', ['run', 'build'], {
    cwd,
    stdio: 'inherit',
  });
}

for (const workspace of ['server', 'client']) {
  const result = runBuild(workspace);

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
