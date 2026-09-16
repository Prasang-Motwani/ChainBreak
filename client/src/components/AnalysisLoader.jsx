import { useEffect, useState } from "react";
import { getAnalysisSteps } from "../services/api";

const STEPS = getAnalysisSteps();
const STEP_DURATION = 550;

// Purely visual: cycles through the steps for as long as the parent keeps
// this mounted. The real backend call can take anywhere from ~400ms (mock
// fallback) to 10+ seconds (real GitHub/OSV/npm/Scorecard lookups), so this
// component has no opinion on when analysis is "done" -- App.jsx unmounts
// it once the actual data arrives, holding on the last step in the
// meantime rather than racing ahead on a fixed timer.
export default function AnalysisLoader({ repoUrl }) {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (activeStep >= STEPS.length - 1) return;
    const t = setTimeout(() => setActiveStep((s) => s + 1), STEP_DURATION);
    return () => clearTimeout(t);
  }, [activeStep]);

  return (
    <div className="bg-grid flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-md">
        <p className="mb-6 text-center font-mono text-xs text-[var(--color-text-muted)]">
          {repoUrl.replace(/^https?:\/\//, "")}
        </p>

        <div className="space-y-3">
          {STEPS.map((step, i) => {
            const done = i < activeStep;
            const active = i === activeStep;
            return (
              <div key={step} className="flex items-center gap-3">
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] ${
                    done
                      ? "border-[var(--color-brand)] bg-[var(--color-brand)] text-[#03151a]"
                      : active
                        ? "border-[var(--color-brand)] text-[var(--color-brand)]"
                        : "border-[var(--color-border)] text-transparent"
                  }`}
                >
                  {done ? "✓" : active ? "" : ""}
                  {active && (
                    <span className="block h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-brand)]" />
                  )}
                </span>
                <span
                  className={`font-mono text-sm transition-colors ${
                    done
                      ? "text-[var(--color-text-secondary)]"
                      : active
                        ? "text-[var(--color-text-primary)]"
                        : "text-[var(--color-text-muted)]"
                  }`}
                >
                  {step}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-8 h-1 w-full overflow-hidden rounded-full bg-[var(--color-bg-hover)]">
          <div
            className="h-full rounded-full bg-[var(--color-brand)] transition-all duration-500 ease-out"
            style={{ width: `${Math.min(100, ((activeStep + 1) / STEPS.length) * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
