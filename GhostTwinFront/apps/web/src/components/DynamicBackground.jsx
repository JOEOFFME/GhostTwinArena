import { useEffect, useState } from 'react';

/** Cross-fading stadium slides for hero / stream panels. */
export function DynamicHeroBackground({ images, className = '' }) {
  const slides = images.filter(Boolean);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return undefined;
    const timer = window.setInterval(
      () => setIndex((current) => (current + 1) % slides.length),
      9000,
    );
    return () => window.clearInterval(timer);
  }, [slides.length]);

  if (slides.length === 0) return null;

  return (
    <div className={`dynamic-hero ${className}`.trim()} aria-hidden="true">
      {slides.map((src, i) => (
        <img
          key={src}
          src={src}
          alt=""
          className={`dynamic-hero__slide${i === index ? ' is-active' : ''}`}
          loading={i === 0 ? 'eager' : 'lazy'}
          decoding="async"
        />
      ))}
      <div className="dynamic-hero__veil" />
    </div>
  );
}

/** Soft animated mesh behind the whole app (light theme). */
export function AppAmbientBackground() {
  return (
    <div className="app-ambient" aria-hidden="true">
      <div className="app-ambient__orb app-ambient__orb--1" />
      <div className="app-ambient__orb app-ambient__orb--2" />
      <div className="app-ambient__orb app-ambient__orb--3" />
      <div className="app-ambient__grid" />
    </div>
  );
}
