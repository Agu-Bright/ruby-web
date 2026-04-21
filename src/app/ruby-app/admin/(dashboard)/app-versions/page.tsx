'use client';

import { useState } from 'react';
import {
  Smartphone, Shield, ExternalLink, Save, RefreshCw,
  Apple, MonitorSmartphone, ToggleLeft, ToggleRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { useApi } from '@/lib/hooks';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/ui';
import type { AppVersion } from '@/lib/types';

const APP_LABELS: Record<string, string> = {
  BUSINESS: 'Business App',
  CUSTOMER: 'Customer App',
};

const PLATFORM_ICONS: Record<string, typeof Apple> = {
  IOS: Apple,
  ANDROID: MonitorSmartphone,
};

export default function AppVersionsPage() {
  const { data: versions, isLoading, refetch } = useApi<AppVersion[]>(
    () => api.appVersions.list(),
    [],
  );

  const [saving, setSaving] = useState<string | null>(null);

  // Group by app
  const businessVersions = (versions || []).filter(v => v.app === 'BUSINESS');
  const customerVersions = (versions || []).filter(v => v.app === 'CUSTOMER');

  const handleSave = async (version: AppVersion, updates: Partial<AppVersion>) => {
    const key = `${version.app}-${version.platform}`;
    setSaving(key);
    try {
      await api.appVersions.upsert({
        app: version.app,
        platform: version.platform,
        minVersion: updates.minVersion ?? version.minVersion,
        latestVersion: updates.latestVersion ?? version.latestVersion,
        storeUrl: updates.storeUrl ?? version.storeUrl,
        forceUpdate: updates.forceUpdate ?? version.forceUpdate,
        updateMessage: updates.updateMessage ?? version.updateMessage,
      });
      toast.success(`${APP_LABELS[version.app]} ${version.platform} updated`);
      refetch();
    } catch {
      toast.error('Failed to update');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="App Versions"
        description="Control minimum required versions and force updates for mobile apps"
      />

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-40 mb-4" />
              <div className="space-y-3">
                <div className="h-10 bg-gray-100 rounded" />
                <div className="h-10 bg-gray-100 rounded" />
                <div className="h-10 bg-gray-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : (versions || []).length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Smartphone className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No App Version Configs</h3>
          <p className="text-sm text-gray-500 mb-4">Create version configs to enable force update for your mobile apps.</p>
          <CreateButtons onCreated={refetch} />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Business App */}
          {businessVersions.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-ruby-600" />
                <h2 className="text-lg font-semibold text-gray-900">Business App</h2>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {businessVersions.map(v => (
                  <VersionCard key={v._id} version={v} saving={saving} onSave={handleSave} />
                ))}
              </div>
            </div>
          )}

          {/* Customer App */}
          {customerVersions.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Smartphone className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">Customer App</h2>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {customerVersions.map(v => (
                  <VersionCard key={v._id} version={v} saving={saving} onSave={handleSave} />
                ))}
              </div>
            </div>
          )}

          {/* Create missing configs */}
          {(versions || []).length < 4 && (
            <div className="border-t border-gray-200 pt-6">
              <CreateButtons existing={versions || []} onCreated={refetch} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Version Card ──────────────────────────────────────────

function VersionCard({
  version,
  saving,
  onSave,
}: {
  version: AppVersion;
  saving: string | null;
  onSave: (v: AppVersion, updates: Partial<AppVersion>) => Promise<void>;
}) {
  const [minVersion, setMinVersion] = useState(version.minVersion);
  const [latestVersion, setLatestVersion] = useState(version.latestVersion || '');
  const [storeUrl, setStoreUrl] = useState(version.storeUrl || '');
  const [forceUpdate, setForceUpdate] = useState(version.forceUpdate);
  const [updateMessage, setUpdateMessage] = useState(version.updateMessage || '');

  const key = `${version.app}-${version.platform}`;
  const isSaving = saving === key;
  const PlatformIcon = PLATFORM_ICONS[version.platform] || Smartphone;

  const hasChanges =
    minVersion !== version.minVersion ||
    latestVersion !== (version.latestVersion || '') ||
    storeUrl !== (version.storeUrl || '') ||
    forceUpdate !== version.forceUpdate ||
    updateMessage !== (version.updateMessage || '');

  const handleSubmit = () => {
    if (!minVersion.trim()) {
      toast.error('Minimum version is required');
      return;
    }
    onSave(version, { minVersion, latestVersion: latestVersion || undefined, storeUrl: storeUrl || undefined, forceUpdate, updateMessage: updateMessage || undefined });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-2.5">
          <PlatformIcon className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-semibold text-gray-800">{version.platform}</span>
        </div>
        <button
          onClick={() => onSave(version, { forceUpdate: !forceUpdate }).then(() => setForceUpdate(!forceUpdate))}
          className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
            forceUpdate
              ? 'bg-red-100 text-red-700 hover:bg-red-200'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
        >
          {forceUpdate ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
          {forceUpdate ? 'Force Update ON' : 'Force Update OFF'}
        </button>
      </div>

      {/* Fields */}
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Min Version *</label>
            <input
              type="text"
              value={minVersion}
              onChange={e => setMinVersion(e.target.value)}
              placeholder="1.0.0"
              className="input-field text-sm"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Latest Version</label>
            <input
              type="text"
              value={latestVersion}
              onChange={e => setLatestVersion(e.target.value)}
              placeholder="1.1.0"
              className="input-field text-sm"
            />
          </div>
        </div>

        <div>
          <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Store URL</label>
          <div className="relative">
            <input
              type="url"
              value={storeUrl}
              onChange={e => setStoreUrl(e.target.value)}
              placeholder="https://apps.apple.com/..."
              className="input-field text-sm pr-8"
            />
            {storeUrl && (
              <a href={storeUrl} target="_blank" rel="noopener noreferrer" className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>

        <div>
          <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Update Message</label>
          <textarea
            value={updateMessage}
            onChange={e => setUpdateMessage(e.target.value)}
            placeholder="A new version is available. Please update to continue."
            rows={2}
            className="input-field text-sm resize-none"
          />
        </div>

        {/* Save */}
        {hasChanges && (
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="w-full flex items-center justify-center gap-2 bg-ruby-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-ruby-700 transition-colors disabled:opacity-50"
          >
            {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Create Missing Configs ────────────────────────────────

function CreateButtons({ existing = [], onCreated }: { existing?: AppVersion[]; onCreated: () => void }) {
  const [creating, setCreating] = useState(false);

  const allConfigs = [
    { app: 'BUSINESS', platform: 'IOS' },
    { app: 'BUSINESS', platform: 'ANDROID' },
    { app: 'CUSTOMER', platform: 'IOS' },
    { app: 'CUSTOMER', platform: 'ANDROID' },
  ];

  const missing = allConfigs.filter(c => !existing.some(e => e.app === c.app && e.platform === c.platform));

  if (missing.length === 0) return null;

  const handleCreateAll = async () => {
    setCreating(true);
    try {
      for (const config of missing) {
        await api.appVersions.upsert({
          app: config.app,
          platform: config.platform,
          minVersion: '1.0.0',
          forceUpdate: false,
          updateMessage: `A new version of Ruby+ ${config.app === 'BUSINESS' ? 'Business' : ''} is available. Please update.`,
        });
      }
      toast.success(`Created ${missing.length} version config(s)`);
      onCreated();
    } catch {
      toast.error('Failed to create configs');
    } finally {
      setCreating(false);
    }
  };

  return (
    <button
      onClick={handleCreateAll}
      disabled={creating}
      className="inline-flex items-center gap-2 text-sm font-medium text-ruby-600 hover:text-ruby-700 disabled:opacity-50"
    >
      {creating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />}
      Create Missing Configs ({missing.length})
    </button>
  );
}
