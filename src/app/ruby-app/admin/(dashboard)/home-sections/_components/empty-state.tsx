'use client';

import { useState } from 'react';
import { LayoutGrid, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

/**
 * Shown when no home sections exist at all — usually only on a fresh
 * database before the onModuleInit seed has run, or after an admin has
 * deleted every CURATED section AND toggled all systems hidden then
 * deleted them externally. The actionable [Seed defaults] button calls
 * the existing admin endpoint and re-creates the baseline so admins
 * can recover without a redeploy.
 */
export function EmptyState({ onAdd, onAfterSeed }: { onAdd: () => void; onAfterSeed: () => void }) {
  const [seeding, setSeeding] = useState(false);

  const seed = async () => {
    setSeeding(true);
    try {
      const res = await api.homeSections.seed();
      if (res.success && res.data) {
        const created = (res.data as any).created ?? 0;
        if (created > 0) {
          toast.success(`Seeded ${created} default sections`);
        } else {
          toast.message('Sections already exist — nothing to seed.');
        }
        onAfterSeed();
      } else {
        toast.error('Could not seed defaults');
      }
    } catch (err) {
      toast.error((err as Error).message || 'Could not seed defaults');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="card flex flex-col items-center text-center px-6 py-16">
      <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <LayoutGrid className="w-7 h-7 text-gray-400" />
      </div>
      <h3 className="text-base font-semibold text-gray-900 mb-1">
        No home sections configured
      </h3>
      <p className="text-sm text-gray-500 max-w-md mb-5">
        The customer app shows its fallback layout until you add sections
        here. Seed the defaults (Reviews + What&rsquo;s Hot + one row per
        category) or add a custom one to get started.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={seed}
          disabled={seeding}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          {seeding ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <LayoutGrid className="w-4 h-4" />
          )}
          {seeding ? 'Seeding…' : 'Seed defaults'}
        </button>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-ruby-600 rounded-lg hover:bg-ruby-700"
        >
          <Plus className="w-4 h-4" />
          Add the first section
        </button>
      </div>
    </div>
  );
}
