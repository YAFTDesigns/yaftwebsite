'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useRef, useEffect } from 'react';

const RHINO_DIRECTORY_URL =
  'https://www.rhino3d.com/training/sites/1650/?coordinates=[78.476681,22.199166]&radius=2200429.497656352&place_type=country';

export default function SiteHeader({ active }: { active?: string }) {
  const [open, setOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<'projects' | 'resources' | null>(null);
  const [hidden, setHidden] = useState(false);
  const projectsRef = useRef<HTMLDivElement>(null);
  const resourcesRef = useRef<HTMLDivElement>(null);

  // Auto-hide on scroll down, reveal instantly on scroll up. Stays visible
  // near the top of the page (within HIDE_AFTER px) so it doesn't
  // disappear on a tiny scroll, and stays visible whenever the mobile
  // menu is open so it can't vanish mid-navigation.
  useEffect(() => {
    const HIDE_AFTER = 80;
    let lastY = window.scrollY;

    function onScroll() {
      if (open) return; // never hide while the mobile menu is open
      const y = window.scrollY;
      const goingDown = y > lastY;
      if (y < HIDE_AFTER) {
        setHidden(false);
      } else if (goingDown) {
        setHidden(true);
      } else {
        setHidden(false);
      }
      lastY = y;
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [open]);

  // close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      const target = e.target as Node;
      const insideProjects = projectsRef.current && projectsRef.current.contains(target);
      const insideResources = resourcesRef.current && resourcesRef.current.contains(target);
      if (!insideProjects && !insideResources) setOpenMenu(null);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isProjectsActive = active === '/projects' || active === '/projects/community';
  const isResourcesActive = active === '/resources' || active === '/insights';

  return (
    <header className={hidden ? 'headerHidden' : undefined}>
      <nav>
        <Link href="/" className="logo">
          <span className="mark">YAFT</span>
          <span className="sub">Designs</span>
        </Link>

        <div className={`navlinks${open ? ' open' : ''}`} id="navlinks">
          <Link href="/courses"  className={active === '/courses'  ? 'active' : undefined} onClick={() => setOpen(false)}>Courses</Link>
          <Link href="/services" className={active === '/services' ? 'active' : undefined} onClick={() => setOpen(false)}>Services</Link>

          {/* Projects dropdown */}
          <div className="nav-dropdown" ref={projectsRef}>
            <button
              className={`nav-drop-btn${isProjectsActive ? ' active' : ''}`}
              onClick={() => setOpenMenu(v => v === 'projects' ? null : 'projects')}
              aria-expanded={openMenu === 'projects'}
            >
              Projects <span className="nav-caret" aria-hidden>▾</span>
            </button>
            {openMenu === 'projects' && (
              <div className="nav-drop-menu">
                <Link href="/projects" className="nav-drop-item" onClick={() => { setOpenMenu(null); setOpen(false); }}>
                  <span className="nav-drop-label">YAFT Works</span>
                  <span className="nav-drop-sub">Our projects and case studies</span>
                </Link>
                <Link href="/projects/community" className="nav-drop-item" onClick={() => { setOpenMenu(null); setOpen(false); }}>
                  <span className="nav-drop-label">YAFT Community Works</span>
                  <span className="nav-drop-sub">Student work, publications & partners</span>
                </Link>
              </div>
            )}
          </div>

          <Link href="/faculty" className={active === '/faculty' ? 'active' : undefined} onClick={() => setOpen(false)}>Faculty</Link>

          {/* Resources dropdown */}
          <div className="nav-dropdown" ref={resourcesRef}>
            <button
              className={`nav-drop-btn${isResourcesActive ? ' active' : ''}`}
              onClick={() => setOpenMenu(v => v === 'resources' ? null : 'resources')}
              aria-expanded={openMenu === 'resources'}
            >
              Resources <span className="nav-caret" aria-hidden>▾</span>
            </button>
            {openMenu === 'resources' && (
              <div className="nav-drop-menu">
                <Link href="/resources" className="nav-drop-item" onClick={() => { setOpenMenu(null); setOpen(false); }}>
                  <span className="nav-drop-label">Resources</span>
                  <span className="nav-drop-sub">Videos, books and learning material</span>
                </Link>
                <Link href="/insights" className="nav-drop-item" onClick={() => { setOpenMenu(null); setOpen(false); }}>
                  <span className="nav-drop-label">Insights</span>
                  <span className="nav-drop-sub">Notes on our Grasshopper and Rhino workflows</span>
                </Link>
              </div>
            )}
          </div>

          <Link href="/labs" className={active === '/labs' ? 'active' : undefined} onClick={() => setOpen(false)}>YAFT Labs</Link>

          <a href="#contact" className="cta-btn" onClick={() => setOpen(false)}>Enquire</a>
          <a href={RHINO_DIRECTORY_URL} target="_blank" rel="noopener">
            <Image className="rhino-logo" src="/assets/logos/rhino_logo.jpeg" alt="Authorized Rhino Training Center" width={32} height={32} />
          </a>
        </div>

        <button className="navtoggle" id="navtoggle" aria-label="Menu" onClick={() => setOpen(v => !v)}>
          <span></span><span></span><span></span>
        </button>
      </nav>
    </header>
  );
}
