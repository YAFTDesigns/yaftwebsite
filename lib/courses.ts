export type Course = {
  slug: string;
  image: string;
  alt: string;
  level: string;
  duration: string;
  tool: string;
  title: string;
  desc: string;
  pdf: string;
};

export const COURSES: Course[] = [
  {
    slug: 'rhino-architecture',
    image: '/assets/images/courses/rhino-architecture.jpg',
    alt: "Recreating MAD Architects' Absolute Towers in Rhino3D",
    level: 'Beginner → Inter',
    duration: '30 hrs · 5 days',
    tool: 'Rhino3D',
    title: 'Rhino3D Training for Architecture',
    desc: "NURBS fundamentals through advanced freeform surfacing and SubD modeling — recreating real case studies like Zaha Hadid's Chanel Mobile Art Pavilion and MAD's Absolute Towers, ending in 3D-print-ready output.",
    pdf: '/assets/pdfs/rhino-architecture.pdf',
  },
  {
    slug: 'grasshopper-architecture',
    image: '/assets/images/courses/grasshopper-architecture.jpg',
    alt: 'KUKA robotic arm fabrication driven by Grasshopper scripting',
    level: 'Beginner → Inter',
    duration: '36 hrs · 6 days',
    tool: 'Grasshopper · Rhino3D',
    title: 'Grasshopper Training for Architecture',
    desc: "Parametric logic, data structures, and form-finding through Grasshopper's plugin ecosystem — Lunchbox, Ladybug climate analysis, Galapagos optimization, and Kangaroo physics — built around real panel and facade problems.",
    pdf: '/assets/pdfs/grasshopper-architecture.pdf',
  },
  {
    slug: 'revit-rhino-inside',
    image: '/assets/images/courses/revit-rhino-inside.jpg',
    alt: 'Revit and Grasshopper working together via Rhino.Inside.Revit',
    level: 'Beginner → Adv',
    duration: '60 hrs · 6 weeks',
    tool: 'Revit · Rhino.Inside.Revit',
    title: 'Revit Architecture + Rhino.Inside.Revit',
    desc: 'A 10-module BIM workshop bridging Revit documentation with Rhino/Grasshopper computational geometry — for teams who need both design freedom and BIM compliance, from project setup through parametric family automation.',
    pdf: '/assets/pdfs/revit-rhino-inside.pdf',
  },
  {
    slug: 'rhino-aec-climate',
    image: '/assets/images/courses/rhino-aec-climate.jpg',
    alt: 'Kinetic, radiation-responsive facade panels in the spirit of Al Bahar Towers',
    level: 'Intermediate',
    duration: '10–15 hrs · 2 days',
    tool: 'Rhino3D · Grasshopper · Ladybug',
    title: 'Rhino3D for AEC & Climate',
    desc: 'A compact climate-responsive facade specialization — solar radiation analysis and orientation optimization with Ladybug, working toward kinetic, performance-driven facades in the spirit of Al Bahar Towers.',
    pdf: '/assets/pdfs/rhino-aec-climate.pdf',
  },
  {
    slug: 'rhino-wearables-footwear',
    image: '/assets/images/courses/rhino-wearables-footwear.jpg',
    alt: '3D-printed Voronoi lattice footwear modeled in Rhino3D',
    level: 'Intermediate',
    duration: '30 hrs · 5 days',
    tool: 'Rhino3D · Grasshopper',
    title: 'Rhino3D for Wearables & Footwear',
    desc: 'Applying Rhino and Grasshopper to footwear, neckwear, and wristband geometry — Voronoi lattice infill for 3D-printed soles, surface continuity for fit, and prep for fabrication or printing.',
    pdf: '/assets/pdfs/rhino-wearables-footwear.pdf',
  },
  {
    slug: 'rhino-industrial-design',
    image: '/assets/images/courses/rhino-industrial-design.jpg',
    alt: 'Parametric twisting wood furniture modeled in Rhino3D and Grasshopper',
    level: 'Beginner → Adv',
    duration: '30 hrs · 5 days',
    tool: 'Rhino3D · Grasshopper',
    title: 'Rhinoceros for Industrial Design',
    desc: 'CNC-aware product modeling — hybrid surface and solid workflows with Loft, SubD, and BlendSrf, then parametric Grasshopper automation for batch DXF export, perforated panels, and manufacture-ready part breakdown.',
    pdf: '/assets/pdfs/rhino-industrial-design.pdf',
  },
];

export function getCourseBySlug(slug: string): Course | undefined {
  return COURSES.find((c) => c.slug === slug);
}
