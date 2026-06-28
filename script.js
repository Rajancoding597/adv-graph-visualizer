/* =========================================================
   GraphViz Lab — Mobile Friendly
   ========================================================= */
const $ = (id) => document.getElementById(id);
const svg = d3.select("#graph");
const width = () => svg.node().clientWidth;
const height = () => svg.node().clientHeight;
const isMobile = () => window.innerWidth <= 768;

let state = {
  nodes: [],
  edges: [],
  directed: false,
  weighted: false,
  showLabels: true,
  showWeights: true,
  base: 0,
  simulation: null,
  zoom: null,
  gLinks: null,
  gNodes: null,
  gLabels: null,
  gWeights: null,
  layout: "force",
  algoRunning: false,
  algoPaused: false,
  algoStepMode: false,
  algoStepResolve: null,
  currentTransform: d3.zoomIdentity,
};

function setupMobileNav() {
  const items = document.querySelectorAll('.mobile-nav-item');
  items.forEach(item => {
    item.addEventListener('click', () => {
      const panel = item.dataset.panel;
      items.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      switchMobilePanel(panel);
    });
  });
}

function switchMobilePanel(panel) {
  if (!isMobile()) return;

  const panelInput = $('panelInput');
  const panelGraph = $('panelGraph');
  const panelStats = $('panelStats');

  panelInput.classList.add('mobile-hidden');
  panelGraph.classList.add('mobile-hidden');
  panelStats.classList.add('mobile-hidden');

  if (panel === 'input') {
    panelInput.classList.remove('mobile-hidden');
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelector('[data-tab="input"]').classList.add('active');
    ['input','algo','examples'].forEach(n => {
      $('tab-'+n).classList.toggle('hidden', n !== 'input');
    });
  } else if (panel === 'graph') {
    panelGraph.classList.remove('mobile-hidden');
    setTimeout(fitView, 100);
  } else if (panel === 'algo') {
    panelInput.classList.remove('mobile-hidden');
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelector('[data-tab="algo"]').classList.add('active');
    ['input','algo','examples'].forEach(n => {
      $('tab-'+n).classList.toggle('hidden', n !== 'algo');
    });
  } else if (panel === 'stats') {
    panelStats.classList.remove('mobile-hidden');
  }
}

setupMobileNav();

function toast(msg, type="info") {
  const t = $("toast");
  t.textContent = msg;
  t.style.borderColor = type === "error" ? "#f87171" : type === "success" ? "#34d399" : "#1f2937";
  t.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove("show"), 2200);
}

document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    ["input", "algo", "examples"].forEach(n => {
      $("tab-" + n).classList.toggle("hidden", n !== tab.dataset.tab);
    });
  });
});

$("helpBtn").addEventListener("click", () => {
  $("helpModal").classList.remove("hidden");
  $("helpModal").classList.add("flex");
});
$("closeHelp").addEventListener("click", () => {
  $("helpModal").classList.add("hidden");
  $("helpModal").classList.remove("flex");
});
$("helpModal").addEventListener("click", (e) => {
  if (e.target === $("helpModal")) {
    $("helpModal").classList.add("hidden");
    $("helpModal").classList.remove("flex");
  }
});

$("helpToggle").addEventListener("click", () => {
  const h = $("inputHelp");
  const icon = $("helpToggleIcon");
  h.classList.toggle("hidden");
  icon.textContent = h.classList.contains("hidden") ? "▶" : "▼";
});

const ALGORITHMS = [
  { cat: "Traversal", value: "bfs", name: "Breadth-First Search", badge: "popular", desc: "Explores neighbors level by level using a queue. Finds shortest path in unweighted graphs.", complexity: "O(V + E)", needs: ["start"], directed: "both", weighted: "both" },
  { cat: "Traversal", value: "dfs", name: "Depth-First Search", badge: "popular", desc: "Explores as deep as possible before backtracking. Uses a stack (recursion).", complexity: "O(V + E)", needs: ["start"], directed: "both", weighted: "both" },
  { cat: "Shortest Path", value: "dijkstra", name: "Dijkstra's Algorithm", badge: "popular", desc: "Finds shortest path from source to all nodes. Requires non-negative weights.", complexity: "O((V+E) log V)", needs: ["start", "end"], directed: "both", weighted: "yes" },
  { cat: "Shortest Path", value: "bellman", name: "Bellman-Ford", badge: "new", desc: "Handles negative weights. Detects negative cycles. Slower than Dijkstra.", complexity: "O(V · E)", needs: ["start", "end"], directed: "both", weighted: "yes" },
  { cat: "Shortest Path", value: "astar", name: "A* Search", badge: "new", desc: "Heuristic-guided search. Uses BFS distance as heuristic (admissible).", complexity: "O(E log V)", needs: ["start", "end"], directed: "both", weighted: "yes" },
  { cat: "Shortest Path", value: "floyd", name: "Floyd-Warshall (All-Pairs)", badge: "new", desc: "Computes shortest paths between ALL pairs of nodes. Great for dense graphs.", complexity: "O(V³)", needs: [], directed: "both", weighted: "yes" },
  { cat: "MST", value: "prim", name: "Prim's Algorithm", badge: "popular", desc: "Builds Minimum Spanning Tree by growing from a starting node.", complexity: "O(E log V)", needs: ["start"], directed: "no", weighted: "yes" },
  { cat: "MST", value: "kruskal", name: "Kruskal's Algorithm", badge: "popular", desc: "Builds MST by sorting edges and using Union-Find.", complexity: "O(E log E)", needs: [], directed: "no", weighted: "yes" },
  { cat: "Topological", value: "topo_kahn", name: "Topological Sort (Kahn's)", badge: "new", desc: "BFS-based topological ordering using in-degrees. Detects cycles in DAGs.", complexity: "O(V + E)", needs: [], directed: "yes", weighted: "both" },
  { cat: "Topological", value: "topo_dfs", name: "Topological Sort (DFS)", badge: "new", desc: "DFS-based topological ordering using finish times.", complexity: "O(V + E)", needs: [], directed: "yes", weighted: "both" },
  { cat: "Advanced", value: "scc", name: "Strongly Connected Components", badge: "new", desc: "Kosaraju's algorithm finds all SCCs in a directed graph.", complexity: "O(V + E)", needs: [], directed: "yes", weighted: "both" },
  { cat: "Advanced", value: "bridges", name: "Find Bridges", badge: "new", desc: "Finds all bridge edges whose removal disconnects the graph.", complexity: "O(V + E)", needs: [], directed: "no", weighted: "both" },
  { cat: "Advanced", value: "bipartite_check", name: "Bipartite Check", badge: "new", desc: "Checks if the graph is 2-colorable (bipartite) using BFS coloring.", complexity: "O(V + E)", needs: [], directed: "no", weighted: "both" },
];

function populateAlgoSelect() {
  const sel = $("algo");
  sel.innerHTML = "";
  let lastCat = "";
  ALGORITHMS.forEach(a => {
    if (a.cat !== lastCat) {
      const og = document.createElement("optgroup");
      og.label = a.cat;
      sel.appendChild(og);
      lastCat = a.cat;
    }
    const opt = document.createElement("option");
    opt.value = a.value;
    opt.textContent = a.name + (a.badge === "new" ? " ✨" : a.badge === "popular" ? " ⭐" : "");
    sel.lastElementChild.appendChild(opt);
  });
  updateAlgoInfo();
}

function updateAlgoInfo() {
  const a = ALGORITHMS.find(x => x.value === $("algo").value);
  if (!a) return;
  const needsStr = a.needs.length ? a.needs.map(n => n === "start" ? "Start node" : n === "end" ? "End node" : n).join(", ") : "None";
  $("algoInfo").innerHTML = `
    <div class="mb-1"><strong>${a.name}</strong></div>
    <div class="text-[11px] mb-2">${a.desc}</div>
    <div class="flex flex-wrap gap-3 text-[11px]">
      <span>⏱ <strong>${a.complexity}</strong></span>
      <span>🎯 Needs: ${needsStr}</span>
    </div>
  `;
  $("endNodeWrap").style.display = a.needs.includes("end") ? "" : "none";
}

populateAlgoSelect();
$("algo").addEventListener("change", updateAlgoInfo);

