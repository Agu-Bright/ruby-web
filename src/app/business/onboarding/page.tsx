'use client';

import Link from 'next/link';
import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, CheckCircle2, ChevronRight, Clock3, MapPin, ShieldCheck, WalletCards } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { BusinessAuthProvider, useBusinessAuth } from '@/lib/business-auth';
import { useBusinessQuery } from '@/lib/business-api/hooks';
import { DynamicMap } from '@/lib/leaflet/DynamicMap';
import { LocationSelector } from '@/components/business/onboarding/LocationSelector';

const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
type OpeningHour = { dayOfWeek: number; openTime: string; closeTime: string; isClosed: boolean };

function OnboardingContent() {
  const { business, isAuthenticated, isLoading } = useBusinessAuth();
  const router = useRouter();
  const id = business?._id ?? '';
  const fetcher = useCallback(() => api.businessOnboarding.profile(id), [id]);
  const profile = useBusinessQuery<any>(fetcher, [id], { enabled: !!id });
  const categories = useBusinessQuery<any[]>(useCallback(() => api.businessOnboarding.categories(), []), []);
  const data = profile.data ?? {};

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [locationId, setLocationId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categorySlug, setCategorySlug] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [nameState, setNameState] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [merchantAgreementAccepted, setMerchantAgreementAccepted] = useState(false);
  const [discountAgreementAccepted, setDiscountAgreementAccepted] = useState(false);
  const [operationModes, setOperationModes] = useState<string[]>([]);
  const [hours, setHours] = useState<OpeningHour[]>([]);
  const [pin, setPin] = useState<[number, number]>([4.8156, 7.0498]);
  const [savedProfile, setSavedProfile] = useState(false);
  const [savedOperation, setSavedOperation] = useState(false);
  const [locationVerified, setLocationVerified] = useState(false);
  const [documentUrls, setDocumentUrls] = useState<Record<string, string>>({});
  const [media, setMedia] = useState<{ logoUrl: string; coverUrl: string; galleryUrls: string[] }>({ logoUrl: '', coverUrl: '', galleryUrls: [] });
  const [busy, setBusy] = useState(false);
  const subcategories = useBusinessQuery<any[]>(useCallback(() => categorySlug ? api.businessOnboarding.subcategories(categorySlug, locationId || undefined) : Promise.resolve({ success: true, data: [] } as any), [categorySlug, locationId]), [categorySlug, locationId], { enabled: !!categorySlug });
  const merchantTerms = useBusinessQuery<any>(useCallback(() => api.businessOnboarding.legalDocument('merchant-agreement'), []), []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/business/login');
    if (!isLoading && business?.status && business.status !== 'DRAFT') router.replace('/business/business-pending');
  }, [business?.status, isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!profile.data) return;
    setName(data.name ?? '');
    setDescription(data.description ?? '');
    setPhone(data.contact?.phone ?? data.phone ?? '');
    setStreet(data.address?.street ?? '');
    setCity(data.address?.city ?? '');
    setState(data.address?.state ?? '');
    setLocationId(typeof data.locationId === 'string' ? data.locationId : data.locationId?._id ?? '');
    setCategoryId(typeof data.categoryId === 'string' ? data.categoryId : data.categoryId?._id ?? '');
    setCategorySlug(typeof data.categoryId === 'object' ? data.categoryId?.slug ?? '' : '');
    setSubcategoryId(typeof data.subcategoryId === 'string' ? data.subcategoryId : data.subcategoryId?._id ?? '');
    setMerchantAgreementAccepted(!!data.merchantAgreementAcceptedAt);
    setDiscountAgreementAccepted(!!data.discountAgreementAcceptedAt);
    setOperationModes(data.operationModes ?? []);
    setHours(data.hours?.length ? data.hours : days.map((_, dayOfWeek) => ({ dayOfWeek, openTime: '09:00', closeTime: '17:00', isClosed: dayOfWeek === 0 })));
    const coordinates = data.geoPoint?.coordinates ?? data.coordinates?.coordinates;
    if (Array.isArray(coordinates) && coordinates.length === 2) setPin([coordinates[1], coordinates[0]]);
    setLocationVerified(!!data.isLocationVerified);
    setDocumentUrls({
      cacDocumentUrl: data.cacDocumentUrl ?? '',
      governmentIdUrl: data.governmentIdUrl ?? '',
      businessLicenseUrl: data.businessLicenseUrl ?? '',
    });
    setMedia({ logoUrl: data.logoUrl ?? '', coverUrl: data.coverUrl ?? '', galleryUrls: data.galleryUrls ?? [] });
  }, [profile.data]);
  useEffect(() => {
    if (categorySlug || !categoryId) return;
    const category = (categories.data ?? []).find((item) => item._id === categoryId);
    if (category?.slug) setCategorySlug(category.slug);
  }, [categories.data, categoryId, categorySlug]);

  const sections = useMemo(() => [
    { title: 'Business profile', detail: 'Name, description and customer contact', complete: savedProfile || !!(data.name && data.description && data.contact?.phone), icon: Building2 },
    { title: 'Operating hours & operation', detail: 'Customer availability and how you operate', complete: savedOperation || !!data.operationModes?.length, icon: Clock3 },
    { title: 'Settlement', detail: 'Add a bank account for payouts', complete: false, icon: WalletCards },
    { title: 'Business verification', detail: 'CAC documents are optional during setup', complete: false, icon: ShieldCheck },
    { title: 'Location verification', detail: 'Choose your city and pin the entrance', complete: locationVerified, icon: MapPin },
  ], [data, locationVerified, savedOperation, savedProfile]);
  const profileComplete = savedProfile || !!(data.name && data.description && data.contact?.phone);
  const operationComplete = savedOperation || !!data.operationModes?.length;
  const categoryComplete = !!categoryId && !!subcategoryId;
  const agreementsComplete = merchantAgreementAccepted && discountAgreementAccepted;
  const canSubmit = profileComplete && operationComplete && categoryComplete && agreementsComplete && locationVerified;

  const update = async (payload: Record<string, unknown>, success: string) => {
    if (!id) return;
    setBusy(true);
    try {
      await api.businessOnboarding.update(id, payload);
      await profile.refetch();
      toast.success(success);
    } finally { setBusy(false); }
  };

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    await update({ name, description, contact: { phone }, address: { street, city, state, country: 'Nigeria' } }, 'Business profile saved');
    setSavedProfile(true);
  };
  const checkName = async () => {
    if (!name.trim()) return;
    setNameState('checking');
    try { const response = await api.businessOnboarding.checkName(name.trim()); setNameState(response.data.available ? 'available' : 'taken'); }
    catch { setNameState('idle'); }
  };
  const saveCategory = async () => {
    if (!categoryId || !subcategoryId) { toast.error('Choose a category and subcategory'); return; }
    await update({ categoryId, subcategoryId }, 'Business category saved');
  };
  const saveAgreements = async () => {
    if (!merchantAgreementAccepted || !discountAgreementAccepted) { toast.error('Accept both agreements to continue'); return; }
    await update({ merchantAgreementAcceptedAt: data.merchantAgreementAcceptedAt ?? new Date().toISOString(), merchantAgreementVersion: merchantTerms.data?.version ?? '1.0', discountAgreementAcceptedAt: data.discountAgreementAcceptedAt ?? new Date().toISOString(), discountAgreementVersion: '1.0' }, 'Agreements saved');
  };
  const saveOperation = async (event: FormEvent) => {
    event.preventDefault();
    await update({ operationModes, hours }, 'Hours and operation saved');
    setSavedOperation(true);
  };
  const verifyLocation = async () => {
    if (!id) return;
    if (!locationId) { toast.error('Choose the city where this business operates first'); return; }
    setBusy(true);
    try {
      await api.businessOnboarding.update(id, { locationId });
      const check = await api.businessOnboarding.validateCoordinates(locationId, pin[0], pin[1]);
      if (!check.data.valid) { toast.error(check.data.message || 'This pin is outside the selected city'); return; }
      await api.businessOnboarding.verifyLocation(id, { latitude: pin[0], longitude: pin[1] });
      await profile.refetch();
      setLocationVerified(true);
      toast.success('Location verified');
    } finally { setBusy(false); }
  };
  const uploadDocument = async (field: string, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !id) return;
    setBusy(true);
    try {
      const upload = await api.media.upload(file, 'business-verification');
      const url = (upload.data as { url?: string; secureUrl?: string }).url ?? (upload.data as { secureUrl?: string }).secureUrl;
      if (!url) throw new Error('Upload did not return a URL');
      await api.businessOnboarding.update(id, { [field]: url });
      setDocumentUrls((current) => ({ ...current, [field]: url }));
      await profile.refetch();
      toast.success('Verification document uploaded');
    } catch { toast.error('Could not upload this document'); }
    finally { setBusy(false); event.target.value = ''; }
  };
  const uploadMedia = async (field: 'logoUrl' | 'coverUrl' | 'galleryUrls', event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length || !id) return;
    setBusy(true);
    try {
      const urls = (await Promise.all(files.map(async (file) => {
        const response = await api.media.upload(file, 'business-onboarding');
        return (response.data as { url?: string; secureUrl?: string }).url ?? (response.data as { secureUrl?: string }).secureUrl;
      }))).filter((url): url is string => !!url);
      if (!urls.length) throw new Error('Upload did not return a URL');
      const next = field === 'galleryUrls' ? { ...media, galleryUrls: [...media.galleryUrls, ...urls].slice(0, 8) } : { ...media, [field]: urls[0] };
      await api.businessOnboarding.update(id, { [field]: next[field] });
      setMedia(next);
      await profile.refetch();
      toast.success('Business media saved');
    } catch { toast.error('Could not upload media'); }
    finally { setBusy(false); event.target.value = ''; }
  };
  const submit = async () => {
    if (!id) return;
    setBusy(true);
    try { await api.businessOnboarding.submit(id); toast.success('Business submitted for review'); router.replace('/business/business-pending'); }
    finally { setBusy(false); }
  };

  if (isLoading || !business) return <div className="flex min-h-screen items-center justify-center bg-gray-50"><div className="skeleton h-32 w-72 rounded-2xl" /></div>;

  return <main className="min-h-screen bg-gray-50 p-4 sm:p-6"><div className="mx-auto max-w-5xl">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase text-ruby-red">Draft business</p><h1 className="mt-1 text-2xl font-bold">Complete your business setup</h1><p className="mt-1 text-sm text-gray-500">Finish these sections, then send your listing to Ruby+ for review.</p></div><span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">{sections.filter((section) => section.complete).length} of {sections.length} complete</span></div>
    <section className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">{sections.map((section) => { const Icon = section.icon; return <div key={section.title} className={`rounded-xl border p-4 ${section.complete ? 'border-emerald-200 bg-emerald-50' : 'bg-white'}`}><Icon size={18} className={section.complete ? 'text-emerald-600' : 'text-ruby-red'} /><p className="mt-3 text-sm font-semibold">{section.title}</p><p className="mt-1 text-xs text-gray-500">{section.detail}</p>{section.complete && <CheckCircle2 size={16} className="mt-3 text-emerald-600" />}</div>; })}</section>
    <section className="mt-6 rounded-2xl border bg-white p-5"><h2 className="font-bold">1. Agreements</h2><p className="mt-1 text-sm text-gray-500">Review and accept the terms for operating a Ruby+ business.</p><div className="mt-4 space-y-3 text-sm"><label className="flex gap-3"><input type="checkbox" checked={merchantAgreementAccepted} onChange={(event) => setMerchantAgreementAccepted(event.target.checked)} /><span>I accept {merchantTerms.data?.title ?? 'the Ruby+ Merchant Terms'}{merchantTerms.data?.version ? ` (version ${merchantTerms.data.version})` : ''}.</span></label><label className="flex gap-3"><input type="checkbox" checked={discountAgreementAccepted} onChange={(event) => setDiscountAgreementAccepted(event.target.checked)} /><span>I accept the Ruby+ discount agreement (version 1.0).</span></label></div><button type="button" disabled={busy} onClick={() => void saveAgreements()} className="mt-4 rounded-lg border px-4 py-2.5 text-sm font-semibold">Save agreements</button></section>
    <section className="mt-5 rounded-2xl border bg-white p-5"><h2 className="font-bold">2. Business category</h2><p className="mt-1 text-sm text-gray-500">This controls how customers discover and use your business.</p><div className="mt-4 grid gap-3 md:grid-cols-2"><select value={categoryId} onChange={(event) => { const category = (categories.data ?? []).find((item) => item._id === event.target.value); setCategoryId(event.target.value); setCategorySlug(category?.slug ?? ''); setSubcategoryId(''); }} className="rounded-lg border p-3 text-sm"><option value="">Select category</option>{(categories.data ?? []).map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}</select><select disabled={!categorySlug} value={subcategoryId} onChange={(event) => setSubcategoryId(event.target.value)} className="rounded-lg border p-3 text-sm disabled:bg-gray-50"><option value="">Select subcategory</option>{(subcategories.data ?? []).map((subcategory) => <option key={subcategory._id} value={subcategory._id}>{subcategory.name}</option>)}</select></div><button type="button" disabled={busy} onClick={() => void saveCategory()} className="mt-4 rounded-lg border px-4 py-2.5 text-sm font-semibold">Save category</button></section>
    <form onSubmit={saveProfile} className="mt-5 rounded-2xl border bg-white p-5"><h2 className="font-bold">3. Business profile</h2><div className="mt-4 grid gap-3 md:grid-cols-2"><div className="md:col-span-2"><div className="flex gap-2"><input required value={name} onChange={(event) => { setName(event.target.value); setNameState('idle'); }} placeholder="Business name" className="min-w-0 flex-1 rounded-lg border p-3" /><button type="button" onClick={() => void checkName()} className="rounded-lg border px-3 text-sm font-semibold">{nameState === 'checking' ? 'Checking…' : 'Check name'}</button></div>{nameState === 'available' && <p className="mt-1 text-xs text-emerald-600">Name is available.</p>}{nameState === 'taken' && <p className="mt-1 text-xs text-rose-600">That name is already in use. Choose another before saving.</p>}</div><input required value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Business phone" className="rounded-lg border p-3" /><textarea required value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Tell customers about your business" rows={3} className="rounded-lg border p-3 md:col-span-2" /><input value={street} onChange={(event) => setStreet(event.target.value)} placeholder="Street address" className="rounded-lg border p-3" /><input value={city} onChange={(event) => setCity(event.target.value)} placeholder="City" className="rounded-lg border p-3" /><input value={state} onChange={(event) => setState(event.target.value)} placeholder="State" className="rounded-lg border p-3" /></div><button disabled={busy || nameState === 'taken'} className="mt-4 rounded-lg border px-4 py-2.5 text-sm font-semibold">Save profile</button></form>
    <form onSubmit={saveOperation} className="mt-5 rounded-2xl border bg-white p-5"><h2 className="font-bold">2. Hours & operation</h2><p className="mt-1 text-sm text-gray-500">Choose every way customers can use your business.</p><div className="mt-4 flex flex-wrap gap-2">{['ON_SITE', 'AT_HOME', 'DELIVERY', 'PICKUP'].map((mode) => <button key={mode} type="button" onClick={() => setOperationModes((current) => current.includes(mode) ? current.filter((item) => item !== mode) : [...current, mode])} className={`rounded-lg px-3 py-2 text-sm font-semibold ${operationModes.includes(mode) ? 'bg-ruby-red text-white' : 'bg-gray-100 text-gray-600'}`}>{mode.replace('_', ' ')}</button>)}</div><div className="mt-4 grid gap-2 md:grid-cols-2">{hours.map((hour, index) => <label key={hour.dayOfWeek} className="flex items-center gap-2 rounded-lg bg-gray-50 p-2 text-sm"><input type="checkbox" checked={!hour.isClosed} onChange={(event) => setHours((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, isClosed: !event.target.checked } : item))} /><span className="w-20">{days[hour.dayOfWeek]}</span>{!hour.isClosed && <><input type="time" value={hour.openTime} onChange={(event) => setHours((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, openTime: event.target.value } : item))} className="rounded border p-1" /><input type="time" value={hour.closeTime} onChange={(event) => setHours((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, closeTime: event.target.value } : item))} className="rounded border p-1" /></>}</label>)}</div><button disabled={busy} className="mt-4 rounded-lg border px-4 py-2.5 text-sm font-semibold">Save hours & operation</button></form>
    <section className="mt-5 rounded-2xl border bg-white p-5"><h2 className="font-bold">3. Business media <span className="ml-1 text-sm font-normal text-gray-500">(optional)</span></h2><p className="mt-1 text-sm text-gray-500">Add a logo, cover image and up to eight gallery photos customers can recognise.</p><div className="mt-4 grid gap-3 sm:grid-cols-3">{([{ field: 'logoUrl', label: 'Logo', value: media.logoUrl, multiple: false }, { field: 'coverUrl', label: 'Cover image', value: media.coverUrl, multiple: false }, { field: 'galleryUrls', label: `Gallery (${media.galleryUrls.length}/8)`, value: media.galleryUrls[0], multiple: true }] as const).map((item) => <label key={item.field} className="flex min-h-28 cursor-pointer flex-col justify-center rounded-xl border border-dashed p-3 text-center text-sm"><span className="font-semibold">{item.value ? 'Replace' : 'Upload'} {item.label}</span>{item.value && <img src={item.value} alt="" className="mx-auto mt-2 h-12 w-16 rounded object-cover" />}<input disabled={busy || (item.field === 'galleryUrls' && media.galleryUrls.length >= 8)} type="file" accept="image/*" multiple={item.multiple} className="sr-only" onChange={(event) => void uploadMedia(item.field, event)} /></label>)}</div></section>
    <section className="mt-5 rounded-2xl border bg-white p-5"><h2 className="font-bold">4. Settlement</h2><p className="mt-1 text-sm text-gray-500">Add the bank account Ruby+ will use for approved payouts.</p><Link href="/business/dashboard/bank-accounts" className="mt-4 inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold">Set up bank account <ChevronRight size={16} /></Link></section>
    <section className="mt-5 rounded-2xl border bg-white p-5"><h2 className="font-bold">5. Verify business <span className="ml-1 text-sm font-normal text-gray-500">(optional)</span></h2><p className="mt-1 text-sm text-gray-500">Upload supporting documents for Ruby+ to review. A document remains pending until an administrator verifies it.</p><div className="mt-4 grid gap-3 sm:grid-cols-3">{[{ field: 'cacDocumentUrl', label: 'CAC registration', status: data.cacDocumentStatus }, { field: 'governmentIdUrl', label: 'Government ID', status: data.governmentIdStatus }, { field: 'businessLicenseUrl', label: 'Business licence', status: data.businessLicenseStatus }].map((document) => <label key={document.field} className="cursor-pointer rounded-xl border border-dashed p-4 text-sm"><span className="font-semibold">{document.label}</span><span className="mt-1 block text-xs text-gray-500">{documentUrls[document.field] ? `${document.status ?? 'PENDING'} · Replace document` : 'Upload document'}</span><input disabled={busy || document.status === 'VERIFIED'} type="file" accept="image/*,.pdf" className="sr-only" onChange={(event) => void uploadDocument(document.field, event)} /></label>)}</div></section>
    <section className="mt-5 rounded-2xl border bg-white p-5"><h2 className="font-bold">6. Verify business location</h2><p className="mt-1 text-sm text-gray-500">Select your Ruby+ city, then click the map or drag the pin to the customer entrance.</p><LocationSelector value={locationId} onChange={(value) => { setLocationId(value); setLocationVerified(false); }} pin={pin} /><DynamicMap center={pin} zoom={14} markers={[{ id: 'business', position: pin, draggable: true }]} onMapClick={setPin} onMarkerDragEnd={(_, position) => { setPin(position); setLocationVerified(false); }} className="mt-4 h-80 w-full" /><button type="button" disabled={busy} onClick={() => void verifyLocation()} className="mt-4 rounded-lg border px-4 py-2.5 text-sm font-semibold">{locationVerified ? 'Location verified' : 'Verify location'}</button></section>
    <section className="mt-5 rounded-2xl border bg-white p-5"><h2 className="font-bold">Ready for review?</h2><p className="mt-1 text-sm text-gray-500">Submit once your agreements, category, profile, hours and location are ready. Ruby+ will review your listing before it can go live.</p><button type="button" disabled={busy || !canSubmit} onClick={() => void submit()} className="mt-4 rounded-lg bg-ruby-red px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Submit business for review</button>{!canSubmit && <p className="mt-2 text-xs text-gray-500">Complete the required setup sections and verify your location before submitting.</p>}</section>
  </div></main>;
}

export default function OnboardingPage() { return <BusinessAuthProvider><OnboardingContent /></BusinessAuthProvider>; }
