import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repositories = ['confession', 'for_her', 'rsvp', 'wymm', 'return_to_me', 'our_journey', 'our_flight', 'our_gallery', 'sort_of_us', 'our_hearts', 'our_miles'];
const projects = {};

function gitDates(folder) {
  return execFileSync('git', ['-C', folder, 'log', '--format=%cI'], { encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }).trim().split(/\r?\n/).filter(Boolean);
}

function remoteDates(repo) {
  const result = execFileSync('gh', ['api', '--paginate', `repos/seaboiii/${repo}/commits?per_page=100`, '--jq', '.[].commit.committer.date'], { encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  return result.trim().split(/\r?\n/).filter(Boolean);
}

for (const repo of repositories) {
  const folder = resolve(root, '..', repo);
  let dates = [];
  let source = 'local';
  try {
    dates = existsSync(folder) ? gitDates(folder) : remoteDates(repo);
    source = existsSync(folder) ? 'local' : 'github';
  } catch (localError) {
    try {
      dates = remoteDates(repo);
      source = 'github';
    } catch (remoteError) {
      source = 'unavailable';
      console.warn(`${repo}: unable to read local or GitHub history (${remoteError.message.split('\n')[0]})`);
    }
  }
  dates.sort((a, b) => Date.parse(a) - Date.parse(b));
  const firstCommit = dates[0] ?? null;
  const lastCommit = dates.at(-1) ?? null;
  const daysActive = firstCommit && lastCommit ? Math.max(1, Math.floor((Date.parse(lastCommit) - Date.parse(firstCommit)) / 86_400_000) + 1) : 0;
  projects[repo] = { commits: dates.length, firstCommit, lastCommit, daysActive, source };
  console.log(`${repo}: ${dates.length} commits · ${daysActive} days · ${source}`);
}

const output = { generatedAt: new Date().toISOString(), totalCommits: Object.values(projects).reduce((sum, project) => sum + project.commits, 0), projects };
mkdirSync(resolve(root, 'src/data'), { recursive: true });
writeFileSync(resolve(root, 'src/data/stats.json'), JSON.stringify(output, null, 2) + '\n');
console.log(`Wrote src/data/stats.json (${output.totalCommits} total commits).`);