const EXAMPLES = [
  { cat: "Basic", name: "Two connected nodes", fmt: "edges", base: 0, data: "[[0,1]]", directed: false, weighted: false },
  { cat: "Basic", name: "Triangle", fmt: "edges", base: 0, data: "[[0,1],[1,2],[2,0]]", directed: false, weighted: false },
  { cat: "Basic", name: "Square cycle", fmt: "edges", base: 0, data: "[[0,1],[1,2],[2,3],[3,0]]", directed: false, weighted: false },
  { cat: "LeetCode", name: "Binary Tree (LC 102)", fmt: "adjacency", base: 0, data: "[[1,2],[3,4],[],[],[]]", directed: true, weighted: false },
  { cat: "LeetCode", name: "LC 200 — Number of Islands", fmt: "edges", base: 0, data: "[[0,1],[0,3],[1,2],[1,4],[2,5],[3,4],[4,5],[4,7],[5,8],[6,7],[7,8]]", directed: false, weighted: false },
  { cat: "LeetCode", name: "LC 207 — Course Schedule", fmt: "adjacency", base: 0, data: "[[1],[2],[3,0],[]]", directed: true, weighted: false },
  { cat: "LeetCode", name: "LC 743 — Network Delay", fmt: "weighted", base: 0, data: "[[0,1,4],[0,2,1],[2,1,2],[1,3,1],[2,3,5]]", directed: true, weighted: true },
  { cat: "LeetCode", name: "LC 787 — Cheapest Flights", fmt: "weighted", base: 0, data: "[[0,1,100],[1,2,100],[0,2,500],[2,3,100],[1,3,200]]", directed: true, weighted: true },
  { cat: "LeetCode", name: "LC 1584 — Min Cost to Connect", fmt: "weighted", base: 0, data: "[[0,1,1],[0,2,2],[1,2,3],[1,3,4],[2,3,5],[2,4,6],[3,4,7]]", directed: false, weighted: true },
  { cat: "Classic", name: "Complete graph K5", fmt: "edges", base: 0, data: "[[0,1],[0,2],[0,3],[0,4],[1,2],[1,3],[1,4],[2,3],[2,4],[3,4]]", directed: false, weighted: false },
  { cat: "Classic", name: "Petersen graph", fmt: "edges", base: 0, data: "[[0,1],[1,2],[2,3],[3,4],[4,0],[0,5],[1,6],[2,7],[3,8],[4,9],[5,7],[7,9],[9,6],[6,8],[8,5]]", directed: false, weighted: false },
  { cat: "Classic", name: "Bipartite graph", fmt: "edges", base: 0, data: "[[0,2],[0,3],[1,2],[1,3],[2,4],[3,4]]", directed: false, weighted: false },
  { cat: "Classic", name: "Adjacency Matrix (4x4)", fmt: "matrix", base: 0, data: "[[0,1,0,1],[1,0,1,0],[0,1,0,1],[1,0,1,0]]", directed: false, weighted: false },
  { cat: "Classic", name: "Text format", fmt: "text", base: 0, data: "0-1\n1-2\n2-3\n3-0\n2-4", directed: false, weighted: false },
  { cat: "1-based", name: "1-based example", fmt: "edges", base: 1, data: "[[1,2],[2,3],[3,4],[4,1],[1,3]]", directed: false, weighted: false },
  { cat: "1-based", name: "1-based weighted", fmt: "weighted", base: 1, data: "[[1,2,4],[1,3,1],[3,2,2],[2,4,1],[3,4,5]]", directed: true, weighted: true },
];

function renderExamples() {
  const c = $("examples"); c.innerHTML = "";
  let lastCat = "";
  EXAMPLES.forEach(ex => {
    if (ex.cat !== lastCat) {
      const catDiv = document.createElement("div");
      catDiv.className = "algo-category";
      catDiv.textContent = ex.cat;
      c.appendChild(catDiv);
      lastCat = ex.cat;
    }
    const el = document.createElement("div");
    el.className = "example-card";
    el.innerHTML = `<div class="text-sm font-semibold">${ex.name}</div><div class="mono text-[11px] text-slate-400 mt-1 truncate">${ex.data}</div>`;
    el.addEventListener("click", () => {
      $("format").value = ex.fmt;
      $("base").value = String(ex.base);
      $("input").value = ex.data;
      $("directed").checked = ex.directed;
      $("weighted").checked = ex.weighted;
      render();
      toast("Loaded: " + ex.name, "success");
      if (isMobile()) {
        document.querySelectorAll('.mobile-nav-item').forEach(i => i.classList.remove('active'));
        document.querySelector('[data-panel="graph"]').classList.add('active');
        switchMobilePanel('graph');
      }
    });
    c.appendChild(el);
  });
}
renderExamples();

function safeEval(str) {
  str = str.trim();
  return Function('"use strict";return (' + str + ')')();
}

function detectFormat(str) {
  str = str.trim();
  if (!str) return null;
  if (str.startsWith("[")) {
    try {
      const v = safeEval(str);
      if (!Array.isArray(v) || v.length === 0) return null;
      if (Array.isArray(v[0])) {
        if (v.length === v[0].length && v.every(r => r.length === v.length)) return "matrix";
        if (v[0].length === 3 && v.every(r => r.length === 3 && typeof r[2] === "number")) return "weighted";
        return "edges";
      }
      return null;
    } catch { return null; }
  }
  return "text";
}

function parseInput(str) {
  str = str.trim();
  if (!str) return { nodes: [], edges: [] };

  const base = +$("base").value;
  let fmt = $("format").value;
  if (fmt === "auto") fmt = detectFormat(str) || "edges";

  const directed = $("directed").checked;
  const weighted = $("weighted").checked;

  let nodeSet = new Set();
  let edges = [];

  if (fmt === "matrix") {
    const m = safeEval(str);
    const n = m.length;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      if (m[i][j]) {
        const u = i + base, v = j + base;
        const w = (typeof m[i][j] === "number" && m[i][j] !== 1) ? m[i][j] : null;
        if (!directed && j < i) continue;
        edges.push({ source: u, target: v, weight: w });
        nodeSet.add(u); nodeSet.add(v);
      }
    }
  } else if (fmt === "adjacency") {
    const adj = safeEval(str);
    adj.forEach((neighbors, i) => {
      const u = i + base;
      nodeSet.add(u);
      (neighbors || []).forEach(v => {
        const vv = v + base;
        if (!directed && vv < u) return;
        edges.push({ source: u, target: vv });
        nodeSet.add(vv);
      });
    });
  } else if (fmt === "edges" || fmt === "weighted") {
    const arr = safeEval(str);
    arr.forEach(e => {
      const [u, v, w] = e;
      edges.push({ source: u, target: v, weight: (fmt === "weighted" || weighted) ? (w ?? 1) : null });
      nodeSet.add(u); nodeSet.add(v);
    });
  } else if (fmt === "text") {
    str.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean).forEach(line => {
      const m = line.match(/(-?\d+)\s*(?:->|→|-+|→)\s*(-?\d+)(?:\s*[:=]\s*(-?\d+(?:\.\d+)?))?/);
      if (!m) throw new Error("Bad line: " + line);
      const u = +m[1], v = +m[2], w = m[3] != null ? +m[3] : null;
      edges.push({ source: u, target: v, weight: w });
      nodeSet.add(u); nodeSet.add(v);
    });
  }

  const ids = [...nodeSet].sort((a, b) => a - b);
  const nodes = ids.map(id => ({ id, label: String(id) }));
  return { nodes, edges, weighted: edges.some(e => e.weight != null) };
}

function render() {
  const raw = $("input").value;
  try {
    const { nodes, edges, weighted } = parseInput(raw);
    state.nodes = nodes;
    state.edges = edges;
    state.directed = $("directed").checked;
    state.weighted = weighted || $("weighted").checked;
    $("weighted").checked = state.weighted;
    state.base = +$("base").value;
    drawGraph();
    updateStats();
    updateProperties();
    updateAdjList();
    $("parseStatus").innerHTML = `<span class="text-emerald-400">✓ Parsed ${nodes.length} nodes, ${edges.length} edges (${state.base}-based)</span>`;
    $("baseChip").textContent = "Base: " + state.base;
    setTimeout(() => fitView(), 100);
  } catch (err) {
    console.error(err);
    $("parseStatus").innerHTML = `<span class="text-rose-400">✗ ${err.message}</span>`;
    toast("Parse error: " + err.message, "error");
  }
}

