'use client'

export function NewsMasthead() {
  return (
    <div className="news-masthead relative z-10 w-full overflow-hidden border-b border-white/10">
      <div
        aria-hidden
        className="news-masthead-checker pointer-events-none absolute inset-0"
      />
      <div
        aria-hidden
        className="news-masthead-glass pointer-events-none absolute inset-0"
      />
      <div
        aria-hidden
        className="news-masthead-wash pointer-events-none absolute inset-0"
      />
      <div
        aria-hidden
        className="news-masthead-grain pointer-events-none absolute inset-0 opacity-[0.1]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-fuchsia-300/40 to-transparent"
      />

      <div className="relative flex min-h-[5.5rem] items-center justify-center px-4 py-5 text-center sm:min-h-[6.5rem] md:min-h-[7.5rem] md:py-6">
        <h1
          className="max-w-[20ch] font-bold tracking-tight text-white sm:max-w-none"
          style={{ fontSize: 'clamp(1.75rem, 6vw, 3rem)', lineHeight: 1.1 }}
        >
          Today in Music News
          <span
            aria-hidden
            className="news-masthead-shimmer mx-auto mt-2 block h-px w-24 rounded-full sm:w-28"
          />
        </h1>
      </div>

      <style jsx>{`
        .news-masthead {
          background:
            linear-gradient(135deg, rgba(217, 70, 239, 0.16) 0%, transparent 45%),
            linear-gradient(225deg, rgba(34, 211, 238, 0.12) 0%, transparent 42%),
            rgba(8, 8, 18, 0.78);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
        }

        .news-masthead-checker {
          background-color: transparent;
          background-image:
            linear-gradient(45deg, rgba(255, 255, 255, 0.055) 25%, transparent 25%),
            linear-gradient(-45deg, rgba(255, 255, 255, 0.055) 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, rgba(255, 255, 255, 0.055) 75%),
            linear-gradient(-45deg, transparent 75%, rgba(255, 255, 255, 0.055) 75%);
          background-size: 24px 24px;
          background-position: 0 0, 0 12px, 12px -12px, -12px 0;
          animation: masthead-checker 18s linear infinite;
        }

        .news-masthead-glass {
          background:
            linear-gradient(
              180deg,
              rgba(255, 255, 255, 0.09) 0%,
              rgba(255, 255, 255, 0.02) 45%,
              transparent 75%
            ),
            radial-gradient(ellipse 90% 80% at 50% 0%, rgba(255, 255, 255, 0.07), transparent 55%);
        }

        .news-masthead-wash {
          background:
            radial-gradient(ellipse 80% 120% at 15% 50%, rgba(217, 70, 239, 0.22), transparent 55%),
            radial-gradient(ellipse 70% 100% at 85% 40%, rgba(34, 211, 238, 0.16), transparent 50%);
          animation: masthead-wash 16s ease-in-out infinite;
        }

        .news-masthead-grain {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          background-size: 160px 160px;
          mix-blend-mode: overlay;
          animation: masthead-grain 8s steps(6) infinite;
        }

        .news-masthead-shimmer {
          background: linear-gradient(
            90deg,
            transparent,
            rgba(244, 114, 182, 0.15),
            rgba(34, 211, 238, 0.85),
            rgba(244, 114, 182, 0.15),
            transparent
          );
          background-size: 200% 100%;
          animation: masthead-shimmer 3.5s ease-in-out infinite;
        }

        @keyframes masthead-checker {
          0% {
            background-position: 0 0, 0 12px, 12px -12px, -12px 0;
          }
          100% {
            background-position: 24px 24px, 24px 36px, 36px 12px, 12px 24px;
          }
        }

        @keyframes masthead-wash {
          0%,
          100% {
            transform: translate3d(0, 0, 0) scale(1);
            opacity: 0.85;
          }
          50% {
            transform: translate3d(2%, -1.5%, 0) scale(1.04);
            opacity: 1;
          }
        }

        @keyframes masthead-grain {
          0%,
          100% {
            opacity: 0.08;
          }
          50% {
            opacity: 0.14;
          }
        }

        @keyframes masthead-shimmer {
          0%,
          100% {
            background-position: 100% 0;
            opacity: 0.55;
          }
          50% {
            background-position: 0% 0;
            opacity: 1;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .news-masthead-checker,
          .news-masthead-wash,
          .news-masthead-grain,
          .news-masthead-shimmer {
            animation: none;
          }
        }
      `}</style>
    </div>
  )
}
