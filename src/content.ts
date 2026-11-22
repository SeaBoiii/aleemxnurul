// Aleem's words live encrypted in src/data/vault.json. They are filled in here only after
// Nurulain answers the seal's question (see src/lib/vault.ts). The readable source is
// private/content.json, which never leaves Aleem's laptop.
export type Project = { id: string; title: string; subtitle: string; url: string; month: string; started: string; ended: string; status: 'live' | 'draft'; accent: string; note: string; fact?: string; hint?: string; repo: string; star: string; revealOn?: string };
export type History = { commits: number; daysActive: number; firstCommit: string | null; lastCommit: string | null };
export type SealedContent = {
  letter: string;
  projects: Omit<Project, 'month' | 'started' | 'ended'>[];
  whispers: string[];
  constellationInfo: string;
  finale: string;
  stats?: Record<string, History>;
};

export let letter = '';
export let projects: Project[] = [];
export let whispers: string[] = [];
export let constellationInfo = '';
export let finale = '';
/** Per-project history, sealed in the vault because it names every repository. */
export let history: Record<string, History> = {};

export function loadContent(content: SealedContent) {
  letter = content.letter;
  whispers = content.whispers;
  constellationInfo = content.constellationInfo;
  finale = content.finale;
  history = content.stats ?? {};
  projects = content.projects.map((project) => {
    const started = history[project.id]?.firstCommit || '2026-06-22';
    const ended = history[project.id]?.lastCommit || started;
    const date = new Date(started);
    const month = new Intl.DateTimeFormat('en', { month: 'short', timeZone: 'UTC' }).format(date).toUpperCase() + " '" + String(date.getUTCFullYear()).slice(-2);
    return { ...project, started, ended, month };
  });
}

/** A star whose site is a surprise stays dim and unnamed until its date. */
export function isWaiting(project: Pick<Project, 'revealOn'>) {
  return !!project.revealOn && Date.now() < Date.parse(project.revealOn);
}
