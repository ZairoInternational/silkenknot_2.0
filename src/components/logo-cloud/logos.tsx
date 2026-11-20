import {
  Atom,
  Carrot,
  Droplet,
  Feather,
  HandHeart,
  Heart,
  Leaf,
  Rabbit,
  SunMedium,
  Tag,
  type LucideIcon,
} from "lucide-react";

function ClaimMark({
  icon: Icon,
  label,
}: {
  icon: LucideIcon;
  label: string;
}) {
  return (
    <span className="flex h-14 shrink-0 items-center gap-3 text-ink/75">
      <span className="grid size-11 place-items-center rounded-full border border-line bg-sand/60 text-mute">
        <Icon size={18} strokeWidth={1.25} aria-hidden />
      </span>
      <span className="whitespace-nowrap text-[13px] font-medium uppercase tracking-[0.16em]">
        {label}
      </span>
    </span>
  );
}

export const Logo01 = () => <ClaimMark icon={Leaf} label="Simple formulas" />;
export const Logo02 = () => <ClaimMark icon={Heart} label="Small batches" />;
export const Logo03 = () => <ClaimMark icon={Droplet} label="Rinses clean" />;
export const Logo04 = () => <ClaimMark icon={Feather} label="Quiet scents" />;
// export const Logo05 = () => <ClaimMark icon={Tag} label="Named on the label" />;
export const Logo06 = () => <ClaimMark icon={SunMedium} label="Used every day" />;
export const Logo07 = () => <ClaimMark icon={Carrot} label="Paraben free" />;
export const Logo08 = () => <ClaimMark icon={Atom} label="Sulfate free" />;
export const Logo09 = () => <ClaimMark icon={Droplet} label="Microplastic free" />;
export const Logo10 = () => <ClaimMark icon={Rabbit} label="Cruelty-free" />;
// export const Logo11 = () => <ClaimMark icon={Leaf} label="Plant-based" />;
export const Logo12 = () => <ClaimMark icon={HandHeart} label="Made in India" />;
