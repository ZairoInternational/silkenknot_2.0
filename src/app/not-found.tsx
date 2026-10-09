import Link from "next/link";
import { SiteChrome } from "@/components/providers";

export default function NotFound() {
  return (
    <SiteChrome>
      <div className="page-pad mx-auto max-w-xl px-5 pb-24">
        <p className="eyebrow text-mute">404</p>
        <h1 className="mt-4 font-serif text-6xl">This page has wandered off.</h1>
        <Link href="/" className="mt-8 inline-flex text-[11px] uppercase tracking-[0.18em]">
          Back to the ritual
        </Link>
      </div>
    </SiteChrome>
  );
}
