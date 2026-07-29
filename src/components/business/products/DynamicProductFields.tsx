'use client';

import type { CustomField } from '@/lib/types';

export function DynamicProductFields({ fields, value, onChange }: { fields: CustomField[]; value: Record<string, unknown>; onChange: (value: Record<string, unknown>) => void }) {
  if (!fields.length) return null;
  const set = (key: string, next: unknown) => onChange({ ...value, [key]: next });
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
    {fields.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((field) => {
      const fieldValue = value[field.key];
      const label = <span>{field.label}{field.required ? <span className="ml-1 text-ruby-red">*</span> : null}</span>;
      const className = 'mt-1 w-full rounded-lg border border-gray-200 bg-white p-2.5 text-sm outline-none focus:border-ruby-red';
      if (field.type === 'BOOLEAN') return <label key={field.key} className="flex items-center gap-2 pt-6 text-sm font-medium text-gray-700"><input type="checkbox" checked={Boolean(fieldValue)} onChange={(event) => set(field.key, event.target.checked)} />{label}</label>;
      if (field.type === 'TEXTAREA') return <label key={field.key} className="sm:col-span-2 text-sm font-medium text-gray-700">{label}<textarea required={field.required} rows={3} value={String(fieldValue ?? '')} placeholder={field.placeholder} onChange={(event) => set(field.key, event.target.value)} className={className} />{field.helpText && <small className="mt-1 block font-normal text-gray-500">{field.helpText}</small>}</label>;
      if (field.type === 'SELECT') return <label key={field.key} className="text-sm font-medium text-gray-700">{label}<select required={field.required} value={String(fieldValue ?? '')} onChange={(event) => set(field.key, event.target.value)} className={className}><option value="">Select an option</option>{(field.options ?? []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>{field.helpText && <small className="mt-1 block font-normal text-gray-500">{field.helpText}</small>}</label>;
      if (field.type === 'MULTISELECT') { const selected = Array.isArray(fieldValue) ? fieldValue.map(String) : []; return <fieldset key={field.key} className="sm:col-span-2"><legend className="text-sm font-medium text-gray-700">{label}</legend><div className="mt-2 flex flex-wrap gap-2">{(field.options ?? []).map((option) => <label key={option.value} className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium ${selected.includes(option.value) ? 'border-ruby-red bg-ruby-red/5 text-ruby-red' : 'border-gray-200 text-gray-600'}`}><input className="sr-only" type="checkbox" checked={selected.includes(option.value)} onChange={(event) => set(field.key, event.target.checked ? [...selected, option.value] : selected.filter((item) => item !== option.value))} />{option.label}</label>)}</div>{field.helpText && <small className="mt-1 block text-gray-500">{field.helpText}</small>}</fieldset>; }
      return <label key={field.key} className="text-sm font-medium text-gray-700">{label}<input required={field.required} type={field.type === 'NUMBER' ? 'number' : 'text'} value={String(fieldValue ?? '')} placeholder={field.placeholder} onChange={(event) => set(field.key, field.type === 'NUMBER' && event.target.value !== '' ? Number(event.target.value) : event.target.value)} className={className} />{field.helpText && <small className="mt-1 block font-normal text-gray-500">{field.helpText}</small>}</label>;
    })}
  </div>;
}
