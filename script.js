// ==========================================================================
// MHW Hunting Horn Melody Tree & Calculator Script
// ==========================================================================

// Map of note characters to their corresponding image filenames
const NOTE_IMAGE_MAP = {
  W: "white1.png",
  P: "purple1.png",
  R: "red2.png",
  G: "green2.png",
  Y: "yellow2.png",
  B: "blue2.png",
  C: "cyan2.png",
  O: "orange3.png",
  E: "echo.png"
};

// Stat icons added by user
const STAT_ICONS = {
  attack: "600px-MHWI-Attack_Icon.png.webp",
  affinity: "600px-MHWI-Affinity_Icon.png.webp",
  defense: "600px-MHWI-Defense_Icon.png.webp",
  elderseal: "UI-Elderseal.png",
  sharpness: "UI-Sharpness_Icon.png"
};

// Sharpness tier colors (MHW standards)
const SHARPNESS_COLORS = {
  red: "#ef4444",
  orange: "#f97316",
  yellow: "#eab308",
  green: "#22c55e",
  blue: "#3b82f6",
  white: "#f8fafc",
  purple: "#c084fc"
};

// Return accent style for the top border of the card
function getSharpnessAccent(node) {
  const base = node.base_color || "green";
  const max = node.max_color || base;
  const baseHex = SHARPNESS_COLORS[base] || "#22c55e";
  const maxHex = SHARPNESS_COLORS[max] || baseHex;

  if (node.has_sharpness_upgrade && base !== max) {
    const baseName = base.charAt(0).toUpperCase() + base.slice(1);
    const maxName = max.charAt(0).toUpperCase() + max.slice(1);
    return {
      background: `linear-gradient(90deg, ${baseHex} 0%, ${maxHex} 100%)`,
      glow: maxHex,
      title: `Sharpness: ${baseName} ➔ ${maxName} (with Handicraft)`
    };
  }
  const maxName = max.charAt(0).toUpperCase() + max.slice(1);
  return {
    background: maxHex,
    glow: maxHex,
    title: `Sharpness: ${maxName}`
  };
}

// Render full horizontal sharpness gauge for the hover tooltip
function renderSharpnessGauge(node) {
  if (!node.sharpness_base || !node.sharpness_max) return "";

  const colors = ["red", "orange", "yellow", "green", "blue", "white", "purple"];
  let segsHtml = "";

  for (let i = 0; i < 7; i++) {
    const color = colors[i];
    const baseHits = node.sharpness_base[i] || 0;
    const craftHits = node.handicraft ? (node.handicraft[i] || 0) : 0;

    if (baseHits > 0) {
      const pct = (baseHits / 400) * 100;
      segsHtml += `<div class="sharpness-seg seg-${color}" style="width: ${pct}%;"></div>`;
    }
    if (craftHits > 0) {
      const pct = (craftHits / 400) * 100;
      segsHtml += `<div class="sharpness-seg seg-${color} handicraft" style="width: ${pct}%;"></div>`;
    }
  }

  return `
    <div class="tooltip-sharpness-row" title="Sharpness Gauge (patterned = Handicraft extension)">
      <img src="img/${STAT_ICONS.sharpness}" alt="Sharpness" class="sharpness-icon">
      <div class="sharpness-gauge-container">
        <div class="sharpness-gauge">
          ${segsHtml}
        </div>
      </div>
    </div>
  `;
}

// Configuration for weapon elements/statuses (icon and theme colors)
const ELEMENT_CONFIG = {
  Fire: { icon: "Element_Fire_Icon.webp", color: "#fb923c", bg: "rgba(251, 146, 60, 0.14)" },
  Water: { icon: "Element_Water_Icon.webp", color: "#38bdf8", bg: "rgba(56, 189, 248, 0.14)" },
  Thunder: { icon: "Element_Thunder_Icon.webp", color: "#facc15", bg: "rgba(250, 204, 21, 0.14)" },
  Ice: { icon: "Element_Ice_Icon.webp", color: "#7dd3fc", bg: "rgba(125, 211, 252, 0.14)" },
  Dragon: { icon: "Element_Dragon_Icon.webp", color: "#c084fc", bg: "rgba(192, 132, 252, 0.14)" },
  Poison: { icon: "Status_Poison_Icon.webp", color: "#e879f9", bg: "rgba(232, 121, 249, 0.14)" },
  Paralysis: { icon: "Status_Paralysis_Icon.webp", color: "#fbbf24", bg: "rgba(251, 191, 36, 0.14)" },
  Sleep: { icon: "Status_Sleep_Icon.webp", color: "#93c5fd", bg: "rgba(147, 197, 253, 0.14)" },
  Blast: { icon: "Status_Blastblight_Icon.webp", color: "#f87171", bg: "rgba(248, 113, 113, 0.14)" }
};