function drawGraph() {
  svg.selectAll("*").remove();

  const g = svg.append("g");
  const zoom = d3.zoom().scaleExtent([0.1, 6]).on("zoom", (e) => {
    g.attr("transform", e.transform);
    state.currentTransform = e.transform;
    updateMinimap();
  });
  svg.call(zoom);
  state.zoom = zoom;
  state.gRoot = g;

  const defs = svg.append("defs");
  defs.append("marker").attr("id", "arrow").attr("viewBox", "0 -5 10 10").attr("refX", 22).attr("refY", 0).attr("markerWidth", 8).attr("markerHeight", 8).attr("orient", "auto").append("path").attr("d", "M0,-5L10,0L0,5").attr("fill", "#64748b");
  defs.append("marker").attr("id", "arrow-active").attr("viewBox", "0 -5 10 10").attr("refX", 22).attr("refY", 0).attr("markerWidth", 8).attr("markerHeight", 8).attr("orient", "auto").append("path").attr("d", "M0,-5L10,0L0,5").attr("fill", "#22d3ee");
  defs.append("marker").attr("id", "arrow-path").attr("viewBox", "0 -5 10 10").attr("refX", 22).attr("refY", 0).attr("markerWidth", 8).attr("markerHeight", 8).attr("orient", "auto").append("path").attr("d", "M0,-5L10,0L0,5").attr("fill", "#a78bfa");

  const linkGroup = g.append("g").attr("class", "links");
  const weightGroup = g.append("g").attr("class", "weights");
  const nodeGroup = g.append("g").attr("class", "nodes");
  const labelGroup = g.append("g").attr("class", "labels");

  const links = linkGroup.selectAll("line")
    .data(state.edges).enter().append("line")
    .attr("class", "link")
    .attr("stroke", "#475569").attr("stroke-width", 1.6)
    .attr("marker-end", state.directed ? "url(#arrow)" : null);

  const weights = weightGroup.selectAll("text")
    .data(state.edges.filter(e => e.weight != null)).enter().append("text")
    .attr("class", "mono").attr("fill", "#94a3b8").attr("font-size", 11)
    .attr("text-anchor", "middle").attr("dy", -6)
    .text(d => d.weight);

  const nodes = nodeGroup.selectAll("g")
    .data(state.nodes, d => d.id).enter().append("g")
    .attr("class", "node").call(d3.drag().on("start", dragStart).on("drag", dragged).on("end", dragEnd));

  nodes.append("circle")
    .attr("r", 16)
    .attr("fill", "#0b1220")
    .attr("stroke", "#22d3ee")
    .attr("stroke-width", 2);

  const labels = labelGroup.selectAll("text")
    .data(state.nodes, d => d.id).enter().append("text")
    .attr("class", "mono").attr("fill", "#e5e7eb").attr("font-size", 12).attr("font-weight", "600")
    .attr("text-anchor", "middle").attr("dy", 4)
    .text(d => d.label);

  state.gLinks = links;
  state.gNodes = nodes;
  state.gLabels = labels;
  state.gWeights = weights;

  nodes.on("mouseover touchstart", (e, d) => {
    e.preventDefault();
    const t = $("tooltip");
    const degIn = state.edges.filter(x => (typeof x.target === "object" ? x.target.id : x.target) === d.id).length;
    const degOut = state.edges.filter(x => (typeof x.source === "object" ? x.source.id : x.source) === d.id).length;
    t.innerHTML = `node <b>${d.id}</b> · in ${degIn} · out ${degOut}`;
    t.classList.remove("hidden");
    const rect = svg.node().getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    t.style.left = (clientX - rect.left + 12) + "px";
    t.style.top = (clientY - rect.top + 12) + "px";
  }).on("mousemove", (e) => {
    const t = $("tooltip");
    const rect = svg.node().getBoundingClientRect();
    t.style.left = (e.clientX - rect.left + 12) + "px";
    t.style.top = (e.clientY - rect.top + 12) + "px";
  }).on("mouseout touchend", () => $("tooltip").classList.add("hidden"));

  applyLayout();
  updateMinimap();
}

function applyLayout() {
  if (state.simulation) state.simulation.stop();

  const W = width(), H = height();

  if (state.layout === "force") {
    const sim = d3.forceSimulation(state.nodes)
      .force("link", d3.forceLink(state.edges).id(d => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-350))
      .force("center", d3.forceCenter(W / 2, H / 2))
      .force("collide", d3.forceCollide(32))
      .on("tick", () => { ticked(); updateMinimap(); })
      .on("end", () => { fitView(); });
    state.simulation = sim;
  } else if (state.layout === "circle") {
    const r = Math.min(W, H) / 2 - 100;
    state.nodes.forEach((n, i) => {
      const a = (i / state.nodes.length) * Math.PI * 2 - Math.PI / 2;
      n.x = W / 2 + r * Math.cos(a);
      n.y = H / 2 + r * Math.sin(a);
    });
    ticked();
  } else if (state.layout === "grid") {
    const cols = Math.ceil(Math.sqrt(state.nodes.length));
    const gap = 80;
    const ox = W / 2 - (cols - 1) * gap / 2;
    const oy = H / 2 - (Math.ceil(state.nodes.length / cols) - 1) * gap / 2;
    state.nodes.forEach((n, i) => {
      n.x = ox + (i % cols) * gap;
      n.y = oy + Math.floor(i / cols) * gap;
    });
    ticked();
  } else if (state.layout === "radial") {
    const adj = buildAdj(false);
    const start = state.nodes[0]?.id;
    const layer = new Map(); const q = [start]; layer.set(start, 0);
    while (q.length) {
      const u = q.shift();
      (adj.get(u) || []).forEach(v => {
        if (!layer.has(v.to)) { layer.set(v.to, layer.get(u) + 1); q.push(v.to); }
      });
    }
    state.nodes.forEach(n => { if (!layer.has(n.id)) layer.set(n.id, 0); });
    const maxL = Math.max(0, ...[...layer.values()]);
    const byLayer = new Map();
    state.nodes.forEach(n => {
      const l = layer.get(n.id);
      if (!byLayer.has(l)) byLayer.set(l, []);
      byLayer.get(l).push(n);
    });
    byLayer.forEach((arr, l) => {
      const r = l === 0 ? 0 : (l / (maxL || 1)) * (Math.min(W, H) / 2 - 80);
      arr.forEach((n, i) => {
        const a = (i / arr.length) * Math.PI * 2 - Math.PI / 2;
        n.x = W / 2 + r * Math.cos(a);
        n.y = H / 2 + r * Math.sin(a);
      });
    });
    ticked();
  } else if (state.layout === "hierarchical") {
    const adj = buildAdj(false);
    const start = state.nodes[0]?.id;
    const layer = new Map(); const q = [start]; layer.set(start, 0);
    while (q.length) {
      const u = q.shift();
      (adj.get(u) || []).forEach(v => {
        if (!layer.has(v.to)) { layer.set(v.to, layer.get(u) + 1); q.push(v.to); }
      });
    }
    state.nodes.forEach(n => { if (!layer.has(n.id)) layer.set(n.id, 0); });
    const maxL = Math.max(0, ...[...layer.values()]);
    const byLayer = new Map();
    state.nodes.forEach(n => {
      const l = layer.get(n.id);
      if (!byLayer.has(l)) byLayer.set(l, []);
      byLayer.get(l).push(n);
    });
    const vGap = Math.min(100, (H - 100) / (maxL + 1));
    byLayer.forEach((arr, l) => {
      const hGap = Math.min(100, (W - 100) / (arr.length));
      const startX = W / 2 - (arr.length - 1) * hGap / 2;
      arr.forEach((n, i) => {
        n.x = startX + i * hGap;
        n.y = 80 + l * vGap;
      });
    });
    ticked();
  } else if (state.layout === "tree") {
    const adj = buildAdj(false);
    const start = state.nodes[0]?.id;
    const layer = new Map(); const q = [start]; layer.set(start, 0);
    while (q.length) {
      const u = q.shift();
      (adj.get(u) || []).forEach(v => {
        if (!layer.has(v.to)) { layer.set(v.to, layer.get(u) + 1); q.push(v.to); }
      });
    }
    state.nodes.forEach(n => { if (!layer.has(n.id)) layer.set(n.id, 0); });
    const maxL = Math.max(0, ...[...layer.values()]);
    const byLayer = new Map();
    state.nodes.forEach(n => {
      const l = layer.get(n.id);
      if (!byLayer.has(l)) byLayer.set(l, []);
      byLayer.get(l).push(n);
    });
    const vGap = Math.min(100, (H - 100) / (maxL + 1));
    byLayer.forEach((arr, l) => {
      const hGap = Math.min(100, (W - 100) / (arr.length));
      const startX = W / 2 - (arr.length - 1) * hGap / 2;
      arr.forEach((n, i) => {
        n.x = startX + i * hGap;
        n.y = 80 + l * vGap;
      });
    });
    ticked();
  }
  if (state.layout !== "force") {
    setTimeout(fitView, 50);
  }
}

