function notesToImages(notes) {
  const imagesByPosition = [
    { W: "white1.png", P: "purple1.png" }, // Primera nota
    { R: "red2.png", G: "green2.png", Y: "yellow2.png", B: "blue2.png", C: "cyan2.png" }, // Segunda nota
    { O: "orange3.png", G: "green3.png", Y: "yellow3.png", B: "blue3.png", C: "cyan3.png" } // Tercera nota
  ];
  return notes
    .split("")
    .map((n, i) => imagesByPosition[i] && imagesByPosition[i][n]
      ? `<img src="img/${imagesByPosition[i][n]}" alt="${n}" width="24">`
      : n)
    .join("");
}

// Utilidad para cargar un archivo de texto y devolver sus líneas
function fetchTextLines(url) {
  return fetch(url)
    .then(res => res.text())
    .then(text => text.split(/\r?\n/));
}

// Carga todos los datos necesarios antes de renderizar
Promise.all([
  fetch("horn_crafting_forest.json").then(res => res.json()),
  fetch("songs_in_horns.json").then(res => res.json()),
  fetchTextLines("songs.txt"),
  fetchTextLines("song_texts.txt")
]).then(([data, songsInHorns, songsLines, songTexts]) => {
  const forest = data.forest;
  const container = document.getElementById("container");
  const canvas = document.getElementById("connections");
  const ctx = canvas.getContext("2d");

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const spacingX = 240;
  const spacingY = 120;

  // Devuelve los textos de las canciones para una combinación de notas
  function getSongTextsForNotes(notes) {
    const indices = songsInHorns[notes] || [];
    // 1. Buscar la línea en songs.txt usando el índice (1-based)
    // 2. Obtener el id de canción (número antes del '|')
    // 3. Buscar ese id en song_texts.txt y devolver el texto

    // Para evitar duplicados
    const songIds = new Set();
    indices.forEach(idx => {
      const line = songsLines[idx - 1] || "";
      const match = line.match(/^(\d+)\|/);
      if (match) {
        songIds.add(match[1]);
      }
    });

    // Buscar el texto de cada id en song_texts.txt
    return Array.from(songIds).map(id => {
      const textLine = songTexts.find(line => line.startsWith(id + "|")) || "";
      return textLine.replace(/^\d+\|/, "");
    });
  }

  // Crea el panel flotante una sola vez
  const songPanel = document.createElement("div");
  songPanel.className = "songs-floating";
  songPanel.style.display = "none";
  document.body.appendChild(songPanel);

  function createNode(node, x, y, container) {
    const div = document.createElement("div");
    div.className = "node";
    if (node.notes.includes("W")) {
      div.classList.add("weak-horn");
    }
    div.style.left = x + "px";
    div.style.top = y + "px";

    div.dataset.id = node.id;
    div.dataset.parent = node.parent || null;
    div.dataset.notes = node.notes; // <-- Añade esto

    // Obtiene los textos de las canciones
    const songTexts = getSongTextsForNotes(node.notes);

    div.innerHTML = `
      <div class="name">${node.name_en}</div>
      <div class="notes">${notesToImages(node.notes)}</div>
      <div class="rarity">★${node.rarity}</div>
    `;

    // Eventos para mostrar el panel flotante
    div.addEventListener("mouseenter", e => {
      songPanel.innerHTML = songTexts.map(txt => `<div class="song">${txt}</div>`).join("");
      songPanel.style.display = "block";
      // Posiciona el panel cerca del nodo
      const rect = div.getBoundingClientRect();
      songPanel.style.left = (rect.left + rect.width / 2 - songPanel.offsetWidth / 2) + "px";
      songPanel.style.top = (rect.bottom + 8) + "px";
    });
    div.addEventListener("mouseleave", e => {
      songPanel.style.display = "none";
    });

    container.appendChild(div);
    return div;
  }

  function drawConnections(nodes, ctx) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.strokeStyle = "#aaa";
    ctx.lineWidth = 2;

    const container = document.getElementById("container");
    const containerRect = container.getBoundingClientRect();

    // Agrupa hijos por padre
    const parentMap = {};
    nodes.forEach(node => {
      const parentId = node.dataset.parent;
      if (parentId && parentId !== "null") {
        if (!parentMap[parentId]) parentMap[parentId] = [];
        parentMap[parentId].push(node);
      }
    });

    Object.keys(parentMap).forEach(parentId => {
      const parent = document.querySelector(`[data-id='${parentId}']`);
      if (!parent) return;
      const rectParent = parent.getBoundingClientRect();
      const x1 = rectParent.left - containerRect.left + rectParent.width;
      const y1 = rectParent.top - containerRect.top + rectParent.height / 2;

      const children = parentMap[parentId];
      if (children.length === 1) {
        // Solo un hijo: línea horizontal directa
        const child = children[0];
        const rectChild = child.getBoundingClientRect();
        const x2 = rectChild.left - containerRect.left;
        const y2 = rectChild.top - containerRect.top + rectChild.height / 2;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      } else {
        // Bifurcación: línea horizontal y vertical
        // Encuentra el rango vertical de los hijos
        const yChildren = children.map(child => {
          const rect = child.getBoundingClientRect();
          return rect.top - containerRect.top + rect.height / 2;
        });
        const minY = Math.min(...yChildren);
        const maxY = Math.max(...yChildren);
        const midX = x1 + 40; // distancia horizontal para la bifurcación

        // Línea horizontal corta desde padre
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(midX, y1);
        ctx.stroke();

        // Línea vertical que une todos los hijos
        ctx.beginPath();
        ctx.moveTo(midX, minY);
        ctx.lineTo(midX, maxY);
        ctx.stroke();

        // Líneas horizontales desde la vertical a cada hijo
        children.forEach(child => {
          const rectChild = child.getBoundingClientRect();
          const x2 = rectChild.left - containerRect.left;
          const y2 = rectChild.top - containerRect.top + rectChild.height / 2;

          ctx.beginPath();
          ctx.moveTo(midX, y2);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        });
      }
    });
  }

  // Paso 1: Calcula el tamaño de cada sub-árbol
  function getSubtreeSize(node) {
    if (!node.children || node.children.length === 0) return 1;
    return node.children.map(getSubtreeSize).reduce((a, b) => a + b, 0);
  }

  // Paso 2: Renderiza el árbol usando el tamaño calculado
  function renderTree(node, depth, topY, parentId = null) {
    const subtreeSize = getSubtreeSize(node);

    let nodeY = topY;
    if (node.children && node.children.length > 0) {
      nodeY = topY;
    } else {
      nodeY = topY + (subtreeSize * spacingY) / 2 - spacingY / 2;
    }

    const el = createNode({ ...node, parent: parentId }, depth * spacingX + 50, nodeY, container);

    let childY = topY;
    if (node.children && node.children.length > 0) {
      node.children.forEach((child, idx) => {
        const childSize = getSubtreeSize(child);
        renderTree(child, depth + 1, childY, node.id);
        childY += childSize * spacingY;
      });
    }
  }

  // Renderiza cada árbol del bosque
  let forestY = 50;
  forest.forEach(tree => {
    const treeSize = getSubtreeSize(tree);
    renderTree(tree, 0, forestY);
    forestY += treeSize * spacingY + 50;
  });

  requestAnimationFrame(() => {
    const nodes = document.querySelectorAll(".node");
    drawConnections(nodes, ctx);
  });

  window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const nodes = document.querySelectorAll(".node");
    drawConnections(nodes, ctx);
  });

  // Crear la barra lateral de canciones
  const songList = document.getElementById("song-list");
  const songNames = songTexts.map(line => line.replace(/^\d+\|/, ""));
  songNames.forEach((name, idx) => {
    const li = document.createElement("li");
    li.textContent = name;
    li.dataset.songId = (idx + 1).toString();
    songList.appendChild(li);
  });

  // Mapeo: para cada nodo, guarda los IDs de canciones que tiene
  const nodeSongMap = {};
  document.querySelectorAll(".node").forEach(node => {
    const notes = node.dataset.notes; // <-- Usa el atributo data-notes
    const songIds = new Set();
    const indices = songsInHorns[notes] || [];
    indices.forEach(idx => {
      const line = songsLines[idx - 1] || "";
      const match = line.match(/^(\d+)\|/);
      if (match) songIds.add(match[1]);
    });
    nodeSongMap[node.dataset.id] = songIds;
  });

  // Selección múltiple de canciones
  let selectedSongIds = new Set();

  songList.addEventListener("click", e => {
    if (e.target.tagName !== "LI") return;
    const songId = e.target.dataset.songId;
    if (selectedSongIds.has(songId)) {
      selectedSongIds.delete(songId);
      e.target.classList.remove("selected");
    } else {
      selectedSongIds.add(songId);
      e.target.classList.add("selected");
    }

    // Actualiza el resaltado de las gaitas
    document.querySelectorAll(".node").forEach(node => {
      const nodeIds = nodeSongMap[node.dataset.id];
      // Destaca solo si tiene todas las canciones seleccionadas
      if (
        selectedSongIds.size > 0 &&
        [...selectedSongIds].every(id => nodeIds && nodeIds.has(id))
      ) {
        node.classList.add("highlighted");
      } else {
        node.classList.remove("highlighted");
      }
    });
  });
});
