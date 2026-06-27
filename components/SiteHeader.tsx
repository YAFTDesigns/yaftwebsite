'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useRef, useEffect } from 'react';

const RHINO_DIRECTORY_URL =
  'https://www.rhino3d.com/training/sites/1650/?coordinates=[78.476681,22.199166]&radius=2200429.497656352&place_type=country';

export default function SiteHeader({ active }: { active?: string }) {
  const [open, setOpen] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  // close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setDropOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isProjectsActive = active === '/projects' || active === '/projects/community';

  return (
    <header>
      <nav>
        <Link href="/" className="logo">
          <span className="mark">YAFT</span>
          <span className="sub">Designs</span>
        </Link>

        <div className={`navlinks${open ? ' open' : ''}`} id="navlinks">
          <Link href="/courses"  className={active === '/courses'  ? 'active' : undefined} onClick={() => setOpen(false)}>Courses</Link>
          <Link href="/services" className={active === '/services' ? 'active' : undefined} onClick={() => setOpen(false)}>Services</Link>

          {/* Projects dropdown */}
          <div className="nav-dropdown" ref={dropRef}>
            <button
              className={`nav-drop-btn${isProjectsActive ? ' active' : ''}`}
              onClick={() => setDropOpen(v => !v)}
              aria-expanded={dropOpen}
            >
              Projects <span className="nav-caret" aria-hidden>▾</span>
            </button>
            {dropOpen && (
              <div className="nav-drop-menu">
                <Link href="/projects" className="nav-drop-item" onClick={() => { setDropOpen(false); setOpen(false); }}>
                  <span className="nav-drop-label">YAFT Works</span>
                  <span className="nav-drop-sub">Our projects and case studies</span>
                </Link>
                <Link href="/projects/community" className="nav-drop-item" onClick={() => { setDropOpen(false); setOpen(false); }}>
                  <span className="nav-drop-label">YAFT Community Works</span>
                  <span className="nav-drop-sub">Student work, publications & partners</span>
                </Link>
              </div>
            )}
          </div>

          <Link href="/faculty"   className={active === '/faculty'   ? 'active' : undefined} onClick={() => setOpen(false)}>Faculty</Link>
          <Link href="/resources" className={active === '/resources' ? 'active' : undefined} onClick={() => setOpen(false)}>Resources</Link>

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