// Render elemental damage for the card (without writing element name, side by side with attack)
function renderCardElement(node) {
  if (!node.element || !node.element_attack) return "";
  const conf = ELEMENT_CONFIG[node.element];
  const isHidden = Boolean(node.element_hidden);
  const valText = isHidden ? `(${node.element_attack})` : `${node.element_attack}`;
  const title = `${node.element} ${node.element_attack}${isHidden ? ' (Hidden - requires Free Elem)' : ''}`;

  return `
    <span class="elem-stat ${isHidden ? 'elem-hidden' : ''}" style="color: ${conf ? conf.color : '#cbd5e1'};" title="${title}">
      ${conf ? `<img src="img/${conf.icon}" alt="${node.element}" class="elem-icon-img ${isHidden ? 'elem-img-hidden' : ''}">` : ''}
      <span class="elem-val">${valText}</span>
    </span>
  `;
}

// Render elderseal badge if present
function renderEldersealBadge(node) {
  if (!node.elderseal) return "";
  const sealText = node.elderseal.charAt(0).toUpperCase() + node.elderseal.slice(1);
  return `
    <span class="stat-item elderseal" title="Elderseal: ${sealText}">
      <img src="img/${STAT_ICONS.elderseal}" alt="Elderseal" class="stat-icon elderseal-icon">
      <span>${sealText}</span>
    </span>
  `;
}

// Render base 3 notes of a horn
function notesToImages(notes) {
  const imagesByPosition = [
    { W: "white1.png", P: "purple1.png" },
    { R: "red2.png", G: "green2.png", Y: "yellow2.png", B: "blue2.png", C: "cyan2.png" },
    { O: "orange3.png", G: "green3.png", Y: "yellow3.png", B: "blue3.png", C: "cyan3.png" }
  ];
  return notes
    .split("")
    .map((n, i) => {
      const img = (imagesByPosition[i] && imagesByPosition[i][n]) || NOTE_IMAGE_MAP[n];
      return img ? `<img src="img/${img}" alt="${n}" title="${n}">` : `<span>${n}</span>`;
    })
    .join("");
}

// Render note combination icons for a melody (using echo.png for Iceborne 'E' Echo note)
function renderNoteSequence(noteStr) {
  return noteStr
    .split("")
    .map(ch => {
      const img = NOTE_IMAGE_MAP[ch];
      if (img) {
        const isEcho = ch === "E";
        return `<img src="img/${img}" alt="${ch}" class="note-icon ${isEcho ? 'echo-icon' : ''}" title="${isEcho ? 'Echo Note (E)' : `Note ${ch}`}">`;
      }
      return `<span class="note-char">${ch}</span>`;
    })
    .join("");
}

// Fetch helper returning non-empty trimmed lines
function fetchTextLines(url) {
  return fetch(url)
    .then(res => res.text())
    .then(text => text.split(/\r?\n/).map(l => l.trim()).filter(Boolean));
}

