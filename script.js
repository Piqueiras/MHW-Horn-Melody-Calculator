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

function createNode(node, x, y, container) {
  const div = document.createElement("div");
  div.className = "node";
  div.style.left = x + "px";
  div.style.top = y + "px";

  div.dataset.id = node.id;
  div.dataset.parent = node.parent || null;

  div.innerHTML = `
    <div class="name">${node.name_en}</div>
    <div class="notes">${notesToImages(node.notes)}</div>
    <div class="rarity">★${node.rarity}</div>
  `;

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

fetch("horn_crafting_forest.json")
  .then(res => res.json())
  .then(data => {
    const forest = data.forest;
    const container = document.getElementById("container");
    const canvas = document.getElementById("connections");
    const ctx = canvas.getContext("2d");

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const spacingX = 240; // más espacio horizontal
    const spacingY = 120; // más espacio vertical

    // Paso 1: Calcula el tamaño de cada sub-árbol
    function getSubtreeSize(node) {
      if (!node.children || node.children.length === 0) return 1;
      return node.children.map(getSubtreeSize).reduce((a, b) => a + b, 0);
    }

    // Paso 2: Renderiza el árbol usando el tamaño calculado
    function renderTree(node, depth, topY, parentId = null) {
      const subtreeSize = getSubtreeSize(node);

      // Si tiene hijos, el primer hijo va alineado horizontalmente con el padre
      let nodeY = topY;
      if (node.children && node.children.length > 0) {
        // El padre se alinea con el primer hijo
        nodeY = topY;
      } else {
        // Si no tiene hijos, se centra en el espacio asignado
        nodeY = topY + (subtreeSize * spacingY) / 2 - spacingY / 2;
      }

      const el = createNode({ ...node, parent: parentId }, depth * spacingX + 50, nodeY, container);

      let childY = topY;
      if (node.children && node.children.length > 0) {
        node.children.forEach((child, idx) => {
          const childSize = getSubtreeSize(child);
          // El primer hijo va justo debajo del padre, los siguientes debajo del anterior
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

    // Espera al siguiente frame para dibujar las conexiones
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
  });
