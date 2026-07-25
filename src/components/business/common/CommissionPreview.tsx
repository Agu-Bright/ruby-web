'use client';

export function CommissionPreview({ price, rate = 0 }: { price: number; rate?: number }) {
  if (!Number.isFinite(price) || price <= 0) return null;
  const fee = price * rate;
  return <p className="mt-1 text-xs text-gray-500">Customer price: <strong>₦{Math.round(price).toLocaleString('en-NG')}</strong>{rate > 0 ? <> · Estimated platform fee: ₦{Math.round(fee).toLocaleString('en-NG')} · You receive: ₦{Math.round(price - fee).toLocaleString('en-NG')}</> : null}</p>;
}
