'use client';

import { useState } from 'react';

export default function FaqAccordion({ items }: { items: { q: string; a: string }[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="faq-list">
      {items.map((item, i) => (
        <div className={`faq-item${openIndex === i ? ' open' : ''}`} key={item.q}>
          <button className="faq-q" type="button" onClick={() => setOpenIndex(openIndex === i ? null : i)}>
            <span>{item.q}</span>
            <span className="plus">+</span>
          </button>
          <div className="faq-a"><p>{item.a}</p></div>
        </div>
      ))}
    </div>
  );
}
