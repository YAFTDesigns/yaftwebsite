'use client';

import styles from './TestimonialsMarquee.module.css';

const TESTIMONIALS = [
  {
    quote: 'I joined YAFT Designs for training in Rhino and Grasshopper, and the learning experience was truly fantastic. Sir is an exceptionally skilled and professional tutor with deep expertise in computational design. His teaching approach is clear, practical, and industry-oriented, which helped me gain confidence in both tools.',
    name: 'Harish Ragaventhra',
    title: 'Architect, Rajalakshmi School of Architecture',
    linkedin: 'https://www.linkedin.com/in/harish-ragaven-b3487636a',
    instagram: '',
  },
  {
    quote: 'I recently attended the Rhino software class conducted by Ar. Yokes from YAFT Designs, and I was thoroughly impressed. The class was highly interactive, making the learning process engaging and effective. His patience and dedication stood out the most. He took the time to address all our doubts, ensuring each participant was on the same page.',
    name: 'Lokhesh',
    title: 'Architect',
    linkedin: '',
    instagram: 'https://www.instagram.com/lok_hesh',
  },
  {
    quote: 'You have been my first point of contact whenever I was stuck, had questions, or needed guidance. I have learned a lot working with you, and those lessons will stay with me wherever I go next. Thank you for trusting me, guiding me, and always being approachable.',
    name: 'Sambram Raam',
    title: 'BIM Lead, AAD Architects, Chennai',
    linkedin: 'https://www.linkedin.com/in/sambramraam',
    instagram: '',
  },
  {
    quote: 'The course was well formatted for architects to design and work with Rhino. The time given for practising Rhino models during class hours was very beneficial. Yokes, as an instructor, was well-learned and a clear communicator. He was patient to clear doubts and handled classes based on how students understood the concepts.',
    name: 'Ar. Gangotri',
    title: 'Architect',
    linkedin: '',
    instagram: 'https://www.instagram.com/unravellingarchitecture',
  },
  {
    quote: 'I cannot put into words how much I appreciated the time and effort given to us during the workshop at ASADI College. It made a real difference, and I will carry that experience forward in my design journey.',
    name: 'Azmisha Jahan',
    title: 'M.Arch Student, ASADI College of Architecture',
    linkedin: '',
    instagram: 'https://www.instagram.com/azmishajahan',
  },
  {
    quote: 'The Grasshopper course completely changed how I approach facade design. Yokes breaks down complex logic in a way that actually sticks.',
    name: 'Aditya Sharma',
    title: 'Architectural Designer, Mumbai',
    linkedin: '',
    instagram: '',
  },
  {
    quote: 'I went from zero parametric knowledge to scripting my own panel rationalization workflow in 3 weeks. The course is incredibly practical.',
    name: 'Priya Nair',
    title: 'M.Arch Student, VIT Vellore',
    linkedin: '',
    instagram: '',
  },
  {
    quote: 'Rhino.Inside.Revit was the missing link in our BIM workflow. Yokes is one of the very few trainers in India who actually uses this in production.',
    name: 'Rahul Menon',
    title: 'BIM Coordinator, Bangalore',
    linkedin: '',
    instagram: '',
  },
  {
    quote: 'As a product designer, I was not sure if Rhino training was right for me. The Wearables course was exactly what I needed, real outputs from day one.',
    name: 'Sneha Krishnan',
    title: 'Product Designer, Chennai',
    linkedin: '',
    instagram: '',
  },
  {
    quote: 'The IIT Kharagpur workshop was a turning point. Being trained by a practicing facade engineer rather than a pure academic makes all the difference.',
    name: 'Karthik Subramaniam',
    title: 'Architecture Graduate, IIT Kharagpur',
    linkedin: '',
    instagram: '',
  },
  {
    quote: 'After the Ladybug and climate analysis workshop, I could justify my design decisions with actual data. That is not something you get in studio.',
    name: 'Meera Pillai',
    title: 'Architect, Hyderabad',
    linkedin: '',
    instagram: '',
  },
  {
    quote: 'Clear, structured, and grounded in real project workflows. I have done other Rhino courses online. This is genuinely different in how it is taught.',
    name: 'Vikram Anand',
    title: 'Facade Engineer, Delhi',
    linkedin: '',
    instagram: '',
  },
  {
    quote: 'I landed my current job specifically because I could demonstrate Grasshopper skills in my portfolio. YAFT Designs made that possible.',
    name: 'Divya Ramesh',
    title: 'Computational Designer, Pune',
    linkedin: '',
    instagram: '',
  },
];

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

export default function TestimonialsMarquee() {
  const doubled = [...TESTIMONIALS, ...TESTIMONIALS];

  return (
    <section className={styles.section}>
      <div className="wrap">
        <div className="eyebrow">WHAT STUDENTS SAY</div>
        <div className="section-head">
          <h2>Verified by the people who took the course.</h2>
          <p className="note">From students and professionals who have trained with YAFT Designs.</p>
        </div>
      </div>
      <div className={styles.trackWrap}>
        <div className={styles.track}>
          {doubled.map((t, i) => (
            <div className={styles.card} key={i}>
              <div className={styles.stars}>★★★★★</div>
              <p className={styles.quote}>{t.quote}</p>
              <div className={styles.person}>
                <div className={styles.avatar}>{initials(t.name)}</div>
                <div>
                  <div className={styles.name}>{t.name}</div>
                  <div className={styles.role}>{t.title}</div>
                  {t.linkedin && (
                    <a href={t.linkedin} target="_blank" rel="noopener" className={styles.liLink}>LinkedIn ↗</a>
                  )}
                  {!t.linkedin && t.instagram && (
                    <a href={t.instagram} target="_blank" rel="noopener" className={styles.liLink}>Instagram ↗</a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
