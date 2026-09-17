import { useState } from "react";

export default function RepositoryInput({ onAnalyze, onDemo, serverError }) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) {
      setError("Enter a GitHub repository URL to analyze.");
      return;
    }
    const looksValid = /^(https?:\/\/)?(www\.)?github\.com\/[\w.-]+\/[\w.-]+\/?$/i.test(trimmed);
    if (!looksValid) {
      setError("That doesn't look like a valid GitHub repository URL.");
      return;
    }
    setError("");
    onAnalyze(trimmed);
  };

  const handleDemo = () => {
    setUrl("https://github.com/acme/checkout-service");
    setError("");
    onDemo();
  };

  const displayedError = error || serverError;

  return (
    <div className="bg-grid relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[var(--color-brand-glow)]/[0.06] via-transparent to-transparent" />

      <div className="relative z-10 w-full max-w-xl text-center">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" className="text-[var(--color-brand)]">
            <path
              d="M12 2 3 6v6c0 5.2 3.6 9.7 9 10.9 5.4-1.2 9-5.7 9-10.9V6l-9-4Z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path d="M9 12.4 11.2 14.6 15.5 9.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="font-mono text-lg font-semibold tracking-tight text-[var(--color-text-primary)]">
            CHAIN<span className="text-[var(--color-brand)]">BREAK</span>
          </span>
        </div>

        <h1 className="text-glow mb-3 text-3xl font-semibold tracking-tight text-[var(--color-text-primary)] sm:text-4xl">
          Open-Source Supply Chain Risk Intelligence
        </h1>
        <p className="mx-auto mb-10 max-w-md text-sm leading-relaxed text-[var(--color-text-secondary)]">
          Map your dependency ecosystem, estimate downstream-impact under a modeled compromise, and simulate mitigation
          before it matters.
        </p>

        <form onSubmit={handleSubmit} className="text-left">
          <label className="mb-1.5 block text-[11px] font-mono uppercase tracking-wider text-[var(--color-text-muted)]">
            GitHub Repository
          </label>
          <div className="flex items-center gap-2">
            <div className="flex flex-1 items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-panel)] px-3.5 py-3 transition-colors focus-within:border-[var(--color-brand)]">
              <span className="mr-1.5 select-none font-mono text-sm text-[var(--color-text-muted)]">github.com/</span>
              <input
                value={url.replace(/^https?:\/\/(www\.)?github\.com\//i, "")}
                onChange={(e) => setUrl(`https://github.com/${e.target.value}`)}
                placeholder="user/project"
                className="w-full bg-transparent font-mono text-sm text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)]"
              />
            </div>
          </div>
          {displayedError && <p className="mt-2 text-xs text-[var(--color-risk-high)]">{displayedError}</p>}

          <button
            type="submit"
            className="mt-4 w-full rounded-lg bg-[var(--color-brand)] py-3 font-mono text-sm font-semibold uppercase tracking-wider text-[#03151a] shadow-[0_0_24px_var(--color-brand-glow)] transition-transform hover:scale-[1.01] active:scale-[0.99]"
          >
            Analyze Repository
          </button>
        </form>

        <button
          onClick={handleDemo}
          className="mt-4 text-xs text-[var(--color-text-muted)] underline decoration-dotted underline-offset-4 hover:text-[var(--color-brand)]"
        >
          Or try the demo repository →
        </button>
      </div>
    </div>
  );
}
