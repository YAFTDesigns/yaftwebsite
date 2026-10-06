// Registry of interactive computational-design experiments shown in YAFT Labs.
// To add one: build the page under app/labs/<slug>/, wrap it in
// components/labs/ExperimentShell, and add an entry here (it then appears on
// the Labs page and in the sitemap automatically).

export interface Experiment {
  slug: string;
  title: string;
  summary: string;
  method: string;
  system: string;
  interaction: string;
  tags: string[];
}

export const EXPERIMENTS: Experiment[] = [
  {
    slug: 'tensile-membrane',
    title: 'Tensile Membrane Form Finding',
    summary: 'Drag the masts and anchors and watch a tensile surface relax into a new equilibrium shape.',
    method: 'Dynamic Relaxation / Minimal Surface Approximation',
    system: 'Tensile Membrane',
    interaction: 'Real-time boundary manipulation',
    tags: ['Form finding', 'Tensile', 'Interactive'],
  },
];

export const experimentHref = (slug: string) => `/labs/${slug}`;
