'use client';

/**
 * Business Profile — web parity of mobile `app/(main)/business/edit.tsx`.
 *
 * Tabbed editor covering the fields merchants edit most often:
 *   - Basic      : name, description, tagline, sellsProducts + intake toggles
 *   - Media      : logo + cover image (via shared ImageUpload)
 *   - Contact    : phone/email/website + socials (WA / IG / FB / X / TikTok / YT / LinkedIn)
 *   - Hours      : 7-day open/close with per-day closed toggle
 *   - Verification: CAC number/status (display + link to CAC card if not registered)
 *   - More       : operation mode + acceptsOrders/acceptsBookings + branch label (parent view only)
 *
 * The Location tab uses the shared Leaflet picker with address search,
 * draggable/clickable pin placement and reverse-geocoded address fields.
 *
 * All updates route through `PUT /business/:id` via
 * `api.businessOnboarding.update()` (the endpoint namespace name is
 * misleading — it's actually the generic owner-scoped update). On
 * success the BusinessAuthContext's `refreshBusinessProfile()` is
 * called so the sidebar/topbar/CAC card pick up new fields immediately.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import {
  FileText,
  Image as ImageIcon,
  Phone,
  Clock,
  Shield,
  Sliders,
  MapPin,
  Loader2,
  Save,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useBusinessAuth } from '@/lib/business-auth';
import { useBusinessQuery } from '@/lib/business-api/hooks';
import { ImageUpload } from '@/components/ui/image-upload';
import type { ReverseGeocodeResult } from '@/lib/geocoding';

// Leaflet reads browser globals at module initialisation, so the picker must
// only be loaded in the browser. This is the shared picker used by the admin
// business workflow as well.
const MapLocationPicker = dynamic(
  () =>
    import('@/components/ui/map-location-picker').then((module) => ({
      default: module.MapLocationPicker,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="h-[360px] animate-pulse rounded-xl bg-gray-100" />
    ),
  },
);

// ─── Types ────────────────────────────────────────────────────────────
type BusinessModel = 'ORDER_DELIVERY' | 'VISIT_ONLY' | 'BOOKING_VISIT';

interface BusinessHour {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed?: boolean;
}

interface BusinessContact {
  phone?: string;
  phone2?: string;
  email?: string;
  website?: string;
  whatsapp?: string;
  instagram?: string;
  facebook?: string;
  twitter?: string;
  tiktok?: string;
  youtube?: string;
  linkedin?: string;
}

interface BusinessAddress {
  street?: string;
  street2?: string;
  city?: string;
  state?: string;
  country?: string;
  landmark?: string;
}

interface BusinessDoc {
  _id: string;
  name?: string;
  slug?: string;
  description?: string;
  tagline?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  media?: Array<{
    url: string;
    type?: string;
    isPrimary?: boolean;
    order?: number;
  }>;
  status?: string;
  cacNumber?: string;
  cacStatus?: string;
  sellsProducts?: boolean;
  acceptsOrders?: boolean;
  acceptsBookings?: boolean;
  contact?: BusinessContact;
  address?: BusinessAddress;
  latitude?: number;
  longitude?: number;
  geoPoint?: { type?: string; coordinates?: [number, number] };
  hours?: BusinessHour[];
  isParent?: boolean;
  parentBusinessId?: string;
  branchLabel?: string;
  subcategoryId?:
    | string
    | { _id: string; name?: string; slug?: string; businessModel?: BusinessModel };
  categoryId?: string | { _id: string; name?: string; slug?: string };
  locationId?: string | { _id: string; name?: string; slug?: string };
}

const DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const OPERATION_MODES: Array<{
  value: BusinessModel;
  title: string;
  description: string;
}> = [
  {
    value: 'ORDER_DELIVERY',
    title: 'Order & Delivery',
    description: 'Customers order online; you deliver.',
  },
  {
    value: 'VISIT_ONLY',
    title: 'Visit Only',
    description: 'Walk-in / on-site only, no online orders or bookings.',
  },
  {
    value: 'BOOKING_VISIT',
    title: 'Booking & Visit',
    description: 'Customers book, then visit — or you go to them.',
  },
];

// Default 09:00 – 17:00 hours for every day, closed=false.
function defaultHours(): BusinessHour[] {
  return Array.from({ length: 7 }).map((_, i) => ({
    dayOfWeek: i,
    openTime: '09:00',
    closeTime: '17:00',
    isClosed: false,
  }));
}

function normaliseHours(input: unknown): BusinessHour[] {
  const base = defaultHours();
  if (!Array.isArray(input)) return base;
  input.forEach((raw) => {
    if (!raw || typeof raw !== 'object') return;
    const row = raw as Record<string, unknown>;
    const day = Number(row.dayOfWeek);
    if (Number.isFinite(day) && day >= 0 && day <= 6) {
      base[day] = {
        dayOfWeek: day,
        openTime: (row.openTime as string) || '09:00',
        closeTime: (row.closeTime as string) || '17:00',
        isClosed: !!row.isClosed,
      };
    }
  });
  return base;
}

// ─── Page ──────────────────────────────────────────────────────────────
type TabKey =
  | 'basic'
  | 'media'
  | 'contact'
  | 'hours'
  | 'location'
  | 'verification'
  | 'more';

const TABS: Array<{
  key: TabKey;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}> = [
  { key: 'basic', label: 'Basic', icon: FileText },
  { key: 'media', label: 'Media', icon: ImageIcon },
  { key: 'contact', label: 'Contact', icon: Phone },
  { key: 'hours', label: 'Hours', icon: Clock },
  { key: 'location', label: 'Location', icon: MapPin },
  { key: 'verification', label: 'Verification', icon: Shield },
  { key: 'more', label: 'More', icon: Sliders },
];

export default function BusinessProfilePage() {
  const { business, refreshBusinessProfile } = useBusinessAuth();
  const businessId = business?._id ?? '';

  const fetcher = useCallback(
    () => api.businessOnboarding.profile(businessId),
    [businessId],
  );
  const query = useBusinessQuery(fetcher, [businessId], {
    enabled: !!businessId,
  });
  const doc = query.data as BusinessDoc | null | undefined;
  const { isLoading, error, refetch } = query;

  const [activeTab, setActiveTab] = useState<TabKey>('basic');

  // Form state — hydrates from the fetched business, editable in place.
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tagline, setTagline] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [sellsProducts, setSellsProducts] = useState(false);
  const [acceptsOrders, setAcceptsOrders] = useState(false);
  const [acceptsBookings, setAcceptsBookings] = useState(false);
  const [contact, setContact] = useState<BusinessContact>({});
  const [hours, setHours] = useState<BusinessHour[]>(defaultHours());
  const [address, setAddress] = useState<BusinessAddress>({});
  const [latitude, setLatitude] = useState(6.5244);
  const [longitude, setLongitude] = useState(3.3792);
  const [addressChanged, setAddressChanged] = useState(false);
  const [pinChanged, setPinChanged] = useState(false);
  const [branchLabel, setBranchLabel] = useState('');
  const [operationMode, setOperationMode] = useState<BusinessModel | undefined>();
  const [saving, setSaving] = useState(false);

  // Hydrate form state whenever the fetched doc changes.
  useEffect(() => {
    if (!doc) return;
    setName(doc.name ?? '');
    setDescription(doc.description ?? '');
    setTagline(doc.tagline ?? '');
    const primaryCoverUrl =
      doc.coverImageUrl ??
      doc.media?.find((media) => !media.isPrimary && media.order === 1)?.url ??
      '';
    setLogoUrl(doc.logoUrl ?? '');
    setCoverImageUrl(primaryCoverUrl);
    setGalleryUrls(
      (doc.media ?? [])
        .filter(
          (media) =>
            !!media.url &&
            !media.isPrimary &&
            media.url !== doc.logoUrl &&
            media.url !== primaryCoverUrl,
        )
        .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
        .map((media) => media.url)
        .slice(0, 8),
    );
    setSellsProducts(!!doc.sellsProducts);
    setAcceptsOrders(!!doc.acceptsOrders);
    setAcceptsBookings(!!doc.acceptsBookings);
    setContact(doc.contact ?? {});
    setHours(normaliseHours(doc.hours));
    setAddress(doc.address ?? {});
    const coordinates = doc.geoPoint?.coordinates;
    const nextLongitude =
      typeof doc.longitude === 'number'
        ? doc.longitude
        : typeof coordinates?.[0] === 'number'
          ? coordinates[0]
          : 3.3792;
    const nextLatitude =
      typeof doc.latitude === 'number'
        ? doc.latitude
        : typeof coordinates?.[1] === 'number'
          ? coordinates[1]
          : 6.5244;
    setLongitude(nextLongitude);
    setLatitude(nextLatitude);
    setAddressChanged(false);
    setPinChanged(false);
    setBranchLabel(doc.branchLabel ?? '');
    const populatedSub =
      typeof doc.subcategoryId === 'object' ? doc.subcategoryId : null;
    setOperationMode(populatedSub?.businessModel);
  }, [doc]);

  const subcategoryName = useMemo(() => {
    const sub = doc?.subcategoryId;
    if (sub && typeof sub === 'object') return sub.name ?? '';
    return '';
  }, [doc?.subcategoryId]);
  const categoryName = useMemo(() => {
    const cat = doc?.categoryId;
    if (cat && typeof cat === 'object') return cat.name ?? '';
    return '';
  }, [doc?.categoryId]);
  const locationName = useMemo(() => {
    const loc = doc?.locationId;
    if (loc && typeof loc === 'object') return loc.name ?? '';
    return '';
  }, [doc?.locationId]);

  const handleSave = useCallback(async () => {
    if (!businessId) return;
    setSaving(true);
    try {
      // Send the merchant-editable slice. We intentionally omit
      // categoryId/subcategoryId/locationId (those need admin support
      // to change — merchant edits should go through the classify /
      // change-location flow). branchLabel + hours + contact + media +
      // basic strings + intake toggles + sellsProducts all round-trip
      // cleanly through the UpdateBusinessDto.
      const payload: Record<string, unknown> = {
        name: name.trim(),
        description: description.trim() || undefined,
        tagline: tagline.trim() || undefined,
        logoUrl: logoUrl.trim() || undefined,
        coverImageUrl: coverImageUrl.trim() || undefined,
        media: buildBusinessMedia(logoUrl, coverImageUrl, galleryUrls),
        sellsProducts,
        acceptsOrders,
        acceptsBookings,
        contact: sanitizeContact(contact),
        hours: hours.map((h) => ({
          dayOfWeek: h.dayOfWeek,
          openTime: h.openTime,
          closeTime: h.closeTime,
          isClosed: !!h.isClosed,
        })),
      };
      if (branchLabel.trim()) payload.branchLabel = branchLabel.trim();
      if (addressChanged) payload.address = sanitizeAddress(address);
      if (pinChanged) {
        payload.latitude = latitude;
        payload.longitude = longitude;
      }
      await api.businessOnboarding.update(businessId, payload);
      toast.success('Business profile saved.');
      await refetch();
      await refreshBusinessProfile();
    } catch (err) {
      toast.error(
        (err as Error)?.message || 'Could not save. Try again in a moment.',
      );
    } finally {
      setSaving(false);
    }
  }, [
    businessId,
    name,
    description,
    tagline,
    logoUrl,
    coverImageUrl,
    galleryUrls,
    sellsProducts,
    acceptsOrders,
    acceptsBookings,
    contact,
    hours,
    branchLabel,
    address,
    addressChanged,
    latitude,
    longitude,
    pinChanged,
    refetch,
    refreshBusinessProfile,
  ]);

  if (!businessId) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
          <p className="text-sm text-gray-500">
            No business linked to this account.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading && !doc) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <div className="skeleton mb-3 h-8 w-1/3 rounded" />
        <div className="skeleton mb-6 h-4 w-1/2 rounded" />
        <div className="skeleton h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (error && !doc) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-900">
          Couldn&apos;t load your business profile. {error}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-ruby-red">
            Business Profile
          </p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">
            {doc?.name ?? business?.name ?? 'Your business'}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {categoryName && `${categoryName} · `}
            {subcategoryName && `${subcategoryName} · `}
            {locationName || 'Unknown location'}
          </p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-ruby-red px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Save size={16} />
          )}
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-5 flex flex-wrap gap-1 border-b border-gray-200">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-semibold transition ${
                isActive
                  ? 'border-ruby-red text-ruby-red'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Panels */}
      {activeTab === 'basic' && (
        <BasicPanel
          name={name}
          setName={setName}
          description={description}
          setDescription={setDescription}
          tagline={tagline}
          setTagline={setTagline}
          sellsProducts={sellsProducts}
          setSellsProducts={setSellsProducts}
          acceptsOrders={acceptsOrders}
          setAcceptsOrders={setAcceptsOrders}
          acceptsBookings={acceptsBookings}
          setAcceptsBookings={setAcceptsBookings}
          operationMode={operationMode}
        />
      )}
      {activeTab === 'media' && (
        <MediaPanel
          logoUrl={logoUrl}
          setLogoUrl={setLogoUrl}
          coverImageUrl={coverImageUrl}
          setCoverImageUrl={setCoverImageUrl}
          galleryUrls={galleryUrls}
          setGalleryUrls={setGalleryUrls}
        />
      )}
      {activeTab === 'contact' && (
        <ContactPanel contact={contact} setContact={setContact} />
      )}
      {activeTab === 'hours' && (
        <HoursPanel hours={hours} setHours={setHours} />
      )}
      {activeTab === 'location' && (
        <LocationPanel
          address={address}
          setAddress={(nextAddress) => {
            setAddress(nextAddress);
            setAddressChanged(true);
          }}
          latitude={latitude}
          longitude={longitude}
          setCoordinates={(nextLatitude, nextLongitude) => {
            setLatitude(nextLatitude);
            setLongitude(nextLongitude);
            setPinChanged(true);
          }}
        />
      )}
      {activeTab === 'verification' && (
        <VerificationPanel doc={doc} />
      )}
      {activeTab === 'more' && (
        <MorePanel
          operationMode={operationMode}
          doc={doc}
          branchLabel={branchLabel}
          setBranchLabel={setBranchLabel}
        />
      )}
    </div>
  );
}

