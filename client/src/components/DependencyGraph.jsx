import { useEffect, useRef } from "react";
import cytoscape from "cytoscape";
import dagre from "cytoscape-dagre";

cytoscape.use(dagre);

const RISK_COLOR = {
  LOW: "#34d399",
  MEDIUM: "#fbbf24",
  HIGH: "#f87171",
};

function buildElements(packages, edges) {
  const nodes = Object.values(packages).map((pkg) => ({
    data: {
      id: pkg.id,
      label: pkg.kind === "app" ? pkg.name : `${pkg.name}\n@${pkg.version}`,
      kind: pkg.kind,
      risk: pkg.riskProfile?.label ?? null,
      isCritical: !!pkg.isCritical,
    },
  }));

  const edgeEls = edges.map((e) => ({
    data: { id: `${e.source}->${e.target}`, source: e.source, target: e.target },
  }));

  return [...nodes, ...edgeEls];
}

const STYLE = [
  {
    selector: "node",
    style: {
      shape: "round-rectangle",
      "background-color": "#161c29",
      "border-width": 2,
      "border-color": "#232b3a",
      label: "data(label)",
      color: "#8b95a8",
      "font-size": 10,
      "font-family": "JetBrains Mono, monospace",
      "text-wrap": "wrap",
      "text-valign": "center",
      "text-halign": "center",
      "text-margin-y": 0,
      width: 118,
      height: 44,
      "transition-property": "background-color, border-color, border-width, box-shadow, opacity",
      "transition-duration": 180,
    },
  },
  {
    selector: 'node[kind = "app"]',
    style: {
      shape: "round-hexagon",
      "background-color": "#0e1522",
      "border-color": "#22d3ee",
      "border-width": 2.5,
      color: "#e6eaf2",
      "font-weight": 600,
      width: 140,
      height: 56,
    },
  },
  {
    selector: 'node[risk = "LOW"]',
    style: { "border-color": RISK_COLOR.LOW, color: "#c9f5e3" },
  },
  {
    selector: 'node[risk = "MEDIUM"]',
    style: { "border-color": RISK_COLOR.MEDIUM, color: "#fde7b3" },
  },
  {
    selector: 'node[risk = "HIGH"]',
    style: { "border-color": RISK_COLOR.HIGH, "border-width": 2.5, color: "#fbd0d0" },
  },
  {
    selector: "node[?isCritical]",
    style: {
      "border-width": 3,
      "border-style": "double",
    },
  },
  {
    selector: "node.selected",
    style: {
      "border-width": 3.5,
      "box-shadow": "0 0 0 4px rgba(34, 211, 238, 0.25)",
      "background-color": "#1c2331",
    },
  },
  {
    selector: "node.compromised",
    style: {
      "background-color": "#3a1414",
      "border-color": "#ef4444",
      "border-width": 4,
      color: "#ffffff",
    },
  },
  {
    selector: "node.affected",
    style: {
      "background-color": "#2a1717",
      "border-color": "#f87171",
    },
  },
  {
    selector: "node.dimmed",
    style: { opacity: 0.25 },
  },
  {
    selector: "edge",
    style: {
      width: 1.6,
      "line-color": "#2e3648",
      "target-arrow-color": "#2e3648",
      "target-arrow-shape": "triangle",
      "curve-style": "bezier",
      "arrow-scale": 0.9,
    },
  },
  {
    selector: "edge.propagation",
    style: {
      "line-color": "#f87171",
      "target-arrow-color": "#f87171",
      width: 2.4,
    },
  },
  {
    selector: "edge.dimmed",
    style: { opacity: 0.15 },
  },
];

export default function DependencyGraph({ packages, edges, selectedId, onSelect, simulation }) {
  const containerRef = useRef(null);
  const cyRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const cy = cytoscape({
      container: containerRef.current,
      elements: buildElements(packages, edges),
      style: STYLE,
      layout: { name: "dagre", rankDir: "TB", nodeSep: 28, rankSep: 70, animate: false },
      minZoom: 0.3,
      maxZoom: 2.5,
      wheelSensitivity: 0.25,
    });
    cy.on("tap", "node", (evt) => onSelect(evt.target.id()));
    cy.on("tap", (evt) => {
      if (evt.target === cy) onSelect(null);
    });
    cyRef.current = cy;

    const resizeObserver = new ResizeObserver(() => {
      cy.resize();
      cy.fit(undefined, 40);
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      cy.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packages, edges]);

  // selection highlight
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.nodes().removeClass("selected");
    if (selectedId) cy.getElementById(selectedId).addClass("selected");
  }, [selectedId]);

  // simulation highlight
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.elements().removeClass("compromised affected dimmed propagation");

    if (!simulation?.active) return;

    const { compromisedId, affectedIds } = simulation;
    const highlighted = new Set([compromisedId, ...affectedIds]);

    cy.nodes().forEach((n) => {
      if (n.id() === compromisedId) n.addClass("compromised");
      else if (affectedIds.has(n.id())) n.addClass("affected");
      else n.addClass("dimmed");
    });

    cy.edges().forEach((e) => {
      const sourceHit = highlighted.has(e.data("source"));
      const targetHit = highlighted.has(e.data("target"));
      if (sourceHit && targetHit) e.addClass("propagation");
      else e.addClass("dimmed");
    });
  }, [simulation]);

  const fit = () => cyRef.current?.fit(undefined, 40);
  const zoomIn = () => cyRef.current?.zoom(cyRef.current.zoom() * 1.25);
  const zoomOut = () => cyRef.current?.zoom(cyRef.current.zoom() * 0.8);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      <div className="absolute bottom-3 right-3 flex gap-1.5">
        <button
          onClick={zoomOut}
          className="h-8 w-8 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-brand)] transition-colors"
          title="Zoom out"
        >
          −
        </button>
        <button
          onClick={zoomIn}
          className="h-8 w-8 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-brand)] transition-colors"
          title="Zoom in"
        >
          +
        </button>
        <button
          onClick={fit}
          className="h-8 px-2.5 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elevated)] text-[10px] font-mono uppercase tracking-wide text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-brand)] transition-colors"
          title="Fit to screen"
        >
          Fit
        </button>
      </div>
    </div>
  );
}