function ticked() {
  state.gLinks.attr("x1", d => d.source.x).attr("y1", d => d.source.y).attr("x2", d => d.target.x).attr("y2", d => d.target.y);
  state.gNodes.attr("transform", d => `translate(${d.x},${d.y})`);
  state.gLabels.attr("x", d => d.x).attr("y", d => d.y);
  state.gWeights.attr("x", d => (d.source.x + d.target.x) / 2).attr("y", d => (d.source.y + d.target.y) / 2);
}

function dragStart(event, d) {
  if (state.simulation) state.simulation.alphaTarget(0.3).restart();
  d.fx = d.x; d.fy = d.y;
}
function dragged(event, d) { d.fx = event.x; d.fy = event.y; }
function dragEnd(event, d) {
  if (state.simulation) state.simulation.alphaTarget(0);
  d.fx = null; d.fy = null;
}

function fitView() {
  if (!state.nodes.length) return;
  const pad = 80;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  state.nodes.forEach(n => {
    if (n.x == null) return;
    if (n.x < minX) minX = n.x; if (n.y < minY) minY = n.y;
    if (n.x > maxX) maxX = n.x; if (n.y > maxY) maxY = n.y;
  });
  if (!isFinite(minX)) return;
  const W = width(), H = height();
  const bw = Math.max(1, maxX - minX + pad * 2), bh = Math.max(1, maxY - minY + pad * 2);
  const scale = Math.min(W / bw, H / bh, 2);
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  const t = d3.zoomIdentity.translate(W / 2, H / 2).scale(scale).translate(-cx, -cy);
  svg.transition().duration(500).call(state.zoom.transform, t);
}

function centerGraph() {
  if (!state.nodes.length) return;
  let sx = 0, sy = 0, c = 0;
  state.nodes.forEach(n => { if (n.x != null) { sx += n.x; sy += n.y; c++; } });
  if (!c) return;
  const cx = sx / c, cy = sy / c;
  const W = width(), H = height();
  const k = state.currentTransform.k || 1;
  const t = d3.zoomIdentity.translate(W / 2 - cx * k, H / 2 - cy * k).scale(k);
  svg.transition().duration(400).call(state.zoom.transform, t);
}

function updateMinimap() {
  if (isMobile()) return;
  const mm = d3.select("#minimapSvg");
  mm.selectAll("*").remove();
  if (!state.nodes.length) return;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  state.nodes.forEach(n => {
    if (n.x == null) return;
    if (n.x < minX) minX = n.x; if (n.y < minY) minY = n.y;
    if (n.x > maxX) maxX = n.x; if (n.y > maxY) maxY = n.y;
  });
  if (!isFinite(minX)) return;
  const pad = 30;
  const bw = maxX - minX + pad * 2 || 1, bh = maxY - minY + pad * 2 || 1;
  mm.attr("viewBox", `${minX - pad} ${minY - pad} ${bw} ${bh}`);

  mm.selectAll("line").data(state.edges).enter().append("line")
    .attr("x1", d => d.source.x).attr("y1", d => d.source.y).attr("x2", d => d.target.x).attr("y2", d => d.target.y)
    .attr("stroke", "#334155").attr("stroke-width", 1);

  mm.selectAll("circle").data(state.nodes).enter().append("circle")
    .attr("cx", d => d.x).attr("cy", d => d.y).attr("r", 3).attr("fill", "#22d3ee");
}

function buildAdj(directed) {
  const adj = new Map();
  state.nodes.forEach(n => adj.set(n.id, []));
  state.edges.forEach(e => {
    const s = typeof e.source === "object" ? e.source.id : e.source;
    const t = typeof e.target === "object" ? e.target.id : e.target;
    adj.get(s).push({ to: t, w: e.weight ?? 1 });
    if (!directed) adj.get(t).push({ to: s, w: e.weight ?? 1 });
  });
  return adj;
}

function updateStats() {
  $("nodeCount").textContent = "Nodes: " + state.nodes.length;
  $("edgeCount").textContent = "Edges: " + state.edges.length;
  const adj = buildAdj(false);
  const visited = new Set(); let comps = 0;
  state.nodes.forEach(n => {
    if (visited.has(n.id)) return;
    comps++;
    const q = [n.id]; visited.add(n.id);
    while (q.length) {
      const u = q.shift();
      (adj.get(u) || []).forEach(v => {
        if (!visited.has(v.to)) { visited.add(v.to); q.push(v.to); }
      });
    }
  });
  $("componentCount").textContent = "Components: " + comps;
}

function updateProperties() {
  $("pType").textContent = state.directed ? "Directed" : "Undirected";
  const adj = buildAdj(false);
  const n = state.nodes.length, m = state.edges.length;
  const maxEdges = state.directed ? n * (n - 1) : n * (n - 1) / 2;
  $("pDensity").textContent = maxEdges ? (m / maxEdges).toFixed(3) : "0";
  $("pAvgDeg").textContent = n ? (2 * m / n).toFixed(2) : "0";

  if (n === 0) { $("pConn").textContent = "—"; $("pCyclic").textContent = "—"; $("pBip").textContent = "—"; return; }
  const visited = new Set();
  const q = [state.nodes[0].id]; visited.add(state.nodes[0].id);
  while (q.length) {
    const u = q.shift();
    (adj.get(u) || []).forEach(v => { if (!visited.has(v.to)) { visited.add(v.to); q.push(v.to); } });
  }
  $("pConn").textContent = visited.size === n ? "Yes" : "No (" + visited.size + "/" + n + ")";

  let cyclic = false;
  if (!state.directed) {
    const seen = new Set();
    function dfs(u, p) {
      seen.add(u);
      for (const v of (adj.get(u) || [])) {
        if (v.to === p) continue;
        if (seen.has(v.to)) { cyclic = true; return; }
        dfs(v.to, u); if (cyclic) return;
      }
    }
    for (const nd of state.nodes) if (!seen.has(nd.id)) { dfs(nd.id, -1); if (cyclic) break; }
  } else {
    const color = new Map();
    state.nodes.forEach(n => color.set(n.id, 0));
    function dfsD(u) {
      color.set(u, 1);
      for (const v of (adj.get(u) || [])) {
        if (color.get(v.to) === 1) { cyclic = true; return; }
        if (color.get(v.to) === 0) { dfsD(v.to); if (cyclic) return; }
      }
      color.set(u, 2);
    }
    for (const nd of state.nodes) if (color.get(nd.id) === 0) { dfsD(nd.id); if (cyclic) break; }
  }
  $("pCyclic").textContent = cyclic ? "Yes" : "No";

  if (state.directed) { $("pBip").textContent = "—"; return; }
  const col = new Map(); let bip = true;
  for (const nd of state.nodes) {
    if (col.has(nd.id)) continue;
    const qq = [nd.id]; col.set(nd.id, 0);
    while (qq.length && bip) {
      const u = qq.shift();
      for (const v of (adj.get(u) || [])) {
        if (!col.has(v.to)) { col.set(v.to, 1 - col.get(u)); qq.push(v.to); }
        else if (col.get(v.to) === col.get(u)) { bip = false; break; }
      }
    }
    if (!bip) break;
  }
  $("pBip").textContent = bip ? "Yes" : "No";
}

function updateAdjList() {
  const adj = buildAdj(state.directed);
  const lines = [];
  [...adj.keys()].sort((a, b) => a - b).forEach(u => {
    const arr = adj.get(u).map(x => x.w !== 1 && x.w != null ? `${x.to}(${x.w})` : x.to);
    lines.push(`${u}: [${arr.join(", ")}]`);
  });
  $("adjList").textContent = lines.join("\n") || "(empty)";
}

