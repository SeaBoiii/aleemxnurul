// Aleem's words live encrypted in src/data/vault.json. They are filled in here only after
// Nurulain answers the seal's question (see src/lib/vault.ts). The readable source is
// private/content.json, which never leaves Aleem's laptop.
import stats from './data/stats.json';

export type Project = { id: string; title: string; subtitle: string; url: string; month: string; started: string; ended: string; status: 'live' | 'draft'; accent: string; note: string; fact?: string; hint?: string; repo: string };
export type SealedContent = {
  letter: string;
  projects: Omit<Project, 'month' | 'started' | 'ended'>[];
  whispers: string[];
  constellationInfo: string;
  finale: string;
};
type History = { firstCommit: string | null; lastCommit: string | null };
const history: Record<string, History> = stats.projects;

export let letter = '';
export let projects: Project[] = [];
export let whispers: string[] = [];
export let constellationInfo = '';
export let finale = '';

export function loadContent(content: SealedContent) {
  letter = content.letter;
  whispers = content.whispers;
  constellationInfo = content.constellationInfo;
  finale = content.finale;
  projects = content.projects.map((project) => {
    const started = history[project.id]?.firstCommit || '2026-06-22';
    const ended = history[project.id]?.lastCommit || started;
    const date = new Date(started);
    const month = new Intl.DateTimeFormat('en', { month: 'short', timeZone: 'UTC' }).format(date).toUpperCase() + " '" + String(date.getUTCFullYear()).slice(-2);
    return { ...project, started, ended, month };
  });
}
