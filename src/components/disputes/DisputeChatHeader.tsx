'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  ExternalLink,
  MoreHorizontal,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Eye,
  ArrowLeft,
} from 'lucide-react';
import { StatusBadge } from '@/components/ui';
import type { Dispute, DisputeStatus } from '@/lib/types';
import { TYPE_ICONS, getReferenceLabel, getReferenceUrl } from './utils';

interface Props {
  dispute: Dispute;
  /** Show a back arrow that calls onBack — only used in mobile / single-column mode. */
  onBack?: () => void;
  /** Status change shortcut handler. */
  onChangeStatus: (next: DisputeStatus) => void;
  /** Open the resolve modal. */
  onResolveClick: () => void;
  /** Open the escalate modal. */
  onEscalateClick: () => void;
  /** Close (terminal state) shortcut. */
  onCloseClick: () => void;
}

/**
 * Sticky chat header — always visible at the top of the right pane.
 * Shows: back arrow (mobile), type icon, reference label, status badge,
 * transaction deep-link, and an actions dropdown (Mark under review,
 * Escalate, Resolve, Close).
 *
 * Actions menu uses the same MoreHorizontal pattern as the businesses
 * page (color-coded items per variant) so the design language stays
 * consistent across the admin.
 */
export function DisputeChatHeader({
  dispute,
  onBack,
  onChangeStatus,
  onResolveClick,
  onEscalateClick,
  onCloseClick,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [menuOpen]);

  const t = TYPE_ICONS[dispute.type] || TYPE_ICONS.GENERAL;
  const Icon = t.icon;
  const referenceUrl = getReferenceUrl(dispute);
  const refLabel = getReferenceLabel(dispute);

  const isTerminal =
    dispute.status === 'RESOLVED' || dispute.status === 'CLOSED';

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-200 bg-white">
      <div className="flex items-center gap-3 min-w-0">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="lg:hidden p-1.5 -ml-1 rounded hover:bg-gray-100 text-gray-500"
            aria-label="Back to inbox"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}

        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${t.bg}`}
        >
          <Icon className={`w-4 h-4 ${t.color}`} />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-gray-900 text-sm truncate">
              #{dispute.disputeRef || dispute._id.slice(-8)}
            </p>
            <span className="text-xs text-gray-400">·</span>
            <span className="text-xs text-gray-600 truncate">{refLabel}</span>
          </div>
          {referenceUrl && (
            <Link
              href={referenceUrl}
              target="_blank"
              className="inline-flex items-center gap-1 text-[11px] text-ruby-600 hover:text-ruby-700 mt-0.5"
            >
              <ExternalLink className="w-3 h-3" />
              View transaction
            </Link>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <StatusBadge status={dispute.status} />

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
            aria-label="Actions"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-30 py-1">
              {dispute.status === 'OPEN' && (
                <MenuItem
                  icon={Eye}
                  label="Mark under review"
                  onClick={() => {
                    onChangeStatus('UNDER_REVIEW');
                    setMenuOpen(false);
                  }}
                />
              )}

              {!isTerminal && (
                <MenuItem
                  icon={CheckCircle}
                  label="Resolve dispute"
                  variant="success"
                  onClick={() => {
                    onResolveClick();
                    setMenuOpen(false);
                  }}
                />
              )}

              {!isTerminal && dispute.status !== 'ESCALATED' && (
                <MenuItem
                  icon={AlertTriangle}
                  label="Escalate"
                  variant="warning"
                  onClick={() => {
                    onEscalateClick();
                    setMenuOpen(false);
                  }}
                />
              )}

              {!isTerminal && (
                <MenuItem
                  icon={XCircle}
                  label="Close ticket"
                  variant="danger"
                  onClick={() => {
                    onCloseClick();
                    setMenuOpen(false);
                  }}
                />
              )}

              {isTerminal && (
                <MenuItem
                  icon={Eye}
                  label="Reopen as under review"
                  onClick={() => {
                    onChangeStatus('UNDER_REVIEW');
                    setMenuOpen(false);
                  }}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  variant = 'default',
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'success' | 'danger' | 'warning';
}) {
  const variantClasses = {
    default: 'text-gray-700 hover:bg-gray-50',
    success: 'text-green-700 hover:bg-green-50',
    danger: 'text-red-700 hover:bg-red-50',
    warning: 'text-amber-700 hover:bg-amber-50',
  }[variant];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${variantClasses}`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}
