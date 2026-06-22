'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';

const NAV_LINKS = [
  { href: '/courses', label: 'Courses' },
  { href: '/services', label: 'Services' },
  { href: 'https://www.instagram.com/yaft_designs/', label: 'Projects', external: true },
  { href: '/faculty', label: 'Faculty' },
  { href: '/resources', label: 'Resources' },
];

const RHINO_DIRECTORY_URL =
  'https://www.rhino3d.com/training/sites/1650/?coordinates=[78.476681,22.199166]&radius=2200429.497656352&place_type=country';

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
          <a href={RHINO_DIRECTORY_URL} target="_blank" rel="noopener">
            <Image
              className="rhino-logo"
              src="/assets/logos/rhino_logo.jpeg"
              alt="Authorized Rhino Training Center"
              width={32}
              height={32}
            />
          </a>
        </div>
        <button className="navtoggle" id="navtoggle" aria-label="Menu" onClick={() => setOpen((v) => !v)}>
          <span></span><span></span><span></span>
        </button>
      </nav>
    </header>
  );
}
