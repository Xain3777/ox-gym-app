import Image from "next/image";

// Auth layout — centered, no sidebar, OX branding
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-void flex flex-col items-center justify-center px-4 overflow-hidden">
      {/* Subtle background texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `repeating-linear-gradient(
            45deg,
            transparent 0px, transparent 40px,
            rgba(245, 193, 0, 0.015) 40px, rgba(245, 193, 0, 0.015) 42px
          )`,
        }}
      />

      {/* OX Logo + GYM branding */}
      <div className="relative z-10 mb-8 flex flex-col items-center">
        <Image
          src="/ox-logo.png"
          alt="OX GYM"
          width={80}
          height={80}
          priority
          className="mb-3"
        />
        <h1 className="font-display text-[40px] tracking-[0.06em] text-gold leading-none">
          GYM
        </h1>
        <p className="font-mono text-[9px] tracking-[0.3em] text-muted uppercase mt-1.5">
          HARDER BETTER FASTER STRONGER
        </p>
      </div>

      {/* Auth card */}
      <div className="relative z-10 w-full max-w-[420px] bg-charcoal border border-steel shadow-dark-xl">
        {/* Gold top stripe */}
        <div
          className="h-1 w-full"
          style={{
            backgroundImage: `repeating-linear-gradient(
              45deg,
              #F5C100 0px, #F5C100 4px,
              transparent 4px, transparent 8px
            )`,
          }}
        />
        {children}
      </div>

      {/* Footer */}
      <p className="relative z-10 font-mono text-[9px] tracking-[0.2em] text-muted/30 uppercase mt-10">
        © 2026 OX GYM. ALL RIGHTS RESERVED.
      </p>
    </div>
  );
}