function resetAlgoVisuals() {
  if (!state.gNodes) return;
  state.gNodes.select("circle")
    .attr("fill", "#0b1220").attr("stroke", "#22d3ee").attr("stroke-width", 2)
    .classed("pulse", false);
  state.gLinks.attr("stroke", "#475569").attr("stroke-width", 1.6).attr("marker-end", state.directed ? "url(#arrow)" : null);
  $("trace").innerHTML = '<div class="text-slate-500 italic">Run an algorithm to see the trace here...</div>';
}

function nodeById(id) { return state.nodes.find(n => n.id === +id); }
function highlightNode(id, color, pulse = false) {
  state.gNodes.filter(d => d.id === +id).select("circle")
    .attr("fill", color).attr("stroke", color).classed("pulse", pulse);
}
function highlightEdge(s, t, color, marker = "arrow-active") {
  state.gLinks.filter(d => {
    const a = typeof d.source === "object" ? d.source.id : d.source;
    const b = typeof d.target === "object" ? d.target.id : d.target;
    return (a === +s && b === +t) || (!state.directed && a === +t && b === +s);
  }).attr("stroke", color).attr("stroke-width", 3).attr("marker-end", state.directed ? `url(#${marker})` : null);
}

function traceLine(text, cls = "trace-info") {
  const div = document.createElement("div");
  div.className = "trace-line " + cls;
  div.textContent = text;
  $("trace").appendChild(div);
  $("trace").scrollTop = $("trace").scrollHeight;
}
function clearTrace() { $("trace").innerHTML = ""; }

function sleep(ms) {
  return new Promise(resolve => {
    const check = () => {
      if (state.algoStepMode) {
        state.algoStepResolve = resolve;
        return;
      }
      if (state.algoPaused) {
        setTimeout(check, 100);
        return;
      }
      setTimeout(resolve, ms);
    };
    check();
  });
}

async function runBFS() {
  resetAlgoVisuals();
  const start = +$("startNode").value;
  if (!nodeById(start)) { toast("Start node not in graph", "error"); return; }
  const adj = buildAdj(state.directed);
  const visited = new Set([start]);
  const queue = [start];
  const order = [];
  highlightNode(start, "#f87171", true);
  traceLine(`🚀 BFS from node ${start}`, "trace-info");
  traceLine(`Queue: [${start}]`);
  await sleep(+$("speed").value);

  while (queue.length) {
    const u = queue.shift();
    highlightNode(u, "#34d399");
    order.push(u);
    traceLine(`✓ Visit ${u} → neighbors: [${(adj.get(u) || []).map(x => x.to).join(",")}]`, "trace-visit");
    for (const v of (adj.get(u) || [])) {
      highlightEdge(u, v.to, "#22d3ee");
      if (!visited.has(v.to)) {
        visited.add(v.to); queue.push(v.to);
        highlightNode(v.to, "#fbbf24", true);
        traceLine(`  → enqueue ${v.to}`);
        await sleep(+$("speed").value);
      }
    }
    await sleep(+$("speed").value / 2);
  }
  traceLine(`\n🏁 Order: [${order.join(", ")}]`, "trace-path");
  toast("BFS complete", "success");
}

async function runDFS() {
  resetAlgoVisuals();
  const start = +$("startNode").value;
  if (!nodeById(start)) { toast("Start node not in graph", "error"); return; }
  const adj = buildAdj(state.directed);
  const visited = new Set();
  const order = [];
  traceLine(`🚀 DFS from node ${start}`, "trace-info");
  highlightNode(start, "#f87171", true);
  await sleep(+$("speed").value);

  async function dfs(u) {
    visited.add(u); order.push(u);
    highlightNode(u, "#34d399");
    traceLine(`→ Enter ${u}`, "trace-visit");
    for (const v of (adj.get(u) || [])) {
      highlightEdge(u, v.to, "#22d3ee");
      if (!visited.has(v.to)) {
        highlightNode(v.to, "#fbbf24", true);
        await sleep(+$("speed").value);
        await dfs(v.to);
      }
    }
    traceLine(`← Leave ${u}`);
  }
  await dfs(start);
  traceLine(`\n🏁 Order: [${order.join(", ")}]`, "trace-path");
  toast("DFS complete", "success");
}

async function runDijkstra() {
  resetAlgoVisuals();
  if (!state.weighted) traceLine("⚠ No weights — treating all as 1", "trace-info");
  const start = +$("startNode").value, end = +$("endNode").value;
  if (!nodeById(start) || !nodeById(end)) { toast("Invalid start/end", "error"); return; }
  const adj = buildAdj(state.directed);
  const dist = new Map(); const prev = new Map();
  state.nodes.forEach(n => dist.set(n.id, Infinity));
  dist.set(start, 0);
  const pq = [[0, start]];
  const visited = new Set();
  traceLine(`🚀 Dijkstra: ${start} → ${end}`, "trace-info");
  highlightNode(start, "#f87171", true);

  while (pq.length) {
    pq.sort((a, b) => a[0] - b[0]);
    const [d, u] = pq.shift();
    if (visited.has(u)) continue;
    visited.add(u);
    highlightNode(u, "#34d399");
    traceLine(`Pop ${u} (dist=${d})`, "trace-visit");
    if (u === end) break;
    for (const v of (adj.get(u) || [])) {
      const nd = d + v.w;
      if (nd < dist.get(v.to)) {
        dist.set(v.to, nd); prev.set(v.to, u);
        pq.push([nd, v.to]);
        highlightEdge(u, v.to, "#22d3ee");
        highlightNode(v.to, "#fbbf24", true);
        traceLine(`  Relax ${u}→${v.to} (w=${v.w}) new dist=${nd}`, "trace-relax");
        await sleep(+$("speed").value);
      }
    }
  }

  if (dist.get(end) === Infinity) {
    traceLine(`\n❌ No path from ${start} to ${end}`, "trace-error");
  } else {
    const path = [];
    let cur = end;
    while (cur != null) { path.unshift(cur); cur = prev.get(cur); }
    traceLine(`\n🏁 Distance: ${dist.get(end)}`, "trace-path");
    traceLine(`Path: ${path.join(" → ")}`, "trace-path");
    for (let i = 0; i < path.length - 1; i++) highlightEdge(path[i], path[i + 1], "#a78bfa", "arrow-path");
    path.forEach(p => highlightNode(p, "#a78bfa"));
  }
  toast("Dijkstra complete", "success");
}

async function runBellmanFord() {
  resetAlgoVisuals();
  if (!state.weighted) traceLine("⚠ No weights — treating all as 1", "trace-info");
  const start = +$("startNode").value, end = +$("endNode").value;
  if (!nodeById(start) || !nodeById(end)) { toast("Invalid start/end", "error"); return; }
  const dist = new Map(); const prev = new Map();
  state.nodes.forEach(n => dist.set(n.id, Infinity));
  dist.set(start, 0);
  traceLine(`🚀 Bellman-Ford: ${start} → ${end}`, "trace-info");
  highlightNode(start, "#f87171", true);

  const n = state.nodes.length;
  for (let iter = 0; iter < n - 1; iter++) {
    traceLine(`\n— Iteration ${iter + 1}/${n - 1} —`);
    let changed = false;
    for (const e of state.edges) {
      const u = typeof e.source === "object" ? e.source.id : e.source;
      const v = typeof e.target === "object" ? e.target.id : e.target;
      const w = e.weight ?? 1;
      if (dist.get(u) + w < dist.get(v)) {
        dist.set(v, dist.get(u) + w);
        prev.set(v, u);
        highlightEdge(u, v, "#22d3ee");
        highlightNode(v, "#fbbf24", true);
        traceLine(`  Relax ${u}→${v} (w=${w}) dist=${dist.get(v)}`, "trace-relax");
        changed = true;
        await sleep(+$("speed").value);
      }
      if (!state.directed) {
        if (dist.get(v) + w < dist.get(u)) {
          dist.set(u, dist.get(v) + w);
          prev.set(u, v);
          highlightEdge(u, v, "#22d3ee");
          highlightNode(u, "#fbbf24", true);
          traceLine(`  Relax ${v}→${u} (w=${w}) dist=${dist.get(u)}`, "trace-relax");
          changed = true;
          await sleep(+$("speed").value);
        }
      }
    }
    if (!changed) { traceLine("  No changes — early stop"); break; }
  }

  let negCycle = false;
  for (const e of state.edges) {
    const u = typeof e.source === "object" ? e.source.id : e.source;
    const v = typeof e.target === "object" ? e.target.id : e.target;
    const w = e.weight ?? 1;
    if (dist.get(u) + w < dist.get(v)) { negCycle = true; break; }
  }
  if (negCycle) {
    traceLine("\n⚠ Negative cycle detected!", "trace-error");
  } else if (dist.get(end) === Infinity) {
    traceLine(`\n❌ No path from ${start} to ${end}`, "trace-error");
  } else {
    const path = [];
    let cur = end;
    while (cur != null) { path.unshift(cur); cur = prev.get(cur); }
    traceLine(`\n🏁 Distance: ${dist.get(end)}`, "trace-path");
    traceLine(`Path: ${path.join(" → ")}`, "trace-path");
    for (let i = 0; i < path.length - 1; i++) highlightEdge(path[i], path[i + 1], "#a78bfa", "arrow-path");
    path.forEach(p => highlightNode(p, "#a78bfa"));
  }
  toast("Bellman-Ford complete", "success");
}

