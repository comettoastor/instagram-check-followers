const INSTAGRAM_URL = "https://www.instagram.com/cometto.digital/";

export function SiteFooter() {
  const monthYear = new Intl.DateTimeFormat("es-AR", {
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <footer className="mt-auto border-t border-white/10 px-4 py-8">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 text-center">
        <a
          href={INSTAGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Instagram de Cometto Digital"
          className="transition hover:opacity-80"
        >
          <img
            src="/cometto-digital.png"
            alt="Cometto Digital"
            width={832}
            height={294}
            className="h-12 w-auto sm:h-14"
          />
        </a>
        <a
          href={INSTAGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-zinc-400 transition hover:text-white"
        >
          @cometto.digital
        </a>
        <p className="text-xs text-zinc-500">{monthYear}</p>
      </div>
    </footer>
  );
}
