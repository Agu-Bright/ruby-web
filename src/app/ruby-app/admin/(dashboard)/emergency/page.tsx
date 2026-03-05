'use client';

import { useState, useCallback } from 'react';
import {
  ShieldAlert,
  Eye,
  CheckCircle,
  XCircle,
  MapPin,
  Phone,
  Mail,
  Clock,
  User,
  ExternalLink,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';
import { useApi, useMutation } from '@/lib/hooks';
import api from '@/lib/api/client';
import { PageHeader, StatusBadge, Modal, type Column } from '@/components/ui';
import type {
  EmergencyAlert,
  EmergencyAlertStats,
  EmergencyAlertFilterParams,
  EmergencyAlertStatus,
  UpdateEmergencyAlertRequest,
} from '@/lib/types';
import { formatRelativeTime, formatDateTime, toLocationId } from '@/lib/utils';

const STATUS_OPTIONS: EmergencyAlertStatus[] = ['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'FALSE_ALARM'];

function getAlertUserName(alert: EmergencyAlert): string {
  if (typeof alert.userId === 'object' && alert.userId) {
    return `${alert.userId.firstName || ''} ${alert.userId.lastName || ''}`.trim();
  }
  return alert.contactInfo?.name || '';
}

function getAlertUserPhone(alert: EmergencyAlert): string {
  if (typeof alert.userId === 'object' && alert.userId?.phone) return alert.userId.phone;
  return alert.contactInfo?.phone || '';
}

function getAlertUserEmail(alert: EmergencyAlert): string {
  if (typeof alert.userId === 'object' && alert.userId?.email) return alert.userId.email;
  return alert.contactInfo?.email || '';
}

function getAlertLocationName(alert: EmergencyAlert): string {
  if (typeof alert.locationId === 'object' && alert.locationId?.name) return alert.locationId.name;
  return '';
}

function getAdminName(field: EmergencyAlert['acknowledgedBy'] | EmergencyAlert['resolvedBy']): string {
  if (!field) return '';
  if (typeof field === 'object') return `${field.firstName || ''} ${field.lastName || ''}`.trim();
  return '';
}

function getMapsUrl(alert: EmergencyAlert): string {
  if (!alert.location?.coordinates) return '';
  const [lng, lat] = alert.location.coordinates;
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

function getCoordDisplay(alert: EmergencyAlert): string {
  if (!alert.location?.coordinates) return 'Unknown';
  const [lng, lat] = alert.location.coordinates;
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

export default function EmergencyPage() {
  const { admin } = useAuth();
  const locationId = admin?.scope === 'LOCATION' && admin.locationIds.length === 1
    ? toLocationId(admin.locationIds[0]) : undefined;

  const [filters, setFilters] = useState<EmergencyAlertFilterParams>({
    page: 1,
    limit: 20,
    ...(locationId ? { locationId } : {}),
  });
  const [statusFilter, setStatusFilter] = useState<EmergencyAlertStatus | ''>('');
  const [detailAlert, setDetailAlert] = useState<EmergencyAlert | null>(null);
  const [actionModal, setActionModal] = useState<{ alert: EmergencyAlert; action: EmergencyAlertStatus } | null>(null);
  const [actionNotes, setActionNotes] = useState('');

  const { data: alerts, meta, isLoading, refetch } = useApi<EmergencyAlert[]>(
    () => api.emergency.list(filters),
    [filters],
  );

  const { data: stats } = useApi<EmergencyAlertStats>(
    () => api.emergency.stats(locationId ? { locationId } : undefined),
    [locationId],
  );

  const { data: fullDetail } = useApi<EmergencyAlert>(
    () => detailAlert ? api.emergency.get(detailAlert._id) : Promise.resolve({ success: true, data: detailAlert! }),
    [detailAlert?._id],
  );
  const displayAlert = fullDetail || detailAlert;

  const { mutate: updateAlert, isLoading: updating } = useMutation(
    ({ id, data }: { id: string; data: UpdateEmergencyAlertRequest }) => api.emergency.update(id, data),
    { onError: (msg) => toast.error(msg) },
  );

  const handleStatusChange = useCallback((status: EmergencyAlertStatus | '') => {
    setStatusFilter(status);
    setFilters((f) => ({ ...f, page: 1, status: status || undefined }));
  }, []);

  const handleAction = useCallback(async () => {
    if (!actionModal) return;
    const result = await updateAlert({
      id: actionModal.alert._id,
      data: { status: actionModal.action, notes: actionNotes || undefined },
    });
    if (result !== null) {
      toast.success(`Alert ${actionModal.action === 'ACKNOWLEDGED' ? 'acknowledged' : actionModal.action === 'RESOLVED' ? 'resolved' : 'marked as false alarm'}`);
      setActionModal(null);
      setActionNotes('');
      refetch();
    }
  }, [actionModal, actionNotes, updateAlert, refetch]);

  const pagination = meta;

  const statCards = [
    { label: 'Active', value: stats?.active ?? 0, color: 'bg-red-50 text-red-700', pulse: true },
    { label: 'Acknowledged', value: stats?.acknowledged ?? 0, color: 'bg-amber-50 text-amber-700', pulse: false },
    { label: 'Resolved', value: stats?.resolved ?? 0, color: 'bg-green-50 text-green-700', pulse: false },
    { label: 'False Alarm', value: stats?.falseAlarm ?? 0, color: 'bg-gray-50 text-gray-600', pulse: false },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Emergency Alerts"
        description="Monitor and respond to user SOS distress signals"
      />

      {/* ─── Stat Cards ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className={`rounded-xl p-4 ${s.color}`}>
            <div className="flex items-center gap-2">
              {s.pulse && s.value > 0 && (
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600" />
                </span>
              )}
              <span className="text-xs font-semibold uppercase tracking-wider opacity-80">{s.label}</span>
            </div>
            <div className="text-2xl font-bold mt-1">{s.value}</div>
          </div>
        ))}
      </div>

      {/* ─── Filter Bar ─── */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <select
              className="appearance-none bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500"
              value={statusFilter}
              onChange={(e) => handleStatusChange(e.target.value as EmergencyAlertStatus | '')}
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s.replace('_', ' ')}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ─── Alert Table ─── */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ruby-600" />
          </div>
        ) : !alerts?.length ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <CheckCircle className="w-12 h-12 text-gray-300 mb-3" />
            <p className="font-medium">No emergency alerts</p>
            <p className="text-sm text-gray-400">All clear</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Alert</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Location</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Time</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((alert) => (
                    <tr key={alert._id} className={`border-b border-gray-50 hover:bg-gray-50/50 ${alert.status === 'ACTIVE' ? 'bg-red-50/30' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {alert.status === 'ACTIVE' && (
                            <span className="relative flex h-2.5 w-2.5 shrink-0">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600" />
                            </span>
                          )}
                          <div>
                            <div className="font-medium text-gray-900">{getAlertUserName(alert)}</div>
                            <div className="text-xs text-gray-500">{getAlertUserPhone(alert)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {alert.location?.coordinates ? (
                          <a
                            href={getMapsUrl(alert)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs"
                          >
                            <MapPin className="w-3 h-3" />
                            {getCoordDisplay(alert)}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-gray-400 text-xs">Unknown</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={alert.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-gray-700 text-xs">{formatRelativeTime(alert.createdAt)}</div>
                        <div className="text-gray-400 text-[10px]">{formatDateTime(alert.createdAt)}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
                            title="View details"
                            onClick={() => setDetailAlert(alert)}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {alert.status === 'ACTIVE' && (
                            <button
                              className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-700 text-xs font-medium hover:bg-amber-200"
                              onClick={() => setActionModal({ alert, action: 'ACKNOWLEDGED' })}
                            >
                              Acknowledge
                            </button>
                          )}
                          {alert.status === 'ACKNOWLEDGED' && (
                            <button
                              className="px-2.5 py-1 rounded-lg bg-green-100 text-green-700 text-xs font-medium hover:bg-green-200"
                              onClick={() => setActionModal({ alert, action: 'RESOLVED' })}
                            >
                              Resolve
                            </button>
                          )}
                          {(alert.status === 'ACTIVE' || alert.status === 'ACKNOWLEDGED') && (
                            <button
                              className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 text-xs font-medium hover:bg-gray-200"
                              onClick={() => setActionModal({ alert, action: 'FALSE_ALARM' })}
                            >
                              False Alarm
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination && (pagination.totalPages ?? 0) > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <span className="text-sm text-gray-500">
                  {pagination.total} alert{pagination.total !== 1 ? 's' : ''}
                </span>
                <div className="flex gap-2">
                  <button
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                    disabled={(pagination.page ?? 1) <= 1}
                    onClick={() => setFilters((f) => ({ ...f, page: (f.page || 1) - 1 }))}
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1.5 text-sm text-gray-600">
                    {pagination.page ?? 1} / {pagination.totalPages ?? 1}
                  </span>
                  <button
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                    disabled={(pagination.page ?? 1) >= (pagination.totalPages ?? 1)}
                    onClick={() => setFilters((f) => ({ ...f, page: (f.page || 1) + 1 }))}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ─── Detail Modal ─── */}
      <Modal
        isOpen={!!detailAlert}
        onClose={() => setDetailAlert(null)}
        title="Emergency Alert Detail"
        subtitle={displayAlert ? `#${displayAlert._id.slice(-8)}` : ''}
        size="lg"
      >
        {displayAlert && (
          <div className="space-y-5">
            {/* Status Banner */}
            <div className={`rounded-lg p-3 flex items-center gap-3 ${
              displayAlert.status === 'ACTIVE' ? 'bg-red-50 border border-red-200' :
              displayAlert.status === 'ACKNOWLEDGED' ? 'bg-amber-50 border border-amber-200' :
              displayAlert.status === 'RESOLVED' ? 'bg-green-50 border border-green-200' :
              'bg-gray-50 border border-gray-200'
            }`}>
              {displayAlert.status === 'ACTIVE' && (
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600" />
                </span>
              )}
              <StatusBadge status={displayAlert.status} />
              <span className="text-sm text-gray-600">
                Triggered {formatRelativeTime(displayAlert.createdAt)} &middot; {formatDateTime(displayAlert.createdAt)}
              </span>
            </div>

            {/* User Info */}
            <div>
              <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">User Information</div>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="font-medium text-gray-900">{getAlertUserName(displayAlert)}</span>
                </div>
                {getAlertUserPhone(displayAlert) && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <a href={`tel:${getAlertUserPhone(displayAlert)}`} className="text-blue-600 hover:underline">
                      {getAlertUserPhone(displayAlert)}
                    </a>
                  </div>
                )}
                {getAlertUserEmail(displayAlert) && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <a href={`mailto:${getAlertUserEmail(displayAlert)}`} className="text-blue-600 hover:underline">
                      {getAlertUserEmail(displayAlert)}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Location */}
            <div>
              <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Location</div>
              <div className="bg-gray-50 rounded-lg p-4">
                {displayAlert.location?.coordinates ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-red-500" />
                      <span className="text-sm text-gray-700">{getCoordDisplay(displayAlert)}</span>
                      {getAlertLocationName(displayAlert) && (
                        <span className="text-xs text-gray-400">({getAlertLocationName(displayAlert)})</span>
                      )}
                    </div>
                    <a
                      href={getMapsUrl(displayAlert)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View on Map
                    </a>
                  </div>
                ) : (
                  <span className="text-gray-400 text-sm">Location not available</span>
                )}
              </div>
            </div>

            {/* Emergency Contacts */}
            {displayAlert.emergencyContacts?.length > 0 && (
              <div>
                <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Emergency Contacts</div>
                <div className="space-y-2">
                  {displayAlert.emergencyContacts.map((contact, i) => (
                    <div key={i} className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900 text-sm">{contact.name}</div>
                        <div className="text-xs text-gray-500">{contact.relation}</div>
                      </div>
                      <a
                        href={`tel:${contact.phone}`}
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        {contact.phone}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Message */}
            {displayAlert.message && (
              <div>
                <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Message</div>
                <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">{displayAlert.message}</div>
              </div>
            )}

            {/* Timeline */}
            {(displayAlert.acknowledgedAt || displayAlert.resolvedAt) && (
              <div>
                <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Timeline</div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-3.5 h-3.5 text-red-500" />
                    <span className="text-gray-600">Created: {formatDateTime(displayAlert.createdAt)}</span>
                  </div>
                  {displayAlert.acknowledgedAt && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      <span className="text-gray-600">
                        Acknowledged: {formatDateTime(displayAlert.acknowledgedAt)}
                        {getAdminName(displayAlert.acknowledgedBy) && ` by ${getAdminName(displayAlert.acknowledgedBy)}`}
                      </span>
                    </div>
                  )}
                  {displayAlert.resolvedAt && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-3.5 h-3.5 text-green-500" />
                      <span className="text-gray-600">
                        {displayAlert.status === 'FALSE_ALARM' ? 'False Alarm' : 'Resolved'}: {formatDateTime(displayAlert.resolvedAt)}
                        {getAdminName(displayAlert.resolvedBy) && ` by ${getAdminName(displayAlert.resolvedBy)}`}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notes */}
            {displayAlert.notes && (
              <div>
                <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Notes</div>
                <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">{displayAlert.notes}</div>
              </div>
            )}
            {displayAlert.resolutionNotes && (
              <div>
                <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Resolution Notes</div>
                <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">{displayAlert.resolutionNotes}</div>
              </div>
            )}

            {/* Actions */}
            {(displayAlert.status === 'ACTIVE' || displayAlert.status === 'ACKNOWLEDGED') && (
              <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                {displayAlert.status === 'ACTIVE' && (
                  <button
                    className="px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600"
                    onClick={() => { setDetailAlert(null); setActionModal({ alert: displayAlert, action: 'ACKNOWLEDGED' }); }}
                  >
                    Acknowledge
                  </button>
                )}
                {displayAlert.status === 'ACKNOWLEDGED' && (
                  <button
                    className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700"
                    onClick={() => { setDetailAlert(null); setActionModal({ alert: displayAlert, action: 'RESOLVED' }); }}
                  >
                    Mark Resolved
                  </button>
                )}
                <button
                  className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-300"
                  onClick={() => { setDetailAlert(null); setActionModal({ alert: displayAlert, action: 'FALSE_ALARM' }); }}
                >
                  False Alarm
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ─── Action Confirmation Modal ─── */}
      <Modal
        isOpen={!!actionModal}
        onClose={() => { setActionModal(null); setActionNotes(''); }}
        title={
          actionModal?.action === 'ACKNOWLEDGED' ? 'Acknowledge Alert' :
          actionModal?.action === 'RESOLVED' ? 'Resolve Alert' :
          'Mark as False Alarm'
        }
        size="sm"
      >
        {actionModal && (
          <div className="space-y-4">
            <div className={`rounded-lg p-3 text-sm ${
              actionModal.action === 'ACKNOWLEDGED' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
              actionModal.action === 'RESOLVED' ? 'bg-green-50 text-green-800 border border-green-200' :
              'bg-gray-50 text-gray-700 border border-gray-200'
            }`}>
              {actionModal.action === 'ACKNOWLEDGED' && (
                <p>You are acknowledging that you are aware of and responding to this emergency SOS from <strong>{getAlertUserName(actionModal.alert)}</strong>.</p>
              )}
              {actionModal.action === 'RESOLVED' && (
                <p>You are marking this emergency alert from <strong>{getAlertUserName(actionModal.alert)}</strong> as resolved.</p>
              )}
              {actionModal.action === 'FALSE_ALARM' && (
                <p>You are marking this emergency alert from <strong>{getAlertUserName(actionModal.alert)}</strong> as a false alarm.</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
              <textarea
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ruby-500"
                rows={3}
                placeholder="Add any notes about this action..."
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
                onClick={() => { setActionModal(null); setActionNotes(''); }}
              >
                Cancel
              </button>
              <button
                className={`px-4 py-2 rounded-lg text-white text-sm font-medium flex items-center gap-2 ${
                  actionModal.action === 'ACKNOWLEDGED' ? 'bg-amber-500 hover:bg-amber-600' :
                  actionModal.action === 'RESOLVED' ? 'bg-green-600 hover:bg-green-700' :
                  'bg-gray-600 hover:bg-gray-700'
                }`}
                onClick={handleAction}
                disabled={updating}
              >
                {updating && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />}
                {actionModal.action === 'ACKNOWLEDGED' ? 'Acknowledge' :
                 actionModal.action === 'RESOLVED' ? 'Resolve' : 'Mark False Alarm'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
