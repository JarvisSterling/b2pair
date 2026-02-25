"use client";

import Image, { ImageProps } from "next/image";
import { useRef, useState } from "react";

/**
 * SafeImage wraps next/image for user-provided URLs.
 * - Uses next/image optimization for known domains (Supabase storage)
 * - Falls back to unoptimized for arbitrary external URLs
 * - Handles loading errors gracefully with optional fallback
 */

const OPTIMIZED_HOSTS = [
  "eemeremqmqsqsxioycka.supabase.co",
];

function isOptimizable(src: string): boolean {
  try {
    const url = new URL(src);
    return OPTIMIZED_HOSTS.some((h) => url.hostname === h);
  } catch {
    return false;
  }
}

interface SafeImageProps extends Omit<ImageProps, "src"> {
  src: string;
  fallback?: React.ReactNode;
}

export function SafeImage({ src, fallback, alt, ...props }: SafeImageProps) {
  const [error, setError] = useState(false);

  // Reset error state when src changes
  const prevSrc = useRef(src);
  if (prevSrc.current !== src) {
    prevSrc.current = src;
    if (error) setError(false);
  }

  if (error && fallback) {
    return <>{fallback}</>;
  }

  return (
    <Image
      key={src}
      src={src}
      alt={alt}
      unoptimized={!isOptimizable(src)}
      onError={() => setError(true)}
      {...props}
    />
  );
}
