"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
type Media = {
  id: string;
  filename: string;
  url: string;
  alt: string;
  caption: string;
  title: string;
  width: number;
  height: number;
  createdAt: string;
};
export function MediaLibrary({ initial }: { initial: Media[] }) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <>
      <form
        className="media-upload"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          const form = new FormData(e.currentTarget);
          const r = await fetch("/api/media", { method: "POST", body: form });
          const v = await r.json();
          if (!r.ok) setError(v.error);
          else router.refresh();
          setBusy(false);
        }}
      >
        <label>
          Upload image
          <input
            name="file"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            required
          />
        </label>
        <label>
          Alternative text
          <input name="alt" required />
        </label>
        <button className="button" disabled={busy}>
          {busy ? "Uploading…" : "Upload image"}
        </button>
        <small>
          PNG, JPEG, WebP · Maximum 5 MB · Metadata is removed during processing
        </small>
      </form>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <form className="list-filters">
        <input
          name="q"
          aria-label="Search media"
          placeholder="Search filenames or alternative text"
        />
        <button className="button secondary">Search</button>
      </form>
      <div className="media-grid">
        {initial.map((m) => (
          <article key={m.id}>
            <Image src={m.url} alt={m.alt} width={250} height={180} />
            <strong>{m.filename}</strong>
            <small>
              {m.width} × {m.height} ·{" "}
              {new Date(m.createdAt).toLocaleDateString()}
            </small>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                const r = await fetch("/api/media", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    id: m.id,
                    alt: f.get("alt"),
                    caption: f.get("caption"),
                    title: f.get("title"),
                  }),
                });
                if (!r.ok) setError((await r.json()).error);
                else router.refresh();
              }}
            >
              <label>
                Alt text
                <input name="alt" defaultValue={m.alt} />
              </label>
              <label>
                Title
                <input name="title" defaultValue={m.title} />
              </label>
              <label>
                Caption
                <input name="caption" defaultValue={m.caption} />
              </label>
              <button className="text-link">Save metadata</button>
            </form>
            <button
              className="text-link"
              onClick={() => navigator.clipboard.writeText(m.url)}
            >
              Copy URL
            </button>
            <button
              className="text-link danger-text"
              onClick={async () => {
                if (!confirm("Delete this unused image?")) return;
                const r = await fetch("/api/media", {
                  method: "DELETE",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ id: m.id }),
                });
                if (!r.ok) setError((await r.json()).error);
                else router.refresh();
              }}
            >
              Delete unused image
            </button>
          </article>
        ))}
      </div>
    </>
  );
}
