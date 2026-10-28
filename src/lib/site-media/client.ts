"use client";

import { useEffect, useState } from "react";
import { DEFAULT_SITE_MEDIA, type SiteMediaSettings } from "@/lib/site-media/content";

let cached: SiteMediaSettings | null = null;
let inflight: Promise<SiteMediaSettings> | null = null;

async function loadSiteMedia(): Promise<SiteMediaSettings> {
  if (cached) return cached;
  if (!inflight) {
    inflight = fetch("/api/site-media")
      .then(async (response) => {
        const body = (await response.json()) as { media?: SiteMediaSettings };
        const next = body.media || DEFAULT_SITE_MEDIA;
        cached = next;
        return next;
      })
      .catch(() => {
        cached = DEFAULT_SITE_MEDIA;
        return DEFAULT_SITE_MEDIA;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

const SITE_MEDIA_EVENT = "silkknot:site-media";

export function clearSiteMediaCache() {
  cached = null;
}

export function primeSiteMediaCache(media: SiteMediaSettings) {
  cached = media;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SITE_MEDIA_EVENT, { detail: media }));
  }
}

export function useSiteMedia(): SiteMediaSettings {
  const [media, setMedia] = useState<SiteMediaSettings>(cached || DEFAULT_SITE_MEDIA);

  useEffect(() => {
    let cancelled = false;
    void loadSiteMedia().then((next) => {
      if (!cancelled) setMedia(next);
    });
    const onMedia = (event: Event) => {
      const detail = (event as CustomEvent<SiteMediaSettings>).detail;
      if (detail) setMedia(detail);
    };
    window.addEventListener(SITE_MEDIA_EVENT, onMedia);
    return () => {
      cancelled = true;
      window.removeEventListener(SITE_MEDIA_EVENT, onMedia);
    };
  }, []);

  return media;
}
