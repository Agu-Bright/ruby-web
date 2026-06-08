'use client';

import { useState } from 'react';
import { ShieldAlert, Smartphone, Globe, Users, CheckCircle2 } from 'lucide-react';
import { useApi } from '@/lib/hooks';
import { api } from '@/lib/api';
import { PageHeader, Modal } from '@/components/ui';

/**
 * P99 — Cluster Alerts admin dashboard.
 *
 * Two sections of fraud-ring signals derived from the reward ledger:
 *
 *  1. DEVICE CLUSTERS — same `deviceFingerprintId` attached to more
 *     than 3 user accounts over the last 30 days. Strong sock-puppet
 *     signal: a single install creating multiple accounts to game
 *     referrals / reviews / cashback.
 *
 *  2. IP CLUSTERS — same `clientIp` attached to more than 5 reward
 *     ledger rows over the last 7 days. Weaker signal (legit shared
 *     NAT / WiFi / mobile carriers explain most of it) but rapid
 *     bursts from one IP still surface here for admin triage.
 *
 * Each row exposes the userIds set so an admin can click through to
 * the per-user reward profile and decide whether to clawback (via
 * /admin/rewards/clawback) or adjust (via the user-lookup page).
 */
export default function AdminClusterAlertsPage() {
  const { data, isLoading, refetch } = useApi(
    () => api.rewards.getClusterAlerts(),
    [],
  );

  const [usersOpen, setUsersOpen] = useState(false);
  const [usersModalTitle, setUsersModalTitle] = useState('');
  const [usersModalIds, setUsersModalIds] = useState<string[]>([]);

  const openUsers = (title: string, userIds: string[]) => {
    setUsersModalTitle(title);
    setUsersModalIds(userIds);
    setUsersOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reward Cluster Alerts"
        description="Fraud-ring signals from the reward ledger. A device fingerprint attached to many user accounts, or a client IP attached to many credit rows, suggests sock-puppet activity worth investigating."
      />

      {/* Summary banner */}
      <div className="card flex flex-wrap items-center justify-between gap-3">
        <div
          className="flex items-center gap-2 text-sm text-gray-700"
          role="status"
          aria-live="polite"
        >
          <ShieldAlert className="w-4 h-4 text-amber-600" aria-hidden />
          {isLoading ? (
            <>
              <div
                className="w-3.5 h-3.5 border-2 border-gray-300 border-t-ruby-500 rounded-full animate-spin"
                aria-hidden
              />
              <span>Loading clusters…</span>
            </>
          ) : (
            <span>
              <strong>{data?.deviceClusters?.length ?? 0}</strong> device
              cluster(s) ·{' '}
              <strong>{data?.ipClusters?.length ?? 0}</strong> IP cluster(s)
              · generated{' '}
              {data?.generatedAt
                ? new Date(data.generatedAt).toLocaleString()
                : '—'}
            </span>
          )}
        </div>
        <button
          onClick={() => refetch()}
          disabled={isLoading}
          aria-label="Refresh cluster alerts"
          className="px-3 py-1.5 bg-ruby-500 text-white text-sm font-semibold rounded-md hover:bg-ruby-600 disabled:opacity-60"
        >
          {isLoading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {data?.thresholds && (
        <p className="text-xs text-gray-500">
          Thresholds: device window = {data.thresholds.deviceWindowDays}d,
          min users = {data.thresholds.deviceMinUsers + 1}+ · IP window ={' '}
          {data.thresholds.ipWindowDays}d, min entries ={' '}
          {data.thresholds.ipMinEntries + 1}+
        </p>
      )}

      {/* DEVICE CLUSTERS */}
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
          <Smartphone className="w-4 h-4" />
          Device clusters
        </h3>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500 py-6 justify-center" role="status">
            <div
              className="w-4 h-4 border-2 border-gray-300 border-t-ruby-500 rounded-full animate-spin"
              aria-hidden
            />
            <span>Loading device clusters…</span>
          </div>
        ) : !data?.deviceClusters?.length ? (
          <div className="text-center py-8">
            <CheckCircle2 className="w-9 h-9 text-emerald-500 mx-auto mb-2" aria-hidden />
            <p className="text-sm font-semibold text-gray-700">
              No device clusters above threshold
            </p>
            <p className="text-xs text-gray-500 mt-1">
              No single device fingerprint is tied to{' '}
              {(data?.thresholds?.deviceMinUsers ?? 3) + 1}+ user accounts in
              the last {data?.thresholds?.deviceWindowDays ?? 30} days.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[11px] uppercase tracking-wider text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="text-left py-2">Device fingerprint</th>
                  <th className="text-right py-2">Users</th>
                  <th className="text-right py-2">Reward rows</th>
                  <th className="text-left py-2">Last seen</th>
                  <th className="text-right py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.deviceClusters.map((row) => (
                  <tr
                    key={row.deviceFingerprintId}
                    className="border-b border-gray-100 align-top"
                  >
                    <td className="py-2 text-gray-900 font-mono text-xs break-all">
                      {row.deviceFingerprintId}
                    </td>
                    <td className="py-2 text-right font-semibold text-amber-700">
                      {row.userCount}
                    </td>
                    <td className="py-2 text-right text-gray-700">
                      {row.entryCount}
                    </td>
                    <td className="py-2 text-gray-600 whitespace-nowrap">
                      {new Date(row.lastSeen).toLocaleString()}
                    </td>
                    <td className="py-2 text-right">
                      <button
                        onClick={() =>
                          openUsers(
                            `Users on device ${row.deviceFingerprintId.slice(0, 8)}…`,
                            row.userIds,
                          )
                        }
                        aria-label={`View ${row.userCount} users on this device fingerprint`}
                        className="px-2 py-1 text-xs font-semibold bg-ruby-50 text-ruby-700 border border-ruby-200 rounded-md hover:bg-ruby-100 flex items-center gap-1 ml-auto"
                      >
                        <Users className="w-3 h-3" aria-hidden /> View users
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* IP CLUSTERS */}
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
          <Globe className="w-4 h-4" />
          IP clusters
        </h3>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500 py-6 justify-center" role="status">
            <div
              className="w-4 h-4 border-2 border-gray-300 border-t-ruby-500 rounded-full animate-spin"
              aria-hidden
            />
            <span>Loading IP clusters…</span>
          </div>
        ) : !data?.ipClusters?.length ? (
          <div className="text-center py-8">
            <CheckCircle2 className="w-9 h-9 text-emerald-500 mx-auto mb-2" aria-hidden />
            <p className="text-sm font-semibold text-gray-700">
              No IP clusters above threshold
            </p>
            <p className="text-xs text-gray-500 mt-1">
              No single client IP is tied to{' '}
              {(data?.thresholds?.ipMinEntries ?? 5) + 1}+ reward credits in
              the last {data?.thresholds?.ipWindowDays ?? 7} days.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[11px] uppercase tracking-wider text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="text-left py-2">Client IP</th>
                  <th className="text-right py-2">Users</th>
                  <th className="text-right py-2">Reward rows</th>
                  <th className="text-left py-2">Last seen</th>
                  <th className="text-right py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.ipClusters.map((row) => (
                  <tr
                    key={row.clientIp}
                    className="border-b border-gray-100 align-top"
                  >
                    <td className="py-2 text-gray-900 font-mono text-xs">
                      {row.clientIp}
                    </td>
                    <td className="py-2 text-right font-semibold text-amber-700">
                      {row.userCount}
                    </td>
                    <td className="py-2 text-right text-gray-700">
                      {row.entryCount}
                    </td>
                    <td className="py-2 text-gray-600 whitespace-nowrap">
                      {new Date(row.lastSeen).toLocaleString()}
                    </td>
                    <td className="py-2 text-right">
                      <button
                        onClick={() =>
                          openUsers(`Users on IP ${row.clientIp}`, row.userIds)
                        }
                        aria-label={`View ${row.userCount} users on IP ${row.clientIp}`}
                        className="px-2 py-1 text-xs font-semibold bg-ruby-50 text-ruby-700 border border-ruby-200 rounded-md hover:bg-ruby-100 flex items-center gap-1 ml-auto"
                      >
                        <Users className="w-3 h-3" aria-hidden /> View users
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        isOpen={usersOpen}
        onClose={() => setUsersOpen(false)}
        title={usersModalTitle}
        subtitle={`${usersModalIds.length} user(s)`}
        size="md"
      >
        <div className="space-y-2">
          {usersModalIds.map((uid) => (
            <div
              key={uid}
              className="flex items-center justify-between text-sm bg-gray-50 border border-gray-200 rounded-md p-2"
            >
              <span className="font-mono text-xs text-gray-700 break-all">
                {uid}
              </span>
              <a
                href={`/ruby-app/admin/rewards?userId=${uid}`}
                className="px-2 py-1 text-[11px] font-semibold bg-ruby-500 text-white rounded-md hover:bg-ruby-600 whitespace-nowrap"
              >
                Open profile
              </a>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
