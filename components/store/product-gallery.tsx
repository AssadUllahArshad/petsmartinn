"use client";
import { amazonImage } from "@/lib/amazon/normalize";
import Image from "next/image";
import { useState } from "react";
export type GalleryPhoto = { url: string; alt: string };
export function ProductGallery({ photos }: { photos: GalleryPhoto[] }) {
  const [active, setActive] = useState(0);
  const photo = photos[active] || photos[0];
  return (
    <div className="product-gallery">
      <div className="detail-image">
        {photo ? (
          <Image
            unoptimized={!!amazonImage(photo.url)}
            src={photo.url}
            alt={photo.alt}
            fill
            priority
            sizes="(max-width:760px) 94vw, 50vw"
          />
        ) : (
          <span className="image-unavailable">Product photo coming soon</span>
        )}
      </div>
      {photos.length > 1 && (
        <div className="gallery" aria-label="Product image gallery">
          {photos.map((item, i) => (
            <button
              type="button"
              key={item.url}
              onClick={() => setActive(i)}
              aria-pressed={i === active}
              aria-label={`View image ${i + 1}: ${item.alt}`}
            >
              <Image
                unoptimized={!!amazonImage(item.url)}
                src={item.url}
                alt=""
                width={88}
                height={88}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
