export type InsightBlock =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'code'; text: string }
  | { type: 'quote'; text: string };

export type InsightPost = {
  slug: string;
  title: string;
  dek: string;
  tags: string[];
  publishedAt: string; // ISO date
  readMinutes: number;
  body: InsightBlock[];
};

export const INSIGHT_POSTS: InsightPost[] = [
  {
    slug: 'clustering-facade-fins-by-curvature',
    title: 'Clustering 131 Facade Fins by Curvature to Cut Fabrication Molds',
    dek: 'A unitized facade with 131 uniquely curved fins is 131 fabrication molds — unless you can prove some of those curves are close enough to share one. Here is the workflow we used to find out.',
    tags: ['Grasshopper', 'GHPython', 'Facade Engineering'],
    publishedAt: '2026-07-25',
    readMinutes: 6,
    body: [
      { type: 'p', text: "On a recent facade rationalization job, the design called for around 131 strip and fin elements, each following its own gentle curve across the building's surface. Left as-is, that's 131 unique fabrication molds — and every unique mold is real money and real lead time. The brief was simple to state and hard to do: find which of those 131 curves are close enough to each other that they can share a mold, without visibly changing the design intent." },

      { type: 'h2', text: 'Why this can\'t be done by eye' },
      { type: 'p', text: "At 10 or 20 elements, you could plausibly eyeball which curves look similar. At 131, human pattern-matching breaks down in both directions — you miss genuine matches because two curves that are numerically close don't always look identical side by side, and you force bad matches because visual similarity is a poor proxy for the actual manufacturing tolerance a mold needs to hold. The problem needed a number to sort by, not an eye to judge by." },

      { type: 'h2', text: 'Picking a cheap, honest measure of curvature' },
      { type: 'p', text: "Comparing full curve geometry pairwise across 131 elements is expensive and, for this class of shallow arcs, overkill. What actually matters for a mold is how much a curve bows away from a straight line between its endpoints — which is exactly what sagitta measures: the height of the arc above its chord. It's a single number per curve, cheap to compute, and directly meaningful to the question \"can this curve pass through a mold built for that curve, within tolerance?\"" },
      { type: 'p', text: "Reducing every curve to one scalar value turns a geometry-comparison problem into a sorting problem, which is a much easier problem to solve well." },

      { type: 'h2', text: 'A greedy clustering pass' },
      { type: 'p', text: "With sagitta values in hand, the clustering itself is a straightforward greedy pass: sort all 131 curves by their sagitta value, then walk the sorted list start to end. If a curve's sagitta is within the tolerance band of the cluster currently being built, it joins that cluster and the mold gets built to fit the group's spread. If it falls outside tolerance, it starts a new cluster." },
      { type: 'code', text: `sort curves by sagitta ascending
clusters = []
current = new cluster with curves[0]

for curve in curves[1:]:
    if abs(curve.sagitta - current.representative_sagitta) <= tolerance:
        current.add(curve)
    else:
        clusters.append(current)
        current = new cluster with curve

clusters.append(current)` },
      { type: 'p', text: "Simple, but the tolerance band is where the real judgment lives — set it too tight and you barely reduce the mold count; set it too loose and you're bending the design intent to fit manufacturing convenience. That number came from a few rounds of running the clustering at different tolerances and checking the resulting groups against what was actually acceptable to the design." },

      { type: 'h2', text: 'Making 40+ clusters visually distinguishable' },
      { type: 'p', text: "Once curves are grouped, the next problem is purely practical: how do you QA dozens of clusters in the Rhino viewport without the colors blurring together? Stepping hue evenly around the color wheel doesn't work well when the number of clusters isn't known in advance — you either run out of well-separated hues or waste most of the wheel on the first few clusters." },
      { type: 'p', text: "The fix was to step each new cluster's hue by the golden angle (~137.5°) instead of dividing the wheel evenly. This is the same principle behind sunflower seed spirals — golden-angle stepping stays well-distributed no matter how many steps you take, so cluster 3 and cluster 40 are both easy to tell apart from their neighbors, without deciding the total cluster count up front." },

      { type: 'h2', text: 'What this generalizes to' },
      { type: 'p', text: "None of this is specific to fins. The same shape — reduce a fabrication-constrained rationalization problem to one honest scalar, sort, greedily cluster within a tolerance, color for QA — applies just as well to mullions, transoms, or any other run of unitized curved elements where the real cost driver is the number of distinct molds or dies, not the number of parts." },
      { type: 'quote', text: 'The hard part was never the clustering algorithm — it was picking a measurement cheap enough to run 131 times and honest enough to trust.' },
    ],
  },
];

export function getInsightPost(slug: string): InsightPost | undefined {
  return INSIGHT_POSTS.find((p) => p.slug === slug);
}
