export default function Footer() {
  const year = new Date().getFullYear();
  const utmLink = `https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(
    typeof window !== "undefined" ? window.location.hostname : "romdrop",
  )}`;

  return (
    <footer className="border-t border-border mt-auto">
      <div className="container mx-auto max-w-4xl px-4 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="font-mono text-xs text-muted-foreground">
          © {year} ROMDrop — no accounts, no limits
        </p>
        <a
          href={utmLink}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-xs text-muted-foreground hover:text-neon transition-colors duration-200"
        >
          built with ♥ using <span className="text-neon-dim">caffeine.ai</span>
        </a>
      </div>
    </footer>
  );
}
