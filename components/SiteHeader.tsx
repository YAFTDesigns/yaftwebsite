'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';

const NAV_LINKS = [
  { href: 'https://www.linkedin.com/in/yokes-marapa-791b06216/', label: 'About', external: true },
  { href: '/courses', label: 'Courses' },
  { href: '/services', label: 'Services' },
  { href: 'https://www.instagram.com/yaft_designs/', label: 'Projects', external: true },
  { href: '/faculty', label: 'Faculty' },
];

export default function SiteHeader({ active }: { active?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <header>
      <nav>
        <Link href="/" className="logo">
          <span className="mark">YAFT</span>
          <span className="sub">Designs</span>
        </Link>
        <div className={`navlinks${open ? ' open' : ''}`} id="navlinks">
          {NAV_LINKS.map((link) =>
            link.external ? (
              <a key={link.href} href={link.href} onClick={() => setOpen(false)}>
                {link.label}
              </a>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                className={active === link.href ? 'active' : undefined}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            )
          )}
          <a href="#contact" className="cta-btn" onClick={() => setOpen(false)}>
            Enquire
          </a>
          <Image className="rhino-logo" src="/assets/logos/rhino_logo.jpeg" alt="Rhino" width={32} height={32} />
        </div>
        <button className="navtoggle" id="navtoggle" aria-label="Menu" onClick={() => setOpen((v) => !v)}>
          <span></span><span></span><span></span>
        </button>
      </nav>
    </header>
  );
}
