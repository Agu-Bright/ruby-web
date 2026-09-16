'use client';

import { useEffect, useState } from 'react';
import type { TocItem } from '@/lib/blog';

/** Sticky in-article outline with scroll-spy highlighting the current section. */
export function TableOfContents({ items }: { items: TocItem[] }) {
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    if (!items.length) return;
    const headings = items
      .map((i) => document.getElementById(i.id))
      .filter((el): el is HTMLElement => !!el);
    if (!headings.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: '-96px 0px -70% 0px', threshold: 0 },
    );
    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [items]);

  if (items.length < 2) return null;

  return (
    <nav className="hidden xl:block">
      <p className="mb-3 text-xs font-bold uppercase tracking-[.18em] text-gray-400">
        On this page
      </p>
      <ul className="space-y-2 border-l border-gray-200 text-sm">
        {items.map((item) => (
          <li key={item.id} style={{ paddingLeft: item.level === 3 ? 16 : 0 }}>
            <a
              href={`#${item.id}`}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' });
                history.replaceState(null, '', `#${item.id}`);
              }}
              className={`-ml-px block border-l-2 pl-4 py-0.5 transition-colors ${
                activeId === item.id
                  ? 'border-ruby-red font-semibold text-ruby-red'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
