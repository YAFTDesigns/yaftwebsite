'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { track } from '@/lib/analytics';
import { hasStoredWhatsappAccess } from '@/lib/whatsappAccess';
import { OPEN_WHATSAPP_GATE_EVENT, type WhatsAppGateDetail } from './WhatsAppGateModal';

const ALLOWED_PATHS = ['/', '/courses', '/services'];
const DEFAULT_MESSAGE = "Hi, I'm interested in your Rhino3D and Grasshopper courses.";

export default function WhatsAppButton() {
  const pathname = usePathname();
  const allowed = ALLOWED_PATHS.includes(pathname);
  const [pastHero, setPastHero] = useState(!allowed || pathname !== '/');

  useEffect(() => {
    if (!allowed) return;
    // Only the homepage has a hero section to watch; other allowed pages
    // (courses, services) show the button immediately.
    /* eslint-disable react-hooks/set-state-in-effect -- this effect
       exists specifically to synchronize the button's visibility with
       the DOM (which page we're on, whether a hero section element
       exists), the documented legitimate use of useEffect, not an
       accidental cascading-render bug. */
    if (pathname !== '/') {
      setPastHero(true);
      return;
    }
    const hero = document.getElementById('hero-section');
    if (!hero) {
      setPastHero(true);
      return;
    }
    setPastHero(false);
    /* eslint-enable react-hooks/set-state-in-effect */
    const observer = new IntersectionObserver(
      ([entry]) => setPastHero(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(hero);
    return () => observer.disconnect();
  }, [allowed, pathname]);

  if (!allowed || !pastHero) return null;

  const href = `/api/wa?text=${encodeURIComponent(DEFAULT_MESSAGE)}`;

  function handleClick() {
    if (hasStoredWhatsappAccess()) {
      track('whatsapp_click', { page: pathname });
      window.open(href, '_blank', 'noopener,noreferrer');
      return;
    }
    window.dispatchEvent(
      new CustomEvent<WhatsAppGateDetail>(OPEN_WHATSAPP_GATE_EVENT, {
        detail: { text: DEFAULT_MESSAGE, fallbackUrl: href },
      })
    );
  }

  return (
    <>
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <filter id="wa-glass-distort">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.018" numOctaves="2" seed="7" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="14" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      <button
        type="button"
        onClick={handleClick}
        aria-label="Chat with YAFT Designs on WhatsApp"
        className="wa-float-pill"
      >
        <span>Chat With Us</span>
        <span className="wa-icon-wrap">
          <span className="wa-ring" />
          <span className="wa-ring wa-ring-delay" />
          <span className="wa-icon-circle">
            <svg viewBox="0 0 32 32" width="20" height="20" fill="white">
              <path d="M16.004 3C9.377 3 4 8.373 4 15c0 2.362.688 4.564 1.874 6.417L4 29l7.771-1.845A11.94 11.94 0 0016.004 27C22.63 27 28 21.627 28 15S22.63 3 16.004 3zm0 21.75a9.7 9.7 0 01-4.949-1.354l-.355-.21-4.612 1.095 1.13-4.494-.232-.368A9.71 9.71 0 016.25 15c0-5.38 4.375-9.75 9.754-9.75 5.38 0 9.746 4.37 9.746 9.75s-4.366 9.75-9.746 9.75z" />
              <path d="M21.44 17.63c-.29-.145-1.71-.844-1.976-.94-.265-.096-.458-.145-.65.145-.194.29-.746.94-.915 1.132-.169.194-.337.218-.626.073-.29-.145-1.223-.451-2.33-1.438-.861-.768-1.443-1.717-1.612-2.007-.169-.29-.018-.446.127-.59.13-.13.29-.338.435-.507.145-.169.193-.29.29-.483.096-.194.048-.362-.024-.507-.073-.145-.65-1.567-.89-2.146-.235-.564-.474-.488-.65-.497l-.554-.01c-.193 0-.507.072-.772.362-.265.29-1.012.988-1.012 2.41s1.036 2.796 1.18 2.989c.145.194 2.038 3.11 4.94 4.36.69.298 1.228.476 1.647.61.692.22 1.322.189 1.82.115.555-.083 1.71-.699 1.951-1.373.242-.675.242-1.253.169-1.373-.072-.121-.265-.194-.555-.338z" />
            </svg>
          </span>
        </span>
      </button>
      <style jsx>{`
        .wa-float-pill {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 60;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 8px 8px 20px;
          border-radius: 999px;
          cursor: pointer;
          text-decoration: none;
          font: inherit;
          -webkit-appearance: none;
          appearance: none;
          animation: wa-entrance 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both;

          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.16);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.22),
            inset 0 0 18px rgba(255, 255, 255, 0.03),
            0 8px 24px rgba(0, 0, 0, 0.45);
          backdrop-filter: url(#wa-glass-distort) blur(4px) saturate(150%);
          -webkit-backdrop-filter: blur(8px) saturate(150%);
          transition: border-color 0.2s;
        }
        .wa-float-pill:hover {
          border-color: rgba(255, 255, 255, 0.28);
        }
        .wa-float-pill::before {
          content: '';
          position: absolute;
          top: 0;
          left: 14px;
          right: 14px;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.6), transparent);
        }
        @keyframes wa-entrance {
          0% { opacity: 0; transform: scale(0.3) translateY(20px); }
          60% { opacity: 1; transform: scale(1.08) translateY(-4px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .wa-float-pill span:first-child {
          color: #ededed;
          font-family: var(--display, sans-serif);
          font-weight: 600;
          font-size: 14px;
          letter-spacing: 0.01em;
          white-space: nowrap;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
        }
        .wa-icon-wrap {
          position: relative;
          width: 38px;
          height: 38px;
          flex-shrink: 0;
          display: block;
        }
        .wa-ring {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: #25d366;
          animation: wa-ripple 2.2s ease-out 2;
        }
        .wa-ring-delay {
          animation-delay: 1.1s;
        }
        @keyframes wa-ripple {
          0% { transform: scale(1); opacity: 0.5; }
          70% { transform: scale(1.9); opacity: 0; }
          100% { transform: scale(1.9); opacity: 0; }
        }
        .wa-icon-circle {
          position: relative;
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: #25d366;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.3), 0 2px 6px rgba(37, 211, 102, 0.4);
        }
        .wa-icon-circle svg {
          animation: wa-ring-shake 2.6s ease-in-out 1;
          transform-origin: 50% 20%;
        }
        @keyframes wa-ring-shake {
          0%, 75%, 100% { transform: rotate(0deg); }
          78% { transform: rotate(-16deg); }
          81% { transform: rotate(14deg); }
          84% { transform: rotate(-10deg); }
          87% { transform: rotate(8deg); }
          90% { transform: rotate(-4deg); }
          93% { transform: rotate(0deg); }
        }
        @media (max-width: 640px) {
          .wa-float-pill span:first-child { display: none; }
          .wa-float-pill { padding: 8px; }
        }
      `}</style>
    </>
  );
}
