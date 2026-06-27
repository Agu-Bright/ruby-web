"use client";

import { useState } from "react";
import {
  Bell,
  Plus,
  Trash2,
  Edit3,
  Send,
  MoreHorizontal,
  X,
} from "lucide-react";
import { useApi, useMutation } from "@/lib/hooks";
import { api } from "@/lib/api";
import { DataTable, Modal, PageHeader, type Column } from "@/components/ui";
import { toast } from "sonner";
import type {
  SystemAlertRecipient,
  CreateSystemAlertRecipientRequest,
  UpdateSystemAlertRecipientRequest,
} from "@/lib/types";

/**
 * Admin-managed system alert recipients. CRUD over /admin/system-alerts/
 * recipients. The three flags map to platform-wide ops alerts:
 *   adPayment         — merchant successfully paid for an ad (IAP/Paystack/wallet)
 *   payoutRequested   — reserved future use
 *   businessSubmission — reserved future use
 *
 * Mirrors the events-recipients page (Phase 40) and the merchant-support
 * page (P135) visually — single-page settings surface, Modal-based
 * create/edit, send-test self-service button.
 */

const FLAG_LABELS: Record<keyof SystemAlertRecipient["alerts"], string> = {
  adPayment: "Ad payment received",
  payoutRequested: "Payout requested (V1.1)",
  businessSubmission: "New business submitted (V1.1)",
};

