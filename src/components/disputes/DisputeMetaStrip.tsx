import { formatCurrency } from '@/lib/utils';
import type { Dispute } from '@/lib/types';
import { getCustomerName, getBusinessName } from './utils';

/**
 * The 4-cell meta grid below the chat header. Each cell is a small
 * bg-gray-50 card with an uppercase label and the value below — same
 * convention used across the admin (businesses page detail modal, etc.).
 *
 * Cells degrade gracefully: business + amount only render when the data
 * is there. Filed-by and Reason always render. So a barebones GENERAL
 * dispute shows 2 cells; a fully-loaded ORDER dispute shows 4.
 */
export function DisputeMetaStrip({ dispute }: { dispute: Dispute }) {
  const business = getBusinessName(dispute);
  const amount =
    dispute.disputedAmount ?? dispute.amount ?? dispute.referenceAmount;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
      <MetaCard label="Filed by">
        <p className="font-medium text-gray-800 text-sm">
          {getCustomerName(dispute)}
        </p>
        <p className="text-xs text-gray-500 mt-0.5">
          {dispute.filedByRole === 'BUSINESS' ? 'Business owner' : 'Customer'}
        </p>
      </MetaCard>

      {business && !dispute.isAdminOnly && (
        <MetaCard label="Against">
          <p className="font-medium text-gray-800 text-sm truncate">
            {business}
          </p>
        </MetaCard>
      )}

      <MetaCard label="Reason">
        <p className="font-medium text-gray-800 text-sm">
          {dispute.reason.replace(/_/g, ' ')}
        </p>
      </MetaCard>

      {amount != null && (
        <MetaCard label="Disputed amount">
          <p className="font-semibold text-gray-900 text-sm">
            {formatCurrency(amount, dispute.currency)}
          </p>
        </MetaCard>
      )}
    </div>
  );
}

function MetaCard({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-gray-50 rounded-lg px-3 py-2.5 border border-gray-100">
      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
        {label}
      </p>
      <div className="mt-1">{children}</div>
    </div>
  );
}
