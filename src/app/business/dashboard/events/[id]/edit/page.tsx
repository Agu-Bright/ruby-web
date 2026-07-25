"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { DynamicMap } from "@/lib/leaflet/DynamicMap";
import { useEventDetail, useUpdateEvent } from "@/lib/business-api/events";

export default function EditEventPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const detail = useEventDetail(params.id);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [venueName, setVenueName] = useState("");
  const [venueAddress, setVenueAddress] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [pin, setPin] = useState<[number, number]>([4.8156, 7.0498]);
  useEffect(() => {
    const item = detail.data;
    if (!item) return;
    setTitle(item.title);
    setDescription(item.description);
    setVenueName(item.venueName);
    setVenueAddress(item.venueAddress);
    setCoverImageUrl(item.coverImageUrl);
    setStartsAt(item.startsAt.slice(0, 16));
    setEndsAt(item.endsAt.slice(0, 16));
    const coordinates = item.geoPoint?.coordinates;
    if (coordinates?.length === 2) setPin([coordinates[1], coordinates[0]]);
  }, [detail.data]);
  const update = useUpdateEvent(params.id, () => {
    toast.success("Event changes saved");
    router.push(`/business/dashboard/events/${params.id}`);
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (
      !title ||
      !description ||
      !venueName ||
      !venueAddress ||
      !startsAt ||
      !endsAt ||
      !coverImageUrl
    )
      return toast.error("Complete all required fields");
    update.mutate({
      title,
      description,
      venueName,
      venueAddress,
      coverImageUrl,
      startsAt: new Date(startsAt).toISOString(),
      endsAt: new Date(endsAt).toISOString(),
      geoCoordinates: [pin[1], pin[0]],
    });
  };
  if (detail.isLoading)
    return <p className="p-6 text-sm text-gray-500">Loading event…</p>;
  if (!detail.data) return <main className="p-6">Event not found.</main>;
  return (
    <main className="mx-auto max-w-3xl p-6">
      <Link
        href={`/business/dashboard/events/${params.id}`}
        className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600"
      >
        <ArrowLeft size={16} /> Back to event
      </Link>
      <h1 className="mt-5 text-2xl font-bold">Edit event</h1>
      <form onSubmit={submit} className="mt-5 space-y-5">
        <section className="rounded-2xl border bg-white p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold sm:col-span-2">
              Title
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="mt-1 w-full rounded-lg border p-3 font-normal"
              />
            </label>
            <label className="block text-sm font-semibold sm:col-span-2">
              Description
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
                className="mt-1 w-full rounded-lg border p-3 font-normal"
              />
            </label>
            <label className="block text-sm font-semibold">
              Starts
              <input
                type="datetime-local"
                value={startsAt}
                onChange={(event) => setStartsAt(event.target.value)}
                className="mt-1 w-full rounded-lg border p-3 font-normal"
              />
            </label>
            <label className="block text-sm font-semibold">
              Ends
              <input
                type="datetime-local"
                value={endsAt}
                onChange={(event) => setEndsAt(event.target.value)}
                className="mt-1 w-full rounded-lg border p-3 font-normal"
              />
            </label>
            <label className="block text-sm font-semibold sm:col-span-2">
              Cover image URL
              <input
                type="url"
                value={coverImageUrl}
                onChange={(event) => setCoverImageUrl(event.target.value)}
                className="mt-1 w-full rounded-lg border p-3 font-normal"
              />
            </label>
          </div>
        </section>
        <section className="rounded-2xl border bg-white p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold">
              Venue name
              <input
                value={venueName}
                onChange={(event) => setVenueName(event.target.value)}
                className="mt-1 w-full rounded-lg border p-3 font-normal"
              />
            </label>
            <label className="block text-sm font-semibold">
              Venue address
              <input
                value={venueAddress}
                onChange={(event) => setVenueAddress(event.target.value)}
                className="mt-1 w-full rounded-lg border p-3 font-normal"
              />
            </label>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            Click or drag the pin to update the venue location.
          </p>
          <DynamicMap
            center={pin}
            zoom={14}
            markers={[{ id: "venue", position: pin, draggable: true }]}
            onMapClick={setPin}
            onMarkerDragEnd={(_, position) => setPin(position)}
            className="mt-3 h-72 w-full"
          />
        </section>
        <button
          disabled={update.isLoading}
          className="rounded-lg bg-ruby-red px-5 py-3 text-sm font-semibold text-white"
        >
          {update.isLoading ? "Saving…" : "Save changes"}
        </button>
      </form>
    </main>
  );
}
