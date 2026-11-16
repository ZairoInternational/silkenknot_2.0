"use client";

import { useAnimationFrame } from "framer-motion";
import { useRef } from "react";
import { BorderBeam } from "@/components/logo-cloud/border-beam";
import {
  Logo01,
  Logo02,
  Logo03,
  Logo04,
  Logo05,
  Logo06,
  Logo07,
  Logo08,
  Logo09,
  Logo10,
  Logo11,
  Logo12,
} from "@/components/logo-cloud/logos";
import { Marquee } from "@/components/logo-cloud/marquee";

const BEAM_DURATION = 8;
const BEAM_SIZE = 100;

/** Champagne → mist wave, synced to the border beam. */
const WAVE_GRADIENT =
  "linear-gradient(90deg, currentColor 0%, currentColor 45%, #c7ad87 47%, #61a2af 50%, #c7ad87 53%, currentColor 55%, currentColor 100%)";

export function LogoCloud() {
  const cardRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);
  const waveSpanRef = useRef<HTMLSpanElement>(null);
  const startTimeRef = useRef<number | null>(null);

  useAnimationFrame((time) => {
    if (!(cardRef.current && textRef.current && waveSpanRef.current)) return;

    if (startTimeRef.current === null) {
      startTimeRef.current = time;
    }

    const elapsed = ((time - startTimeRef.current) / 1000) % BEAM_DURATION;
    const beamOffset = (elapsed / BEAM_DURATION) * 100;

    const cardRect = cardRef.current.getBoundingClientRect();
    const textRect = textRef.current.getBoundingClientRect();

    const W = cardRect.width;
    const H = cardRect.height;
    const perimeter = 2 * (W + H);

    const textLeft = Math.max(0, textRect.left - cardRect.left);
    const textRight = Math.min(W, textRect.right - cardRect.left);

    const textStartPercent = (textLeft / perimeter) * 100;
    const textEndPercent = (textRight / perimeter) * 100;

    const span = waveSpanRef.current;

    if (beamOffset >= textStartPercent && beamOffset <= textEndPercent) {
      const t =
        (beamOffset - textStartPercent) / (textEndPercent - textStartPercent);
      span.style.backgroundPosition = `${95 - t * 90}% center`;
    } else if (beamOffset < textStartPercent) {
      span.style.backgroundPosition = "0% center";
    } else {
      span.style.backgroundPosition = "100% center";
    }
  });

  return (
    <div
      className="relative mx-auto max-w-(--breakpoint-lg) rounded-[1.25rem] border border-line bg-paper shadow-[0_18px_48px_rgba(31,59,64,0.06)]"
      ref={cardRef}
    >
      <BorderBeam
        className="isolate -z-1"
        colorFrom="#c7ad87"
        colorTo="#61a2af"
        duration={BEAM_DURATION}
        size={BEAM_SIZE}
      />

      <div className="absolute inset-x-0 top-0 flex -translate-y-1/2 items-center justify-center px-6 sm:px-10">
        <p
          className="bg-paper px-3 text-center font-medium text-ink/70 text-base tracking-[-0.01em] sm:px-6 sm:text-xl"
          ref={textRef}
        >
          <span
            ref={waveSpanRef}
            style={{
              backgroundImage: WAVE_GRADIENT,
              backgroundSize: "250% 100%",
              backgroundRepeat: "no-repeat",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundPosition: "0% center",
            }}
          >
            Soft formulas, named ingredients{" "}
            <span className="max-sm:hidden">made for every day</span>
          </span>
        </p>
      </div>

      <div className="grid">
        <div className="flex min-w-0 items-center justify-center p-8 pt-12 sm:p-10 sm:pt-14">
          <Marquee
            className="mask-x-from-75% w-full [--duration:32s] [--gap:2.5rem]"
            pauseOnHover
          >
            <Logo01 />
            <Logo02 />
            <Logo03 />
            <Logo04 />
            <Logo05 />
            <Logo06 />
            <Logo07 />
            <Logo08 />
            <Logo09 />
            <Logo10 />
            <Logo11 />
            <Logo12 />
          </Marquee>
        </div>
      </div>
    </div>
  );
}