async function runAStar() {
  resetAlgoVisuals();
  const start = +$("startNode").value, end = +$("endNode").value;
  if (!nodeById(start) || !nodeById(end)) { toast("Invalid start/end", "error"); return; }
  const adj = buildAdj(state.directed);
  const h = new Map();
  const q = [end]; h.set(end, 0);
  while (q.length) {
    const u = q.shift();
    for (const v of (adj.get(u) || [])) {
      if (!h.has(v.to)) { h.set(v.to, h.get(u) + 1); q.push(v.to); }
    }
  }
  state.nodes.forEach(n => { if (!h.has(n.id)) h.set(n.id, Infinity); });

  const g = new Map(); const prev = new Map();
  state.nodes.forEach(n => g.set(n.id, Infinity));
  g.set(start, 0);
  const open = [[0 + h.get(start), 0, start]];
  const closed = new Set();
  traceLine(`🚀 A*: ${start} → ${end} (BFS heuristic)`, "trace-info");
  highlightNode(start, "#f87171", true);

  while (open.length) {
    open.sort((a, b) => a[0] - b[0]);
    const [f, gVal, u] = open.shift();
    if (closed.has(u)) continue;
    closed.add(u);
    highlightNode(u, "#34d399");
    traceLine(`Pop ${u} (g=${gVal}, h=${h.get(u)}, f=${f})`, "trace-visit");
    if (u === end) break;
    for (const v of (adj.get(u) || [])) {
      if (closed.has(v.to)) continue;
      const ng = gVal + v.w;
      if (ng < g.get(v.to)) {
        g.set(v.to, ng); prev.set(v.to, u);
        open.push([ng + h.get(v.to), ng, v.to]);
        highlightEdge(u, v.to, "#22d3ee");
        highlightNode(v.to, "#fbbf24", true);
        traceLine(`  Expand ${u}→${v.to} g=${ng}`, "trace-relax");
        await sleep(+$("speed").value);
      }
    }
  }

  if (g.get(end) === Infinity) {
    traceLine(`\n❌ No path from ${start} to ${end}`, "trace-error");
  } else {
    const path = [];
    let cur = end;
    while (cur != null) { path.unshift(cur); cur = prev.get(cur); }
    traceLine(`\n🏁 Distance: ${g.get(end)}`, "trace-path");
    traceLine(`Path: ${path.join(" → ")}`, "trace-path");
    for (let i = 0; i < path.length - 1; i++) highlightEdge(path[i], path[i + 1], "#a78bfa", "arrow-path");
    path.forEach(p => highlightNode(p, "#a78bfa"));
  }
  toast("A* complete", "success");
}

async function runFloydWarshall() {
  resetAlgoVisuals();
  const n = state.nodes.length;
  const ids = state.nodes.map(x => x.id);
  const idx = new Map(); ids.forEach((id, i) => idx.set(id, i));
  const dist = Array.from({ length: n }, () => Array(n).fill(Infinity));
  const next = Array.from({ length: n }, () => Array(n).fill(-1));
  for (let i = 0; i < n; i++) { dist[i][i] = 0; next[i][i] = i; }
  state.edges.forEach(e => {
    const u = idx.get(typeof e.source === "object" ? e.source.id : e.source);
    const v = idx.get(typeof e.target === "object" ? e.target.id : e.target);
    const w = e.weight ?? 1;
    if (w < dist[u][v]) { dist[u][v] = w; next[u][v] = v; }
    if (!state.directed && w < dist[v][u]) { dist[v][u] = w; next[v][u] = u; }
  });
  traceLine(`🚀 Floyd-Warshall (${n} nodes)`, "trace-info");

  for (let k = 0; k < n; k++) {
    traceLine(`\n— Intermediate k=${ids[k]} —`);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      if (dist[i][k] + dist[k][j] < dist[i][j]) {
        dist[i][j] = dist[i][k] + dist[k][j];
        next[i][j] = next[i][k];
        highlightEdge(ids[i], ids[k], "#22d3ee");
        highlightEdge(ids[k], ids[j], "#fbbf24");
        traceLine(`  ${ids[i]}→${ids[j]} via ${ids[k]}: ${dist[i][j]}`, "trace-relax");
        await sleep(+$("speed").value / 2);
      }
    }
  }

  traceLine("\n🏁 Distance matrix:", "trace-path");
  let matStr = "    " + ids.map(x => String(x).padStart(4)).join("") + "\n";
  for (let i = 0; i < n; i++) {
    matStr += String(ids[i]).padStart(3) + " " + dist[i].map(d => (d === Infinity ? "∞" : d).toString().padStart(4)).join("") + "\n";
  }
  traceLine(matStr, "trace-info");
  toast("Floyd-Warshall complete", "success");
}

async function runPrim() {
  resetAlgoVisuals();
  if (state.directed) { toast("Prim requires undirected graph", "error"); return; }
  const start = +$("startNode").value;
  if (!nodeById(start)) { toast("Start node not in graph", "error"); return; }
  const adj = buildAdj(false);
  const inMST = new Set([start]);
  const edges = [];
  let totalWeight = 0;
  traceLine(`🚀 Prim's MST from ${start}`, "trace-info");
  highlightNode(start, "#f87171", true);

  while (inMST.size < state.nodes.length) {
    let best = null;
    for (const u of inMST) {
      for (const v of (adj.get(u) || [])) {
        if (inMST.has(v.to)) continue;
        if (!best || v.w < best.w) best = { u, v: v.to, w: v.w };
      }
    }
    if (!best) break;
    inMST.add(best.v);
    edges.push([best.u, best.v]);
    totalWeight += best.w;
    highlightEdge(best.u, best.v, "#fb923c");
    highlightNode(best.v, "#34d399");
    traceLine(`Add edge ${best.u}—${best.v} (w=${best.w})`, "trace-relax");
    await sleep(+$("speed").value);
  }

  traceLine(`\n🏁 MST weight: ${totalWeight}`, "trace-path");
  traceLine(`Edges: ${edges.map(e => e.join("-")).join(", ")}`, "trace-path");
  toast("Prim complete", "success");
}

