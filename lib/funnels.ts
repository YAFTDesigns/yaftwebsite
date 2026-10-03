import { COURSE_NAV_LIST } from '@/app/courses/courseNav';
import type { Funnel } from '@/lib/enquiryFields';

// Copy below only restates what the live site already says (services page,
// course pages, terms). Do not add prices, dates or outcome claims here
// without Yokes confirming them.
export type FunnelConfig = {
  key: Funnel;
  path: string;
  title: string;
  description: string;
  eyebrow: string;
  heading: string;
  lede: string;
  points: { title: string; text: string }[];
  steps: string[];
  cta: string;
  formHeading: string;
  options: string[];
  messagePlaceholder: string;
  // ServiceCta wants one of these to preselect the audience.
  segment: 'individual' | 'college' | 'corporate';
  crossLinks: Funnel[];
  // Optional looping, muted hero background (files under /public/assets/video).
  heroVideo?: { src: string; poster: string };
};

export const FUNNEL_CONFIG: Record<Funnel, FunnelConfig> = {
  individual: {
    key: 'individual',
    path: '/individuals',
    title: 'Rhino and Grasshopper courses for students and professionals',
    description: 'Live Rhino3D, Grasshopper and Rhino.Inside.Revit courses for architecture students and working professionals, from an Authorized Rhino Training Center in Coimbatore.',
    eyebrow: 'FOR INDIVIDUALS',
    heading: 'Learn Rhino and Grasshopper for real architecture and design work.',
    lede: 'Courses for students and working professionals, taught from the workflows we use on live projects. Tell us your background and we will say which course fits, or point you to a better starting one.',
    points: [
      { title: 'Rhino3D for Architecture', text: '30 hours over 5 days.' },
      { title: 'Grasshopper for Architecture', text: '36 hours over 6 days.' },
      { title: 'Other tracks', text: 'Rhino.Inside.Revit, AEC & Climate, Industrial Design, and Wearables & Footwear.' },
    ],
    steps: [
      'Tell us whether you are a student or working, and what you want to learn.',
      'We reply with the course that fits and what to skip.',
      'Confirm your seat with a 50% advance. The balance is due within 7 days of the invoice date.',
    ],
    cta: 'Ask which course fits me',
    formHeading: 'Tell us about you',
    options: [...COURSE_NAV_LIST.map((c) => c.enquiryLabel), 'Not sure, help me choose'],
    messagePlaceholder: 'Your background, any Rhino or Grasshopper experience, and what you want to be able to do',
    segment: 'individual',
    crossLinks: ['college', 'corporate'],
    heroVideo: { src: '/assets/video/individuals-hero.mp4', poster: '/assets/video/individuals-hero-poster.jpg' },
  },
  college: {
    key: 'college',
    path: '/colleges',
    title: 'Computational design workshops for colleges',
    description: 'Multi-day or semester-length computational design programs for architecture schools, delivered on campus or online by YAFT Designs.',
    eyebrow: 'FOR COLLEGES',
    heading: 'Computational design programs for your architecture students.',
    lede: 'Multi-day or semester-length programs for architecture schools, delivered on campus or online. Tell us your batch and timeline and we will propose a format.',
    points: [
      { title: 'Multi-day workshops', text: 'Short, focused programs on Rhino and Grasshopper.' },
      { title: 'Semester-length programs', text: 'A structured computational design track across a term.' },
      { title: 'On campus or online', text: 'Delivered where it suits your department.' },
    ],
    steps: [
      'Send your institution, batch size and what you want students to learn.',
      'We reply with a proposed format and schedule.',
      'Confirm with a 50% advance to hold the dates.',
    ],
    cta: 'Plan a college program',
    formHeading: 'Tell us about your college',
    options: ['Multi-day workshop', 'Semester-length program', 'Faculty training', 'Not sure yet, advise me'],
    messagePlaceholder: 'Year and batch size, preferred dates, and on campus or online',
    segment: 'college',
    crossLinks: ['individual', 'corporate'],
    heroVideo: { src: '/assets/video/colleges-hero.mp4', poster: '/assets/video/colleges-hero-poster.jpg' },
  },
  corporate: {
    key: 'corporate',
    path: '/corporate',
    title: 'Rhino and Grasshopper training for architecture firms',
    description: 'Structured digital-technology upskilling for practising studios: Rhino, Grasshopper and Rhino.Inside.Revit workflows tailored to your live project pipeline.',
    eyebrow: 'FOR COMPANIES',
    heading: 'Upskill your design team on workflows from your own projects.',
    lede: 'Structured training for practising studios in Rhino, Grasshopper and Rhino.Inside.Revit, shaped around the firm\'s live project pipeline.',
    points: [
      { title: 'Rhino and Grasshopper', text: 'Parametric modelling and scripting for design teams.' },
      { title: 'Rhino.Inside.Revit', text: 'Connecting computational design to BIM delivery.' },
      { title: 'Tailored to live projects', text: 'Content follows your current project pipeline.' },
    ],
    steps: [
      'Tell us your team, current tools and what you need them to do.',
      'We reply with a proposed scope and schedule.',
      'Confirm with a 50% advance. The balance is due within 7 days of the invoice date.',
    ],
    cta: 'Request team training',
    formHeading: 'Tell us about your team',
    options: ['Team training in Rhino and Grasshopper', 'Rhino.Inside.Revit training', 'Not sure yet, advise me'],
    messagePlaceholder: 'Team size, current software, and the projects or workflows you want the training to focus on',
    segment: 'corporate',
    crossLinks: ['consulting', 'college'],
  },
  consulting: {
    key: 'consulting',
    path: '/consulting',
    title: 'Computational design and BIM consulting',
    description: 'Parametric facade fabrication, shop drawing automation and computational design execution for studios and contractors, from YAFT Designs.',
    eyebrow: 'CONSULTING',
    heading: 'Computational design execution, from parametric facade to fabrication-ready output.',
    lede: 'YAFT Designs works alongside studios and contractors on live facade scripting and shop drawing automation. Describe the project and we will tell you how we would approach it.',
    points: [
      { title: 'Parametric facade fabrication', text: 'Surface rationalization, panel typology and double-curved geometry, scripted in Grasshopper for fabrication.' },
      { title: 'Shop drawing automation', text: 'Scripted pipelines from rationalized geometry to fabrication-ready shop drawings.' },
      { title: 'Work across five countries', text: 'Drawn from projects running internationally.' },
    ],
    steps: [
      'Describe the project, the geometry or documentation challenge, and your timeline.',
      'We reply with how we would approach it and what we need from you.',
      'A scope and proposal follow, and the engagement is confirmed with a 50% advance.',
    ],
    cta: 'Discuss a project',
    formHeading: 'Tell us about the project',
    options: ['Parametric facade fabrication', 'Shop drawing automation', 'Other consulting project'],
    messagePlaceholder: 'Project type, stage, location, and what you need from us',
    segment: 'corporate',
    crossLinks: ['corporate', 'individual'],
  },
};
