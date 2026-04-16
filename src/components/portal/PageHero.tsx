import Image from "next/image";

interface PageHeroProps {
  /** Page title shown over the hero */
  title: string;
  /** Smaller subtitle below title */
  subtitle?: string;
  /** Accent colour class, e.g. "text-emerald-400" / "text-blue-400" / "text-gold" */
  accentClass?: string;
  /** Border / glow colour class used on the bottom tape strip */
  tapeClass?: string;
  /** Figure image src — defaults to /fig-bicep.png */
  figure?: string;
  /** Background overlay tint class */
  bgClass?: string;
}

/**
 * Full-width hero banner for portal sub-pages.
 * Shows ~180px tall: danger tape top strip, figure silhouette, title, tape bottom strip.
 * Inspired by the top-section pattern in the reference design.
 */
export function PageHero({
  title,
  subtitle,
  accentClass = "text-gold",
  tapeClass,
  figure = "/fig-bicep.png",
  bgClass = "bg-[#0a0a0a]",
}: PageHeroProps) {
  return (
    <div className={`relative w-full overflow-hidden ${bgClass}`} style={{ height: 200 }}>
      {/* Top black-gold danger tape strip */}
      <div
        className="absolute top-0 left-0 right-0 h-[6px] z-10"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg,#F5C100 0px,#F5C100 14px,#0a0a0a 14px,#0a0a0a 28px)",
          opacity: 0.85,
        }}
      />

      {/* Figure silhouette */}
      <div className="absolute inset-0 flex items-end justify-end rtl:justify-start pr-4 rtl:pl-4 rtl:pr-0 pb-2 z-0">
        <div className="relative w-36 h-44 opacity-30 select-none pointer-events-none">
          <Image
            src={figure}
            alt=""
            fill
            className="object-contain object-bottom"
            unoptimized
          />
        </div>
      </div>

      {/* Grid diagonal texture */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg,transparent 0,transparent 28px,rgba(255,255,255,0.015) 28px,rgba(255,255,255,0.015) 30px)",
        }}
      />

      {/* Text content */}
      <div className="absolute bottom-8 left-0 right-0 z-10 px-5">
        <p className={`font-display text-[38px] leading-none tracking-wider ${accentClass}`}>
          {title}
        </p>
        {subtitle && (
          <p className="text-white/40 text-[13px] mt-1 font-medium">{subtitle}</p>
        )}
      </div>

      {/* Bottom accent tape strip */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[5px] z-10"
        style={{
          backgroundImage: tapeClass
            ? undefined
            : "repeating-linear-gradient(90deg,#F5C100 0px,#F5C100 14px,transparent 14px,transparent 28px)",
          opacity: 0.5,
        }}
      />
    </div>
  );
}
