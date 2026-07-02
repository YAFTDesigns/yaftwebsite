'use client';

import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { useEffect } from 'react';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <>
      <SiteHeader />
      <main style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        textAlign: 'center',
      }}>
        <p style={{
          fontFamily: 'var(--mono)',
          fontSize: 10,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--blueprint)',
          marginBottom: 16,
        }}>
          Something went wrong
        </p>
        <h1 style={{
          fontSize: 22,
          fontWeight: 500,
          color: 'var(--ink)',
          marginBottom: 12,
          maxWidth: 480,
        }}>
          This page could not load right now
        </h1>
        <p style={{
          fontSize: 14,
          color: 'var(--ink-soft)',
          lineHeight: 1.7,
          maxWidth: 400,
          marginBottom: 28,
        }}>
          We are experiencing a temporary service issue. Please try again in a few minutes.
        </p>
        <button
          onClick={reset}
          style={{
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.15)',
            color: 'var(--ink-soft)',
            borderRadius: 4,
            padding: '10px 24px',
            fontSize: 12,
            fontFamily: 'var(--mono)',
            letterSpacing: '0.06em',
            cursor: 'pointer',
            textTransform: 'uppercase',
          }}
        >
          Try again
        </button>
      </main>
      <SiteFooter />
    </>
  );
}