async function runKruskal() {
  resetAlgoVisuals();
  if (state.directed) { toast("Kruskal requires undirected graph", "error"); return; }
  const parent = new Map(); const rank = new Map();
  state.nodes.forEach(n => { parent.set(n.id, n.id); rank.set(n.id, 0); });
  function find(x) { if (parent.get(x) !== x) parent.set(x, find(parent.get(x))); return parent.get(x); }
  function union(a, b) {
    const ra = find(a), rb = find(b);
    if (ra === rb) return false;
    if (rank.get(ra) < rank.get(rb)) parent.set(ra, rb);
    else if (rank.get(ra) > rank.get(rb)) parent.set(rb, ra);
    else { parent.set(rb, ra); rank.set(ra, rank.get(ra) + 1); }
    return true;
  }

  const sorted = [...state.edges].sort((a, b) => (a.weight ?? 1) - (b.weight ?? 1));
  traceLine(`🚀 Kruskal's MST (${sorted.length} edges sorted)`, "trace-info");
  const mstEdges = [];
  let total = 0;

  for (const e of sorted) {
    const u = typeof e.source === "object" ? e.source.id : e.source;
    const v = typeof e.target === "object" ? e.target.id : e.target;
    const w = e.weight ?? 1;
    highlightEdge(u, v, "#22d3ee");
    traceLine(`Consider ${u}—${v} (w=${w})`);
    await sleep(+$("speed").value / 2);
    if (union(u, v)) {
      mstEdges.push([u, v, w]);
      total += w;
      highlightEdge(u, v, "#fb923c");
      highlightNode(u, "#34d399");
      highlightNode(v, "#34d399");
      traceLine(`  ✓ Add ${u}—${v}`, "trace-relax");
    } else {
      traceLine(`  ✗ Skip (cycle)`);
    }
    await sleep(+$("speed").value / 2);
  }

  traceLine(`\n🏁 MST weight: ${total}`, "trace-path");
  traceLine(`Edges: ${mstEdges.map(e => `${e[0]}-${e[1]}(${e[2]})`).join(", ")}`, "trace-path");
  toast("Kruskal complete", "success");
}

async function runTopoKahn() {
  resetAlgoVisuals();
  if (!state.directed) { toast("Topological sort requires directed graph", "error"); return; }
  const adj = buildAdj(true);
  const indeg = new Map();
  state.nodes.forEach(n => indeg.set(n.id, 0));
  state.edges.forEach(e => {
    const v = typeof e.target === "object" ? e.target.id : e.target;
    indeg.set(v, indeg.get(v) + 1);
  });
  const q = [];
  state.nodes.forEach(n => { if (indeg.get(n.id) === 0) q.push(n.id); });
  const order = [];
  traceLine(`🚀 Kahn's Topological Sort`, "trace-info");
  traceLine(`Initial zero-indegree: [${q.join(",")}]`);

  while (q.length) {
    const u = q.shift();
    order.push(u);
    highlightNode(u, "#34d399");
    traceLine(`Pop ${u} (indeg=0)`, "trace-visit");
    for (const v of (adj.get(u) || [])) {
      highlightEdge(u, v.to, "#22d3ee");
      indeg.set(v.to, indeg.get(v.to) - 1);
      traceLine(`  ${u}→${v.to}: indeg=${indeg.get(v.to)}`);
      if (indeg.get(v.to) === 0) { q.push(v.to); highlightNode(v.to, "#fbbf24", true); }
      await sleep(+$("speed").value);
    }
  }

  if (order.length < state.nodes.length) {
    traceLine(`\n⚠ Cycle detected! Only ${order.length}/${state.nodes.length} nodes ordered`, "trace-error");
  } else {
    traceLine(`\n🏁 Order: [${order.join(", ")}]`, "trace-path");
  }
  toast("Topological sort complete", "success");
}

async function runTopoDFS() {
  resetAlgoVisuals();
  if (!state.directed) { toast("Topological sort requires directed graph", "error"); return; }
  const adj = buildAdj(true);
  const visited = new Set(); const order = [];
  traceLine(`🚀 DFS Topological Sort`, "trace-info");

  async function dfs(u) {
    visited.add(u);
    highlightNode(u, "#fbbf24", true);
    traceLine(`→ Enter ${u}`, "trace-visit");
    for (const v of (adj.get(u) || [])) {
      highlightEdge(u, v.to, "#22d3ee");
      if (!visited.has(v.to)) {
        await sleep(+$("speed").value);
        await dfs(v.to);
      }
    }
    order.unshift(u);
    highlightNode(u, "#34d399");
    traceLine(`← Finish ${u} (push to front)`, "trace-visit");
    await sleep(+$("speed").value / 2);
  }

  for (const n of state.nodes) {
    if (!visited.has(n.id)) await dfs(n.id);
  }
  traceLine(`\n🏁 Order: [${order.join(", ")}]`, "trace-path");
  toast("Topological sort complete", "success");
}

async function runSCC() {
  resetAlgoVisuals();
  if (!state.directed) { toast("SCC requires directed graph", "error"); return; }
  const adj = buildAdj(true);
  const revAdj = new Map();
  state.nodes.forEach(n => revAdj.set(n.id, []));
  state.edges.forEach(e => {
    const u = typeof e.source === "object" ? e.source.id : e.source;
    const v = typeof e.target === "object" ? e.target.id : e.target;
    revAdj.get(v).push({ to: u, w: 1 });
  });

  const visited = new Set(); const order = [];
  traceLine(`🚀 Kosaraju's SCC — Pass 1 (DFS on G)`, "trace-info");
  async function dfs1(u) {
    visited.add(u);
    for (const v of (adj.get(u) || [])) {
      if (!visited.has(v.to)) await dfs1(v.to);
    }
    order.push(u);
    traceLine(`  Finish ${u}`, "trace-visit");
  }
  for (const n of state.nodes) {
    if (!visited.has(n.id)) {
      highlightNode(n.id, "#fbbf24", true);
      await sleep(+$("speed").value / 2);
      await dfs1(n.id);
    }
  }

  traceLine(`\nPass 2 (DFS on G^R, reverse finish order)`, "trace-info");
  const visited2 = new Set();
  const sccs = [];
  async function dfs2(u, comp) {
    visited2.add(u);
    comp.push(u);
    highlightNode(u, "#34d399");
    for (const v of (revAdj.get(u) || [])) {
      if (!visited2.has(v.to)) await dfs2(v.to, comp);
    }
  }
  for (let i = order.length - 1; i >= 0; i--) {
    const u = order[i];
    if (!visited2.has(u)) {
      const comp = [];
      await dfs2(u, comp);
      sccs.push(comp);
      traceLine(`SCC: {${comp.join(",")}}`, "trace-path");
      await sleep(+$("speed").value);
    }
  }
  traceLine(`\n🏁 Found ${sccs.length} SCCs`, "trace-path");
  toast("SCC complete", "success");
}

async function runBridges() {
  resetAlgoVisuals();
  if (state.directed) { toast("Bridges require undirected graph", "error"); return; }
  const adj = buildAdj(false);
  const disc = new Map(); const low = new Map();
  let timer = 0;
  const bridges = [];
  traceLine(`🚀 Finding Bridges (Tarjan)`, "trace-info");

  async function dfs(u, parent) {
    disc.set(u, low.set(u, timer++).get(u));
    highlightNode(u, "#fbbf24", true);
    traceLine(`Visit ${u} (disc=${disc.get(u)})`, "trace-visit");
    await sleep(+$("speed").value);
    for (const v of (adj.get(u) || [])) {
      if (v.to === parent) { parent = -1; continue; }
      highlightEdge(u, v.to, "#22d3ee");
      if (disc.has(v.to)) {
        low.set(u, Math.min(low.get(u), disc.get(v.to)));
      } else {
        await dfs(v.to, u);
        low.set(u, Math.min(low.get(u), low.get(v.to)));
        if (low.get(v.to) > disc.get(u)) {
          bridges.push([u, v.to]);
          highlightEdge(u, v.to, "#f87171");
          traceLine(`  ⚡ Bridge: ${u}—${v.to}`, "trace-error");
        }
      }
    }
  }
  for (const n of state.nodes) {
    if (!disc.has(n.id)) await dfs(n.id, -1);
  }
  traceLine(`\n🏁 Found ${bridges.length} bridge(s)`, "trace-path");
  if (bridges.length) traceLine(bridges.map(b => `${b[0]}—${b[1]}`).join(", "), "trace-path");
  toast("Bridges complete", "success");
}

