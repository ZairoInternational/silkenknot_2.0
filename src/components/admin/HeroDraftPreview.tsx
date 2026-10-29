"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Hero } from "@/components/home/Hero";
import { DraftPreviewFrame } from "@/components/admin/DraftPreviewFrame";
import type { HeroContent } from "@/lib/hero/content";

const FRAME_W = 1280;
const FRAME_H = 740;

/** Scaled live view of the homepage hero from unsaved admin draft values. */
export function HeroDraftPreview({ content }: { content: HeroContent }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const update = () => {
      const width = el.clientWidth;
      if (width > 0) setScale(Math.min(1, width / FRAME_W));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const frameStyle = useMemo(
    (): CSSProperties => ({
      width: FRAME_W,
      height: FRAME_H,
      transform: `scale(${scale})`,
      ["--nav-h" as string]: "3.5rem",
      ["--announce-h" as string]: "0px",
    }),
    [scale],
  );

  return (
    <DraftPreviewFrame>
      <div ref={frameRef} className="relative w-full overflow-hidden" style={{ height: FRAME_H * scale }}>
        <div className="origin-top-left" style={frameStyle}>
          <div className="h-full w-full overflow-hidden">
            <Hero content={content} preview />
          </div>
        </div>
      </div>
    </DraftPreviewFrame>
  );
}
