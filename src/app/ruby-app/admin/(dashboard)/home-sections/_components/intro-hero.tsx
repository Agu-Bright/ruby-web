'use client';

import { useEffect, useState } from 'react';
import { X, LayoutGrid, Hand, Eye, Zap } from 'lucide-react';
import { TYPE_INFO } from './type-badge';
import type { HomeSectionType } from '@/lib/types';

const STORAGE_KEY = 'ruby_admin_seen_home_sections_intro_v1';

/**
 * One-time onboarding card shown above the section list. Explains
 * what the page does and what the four section types mean — the
 * "admin opens this for the first time and has no idea what to do"
 * problem the user flagged.
 *
 * Persistence: a `localStorage` flag per browser. We deliberately
 * don't sync this across devices — the cost of seeing the intro twice
 * is zero, and a cross-device flag would need server work for a
 * one-time-per-user value that's not worth the round-trip.
 */
export function IntroHero() {
  const [dismissed, setDismissed] = useState(true); // start hidden until effect runs

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setDismissed(window.localStorage.getItem(STORAGE_KEY) === '1');
  }, []);

  const dismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // localStorage can throw in private/incognito mode — UX still works
      // for the current session; just no persistence.
    }
  };

  if (dismissed) return null;

  const types: HomeSectionType[] = ['REVIEWS', 'WHATS_HOT', 'EVENTS', 'CATEGORY', 'CURATED'];

  return (
    <div className="relative card p-5 bg-gradient-to-br from-ruby-50 via-white to-blue-50 border-ruby-100">
      <button
        onClick={dismiss}
        className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-white/60 text-gray-400 hover:text-gray-700 transition-colors"
        aria-label="Dismiss intro"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-ruby-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-ruby-200/60">
          <LayoutGrid className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-gray-900">
            This is the customer app&rsquo;s home screen
          </h3>
          <p className="text-sm text-gray-600 mt-0.5 max-w-2xl">
            Every row below is a band on the home tab. Drag to reorder, toggle
            the eye to hide, or click a row to edit it. Changes go live in
            every customer&rsquo;s app within a second.
          </p>
        </div>
      </div>

      {/* Quick actions hint */}
      <div className="flex flex-wrap gap-3 mb-4 text-[12px]">
        <span className="inline-flex items-center gap-1.5 text-gray-600">
          <Hand className="w-3.5 h-3.5 text-ruby-500" />
          Drag the handle to reorder
        </span>
        <span className="inline-flex items-center gap-1.5 text-gray-600">
          <Eye className="w-3.5 h-3.5 text-emerald-500" />
          Toggle to hide a row
        </span>
        <span className="inline-flex items-center gap-1.5 text-gray-600">
          <Zap className="w-3.5 h-3.5 text-amber-500" />
          Live updates &mdash; no publish step
        </span>
      </div>

      {/* Type legend */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {types.map((t) => {
          const info = TYPE_INFO[t];
          const Icon = info.icon;
          return (
            <div
              key={t}
              className="flex items-start gap-2 p-2.5 rounded-lg bg-white/70 border border-gray-100"
            >
              <div
                className={`w-7 h-7 rounded-md ${info.iconBg} ${info.iconColor} flex items-center justify-center shrink-0`}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="text-[12px] font-semibold text-gray-900">
                  {info.label}
                </div>
                <div className="text-[11px] text-gray-500 leading-snug">
                  {info.description}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