async function runBipartiteCheck() {
  resetAlgoVisuals();
  if (state.directed) { toast("Bipartite check for undirected graphs", "error"); return; }
  const adj = buildAdj(false);
  const color = new Map();
  let isBip = true;
  traceLine(`🚀 Bipartite Check (BFS coloring)`, "trace-info");

  for (const start of state.nodes) {
    if (color.has(start.id)) continue;
    const q = [start.id]; color.set(start.id, 0);
    highlightNode(start.id, "#f87171", true);
    traceLine(`\nComponent from ${start.id}`);
    while (q.length && isBip) {
      const u = q.shift();
      highlightNode(u, "#34d399");
      traceLine(`Visit ${u} (color=${color.get(u)})`, "trace-visit");
      for (const v of (adj.get(u) || [])) {
        highlightEdge(u, v.to, "#22d3ee");
        if (!color.has(v.to)) {
          color.set(v.to, 1 - color.get(u));
          highlightNode(v.to, color.get(v.to) ? "#a78bfa" : "#fbbf24", true);
          q.push(v.to);
          traceLine(`  ${v.to} → color ${color.get(v.to)}`);
        } else if (color.get(v.to) === color.get(u)) {
          isBip = false;
          traceLine(`  ✗ Conflict: ${u} and ${v.to} same color!`, "trace-error");
          highlightEdge(u, v.to, "#f87171");
        }
        await sleep(+$("speed").value);
      }
    }
    if (!isBip) break;
  }
  traceLine(`\n🏁 Graph is ${isBip ? "✓ BIPARTITE" : "✗ NOT bipartite"}`, isBip ? "trace-path" : "trace-error");
  toast("Bipartite check complete", "success");
}

$("renderBtn").addEventListener("click", () => {
  render();
  if (isMobile()) {
    setTimeout(() => {
      document.querySelectorAll('.mobile-nav-item').forEach(i => i.classList.remove('active'));
      document.querySelector('[data-panel="graph"]').classList.add('active');
      switchMobilePanel('graph');
    }, 200);
  }
});
$("formatBtn").addEventListener("click", () => {
  try {
    const v = safeEval($("input").value);
    $("input").value = JSON.stringify(v, null, 2);
    toast("Formatted", "success");
  } catch { toast("Cannot format — invalid JSON", "error"); }
});
$("clearBtn").addEventListener("click", () => { $("input").value = ""; render(); });
$("directed").addEventListener("change", render);
$("weighted").addEventListener("change", render);
$("base").addEventListener("change", render);
$("showLabels").addEventListener("change", () => {
  state.showLabels = $("showLabels").checked;
  state.gLabels?.attr("visibility", state.showLabels ? "visible" : "hidden");
});
$("showWeights").addEventListener("change", () => {
  state.showWeights = $("showWeights").checked;
  state.gWeights?.attr("visibility", state.showWeights ? "visible" : "hidden");
});
document.querySelectorAll("[data-layout]").forEach(b => {
  b.addEventListener("click", () => {
    state.layout = b.dataset.layout;
    applyLayout();
  });
});

$("zoomIn").addEventListener("click", () => svg.transition().call(state.zoom.scaleBy, 1.3));
$("zoomOut").addEventListener("click", () => svg.transition().call(state.zoom.scaleBy, 0.77));
$("zoomFit").addEventListener("click", fitView);
$("centerBtn").addEventListener("click", centerGraph);

$("speed").addEventListener("input", e => $("speedVal").textContent = e.target.value + "ms");

$("runAlgo").addEventListener("click", async () => {
  if (state.algoRunning) { toast("Algorithm already running", "error"); return; }
  state.algoRunning = true;
  state.algoPaused = false;
  state.algoStepMode = false;
  $("runAlgo").disabled = true;
  $("pauseAlgo").disabled = false;
  $("statusRight").innerHTML = '<span class="algo-running-indicator"></span>Running...';
  try {
    const a = $("algo").value;
    if (a === "bfs") await runBFS();
    else if (a === "dfs") await runDFS();
    else if (a === "dijkstra") await runDijkstra();
    else if (a === "bellman") await runBellmanFord();
    else if (a === "astar") await runAStar();
    else if (a === "floyd") await runFloydWarshall();
    else if (a === "prim") await runPrim();
    else if (a === "kruskal") await runKruskal();
    else if (a === "topo_kahn") await runTopoKahn();
    else if (a === "topo_dfs") await runTopoDFS();
    else if (a === "scc") await runSCC();
    else if (a === "bridges") await runBridges();
    else if (a === "bipartite_check") await runBipartiteCheck();
  } catch (err) {
    console.error(err);
    traceLine(`Error: ${err.message}`, "trace-error");
  }
  state.algoRunning = false;
  $("runAlgo").disabled = false;
  $("pauseAlgo").disabled = true;
  $("statusRight").textContent = "";
});

$("pauseAlgo").addEventListener("click", () => {
  state.algoPaused = !state.algoPaused;
  $("pauseAlgo").textContent = state.algoPaused ? "▶" : "⏸";
  $("statusRight").innerHTML = state.algoPaused ? '<span style="color:#fbbf24">⏸ Paused</span>' : '<span class="algo-running-indicator"></span>Running...';
});

$("stepAlgo").addEventListener("click", () => {
  if (state.algoStepResolve) {
    const r = state.algoStepResolve;
    state.algoStepResolve = null;
    r();
  } else if (!state.algoRunning) {
    state.algoStepMode = true;
    $("runAlgo").click();
  } else {
    state.algoStepMode = !state.algoStepMode;
    toast(state.algoStepMode ? "Step mode ON" : "Step mode OFF", "info");
  }
});

$("resetAlgo").addEventListener("click", () => {
  state.algoRunning = false;
  state.algoPaused = false;
  state.algoStepMode = false;
  $("pauseAlgo").textContent = "⏸";
  $("runAlgo").disabled = false;
  $("pauseAlgo").disabled = true;
  $("statusRight").textContent = "";
  resetAlgoVisuals();
});

$("clearTrace").addEventListener("click", clearTrace);

$("exportBtn").addEventListener("click", () => {
  const svgNode = svg.node();
  const serializer = new XMLSerializer();
  const source = serializer.serializeToString(svgNode);
  const img = new Image();
  const svgBlob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = svgNode.clientWidth * 2; canvas.height = svgNode.clientHeight * 2;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#0b0f17"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const a = document.createElement("a");
    a.download = "graph.png"; a.href = canvas.toDataURL("image/png"); a.click();
    URL.revokeObjectURL(url);
    toast("Exported PNG", "success");
  };
  img.src = url;
});

$("nodeSearch").addEventListener("input", (e) => {
  const q = e.target.value.trim();
  if (!state.gNodes) return;
  if (!q) {
    state.gNodes.select("circle").attr("stroke", "#22d3ee").attr("stroke-width", 2);
    return;
  }
  state.gNodes.select("circle").each(function (d) {
    const match = String(d.id).includes(q) || String(d.label).includes(q);
    d3.select(this)
      .attr("stroke", match ? "#fbbf24" : "#22d3ee")
      .attr("stroke-width", match ? 4 : 2);
    if (match) {
      const t = state.currentTransform;
      const W = width(), H = height();
      const newT = d3.zoomIdentity.translate(W / 2 - d.x * t.k, H / 2 - d.y * t.k).scale(t.k);
      svg.transition().duration(400).call(state.zoom.transform, newT);
    }
  });
});

document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.key === "Enter") { e.preventDefault(); render(); return; }
  if (document.activeElement.tagName === "TEXTAREA" || document.activeElement.tagName === "INPUT") {
    if (e.key === "Escape") document.activeElement.blur();
    return;
  }
  if (e.key === "f" || e.key === "F") fitView();
  if (e.key === "c" || e.key === "C") centerGraph();
  if (e.key === "d" || e.key === "D") { $("directed").checked = !$("directed").checked; render(); }
  if (e.key === "/") { e.preventDefault(); $("nodeSearch").focus(); }
});

let prevMobile = isMobile();
window.addEventListener("resize", () => {
  const nowMobile = isMobile();
  if (nowMobile !== prevMobile) {
    prevMobile = nowMobile;
    if (nowMobile) {
      document.querySelectorAll('.mobile-nav-item').forEach(i => i.classList.remove('active'));
      document.querySelector('[data-panel="graph"]').classList.add('active');
      switchMobilePanel('graph');
    } else {
      $('panelInput').classList.remove('mobile-hidden');
      $('panelGraph').classList.remove('mobile-hidden');
      $('panelStats').classList.remove('mobile-hidden');
    }
  }
  if (state.simulation) state.simulation.force("center", d3.forceCenter(width() / 2, height() / 2)).alpha(0.3).restart();
  setTimeout(fitView, 200);
});

$("input").value = "[[1,2],[0,2,3],[0,1,3],[1,2,4],[3]]";
render();

if (isMobile()) {
  document.querySelectorAll('.mobile-nav-item').forEach(i => i.classList.remove('active'));
  document.querySelector('[data-panel="graph"]').classList.add('active');
  switchMobilePanel('graph');
}