// ─── Panels ────────────────────────────────────────────────────────────

function Panel({ children }: { children: ReactNode }) {
  return (
    <section className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6">
      {children}
    </section>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
      {children}
    </label>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-lg border border-gray-200 bg-white p-3 text-sm focus:border-ruby-red focus:outline-none focus:ring-2 focus:ring-ruby-red/20 ${
        props.className ?? ''
      }`}
    />
  );
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-lg border border-gray-200 bg-white p-3 text-sm focus:border-ruby-red focus:outline-none focus:ring-2 focus:ring-ruby-red/20 ${
        props.className ?? ''
      }`}
    />
  );
}

function ToggleRow({
  title,
  description,
  value,
  onChange,
}: {
  title: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-gray-200 p-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-gray-500">
          {description}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        role="switch"
        aria-checked={value}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
          value ? 'bg-ruby-red' : 'bg-gray-300'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
            value ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

// ─── Basic ─────────────────────────────────────────────────────────────
function BasicPanel(props: {
  name: string;
  setName: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  tagline: string;
  setTagline: (v: string) => void;
  sellsProducts: boolean;
  setSellsProducts: (v: boolean) => void;
  acceptsOrders: boolean;
  setAcceptsOrders: (v: boolean) => void;
  acceptsBookings: boolean;
  setAcceptsBookings: (v: boolean) => void;
  operationMode: BusinessModel | undefined;
}) {
  return (
    <Panel>
      <div>
        <FieldLabel>Business name</FieldLabel>
        <TextInput
          value={props.name}
          onChange={(e) => props.setName(e.target.value)}
          placeholder="Your business name as customers see it"
          required
        />
      </div>
      <div>
        <FieldLabel>Tagline</FieldLabel>
        <TextInput
          value={props.tagline}
          onChange={(e) => props.setTagline(e.target.value)}
          placeholder="One line — what makes you special"
          maxLength={140}
        />
      </div>
      <div>
        <FieldLabel>Description</FieldLabel>
        <TextArea
          value={props.description}
          onChange={(e) => props.setDescription(e.target.value)}
          rows={5}
          placeholder="Tell customers about your business, what you offer, your story…"
        />
      </div>

      <div className="space-y-3 pt-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
          What you offer
        </p>
        <ToggleRow
          title="Sell products"
          description="Show a Products tab on your profile and enable the online catalogue. Off = services / bookings only."
          value={props.sellsProducts}
          onChange={props.setSellsProducts}
        />
        {props.operationMode !== 'VISIT_ONLY' && (
          <ToggleRow
            title="Accept online orders"
            description="Customers can order and pay through the Ruby+ app. Turn off during busy hours or when you're closed."
            value={props.acceptsOrders}
            onChange={props.setAcceptsOrders}
          />
        )}
        {props.operationMode !== 'ORDER_DELIVERY' && (
          <ToggleRow
            title="Accept bookings"
            description="Customers can reserve time slots or request quotes. Recommended for services + hospitality."
            value={props.acceptsBookings}
            onChange={props.setAcceptsBookings}
          />
        )}
      </div>
    </Panel>
  );
}

// ─── Media ─────────────────────────────────────────────────────────────
function MediaPanel(props: {
  logoUrl: string;
  setLogoUrl: (v: string) => void;
  coverImageUrl: string;
  setCoverImageUrl: (v: string) => void;
  galleryUrls: string[];
  setGalleryUrls: (urls: string[]) => void;
}) {
  return (
    <Panel>
      <div>
        <FieldLabel>Logo</FieldLabel>
        <p className="mb-3 text-xs text-gray-500">
          Square, at least 200×200. Shown as your avatar across the app.
        </p>
        <ImageUpload
          value={props.logoUrl}
          onChange={(url) => props.setLogoUrl(url ?? '')}
          folder="business/logo"
        />
      </div>
      <div>
        <FieldLabel>Primary cover image</FieldLabel>
        <p className="mb-3 text-xs text-gray-500">
          Wide banner (16:9 or wider). This is the main image behind your profile header.
        </p>
        <ImageUpload
          value={props.coverImageUrl}
          onChange={(url) => props.setCoverImageUrl(url ?? '')}
          folder="business/cover"
        />
      </div>
      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <FieldLabel>Cover gallery</FieldLabel>
          <span className="text-xs font-medium text-gray-500">
            {props.galleryUrls.length}/8 photos
          </span>
        </div>
        <p className="mb-3 text-xs text-gray-500">
          Add extra photos of your store, products, menu or space. Customers can browse these on your profile.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {props.galleryUrls.map((url, index) => (
            <div key={url} className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
              <img src={url} alt={`Business gallery photo ${index + 1}`} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => props.setGalleryUrls(props.galleryUrls.filter((item) => item !== url))}
                className="absolute right-2 top-2 rounded-full bg-black/65 px-2 py-1 text-xs font-semibold text-white opacity-0 transition group-hover:opacity-100 focus:opacity-100"
                aria-label={`Remove gallery photo ${index + 1}`}
              >
                Remove
              </button>
            </div>
          ))}
          {props.galleryUrls.length < 8 && (
            <div className="min-h-28">
              <ImageUpload
                onChange={(url) => {
                  if (url) props.setGalleryUrls([...props.galleryUrls, url].slice(0, 8));
                }}
                folder="business/gallery"
              />
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
}

// ─── Contact ───────────────────────────────────────────────────────────
function ContactPanel({
  contact,
  setContact,
}: {
  contact: BusinessContact;
  setContact: (v: BusinessContact) => void;
}) {
  const update = (key: keyof BusinessContact, value: string) =>
    setContact({ ...contact, [key]: value });
  return (
    <Panel>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <FieldLabel>Primary phone</FieldLabel>
          <TextInput
            value={contact.phone ?? ''}
            onChange={(e) => update('phone', e.target.value)}
            placeholder="+234 800 000 0000"
            inputMode="tel"
          />
        </div>
        <div>
          <FieldLabel>Secondary phone</FieldLabel>
          <TextInput
            value={contact.phone2 ?? ''}
            onChange={(e) => update('phone2', e.target.value)}
            placeholder="Optional"
            inputMode="tel"
          />
        </div>
        <div>
          <FieldLabel>Email</FieldLabel>
          <TextInput
            value={contact.email ?? ''}
            onChange={(e) => update('email', e.target.value)}
            placeholder="hello@example.com"
            type="email"
          />
        </div>
        <div>
          <FieldLabel>Website</FieldLabel>
          <TextInput
            value={contact.website ?? ''}
            onChange={(e) => update('website', e.target.value)}
            placeholder="https://…"
          />
        </div>
      </div>

      <div className="pt-2">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
          Social
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {(
            [
              ['whatsapp', 'WhatsApp (phone or wa.me link)'],
              ['instagram', 'Instagram (@handle or URL)'],
              ['facebook', 'Facebook (URL or handle)'],
              ['twitter', 'X / Twitter (@handle)'],
              ['tiktok', 'TikTok (@handle or URL)'],
              ['youtube', 'YouTube channel URL'],
              ['linkedin', 'LinkedIn URL'],
            ] as Array<[keyof BusinessContact, string]>
          ).map(([key, label]) => (
            <div key={key}>
              <FieldLabel>{label}</FieldLabel>
              <TextInput
                value={(contact[key] ?? '') as string}
                onChange={(e) => update(key, e.target.value)}
                placeholder="Optional"
              />
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

// ─── Hours ─────────────────────────────────────────────────────────────
function HoursPanel({
  hours,
  setHours,
}: {
  hours: BusinessHour[];
  setHours: (v: BusinessHour[]) => void;
}) {
  const patch = (dayOfWeek: number, changes: Partial<BusinessHour>) => {
    setHours(
      hours.map((h) => (h.dayOfWeek === dayOfWeek ? { ...h, ...changes } : h)),
    );
  };
  return (
    <Panel>
      <p className="text-xs text-gray-500">
        Set weekly opening hours. Customers see &quot;Open&quot; / &quot;Closed
        now&quot; on your profile based on these hours in your local timezone.
      </p>
      <div className="space-y-3">
        {hours.map((h) => (
          <div
            key={h.dayOfWeek}
            className="grid grid-cols-1 items-center gap-3 rounded-xl border border-gray-200 p-3 md:grid-cols-[110px_1fr_1fr_auto]"
          >
            <p className="text-sm font-semibold text-gray-900">
              {DAYS[h.dayOfWeek]}
            </p>
            <div>
              <FieldLabel>Opens</FieldLabel>
              <TextInput
                type="time"
                value={h.openTime}
                onChange={(e) => patch(h.dayOfWeek, { openTime: e.target.value })}
                disabled={h.isClosed}
              />
            </div>
            <div>
              <FieldLabel>Closes</FieldLabel>
              <TextInput
                type="time"
                value={h.closeTime}
                onChange={(e) => patch(h.dayOfWeek, { closeTime: e.target.value })}
                disabled={h.isClosed}
              />
            </div>
            <label className="mt-4 inline-flex cursor-pointer items-center gap-2 self-end md:mt-0 md:self-center">
              <input
                type="checkbox"
                checked={!!h.isClosed}
                onChange={(e) => patch(h.dayOfWeek, { isClosed: e.target.checked })}
                className="h-4 w-4 accent-ruby-red"
              />
              <span className="text-xs font-semibold text-gray-700">Closed</span>
            </label>
          </div>
        ))}
      </div>
    </Panel>
  );
}

// ─── Location ──────────────────────────────────────────────────────────
function LocationPanel({
  address,
  setAddress,
  latitude,
  longitude,
  setCoordinates,
}: {
  address: BusinessAddress;
  setAddress: (nextAddress: BusinessAddress) => void;
  latitude: number;
  longitude: number;
  setCoordinates: (latitude: number, longitude: number) => void;
}) {
  const updateAddress = (field: keyof BusinessAddress, value: string) =>
    setAddress({ ...address, [field]: value });
  const applyReverseGeocode = (result: ReverseGeocodeResult) =>
    setAddress({
      ...address,
      street: result.street ?? address.street,
      city: result.city ?? address.city,
      state: result.state ?? address.state,
      country: result.country ?? address.country,
    });
  return (
    <Panel>
      <div>
        <FieldLabel>Find your business on the map</FieldLabel>
        <p className="mb-3 text-xs leading-relaxed text-gray-500">
          Search for the address, click the map, or drag the Ruby+ pin to the
          exact entrance. Selecting a place updates the address fields below.
        </p>
        <MapLocationPicker
          latitude={latitude}
          longitude={longitude}
          onLocationChange={setCoordinates}
          onAddressResolved={applyReverseGeocode}
          height="360px"
        />
      </div>
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-semibold">Location details</p>
        <p className="mt-1 text-xs leading-relaxed">
          Confirm the written address below, then select Save changes to keep
          it in sync with the precise map pin and customer discovery.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <FieldLabel>Street address</FieldLabel>
          <TextInput
            value={address.street ?? ''}
            onChange={(event) => updateAddress('street', event.target.value)}
            placeholder="House number and street"
          />
        </div>
        <div>
          <FieldLabel>Suite, floor or extra detail</FieldLabel>
          <TextInput
            value={address.street2 ?? ''}
            onChange={(event) => updateAddress('street2', event.target.value)}
            placeholder="Optional"
          />
        </div>
        <div>
          <FieldLabel>Landmark</FieldLabel>
          <TextInput
            value={address.landmark ?? ''}
            onChange={(event) => updateAddress('landmark', event.target.value)}
            placeholder="e.g. Opposite City Mall"
          />
        </div>
        <div>
          <FieldLabel>City</FieldLabel>
          <TextInput
            value={address.city ?? ''}
            onChange={(event) => updateAddress('city', event.target.value)}
            placeholder="City"
          />
        </div>
        <div>
          <FieldLabel>State</FieldLabel>
          <TextInput
            value={address.state ?? ''}
            onChange={(event) => updateAddress('state', event.target.value)}
            placeholder="State"
          />
        </div>
        <div>
          <FieldLabel>Country</FieldLabel>
          <TextInput
            value={address.country ?? ''}
            onChange={(event) => updateAddress('country', event.target.value)}
            placeholder="Nigeria"
          />
        </div>
      </div>
    </Panel>
  );
}

// ─── Verification ──────────────────────────────────────────────────────
function VerificationPanel({ doc }: { doc: BusinessDoc | null | undefined }) {
  const cacNumber = doc?.cacNumber?.trim() ?? '';
  const cacStatus = doc?.cacStatus ?? (cacNumber ? 'PENDING' : 'NOT_SUBMITTED');
  const tint =
    cacStatus === 'VERIFIED'
      ? 'bg-green-50 border-green-200 text-green-900'
      : cacStatus === 'REJECTED'
      ? 'bg-rose-50 border-rose-200 text-rose-900'
      : cacStatus === 'PENDING'
      ? 'bg-blue-50 border-blue-200 text-blue-900'
      : 'bg-gray-50 border-gray-200 text-gray-900';
  return (
    <Panel>
      <div>
        <FieldLabel>CAC number</FieldLabel>
        <div className={`rounded-xl border p-4 text-sm ${tint}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold">
              {cacNumber || 'No CAC number on file'}
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider">
              {cacStatus.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>
      {!cacNumber && (
        <div className="rounded-xl border border-purple-200 bg-purple-50 p-4 text-sm text-purple-900">
          <p className="font-semibold">Don&apos;t have a CAC yet?</p>
          <p className="mt-1 text-xs leading-relaxed">
            Use the &quot;Register your business with CAC&quot; card on your
            dashboard home to chat with the Ruby+ team — we&apos;ll handle the
            paperwork for you.
          </p>
        </div>
      )}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-xs leading-relaxed text-gray-600">
        Verification updates come from the Ruby+ compliance team after review.
        If you have a new CAC certificate to submit, please reach out via the
        support WhatsApp on the dashboard home.
      </div>
    </Panel>
  );
}

// ─── More ──────────────────────────────────────────────────────────────
function MorePanel({
  operationMode,
  doc,
  branchLabel,
  setBranchLabel,
}: {
  operationMode: BusinessModel | undefined;
  doc: BusinessDoc | null | undefined;
  branchLabel: string;
  setBranchLabel: (v: string) => void;
}) {
  const isBranch = !!doc?.parentBusinessId;
  return (
    <Panel>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
          Operation mode
        </p>
        <p className="mt-1 text-xs text-gray-500">
          Set by your subcategory. Change through Support if this doesn&apos;t
          match how you actually operate.
        </p>
        <div className="mt-3 space-y-2">
          {OPERATION_MODES.map((mode) => {
            const isActive = mode.value === operationMode;
            return (
              <div
                key={mode.value}
                className={`rounded-xl border p-3 ${
                  isActive
                    ? 'border-ruby-red bg-ruby-red/5'
                    : 'border-gray-200 bg-white opacity-60'
                }`}
              >
                <p className="text-sm font-semibold text-gray-900">
                  {mode.title}{' '}
                  {isActive && (
                    <span className="ml-2 rounded-full bg-ruby-red px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                      Current
                    </span>
                  )}
                </p>
                <p className="mt-1 text-xs text-gray-500">{mode.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      {(isBranch || doc?.isParent) && (
        <div>
          <FieldLabel>Branch label</FieldLabel>
          <p className="mb-2 text-xs text-gray-500">
            Short label shown after your brand name (e.g. &quot;Lekki&quot; →
            &quot;Ruby Pizza — Lekki&quot;).
          </p>
          <TextInput
            value={branchLabel}
            onChange={(e) => setBranchLabel(e.target.value)}
            placeholder="e.g. Lekki, Yaba, VI"
          />
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-xs leading-relaxed text-gray-600">
        Template-specific fields (menu style, spa services, gym equipment,
        etc.) are ported next. For now, edit them from the mobile Ruby+
        Business app — the change syncs across both surfaces immediately.
      </div>
    </Panel>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────
function sanitizeContact(c: BusinessContact): BusinessContact {
  const out: BusinessContact = {};
  (Object.keys(c) as Array<keyof BusinessContact>).forEach((k) => {
    const v = (c[k] ?? '').trim();
    if (v) out[k] = v;
  });
  return out;
}

function sanitizeAddress(address: BusinessAddress): BusinessAddress {
  const result: BusinessAddress = {};
  (Object.keys(address) as Array<keyof BusinessAddress>).forEach((key) => {
    const value = address[key]?.trim();
    if (value) result[key] = value;
  });
  return result;
}

function buildBusinessMedia(
  logoUrl: string,
  coverImageUrl: string,
  galleryUrls: string[],
) {
  const media: Array<{
    url: string;
    type: 'IMAGE';
    isPrimary?: boolean;
    order: number;
  }> = [];
  if (logoUrl.trim()) {
    media.push({ url: logoUrl.trim(), type: 'IMAGE', isPrimary: true, order: 0 });
  }
  if (coverImageUrl.trim()) {
    media.push({ url: coverImageUrl.trim(), type: 'IMAGE', order: 1 });
  }
  galleryUrls.slice(0, 8).forEach((url, index) => {
    if (url.trim()) media.push({ url: url.trim(), type: 'IMAGE', order: index + 2 });
  });
  return media;
}
