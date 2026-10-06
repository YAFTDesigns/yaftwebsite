import type { Metadata } from 'next';
import ExperimentShell from '@/components/labs/ExperimentShell';
import TensileMembraneLoader from '@/components/labs/TensileMembraneLoader';
import { EXPERIMENTS } from '@/lib/labs/experiments';

const experiment = EXPERIMENTS.find((e) => e.slug === 'tensile-membrane')!;

export const metadata: Metadata = {
  title: 'Tensile Membrane Form Finding | Interactive Experiment | YAFT Labs',
  description:
    'Interactive tensile membrane form-finding in your browser. Drag masts and anchors and watch a dynamic-relaxation solver find a new equilibrium surface. A YAFT Labs experiment.',
  alternates: { canonical: '/labs/tensile-membrane' },
  openGraph: {
    title: 'Tensile Membrane Form Finding | YAFT Labs',
    description: 'Move the supports and watch a tensile surface find equilibrium in real time.',
    url: '/labs/tensile-membrane',
    type: 'website',
  },
};

export default function TensileMembranePage() {
  return (
    <ExperimentShell
      experiment={experiment}
      about={
        <p>
          Explore how tensile surfaces find equilibrium through computational form finding. Move the supports and observe how
          the membrane continuously adapts to the changing boundary conditions.
        </p>
      }
    >
      <TensileMembraneLoader />
    </ExperimentShell>
  );
}
