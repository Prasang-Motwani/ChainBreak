import { useState } from "react";
import RepositoryInput from "./components/RepositoryInput";
import AnalysisLoader from "./components/AnalysisLoader";
import Dashboard from "./components/Dashboard";
import { analyzeRepository } from "./services/api";

// App states: "input" -> "analyzing" -> "dashboard"
export default function App() {
  const [stage, setStage] = useState("input");
  const [repoUrl, setRepoUrl] = useState("");
  const [analysis, setAnalysis] = useState(null);

  const handleAnalyze = async (url) => {
    setRepoUrl(url);
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
      // analyzeRepository() is expected to fall back to mock data rather
      // than throw, but never leave the user stuck on the loading screen
      // if that contract is ever violated.
      console.error("Analysis failed unexpectedly:", err);
      setStage("input");
    }
  };

  const handleReset = () => {
    setStage("input");
    setAnalysis(null);
    setRepoUrl("");
  };

  if (stage === "input") return <RepositoryInput onAnalyze={handleAnalyze} />;
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
