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
  {
    slug: 'rhino-inside-revit-transactions-type-wrapping',
    title: 'Rhino.Inside.Revit: Transactions, Type-Wrapping, and Placing Families from Grasshopper',
    dek: 'Getting Grasshopper to place Revit family instances and build Assemblies through GHPython sounds simple until the Transaction fails silently and the geometry you passed in isn\'t the type Revit expected.',
    tags: ['Rhino.Inside.Revit', 'GHPython', 'Revit'],
    publishedAt: '2026-07-25',
    readMinutes: 7,
    body: [
      { type: 'p', text: "Rhino.Inside.Revit is genuinely powerful once it's working — you get Grasshopper's parametric logic driving live Revit elements, no round-tripping through import/export. But the path from \"this works in a Python console\" to \"this works reliably inside a Grasshopper definition\" has a few specific traps that cost real debugging time, mostly around two things: how Revit's Transaction model expects to be used, and how loosely-typed Grasshopper data needs to be coerced into the exact Revit API types a method expects." },

      { type: 'h2', text: 'Why placing a family instance isn\'t just one API call' },
      { type: 'p', text: "The naive version — call NewFamilyInstance with a location and a family symbol — fails immediately if you haven't done two things first: activated the FamilySymbol (Revit loads family types lazily, and an inactive symbol can't be placed), and wrapped the whole operation in a Transaction. Skip the Transaction and Revit either throws immediately or, worse, appears to succeed in-session but never commits, so the instance vanishes the moment the document is touched again." },

      { type: 'h2', text: 'The Transaction pattern that actually holds up' },
      { type: 'p', text: "The pattern that stopped causing silent failures was: open the Transaction, activate the symbol if needed, place the instance, set any type or instance parameters while still inside the same Transaction, then commit. Splitting parameter-setting into a second Transaction after commit sounds harmless but occasionally raced against Revit's own regeneration cycle and produced instances with parameters that silently didn't take." },
      { type: 'code', text: `with Transaction(doc, "Place Family Instance") as t:
    t.Start()
    if not symbol.IsActive:
        symbol.Activate()
        doc.Regenerate()
    instance = doc.Create.NewFamilyInstance(point, symbol, level, structuralType)
    instance.LookupParameter("Comments").Set(comment_value)
    t.Commit()` },
      { type: 'p', text: "One Transaction, start to finish, including parameter writes. Fewer moving parts, fewer places for a regeneration cycle to land between two operations that were supposed to be atomic." },

      { type: 'h2', text: 'Type-wrapping: the quieter failure mode' },
      { type: 'p', text: "The second recurring issue was subtler than a crash — Grasshopper geometry (points, curves, planes) doesn't automatically become the Revit API type a method signature expects. A Grasshopper Point3d needs to become a Revit XYZ; a Rhino plane needs to become a Revit Plane via its own constructor, not a cast. Methods that expect an XYZ will accept something that looks close enough in a dynamically-typed script and either throw a type error deep in the Revit API, or worse, accept it and produce geometry that's subtly wrong — flipped, offset, or in the wrong coordinate space entirely, because Rhino.Inside.Revit runs Grasshopper's world in Rhino's coordinate system and Revit expects its own." },
      { type: 'p', text: "The fix was disciplined, boring, and effective: every value crossing from Grasshopper geometry into a Revit API call goes through an explicit conversion function, never an implicit one, and every coordinate gets checked for which system it's actually in before it's used." },

      { type: 'h2', text: 'Building Assemblies, not just instances' },
      { type: 'p', text: "Once individual family placement was reliable, the next layer was grouping placed instances into Revit Assemblies via GHPython — useful for anything that needs to move, schedule, or document as one buildable unit rather than a scatter of individual elements. AssemblyInstance.Create takes a document, a list of ElementIds, and a category, and the main gotcha here was the same Transaction discipline as before: creating the assembly and setting its naming/parameters needed to happen inside one Transaction, not split across the creation call and a later update." },

      { type: 'h2', text: 'What this is worth knowing before you start' },
      { type: 'p', text: "If you're building a Rhino.Inside.Revit workflow: wrap each logical operation in exactly one Transaction, do all related parameter writes inside it, and never let Grasshopper geometry cross into a Revit API call without an explicit, checked conversion. Both of those sound obvious written down — neither is obvious the first time a symbol silently fails to activate or a coordinate lands 30 feet from where it should." },
    ],
  },
  {
    slug: 'sorting-600-curves-native-vs-ghpython',
    title: 'Sorting 600 Curves by Z Value: Native Grasshopper vs. GHPython',
    dek: 'Every Grasshopper user eventually hits the same fork in the road: keep wiring native components together, or drop into a Python node. Here\'s what that decision actually looked like on a real 600-curve sort.',
    tags: ['Grasshopper', 'GHPython'],
    publishedAt: '2026-07-25',
    readMinutes: 5,
    body: [
      { type: 'p', text: "Sorting and grouping 600 curves by their Z value sounds like the kind of task Grasshopper's native components should handle without ceremony — and for a while, they do. The interesting part isn't whether it's possible natively (it is), it's at what point native components stop being the right tool, and why." },

      { type: 'h2', text: 'The native path' },
      { type: 'p', text: "Native Grasshopper handles this cleanly with a small chain: extract each curve's midpoint or a representative point, pull its Z coordinate, feed that list into a Sort component alongside the curve list as the values to sort, then group the sorted output using a Group/Partition pattern on the Z values — bucketing anything within a tolerance band into the same group. No code, fully visible on the canvas, easy for someone else to open the file and understand what's happening step by step." },

      { type: 'h2', text: 'Where it starts to strain' },
      { type: 'p', text: "The strain shows up in three places as complexity grows. First, grouping by a tolerance band rather than an exact match doesn't have a single clean native component — it usually means chaining several Partition List / Cull Pattern / Jitter-style components together in a way that works but is genuinely harder to read than the equivalent five lines of code. Second, anything conditional — \"group A unless condition X, in which case handle it differently\" — turns into an increasingly tangled wire diagram. Third, canvas performance: 600 curves through a dense native chain with multiple data-tree operations is noticeably slower to solve than the same logic in one Python component, because each native component is its own solve step with its own tree-matching overhead." },

      { type: 'h2', text: 'The GHPython version' },
      { type: 'p', text: "The equivalent in a single GHPython component: extract Z values, pair them with their curves, sort the pairs, then run a simple tolerance-based grouping loop." },
      { type: 'code', text: `pairs = sorted(zip(z_values, curves), key=lambda p: p[0])

groups = []
current_group = [pairs[0]]

for z, curve in pairs[1:]:
    if abs(z - current_group[-1][0]) <= tolerance:
        current_group.append((z, curve))
    else:
        groups.append(current_group)
        current_group = [(z, curve)]

groups.append(current_group)` },
      { type: 'p', text: "This solves in one step instead of a chain of six or seven, and the tolerance-grouping logic — the part that was awkward natively — is three readable lines. The tradeoff is real too: it's a black box on the canvas. Anyone opening the file has to open the Python editor to see what it does, versus reading it directly off wired components." },

      { type: 'h2', text: 'The actual decision rule' },
      { type: 'p', text: "What settled it wasn't performance or line count, it was who else needs to open the file. For a one-off internal script, GHPython won outright — faster to write, faster to solve, easier to modify. For anything meant to be handed to a junior team member or used as a teaching example, native components stayed the better choice even when clunkier, because the logic being visible on the canvas is worth more than the extra wires. The 600-curve sort itself ended up as a Python component; the simplified teaching version of the same workflow stayed native." },
    ],
  },
  {
    slug: 'iterate-workshop-fractal-recursive-logic',
    title: 'What ITERATE Taught Me About Fractal Logic in Parametric Design',
    dek: 'Running a workshop on recursion and fractal logic for B.Arch and M.Arch students surfaced a gap that\'s easy to miss when you already think recursively: the hard part was never the code.',
    tags: ['Teaching', 'Grasshopper', 'WASP'],
    publishedAt: '2026-07-25',
    readMinutes: 5,
    body: [
      { type: 'p', text: "ITERATE was a workshop built around a simple premise: fractal and recursive logic isn't just a visual style in parametric design, it's a different way of describing a rule — instead of drawing the final form, you describe the step that repeats, and the form emerges from how many times and how it repeats. Running it for B.Arch and M.Arch students, using Grasshopper with Python and WASP for the aggregation side, surfaced something I hadn't fully anticipated going in." },

      { type: 'h2', text: 'The gap wasn\'t technical' },
      { type: 'p', text: "Every student in the room could follow a for-loop. The gap wasn't understanding recursion as a programming concept — it was translating a design intention into a recursive rule in the first place. Given a target form, most students' first instinct was to try to describe the whole shape at once, the same way they'd approach it in a direct modeling tool. Recursive thinking asks a completely different question: not \"what does the final thing look like\" but \"what is the one operation that, repeated, produces this?\" That reframe was the actual teaching challenge, far more than any Grasshopper syntax." },

      { type: 'h2', text: 'Where WASP earned its place in the curriculum' },
      { type: 'p', text: "WASP's aggregation-by-rule approach turned out to be a good bridge for this, because it forces the same reframe structurally: you don't place parts, you define connection rules between parts and let the aggregation run. Students who were stuck trying to \"design the whole thing\" in Grasshopper often unstuck themselves faster once they'd worked through a WASP exercise, because the tool itself doesn't let you skip straight to the final form — you're forced to think in terms of the repeating unit and its connection logic from the start." },

      { type: 'h2', text: 'The mistake worth naming' },
      { type: 'p', text: "The most common actual mistake wasn't a bad rule, it was an unconstrained one — a recursive or aggregation rule with no termination condition or growth limit produces geometry that technically satisfies the rule and is completely unusable, growing forever or exploding in complexity within a few iterations. Getting students to build a stopping condition into their rule from the start, rather than bolting one on after watching Grasshopper struggle to solve an unbounded aggregation, was one of the more useful small habits to instill early." },

      { type: 'h2', text: 'What carried over into how I teach computational design generally' },
      { type: 'p', text: "The bigger lesson wasn't really about fractals specifically. It's that the hardest part of teaching computational design tools usually isn't the tool — students pick up components and syntax reasonably fast. It's teaching the reframe from \"describe the object\" to \"describe the rule that generates the object,\" and that reframe needs its own deliberate exercises, not just harder and harder examples of the same kind of thinking." },
    ],
  },
  {
    slug: 'hicad-vs-rhino-grasshopper-facade-workflows',
    title: 'HiCAD vs. Rhino/Grasshopper for Facade Workflows: An Honest Comparison',
    dek: 'Both tools show up in facade engineering conversations, usually with more opinion than evidence behind the take. Here\'s what actually differs once you\'ve run real rationalization work through both.',
    tags: ['Facade Engineering', 'Rhino', 'HiCAD'],
    publishedAt: '2026-07-25',
    readMinutes: 6,
    body: [
      { type: 'p', text: "HiCAD and Rhino/Grasshopper get compared a lot in facade engineering circles, usually as a proxy for a bigger argument about parametric-first versus detailing-first workflows. Having run real rationalization and fabrication-drawing work through both, the honest answer is neither wins outright — they're built around different assumptions about where in the process the hard thinking happens." },

      { type: 'h2', text: 'What HiCAD is actually good at' },
      { type: 'p', text: "HiCAD's strength is downstream: once a facade system is defined, its steel/metal-detailing toolset and native fabrication-drawing output are more mature out of the box than anything in the Rhino ecosystem without significant custom setup. Connection details, standard profile libraries, and shop-drawing generation feel like they were built by people who've stood on a fabrication floor. If the geometry is largely settled and the job is turning it into buildable, documented steel, HiCAD gets there with less custom scripting than the Rhino/Grasshopper equivalent." },

      { type: 'h2', text: 'What Rhino/Grasshopper is actually good at' },
      { type: 'p', text: "Grasshopper's strength is upstream: exploring and rationalizing geometry that isn't settled yet. Doubly-curved surfaces, panel families that need to minimize unique mold or die counts, anything where the real work is deciding what the geometry should be rather than documenting geometry that's already decided — that's where Grasshopper's live parametric graph earns its complexity. Changing one input and watching 600 panels re-solve in seconds is not something HiCAD's workflow is built around; its strength assumes the geometry question is mostly answered already." },

      { type: 'h2', text: 'The honest failure mode of each' },
      { type: 'p', text: "Grasshopper's failure mode is definitions that become unmaintainable — a rationalization script built by one person, under deadline, that nobody else on the team can safely open and modify six months later. That's a real, recurring cost, not a hypothetical one. HiCAD's failure mode is the opposite: it's comparatively rigid when the geometry itself is still changing, so late-stage design changes that would be a five-minute slider adjustment in Grasshopper can mean substantial rework in HiCAD, because the tool assumes you've stopped asking \"what should this be\" and started asking \"how do we build this.\"" },

      { type: 'h2', text: 'What this actually means for choosing a workflow' },
      { type: 'p', text: "The practical answer that's held up across multiple jobs: use Grasshopper for the phase where the geometry is still a question, and hand off to HiCAD (or equivalent detailing tools) once the geometry is a settled answer and the job becomes documentation and fabrication output. Trying to force one tool to cover both phases is where most of the real pain shows up — either over-engineering a Grasshopper definition to do detailing work it wasn't designed for, or fighting HiCAD's assumptions during a phase where the design is still genuinely moving." },
    ],
  },
];

export function getInsightPost(slug: string): InsightPost | undefined {
  return INSIGHT_POSTS.find((p) => p.slug === slug);
}
