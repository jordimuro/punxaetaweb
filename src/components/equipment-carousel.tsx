"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

type EquipmentCarouselProps = {
  title: string;
  images: string[];
};

export function EquipmentCarousel({ title, images }: EquipmentCarouselProps) {
  const safeImages = useMemo(() => (images.length > 0 ? images : ["/equipacions/09-frontal-2.jpeg"]), [images]);
  const [index, setIndex] = useState(0);

  const currentIndex = index % safeImages.length;
  const currentImage = safeImages[currentIndex];

  const goTo = (nextIndex: number) => {
    setIndex((nextIndex + safeImages.length) % safeImages.length);
  };

  return (
    <div className="equipment-carousel">
      <div className="equipment-carousel__frame">
        <Image src={currentImage} alt={title} fill sizes="(max-width: 980px) 100vw, 55vw" />
      </div>

      {safeImages.length > 1 ? (
        <div className="equipment-carousel__controls">
          <button type="button" className="button button--secondary button--small" onClick={() => goTo(currentIndex - 1)}>
            ←
          </button>
          <div className="equipment-carousel__dots" aria-label="Imatges del producte">
            {safeImages.map((image, dotIndex) => (
              <button
                key={image}
                type="button"
                className={`equipment-carousel__dot ${dotIndex === currentIndex ? "equipment-carousel__dot--active" : ""}`}
                aria-label={`Veure imatge ${dotIndex + 1}`}
                onClick={() => setIndex(dotIndex)}
              />
            ))}
          </div>
          <button type="button" className="button button--secondary button--small" onClick={() => goTo(currentIndex + 1)}>
            →
          </button>
        </div>
      ) : null}
    </div>
  );
}