export default function SystemAlertsPage() {
  const [editing, setEditing] = useState<SystemAlertRecipient | null>(null);
  const [creating, setCreating] = useState(false);
  const [actionMenu, setActionMenu] = useState<string | null>(null);

  const { data, isLoading, refetch } = useApi(() => api.systemAlerts.list());
  const recipients: SystemAlertRecipient[] = data || [];

  const deleteMut = useMutation((id: string) => api.systemAlerts.remove(id));
  const sendTestMut = useMutation(() => api.systemAlerts.sendTest());
  const toggleActiveMut = useMutation(
    (args: { id: string; isActive: boolean }) =>
      api.systemAlerts.update(args.id, { isActive: args.isActive }),
  );

  const handleSendTest = async () => {
    const result = await sendTestMut.mutate();
    if (result) {
      toast.success(`Test email dispatched to ${result.sentTo}.`);
    }
  };

  const handleDelete = async (id: string, email: string) => {
    if (!confirm(`Remove ${email} from system alerts?`)) return;
    setActionMenu(null);
    await deleteMut.mutate(id);
    refetch();
  };

  const handleToggleActive = async (r: SystemAlertRecipient) => {
    setActionMenu(null);
    await toggleActiveMut.mutate({ id: r._id, isActive: !r.isActive });
    refetch();
  };

  const columns: Column<SystemAlertRecipient>[] = [
    {
      key: "email",
      header: "Email",
      render: (r) => (
        <div className="flex flex-col">
          <span className="font-medium text-gray-900">{r.email}</span>
          {r.label && (
            <span className="text-xs text-gray-500 mt-0.5">{r.label}</span>
          )}
        </div>
      ),
    },
    {
      key: "alerts",
      header: "Subscribed to",
      render: (r) => (
        <div className="flex flex-wrap gap-1">
          {(Object.keys(r.alerts) as Array<keyof typeof r.alerts>).map((k) => {
            const on = r.alerts[k];
            return (
              <span
                key={k}
                className={`text-[11px] px-2 py-0.5 rounded ${
                  on
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-gray-50 text-gray-400 border border-gray-200"
                }`}
              >
                {FLAG_LABELS[k]}
              </span>
            );
          })}
        </div>
      ),
    },
    {
      key: "isActive",
      header: "Active",
      render: (r) => (
        <button
          onClick={() => handleToggleActive(r)}
          className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${
            r.isActive ? "bg-green-500" : "bg-gray-300"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white transition-transform mt-0.5 ${
              r.isActive ? "translate-x-4" : "translate-x-0.5"
            }`}
          />
        </button>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <div className="relative">
          <button
            onClick={() => setActionMenu(actionMenu === r._id ? null : r._id)}
            className="p-2 hover:bg-gray-100 rounded"
          >
            <MoreHorizontal size={16} />
          </button>
          {actionMenu === r._id && (
            <div className="absolute right-0 top-9 z-10 w-44 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
              <button
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                onClick={() => {
                  setActionMenu(null);
                  setEditing(r);
                }}
              >
                <Edit3 size={14} /> Edit
              </button>
              <button
                className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 text-red-700 flex items-center gap-2"
                onClick={() => handleDelete(r._id, r.email)}
              >
                <Trash2 size={14} /> Remove
              </button>
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <PageHeader
          title="System Alerts"
          description="Email addresses that receive critical platform alerts (ad payments succeeded today; payouts + submissions reserved for V1.1). Merged with the SYSTEM_ALERT_INBOX_EMAIL env-var inbox so ops always gets paged even when this list is empty."
        />
        <div className="flex gap-2">
          <button
            onClick={handleSendTest}
            disabled={sendTestMut.isLoading}
            className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium disabled:opacity-50"
          >
            <Send size={16} /> Send test to me
          </button>
          <button
            onClick={() => setCreating(true)}
            className="bg-ruby-500 hover:bg-ruby-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium"
          >
            <Plus size={16} /> Add recipient
          </button>
        </div>
      </div>

      <DataTable
        data={recipients}
        columns={columns}
        isLoading={isLoading}
        emptyMessage="No recipients yet. Add an email to start receiving system alerts."
      />

      {creating && (
        <RecipientFormModal
          mode="create"
          onClose={() => setCreating(false)}
          onSuccess={() => {
            setCreating(false);
            refetch();
          }}
        />
      )}
      {editing && (
        <RecipientFormModal
          mode="edit"
          recipient={editing}
          onClose={() => setEditing(null)}
          onSuccess={() => {
            setEditing(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}

function RecipientFormModal({
  mode,
  recipient,
  onClose,
  onSuccess,
}: {
  mode: "create" | "edit";
  recipient?: SystemAlertRecipient;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [email, setEmail] = useState(recipient?.email || "");
  const [label, setLabel] = useState(recipient?.label || "");
  const [alerts, setAlerts] = useState<SystemAlertRecipient["alerts"]>(
    recipient?.alerts || {
      adPayment: true,
      payoutRequested: true,
      businessSubmission: true,
    },
  );

  const createMut = useMutation((data: CreateSystemAlertRecipientRequest) =>
    api.systemAlerts.create(data),
  );
  const updateMut = useMutation(
    (args: { id: string; data: UpdateSystemAlertRecipientRequest }) =>
      api.systemAlerts.update(args.id, args.data),
  );

  const isCreate = mode === "create";
  const submitting = createMut.isLoading || updateMut.isLoading;

  const handleSubmit = async () => {
    if (isCreate) {
      const trimmed = email.trim();
      if (!trimmed) {
        toast.error("Email is required");
        return;
      }
      const r = await createMut.mutate({
        email: trimmed,
        label: label.trim() || undefined,
        alerts,
      });
      if (r) {
        toast.success(`${r.email} added.`);
        onSuccess();
      }
    } else if (recipient) {
      const r = await updateMut.mutate({
        id: recipient._id,
        data: { label: label.trim() || undefined, alerts },
      });
      if (r) {
        toast.success("Recipient updated.");
        onSuccess();
      }
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={isCreate ? "Add system alert recipient" : "Edit recipient"}
      size="md"
    >
      <div className="space-y-4">
        <div>
          <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={!isCreate}
            placeholder="ops@rubyplus.net"
            className="input-field mt-1 disabled:bg-gray-50 disabled:text-gray-500"
          />
          {!isCreate && (
            <p className="text-xs text-gray-400 mt-1">
              Email cannot be changed. Remove and re-add to switch.
            </p>
          )}
        </div>

        <div>
          <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
            Label (optional)
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value.slice(0, 100))}
            placeholder="Revenue lead"
            className="input-field mt-1"
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
            Alerts
          </label>
          <div className="mt-2 space-y-2">
            {(Object.keys(alerts) as Array<keyof typeof alerts>).map((k) => (
              <label
                key={k}
                className="flex items-start gap-2.5 cursor-pointer p-2 rounded hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={alerts[k]}
                  onChange={(e) =>
                    setAlerts({ ...alerts, [k]: e.target.checked })
                  }
                  className="mt-0.5 rounded border-gray-300"
                />
                <span className="text-sm text-gray-900">{FLAG_LABELS[k]}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg flex items-center gap-1.5"
          >
            <X size={14} /> Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-ruby-500 hover:bg-ruby-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {submitting
              ? "Saving..."
              : isCreate
                ? "Add recipient"
                : "Save changes"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
