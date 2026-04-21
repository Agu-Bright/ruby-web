'use client';

import React from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown, GripVertical } from 'lucide-react';
import type { CustomField, CustomFieldOption } from '@/lib/types';

const FIELD_TYPES = [
  { value: 'TEXT', label: 'Text' },
  { value: 'TEXTAREA', label: 'Long Text' },
  { value: 'NUMBER', label: 'Number' },
  { value: 'BOOLEAN', label: 'Yes / No' },
  { value: 'SELECT', label: 'Dropdown' },
  { value: 'MULTISELECT', label: 'Multi-Select' },
] as const;

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '');
}

function newField(order: number): CustomField {
  return { key: '', label: '', type: 'TEXT', required: false, order };
}

function newOption(order: number): CustomFieldOption {
  return { value: '', label: '', order };
}

interface FieldBuilderProps {
  fields: CustomField[];
  onChange: (fields: CustomField[]) => void;
  label: string;
  description?: string;
}

export function FieldBuilder({ fields, onChange, label, description }: FieldBuilderProps) {
  const updateField = (index: number, updates: Partial<CustomField>) => {
    const updated = fields.map((f, i) => (i === index ? { ...f, ...updates } : f));
    onChange(updated);
  };

  const addField = () => {
    onChange([...fields, newField(fields.length)]);
  };

  const removeField = (index: number) => {
    onChange(fields.filter((_, i) => i !== index).map((f, i) => ({ ...f, order: i })));
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= fields.length) return;
    const copy = [...fields];
    [copy[index], copy[target]] = [copy[target], copy[index]];
    onChange(copy.map((f, i) => ({ ...f, order: i })));
  };

  const updateOption = (fieldIndex: number, optIndex: number, updates: Partial<CustomFieldOption>) => {
    const field = fields[fieldIndex];
    const options = (field.options || []).map((o, i) => (i === optIndex ? { ...o, ...updates } : o));
    updateField(fieldIndex, { options });
  };

  const addOption = (fieldIndex: number) => {
    const field = fields[fieldIndex];
    const options = [...(field.options || []), newOption((field.options || []).length)];
    updateField(fieldIndex, { options });
  };

  const removeOption = (fieldIndex: number, optIndex: number) => {
    const field = fields[fieldIndex];
    const options = (field.options || []).filter((_, i) => i !== optIndex);
    updateField(fieldIndex, { options });
  };

  const hasOptions = (type: string) => type === 'SELECT' || type === 'MULTISELECT';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-gray-700">{label}</h4>
          {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
        </div>
        <span className="text-xs text-gray-400">{fields.length} field{fields.length !== 1 ? 's' : ''}</span>
      </div>

      {fields.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 rounded-lg py-8 text-center">
          <p className="text-sm text-gray-400 mb-2">No custom fields configured</p>
          <button
            type="button"
            onClick={addField}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-ruby-600 hover:text-ruby-700"
          >
            <Plus size={14} />
            Add First Field
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {fields.map((field, index) => (
            <div key={index} className="border border-gray-200 rounded-lg bg-white">
              {/* Field header row */}
              <div className="flex items-center gap-2 p-3 border-b border-gray-100">
                <GripVertical size={14} className="text-gray-300 flex-shrink-0" />

                {/* Label */}
                <input
                  type="text"
                  placeholder="Field label"
                  value={field.label}
                  onChange={(e) => {
                    const label = e.target.value;
                    const updates: Partial<CustomField> = { label };
                    if (!field.key || field.key === slugify(field.label)) {
                      updates.key = slugify(label);
                    }
                    updateField(index, updates);
                  }}
                  className="flex-1 min-w-0 text-sm border border-gray-200 rounded-md px-2.5 py-1.5 focus:ring-1 focus:ring-ruby-500 focus:border-ruby-500 outline-none"
                />

                {/* Type */}
                <select
                  value={field.type}
                  onChange={(e) => updateField(index, { type: e.target.value as CustomField['type'] })}
                  className="text-sm border border-gray-200 rounded-md px-2 py-1.5 bg-white focus:ring-1 focus:ring-ruby-500 focus:border-ruby-500 outline-none"
                >
                  {FIELD_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>

                {/* Required toggle */}
                <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={field.required || false}
                    onChange={(e) => updateField(index, { required: e.target.checked })}
                    className="rounded border-gray-300 text-ruby-600 focus:ring-ruby-500"
                  />
                  Req
                </label>

                {/* Move buttons */}
                <div className="flex flex-col flex-shrink-0">
                  <button type="button" onClick={() => moveField(index, 'up')} disabled={index === 0} className="text-gray-400 hover:text-gray-600 disabled:opacity-30">
                    <ChevronUp size={14} />
                  </button>
                  <button type="button" onClick={() => moveField(index, 'down')} disabled={index === fields.length - 1} className="text-gray-400 hover:text-gray-600 disabled:opacity-30">
                    <ChevronDown size={14} />
                  </button>
                </div>

                {/* Delete */}
                <button type="button" onClick={() => removeField(index)} className="text-gray-400 hover:text-red-500 flex-shrink-0">
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Placeholder row */}
              <div className="px-3 py-2 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Placeholder text (optional)"
                  value={field.placeholder || ''}
                  onChange={(e) => updateField(index, { placeholder: e.target.value || undefined })}
                  className="flex-1 text-xs border border-gray-100 rounded-md px-2.5 py-1.5 bg-gray-50 focus:ring-1 focus:ring-ruby-500 focus:border-ruby-500 outline-none"
                />
                <span className="text-[10px] text-gray-400 font-mono flex-shrink-0">key: {field.key || '—'}</span>
              </div>

              {/* Options (for SELECT / MULTISELECT) */}
              {hasOptions(field.type) && (
                <div className="px-3 pb-3 border-t border-gray-100 pt-2">
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Options</p>
                  {(field.options || []).map((opt, optIdx) => (
                    <div key={optIdx} className="flex items-center gap-2 mb-1.5">
                      <input
                        type="text"
                        placeholder="Label"
                        value={opt.label}
                        onChange={(e) => {
                          const label = e.target.value;
                          const updates: Partial<CustomFieldOption> = { label };
                          if (!opt.value || opt.value === slugify(opt.label)) {
                            updates.value = slugify(label);
                          }
                          updateOption(index, optIdx, updates);
                        }}
                        className="flex-1 text-xs border border-gray-200 rounded px-2 py-1 focus:ring-1 focus:ring-ruby-500 focus:border-ruby-500 outline-none"
                      />
                      <span className="text-[10px] text-gray-400 font-mono w-20 truncate">{opt.value || '—'}</span>
                      <button type="button" onClick={() => removeOption(index, optIdx)} className="text-gray-400 hover:text-red-500">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addOption(index)}
                    className="inline-flex items-center gap-1 text-xs text-ruby-600 hover:text-ruby-700 mt-1"
                  >
                    <Plus size={12} />
                    Add Option
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {fields.length > 0 && (
        <button
          type="button"
          onClick={addField}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ruby-600 hover:text-ruby-700 py-1"
        >
          <Plus size={14} />
          Add Field
        </button>
      )}
    </div>
  );
}