// Load all required data before rendering
Promise.all([
  fetch("horn_crafting_forest.json").then(res => res.json()),
  fetch("songs_in_horns.json").then(res => res.json()),
  fetchTextLines("songs.txt"),
  fetchTextLines("song_texts.txt")
]).then(([forestData, songsInHorns, songsLines, songTexts]) => {
  const forest = forestData.forest;
  const container = document.getElementById("container");
  const canvas = document.getElementById("connections");
  const ctx = canvas.getContext("2d");
  const sidebar = document.getElementById("sidebar");
  const toggleSidebarBtn = document.getElementById("toggle-sidebar");

  // Create dictionary of song ID -> song Name
  const songNameMap = new Map();
  songTexts.forEach(line => {
    const pipeIdx = line.indexOf("|");
    if (pipeIdx !== -1) {
      const id = line.slice(0, pipeIdx);
      const name = line.slice(pipeIdx + 1);
      songNameMap.set(id, name);
    }
  });

  // Layout spacing
  const nodeWidth = 180;
  const nodeHeight = 94;
  const spacingX = 240;
  const leafSpacingY = 110;
  const treeGapY = 55;

  // Resize canvas to cover container
  function resizeCanvas() {
    const width = Math.max(container.offsetWidth || container.scrollWidth, window.innerWidth);
    const height = Math.max(container.offsetHeight || container.scrollHeight, window.innerHeight);
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
  }

  // Retrieve structured song details for a note combination
  function getSongDetailsForNotes(notes) {
    const indices = songsInHorns[notes] || [];
    const songMap = new Map();

    indices.forEach(idx => {
      const line = songsLines[idx - 1];
      if (!line) return;
      const pipeIdx = line.indexOf("|");
      if (pipeIdx === -1) return;
      const songId = line.slice(0, pipeIdx);
      const combo = line.slice(pipeIdx + 1);
      const name = songNameMap.get(songId) || `Melody #${songId}`;

      if (!songMap.has(songId)) {
        songMap.set(songId, { id: songId, name: name, combos: [] });
      }
      songMap.get(songId).combos.push(combo);
    });

    return Array.from(songMap.values());
  }

  // Create single floating song tooltip
  const songPanel = document.createElement("div");
  songPanel.className = "songs-floating";
  document.body.appendChild(songPanel);

  // Position tooltip safely within viewport bounds
  function positionTooltip(targetRect) {
    songPanel.style.display = "block";
    const panelWidth = songPanel.offsetWidth;
    const panelHeight = songPanel.offsetHeight;

    // Horizontal centering relative to node, clamped so it never overlaps sidebar or screen left
    const isSidebarCollapsed = sidebar && sidebar.classList.contains("collapsed");
    const currentSidebarWidth = isSidebarCollapsed ? 0 : 330;
    const maxLeft = window.innerWidth - currentSidebarWidth - panelWidth - 12;
    let left = targetRect.left + (targetRect.width / 2) - (panelWidth / 2);
    left = Math.max(12, Math.min(left, maxLeft));

    // Vertical placement: prefer below, flip above if overflowing bottom
    let top = targetRect.bottom + 8;
    if (top + panelHeight > window.innerHeight - 10) {
      top = Math.max(10, targetRect.top - panelHeight - 8);
    }

    songPanel.style.left = left + "px";
    songPanel.style.top = top + "px";
  }

  // Active filter states
  const selectedSongIds = new Set();
  const selectedElements = new Set();
  let filterPositiveAffinity = false;
  let filterPositiveDefense = false;

  // Create DOM node for a horn
  function createNodeElement(node) {
    const div = document.createElement("div");
    div.className = "node";
    if (node.notes && node.notes.includes("W")) {
      div.classList.add("weak-horn");
    }

    div.style.left = node.x + "px";
    div.style.top = node.y + "px";
    div.dataset.id = node.id;
    div.dataset.parent = node.parentId || "";
    div.dataset.notes = node.notes || "";

    const songs = getSongDetailsForNotes(node.notes);
    const cardElemHtml = renderCardElement(node);

    const eldersealHtml = node.elderseal
      ? `<span class="stat-item elderseal" title="Elderseal: ${node.elderseal}">
           <img src="img/${STAT_ICONS.elderseal}" alt="Elderseal" class="stat-icon elderseal-icon">
           <span>${node.elderseal.charAt(0).toUpperCase() + node.elderseal.slice(1)}</span>
         </span>`
      : "";

    const affinityHtml = node.affinity
      ? `<span class="stat-item affinity ${node.affinity > 0 ? 'pos' : 'neg'}" title="Affinity: ${node.affinity > 0 ? '+' : ''}${node.affinity}%">
           <img src="img/${STAT_ICONS.affinity}" alt="Aff" class="stat-icon"> ${node.affinity > 0 ? '+' : ''}${node.affinity}%
         </span>`
      : "";

    const defenseHtml = (node.defense && node.defense > 0)
      ? `<span class="stat-item defense" title="Defense: +${node.defense}">
           <img src="img/${STAT_ICONS.defense}" alt="Def" class="stat-icon"> +${node.defense}
         </span>`
      : "";

    const hasSecondary = Boolean(eldersealHtml || affinityHtml || defenseHtml);
    const accent = getSharpnessAccent(node);

    div.innerHTML = `
      <div class="node-sharpness-bar" style="background: ${accent.background}; box-shadow: 0 0 6px ${accent.glow}66;" title="${accent.title}"></div>
      <div class="name" title="${node.name_en}">${node.name_en}</div>
      <div class="notes">${notesToImages(node.notes || "")}</div>
      <div class="primary-row">
        <span class="rarity">★${node.rarity}</span>
        <span class="attack-elem-group">
          <span class="attack" title="Attack: ${node.attack}">
            <img src="img/${STAT_ICONS.attack}" alt="Atk" class="stat-icon"> ${node.attack}
          </span>
          ${cardElemHtml}
        </span>
      </div>
      <div class="secondary-row">
        ${hasSecondary ? `${eldersealHtml}${affinityHtml}${defenseHtml}` : `<span class="empty-secondary">—</span>`}
      </div>
    `;

    // Tooltip hover interactions
    div.addEventListener("mouseenter", () => {
      const songRowsHtml = songs.map(s => {
        const isActive = selectedSongIds.has(s.id);
        const combosHtml = s.combos
          .map(c => `<span class="note-combo">${renderNoteSequence(c)}</span>`)
          .join('<span class="combo-separator">/</span>');

        return `
          <div class="tooltip-song-item ${isActive ? 'active-filter' : ''}">
            <span class="song-name">${s.name}</span>
            <div class="combos-wrapper">${combosHtml}</div>
          </div>
        `;
      }).join("");

      const tooltipAffinity = node.affinity
        ? `<span class="affinity ${node.affinity > 0 ? 'pos' : 'neg'}">
             <img src="img/${STAT_ICONS.affinity}" alt="Aff" class="stat-icon"> ${node.affinity > 0 ? '+' : ''}${node.affinity}% Affinity
           </span>`
        : "";
      const tooltipDefense = node.defense
        ? `<span class="def-bonus">
             <img src="img/${STAT_ICONS.defense}" alt="Def" class="stat-icon"> +${node.defense} Def
           </span>`
        : "";

      const sharpnessHtml = renderSharpnessGauge(node);

      songPanel.innerHTML = `
        <div class="tooltip-header">
          <div class="tooltip-title">${node.name_en}</div>
          <div class="tooltip-meta">
            <span class="rarity">★${node.rarity}</span>
            <span class="attack">
              <img src="img/${STAT_ICONS.attack}" alt="Atk" class="stat-icon"> ${node.attack}
            </span>
            ${tooltipAffinity}
            ${tooltipDefense}
            <div class="notes">${notesToImages(node.notes || "")}</div>
          </div>
          <div class="tooltip-elem-row">
            ${cardElemHtml}
            ${node.element ? `<span class="elem-name-label" style="font-size: 0.78rem; font-weight: 600; color: #94a3b8;">${node.element}</span>` : ''}
            ${eldersealHtml}
          </div>
          ${sharpnessHtml}
        </div>
        <div class="tooltip-songs">
          ${songRowsHtml}
        </div>
      `;

      positionTooltip(div.getBoundingClientRect());
    });

    div.addEventListener("mouseleave", () => {
      songPanel.style.display = "none";
    });

    container.appendChild(div);
    return div;
  }

  // Draw hierarchical connection lines on canvas
  function drawConnections(allPlacedNodes) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Map parent ID to children nodes
    const parentMap = new Map();
    allPlacedNodes.forEach(node => {
      if (node.parentId) {
        if (!parentMap.has(node.parentId)) {
          parentMap.set(node.parentId, []);
        }
        parentMap.get(node.parentId).push(node);
      }
    });

    const nodeById = new Map(allPlacedNodes.map(n => [n.id, n]));

    parentMap.forEach((children, parentId) => {
      const parent = nodeById.get(parentId);
      if (!parent) return;

      const x1 = parent.x + nodeWidth;
      const y1 = parent.y + (nodeHeight / 2);

      if (children.length === 1) {
        // Direct single child: clean horizontal line
        const child = children[0];
        const x2 = child.x;
        const y2 = child.y + (nodeHeight / 2);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      } else {
        // Multiple children: branching fork with vertical bus
        const childYList = children.map(c => c.y + (nodeHeight / 2));
        const minY = Math.min(...childYList);
        const maxY = Math.max(...childYList);
        const midX = x1 + Math.round((spacingX - nodeWidth) / 2);

        // Horizontal stem from parent to midX
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(midX, y1);
        ctx.stroke();

        // Vertical bus connecting all children branches
        ctx.beginPath();
        ctx.moveTo(midX, Math.min(minY, y1));
        ctx.lineTo(midX, Math.max(maxY, y1));
        ctx.stroke();

        // Horizontal branches from midX to each child
        children.forEach(child => {
          const cy = child.y + (nodeHeight / 2);
          const cx = child.x;

          ctx.beginPath();
          ctx.moveTo(midX, cy);
          ctx.lineTo(cx, cy);
          ctx.stroke();
        });
      }
    });
  }

  // ------------------------------------------------------------------------
  // Post-order Tree Layout Algorithm
  // Leaves get sequential leafY. Parent nodes are vertically centered
  // exactly between their first and last child.
  // ------------------------------------------------------------------------
  let currentLeafY = 40;
  const allPlacedNodes = [];

  function computeNodePositions(node, depth = 0, parentId = null) {
    node.depth = depth;
    node.parentId = parentId;
    node.x = depth * spacingX + 40;

    if (!node.children || node.children.length === 0) {
      node.y = currentLeafY;
      currentLeafY += leafSpacingY;
    } else {
      node.children.forEach(child => computeNodePositions(child, depth + 1, node.id));
      const firstY = node.children[0].y;
      const lastY = node.children[node.children.length - 1].y;
      node.y = Math.round((firstY + lastY) / 2);
    }

    allPlacedNodes.push(node);
  }

  // Create subtle horizontal divider line between distinct trees
  function createTreeDivider(y) {
    const divider = document.createElement("div");
    divider.className = "tree-divider";
    divider.style.top = y + "px";
    container.appendChild(divider);
  }

  // Layout each tree in the forest
  forest.forEach((rootTree, idx) => {
    computeNodePositions(rootTree, 0, null);

    if (idx < forest.length - 1) {
      createTreeDivider(currentLeafY + (treeGapY / 2));
      currentLeafY += treeGapY;
    }
  });

  // Render all DOM nodes
  allPlacedNodes.forEach(node => createNodeElement(node));

  // Calculate maximum extent of all placed nodes
  const maxNodeX = Math.max(...allPlacedNodes.map(n => n.x)) + nodeWidth;
  const maxNodeY = Math.max(currentLeafY, ...allPlacedNodes.map(n => n.y)) + nodeHeight;

  // Ensure container has generous padding to the right so rightmost horns
  // are never obscured by the fixed sidebar even when scrolled to the end
  const totalWidth = maxNodeX + 420;
  const totalHeight = maxNodeY + 120;

  container.style.width = totalWidth + "px";
  container.style.minWidth = totalWidth + "px";
  container.style.height = totalHeight + "px";
  container.style.minHeight = totalHeight + "px";

  // Initial canvas sizing and line draw
  resizeCanvas();
  requestAnimationFrame(() => {
    drawConnections(allPlacedNodes);
  });

  window.addEventListener("resize", () => {
    resizeCanvas();
    drawConnections(allPlacedNodes);
  });

  // Sidebar Collapse / Expand toggle
  if (toggleSidebarBtn && sidebar) {
    toggleSidebarBtn.addEventListener("click", () => {
      sidebar.classList.toggle("collapsed");
      const isCollapsed = sidebar.classList.contains("collapsed");
      toggleSidebarBtn.setAttribute("title", isCollapsed ? "Expand sidebar" : "Collapse sidebar");
      toggleSidebarBtn.setAttribute("aria-label", isCollapsed ? "Expand filter sidebar" : "Collapse filter sidebar");
    });
  }

  // ------------------------------------------------------------------------
  // Sidebar Filtering & Faceted Mutual Exclusion
  // ------------------------------------------------------------------------
  const songList = document.getElementById("song-list");
  const songSearch = document.getElementById("song-search");
  const searchClearBtn = document.getElementById("search-clear-btn");
  const matchCounter = document.getElementById("match-counter");
  const clearFilterBtn = document.getElementById("clear-filter");
  const clearElemBtn = document.getElementById("clear-elem-btn");
  const clearSongBtn = document.getElementById("clear-song-btn");
  const filterAffinityBtn = document.getElementById("filter-affinity-btn");
  const filterDefenseBtn = document.getElementById("filter-defense-btn");
  const elemButtons = document.querySelectorAll(".elem-filter-btn");

  // Populate song list in sidebar
  songTexts.forEach(line => {
    const pipeIdx = line.indexOf("|");
    if (pipeIdx === -1) return;
    const songId = line.slice(0, pipeIdx);
    const songName = line.slice(pipeIdx + 1);

    const li = document.createElement("li");
    li.textContent = songName;
    li.dataset.songId = songId;
    songList.appendChild(li);
  });

  // Map each DOM node ID to its set of playable song IDs
  const nodeSongMap = new Map();
  document.querySelectorAll(".node").forEach(nodeEl => {
    const notes = nodeEl.dataset.notes;
    const songs = getSongDetailsForNotes(notes);
    const songIdSet = new Set(songs.map(s => s.id));
    nodeSongMap.set(nodeEl.dataset.id, songIdSet);
  });

  const totalHornsCount = allPlacedNodes.length;

  // Update UI filters, match count, and black out impossible combinations
  function updateFiltering() {
    const allNodeEls = document.querySelectorAll(".node");
    const allSongLis = songList.querySelectorAll("li");

    const isFilterActive = selectedSongIds.size > 0 ||
                           selectedElements.size > 0 ||
                           filterPositiveAffinity ||
                           filterPositiveDefense;

    if (!isFilterActive) {
      allNodeEls.forEach(el => {
        el.classList.remove("highlighted", "dimmed");
      });

      allSongLis.forEach(li => {
        li.classList.remove("disabled", "selected");
      });

      matchCounter.textContent = `${totalHornsCount} horns total`;
      matchCounter.className = "match-counter";
      clearFilterBtn.style.display = "none";
      if (clearElemBtn) clearElemBtn.style.display = "none";
      if (clearSongBtn) clearSongBtn.style.display = "none";
      return;
    }

    clearFilterBtn.style.display = "block";
    if (clearElemBtn) clearElemBtn.style.display = selectedElements.size > 0 ? "block" : "none";
    if (clearSongBtn) clearSongBtn.style.display = selectedSongIds.size > 0 ? "block" : "none";

    let matchCount = 0;
    const matchingHornIds = new Set();
    const availableSongIds = new Set();

    allPlacedNodes.forEach(node => {
      const nodeEl = document.querySelector(`.node[data-id='${node.id}']`);
      if (!nodeEl) return;

      // 1. Check melody filter
      const nodeSongs = nodeSongMap.get(node.id);
      const matchesSongs = selectedSongIds.size === 0 ||
        [...selectedSongIds].every(id => nodeSongs && nodeSongs.has(id));

      // 2. Check element filter
      let matchesElement = true;
      if (selectedElements.size > 0) {
        if (selectedElements.has("None")) {
          const isNonElem = !node.element;
          matchesElement = isNonElem || (node.element && selectedElements.has(node.element));
        } else {
          matchesElement = Boolean(node.element && selectedElements.has(node.element));
        }
      }

      // 3. Check positive affinity filter
      const matchesAffinity = !filterPositiveAffinity || (node.affinity > 0);

      // 4. Check positive defense filter
      const matchesDefense = !filterPositiveDefense || (node.defense > 0);

      const isMatch = matchesSongs && matchesElement && matchesAffinity && matchesDefense;

      if (isMatch) {
        nodeEl.classList.add("highlighted");
        nodeEl.classList.remove("dimmed");
        matchingHornIds.add(node.id);
        matchCount++;

        if (nodeSongs) {
          nodeSongs.forEach(sId => availableSongIds.add(sId));
        }
      } else {
        nodeEl.classList.remove("highlighted");
        nodeEl.classList.add("dimmed");
      }
    });

    // Update match counter
    if (matchCount > 0) {
      matchCounter.textContent = `${matchCount} ${matchCount === 1 ? "horn" : "horns"} match`;
      matchCounter.className = "match-counter has-matches";
    } else {
      matchCounter.textContent = "0 horns match";
      matchCounter.className = "match-counter no-matches";
    }

    // Mutual exclusion: black out melodies that cannot be combined with current filters
    allSongLis.forEach(li => {
      const songId = li.dataset.songId;
      const isSelected = selectedSongIds.has(songId);

      if (isSelected) {
        li.classList.add("selected");
        li.classList.remove("disabled");
      } else {
        li.classList.remove("selected");
        if (availableSongIds.has(songId)) {
          li.classList.remove("disabled");
        } else {
          li.classList.add("disabled");
        }
      }
    });
  }

  // Element filter toggle
  elemButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const elem = btn.dataset.element;
      if (selectedElements.has(elem)) {
        selectedElements.delete(elem);
        btn.classList.remove("selected");
      } else {
        selectedElements.add(elem);
        btn.classList.add("selected");
      }
      updateFiltering();
    });
  });

  // Clear elements button
  if (clearElemBtn) {
    clearElemBtn.addEventListener("click", () => {
      selectedElements.clear();
      elemButtons.forEach(b => b.classList.remove("selected"));
      updateFiltering();
    });
  }

  // Clear songs button
  if (clearSongBtn) {
    clearSongBtn.addEventListener("click", () => {
      selectedSongIds.clear();
      updateFiltering();
    });
  }

  // Affinity filter toggle
  if (filterAffinityBtn) {
    filterAffinityBtn.addEventListener("click", () => {
      filterPositiveAffinity = !filterPositiveAffinity;
      filterAffinityBtn.classList.toggle("selected", filterPositiveAffinity);
      updateFiltering();
    });
  }

  // Defense filter toggle
  if (filterDefenseBtn) {
    filterDefenseBtn.addEventListener("click", () => {
      filterPositiveDefense = !filterPositiveDefense;
      filterDefenseBtn.classList.toggle("selected", filterPositiveDefense);
      updateFiltering();
    });
  }

  // Click handler on song list items
  songList.addEventListener("click", e => {
    const li = e.target.closest("li");
    if (!li || li.classList.contains("disabled")) return;

    const songId = li.dataset.songId;
    if (selectedSongIds.has(songId)) {
      selectedSongIds.delete(songId);
    } else {
      selectedSongIds.add(songId);
    }

    updateFiltering();
  });

  // Clear all filters
  clearFilterBtn.addEventListener("click", () => {
    selectedSongIds.clear();
    selectedElements.clear();
    filterPositiveAffinity = false;
    filterPositiveDefense = false;

    elemButtons.forEach(b => b.classList.remove("selected"));
    if (filterAffinityBtn) filterAffinityBtn.classList.remove("selected");
    if (filterDefenseBtn) filterDefenseBtn.classList.remove("selected");

    updateFiltering();
  });

  // Search filter for melodies in the sidebar
  songSearch.addEventListener("input", () => {
    const query = songSearch.value.trim().toLowerCase();
    searchClearBtn.style.display = query ? "block" : "none";

    songList.querySelectorAll("li").forEach(li => {
      const text = li.textContent.toLowerCase();
      li.style.display = text.includes(query) ? "" : "none";
    });
  });

  searchClearBtn.addEventListener("click", () => {
    songSearch.value = "";
    searchClearBtn.style.display = "none";
    songList.querySelectorAll("li").forEach(li => {
      li.style.display = "";
    });
    songSearch.focus();
  });

  // Initial state setup
  updateFiltering();
});
