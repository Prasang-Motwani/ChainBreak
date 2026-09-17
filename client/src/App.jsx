import { useState } from "react";
import RepositoryInput from "./components/RepositoryInput";
import AnalysisLoader from "./components/AnalysisLoader";
import Dashboard from "./components/Dashboard";
import { analyzeRepository, getDemoRepository } from "./services/api";

// App states: "input" -> "analyzing" -> "dashboard"
export default function App() {
  const [stage, setStage] = useState("input");
  const [repoUrl, setRepoUrl] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [analysisError, setAnalysisError] = useState("");

  const handleAnalyze = async (url) => {
    setRepoUrl(url);
    setAnalysisError("");
    setStage("analyzing");

    try {
      // Real analysis can take anywhere from ~400ms (mock fallback) to 10+
      // seconds (real GitHub/OSV/npm/Scorecard lookups) -- so the loader is
      // driven by this promise resolving, not a fixed animation length. The
      // minimum delay just keeps fast (mock) responses from flashing by.
      const minDisplay = new Promise((resolve) => setTimeout(resolve, 1800));
      const [data] = await Promise.all([analyzeRepository(url), minDisplay]);

      const packagesById = Object.fromEntries(data.packages.map((p) => [p.id, p]));
      setAnalysis({ repository: data.repository, packages: packagesById, edges: data.edges });
      setStage("dashboard");
    } catch (err) {
      // AnalysisError means the backend gave a real, specific answer about
      // this repo (unsupported/not found/no dependencies) -- surface it
      // rather than silently substituting unrelated demo data. Any other
      // error is unexpected; still never leave the user stuck loading.
      setAnalysisError(err.message || "Analysis failed unexpectedly.");
      setStage("input");
    }
  };

  const handleDemo = async () => {
    setRepoUrl("https://github.com/acme/checkout-service");
    setAnalysisError("");
    setStage("analyzing");

    // Never touches the network -- this is a fictitious repo that exists
    // purely to showcase the product with a curated dependency graph.
    const minDisplay = new Promise((resolve) => setTimeout(resolve, 1800));
    const [data] = await Promise.all([getDemoRepository(), minDisplay]);

    const packagesById = Object.fromEntries(data.packages.map((p) => [p.id, p]));
    setAnalysis({ repository: data.repository, packages: packagesById, edges: data.edges });
    setStage("dashboard");
  };

  const handleReset = () => {
    setStage("input");
    setAnalysis(null);
    setRepoUrl("");
  };

  if (stage === "input") return <RepositoryInput onAnalyze={handleAnalyze} onDemo={handleDemo} serverError={analysisError} />;
  if (stage === "analyzing") return <AnalysisLoader repoUrl={repoUrl} />;

  return (
    <Dashboard
      repository={analysis.repository}
      packages={analysis.packages}
      edges={analysis.edges}
      onReset={handleReset}
    />
  );
}
