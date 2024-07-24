// All the cells in the world
let cells = {};

// All the chunks in the world
let chunks = {};

// Method to construct a key for 'cells' or 'chunks'
const getKey = (x, y) => x + ' ' + y;

const sizeFactor = 2;

// Cell size in pixels (width and height)
const cellSize = 16 * sizeFactor;

// Chunk size is in cells (width and height), but it's the exponent to 2.
// Big chunks means less chunks to draw, but a bigger image to render/reconstruct when modifying a chunk.
// 4 = 16x16, 3 = 8x8, 2 = 4x4, 1 = 2x2, 0 = 1x1 (same as one cell)
const chunkSize = 4;

// Scale of the OpenSimplexNoise
const noiseScale = Math.floor(40 / sizeFactor);
let openSimplex;

// Amount of distinct values
// 1 means 0
// 2 means 0 and 0.5
// 3 mean 0, 0.33 and 0.67
// 4 means 0, 0.25, 0.5 and 0.75
const levels = 2;

// How many pixels the camera moves per update
const cameraSpeed = 20;

// How many cells the camera renders outside of its viewport
const cameraPadding = 2;

const mouseClickTypes = new Array(levels).fill(0).map((e, i) => i / (levels - 1));

const pencilStrength = 1;

// Radius in cell size excluding the middle (0 is a single cell, 1 is 3x3 cells, 2 is 5x5, ...)
const pencilSize = 4 / sizeFactor;

// Which sample rate value to "place" on left-click, can have values of the mouseClickTypes array
let mouseClickType = 0;

let mouseDown = false;

const viewport = {
  x: 0,
  y: 0,
  gridX: 0,
  gridY: 0,
  gridWidth: 0,
  gridHeight: 0,
  offset: null
};

let screenToWorld;
let worldToScreen;

// Returns a scaled-up copy
const scaleImage = (image, scale) => {
  textureMode(IMAGE);
  const width = image.width * scale;
  const height = image.height * scale;

  const temp = createImage(width, height);

  image.loadPixels();
  temp.loadPixels();
  for (let j = 0; j < height; j++) {
    for (let i = 0; i < width; i++) {
      const x = Math.floor(i / scale);
      const y = Math.floor(j / scale);
      const c = image.get(x, y);
      temp.set(i, j, c);
    }
  }
  image.updatePixels();
  temp.updatePixels();

  return temp;
};

const drawLine = (a, b) => {
  stroke('white');
  strokeWeight(1);
  line(a.x, a.y, b.x, b.y);
};

// offset is normalized to cell size
const vtx = (canvas, gridPos, offset) => {
  // const coords = gridPos.copy().add(offset).mult(cellSize).add(viewport.offset);
  const coords = offset.copy().mult(cellSize);
  const uv = offset.copy().mult(cellSize);

  // return vertex(coords.x, coords.y, offset.x, offset.y);
  // return canvas.vertex(coords.x, coords.y, uv.x, uv.y);
  return canvas.vertex(coords.x, coords.y, uv.x, uv.y);
};

const edge = (canvas, gridPos, cornerA, cornerB, valueA, valueB) => {
  // const avg = (valueA + valueB) * 0.5;
  // const diff = cornerB.sub()
  // return vtx(createVector());
  const avg = 0.5;
  if (isNaN(avg)) {
    console.error('avg is NaN:', valueA, valueB);
  }
  vtx(canvas, gridPos, cornerB.copy().sub(cornerA).mult(avg).add(cornerA));
};

let cellRenderer;

const stateRenderCache = {};

const renderCell = (state, color, level, nwValue, neValue, seValue, swValue, gridPos, nw, ne, se, sw, n, e, s, w) => {
  // noStroke();
  // fill(color);
  //tint(color, color, color);

  const cachedValue = stateRenderCache[state];

  if (cachedValue) {
    return cachedValue;
  }


  if (!cellRenderer) {
    cellRenderer = createGraphics(cellSize, cellSize, WEBGL)
    cellRenderer.translate(cellSize / -2, cellSize / -2);
  }

  const canvas = cellRenderer;
  canvas.clear();
  canvas.textureWrap(REPEAT, REPEAT);
  canvas.textureMode(IMAGE);
  canvas.texture(wallTexture);

  switch(state) {
    case 0b0001:
      canvas.beginShape();
      edge(canvas, gridPos, nw, sw, nwValue, swValue);
      edge(canvas, gridPos, sw, se, swValue, seValue);
      vtx(canvas, gridPos, sw);
      canvas.endShape(CLOSE);
      // drawLine(w, s);
      break;
    case 0b0010:
      canvas.beginShape();
      edge(canvas, gridPos, sw, se, swValue, seValue);
      edge(canvas, gridPos, ne, se, neValue, seValue);
      vtx(canvas, gridPos, se);
      canvas.endShape(CLOSE);
      // drawLine(e, s);
      break;
    case 0b0011:
      canvas.beginShape();
      edge(canvas, gridPos, nw, sw, nwValue, swValue);
      edge(canvas, gridPos, ne, se, neValue, seValue);
      vtx(canvas, gridPos, se);
      vtx(canvas, gridPos, sw);
      canvas.endShape(CLOSE);
      // drawLine(w, e);
      break;
    case 0b0100:
      canvas.beginShape();
      edge(canvas, gridPos, nw, ne, nwValue, neValue);
      vtx(canvas, gridPos, ne);
      edge(canvas, gridPos, ne, se, neValue, seValue);
      canvas.endShape(CLOSE);
      // drawLine(n, e);
      break;
    case 0b0101:
      canvas.beginShape();
      edge(canvas, gridPos, nw, ne, nwValue, neValue);
      vtx(canvas, gridPos, ne);
      edge(canvas, gridPos, ne, se, neValue, seValue);
      canvas.endShape(CLOSE);
      canvas.beginShape();
      edge(canvas, gridPos, nw, sw, nwValue, swValue);
      edge(canvas, gridPos, sw, se, swValue, seValue);
      vtx(canvas, gridPos, sw);
      canvas.endShape(CLOSE);
      // drawLine(n, e);
      // drawLine(w, s);
      break;
    case 0b0110:
      canvas.beginShape();
      edge(canvas, gridPos, nw, ne, nwValue, neValue);
      vtx(canvas, gridPos, ne);
      vtx(canvas, gridPos, se);
      edge(canvas, gridPos, sw, se, swValue, seValue);
      canvas.endShape(CLOSE);
      // drawLine(n, s);
      break;
    case 0b0111:
      canvas.beginShape();
      edge(canvas, gridPos, nw, ne, nwValue, neValue);
      vtx(canvas, gridPos, ne);
      vtx(canvas, gridPos, se);
      vtx(canvas, gridPos, sw);
      edge(canvas, gridPos, nw, sw, nwValue, swValue);
      canvas.endShape(CLOSE);
      // drawLine(n, w);
      break;
    case 0b1000:
      canvas.beginShape();
      edge(canvas, gridPos, nw, ne, nwValue, neValue);
      edge(canvas, gridPos, nw, sw, nwValue, swValue);
      vtx(canvas, gridPos, nw);
      canvas.endShape(CLOSE);
      // drawLine(n, w);
      break;
    case 0b1001:
      canvas.beginShape();
      edge(canvas, gridPos, nw, ne, nwValue, neValue);
      edge(canvas, gridPos, sw, se, swValue, seValue);
      vtx(canvas, gridPos, sw);
      vtx(canvas, gridPos, nw);
      canvas.endShape(CLOSE);
      // drawLine(n, s);
      break;
    case 0b1010:
      canvas.beginShape();
      edge(canvas, gridPos, nw, ne, nwValue, neValue);
      edge(canvas, gridPos, nw, sw, nwValue, swValue);
      vtx(canvas, gridPos, nw);
      canvas.endShape(CLOSE);
      canvas.beginShape();
      edge(canvas, gridPos, ne, se, neValue, seValue);
      vtx(canvas, gridPos, se);
      edge(canvas, gridPos, sw, se, swValue, seValue);
      canvas.endShape(CLOSE);
      // drawLine(n, w);
      // drawLine(e, s);
      break;
    case 0b1011:
      canvas.beginShape();
      edge(canvas, gridPos, nw, ne, nwValue, neValue);
      edge(canvas, gridPos, ne, se, neValue, seValue);
      vtx(canvas, gridPos, se);
      vtx(canvas, gridPos, sw);
      vtx(canvas, gridPos, nw);
      canvas.endShape(CLOSE);
      // drawLine(n, e);
      break;
    case 0b1100:
      canvas.beginShape();
      vtx(canvas, gridPos, nw);
      vtx(canvas, gridPos, ne);
      edge(canvas, gridPos, ne, se, neValue, seValue);
      edge(canvas, gridPos, nw, sw, nwValue, swValue);
      canvas.endShape(CLOSE);
      // drawLine(w, e);
      break;
    case 0b1101:
      canvas.beginShape();
      edge(canvas, gridPos, ne, se, neValue, seValue);
      edge(canvas, gridPos, sw, se, swValue, seValue);
      vtx(canvas, gridPos, sw);
      vtx(canvas, gridPos, nw);
      vtx(canvas, gridPos, ne);
      canvas.endShape(CLOSE);
      // drawLine(e, s);
      break;
    case 0b1110:
      canvas.beginShape();
      vtx(canvas, gridPos, nw);
      vtx(canvas, gridPos, ne);
      vtx(canvas, gridPos, se);
      edge(canvas, gridPos, sw, se, swValue, seValue);
      edge(canvas, gridPos, nw, sw, nwValue, swValue);
      canvas.endShape(CLOSE);
      // drawLine(w, s);
      break;
    case 0b1111:
      canvas.beginShape();
      vtx(canvas, gridPos, nw);
      vtx(canvas, gridPos, ne);
      vtx(canvas, gridPos, se);
      vtx(canvas, gridPos, sw);
      canvas.endShape(CLOSE);
  }

  const img = createImage(canvas.width, canvas.height);
  img.copy(canvas, canvas.width / -2, canvas.height / -2, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);

  // canvas.noStroke();
  // // canvas.rect(0, 0, cellSize, cellSize);
  // canvas.beginShape();
  // vtx(canvas, gridPos, nw);
  // vtx(canvas, gridPos, ne);
  // vtx(canvas, gridPos, se);
  // vtx(canvas, gridPos, sw);
  // canvas.endShape(CLOSE);

  stateRenderCache[state] = img;

  return img;
}

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const sample = (value, level) => {
  return value;
}

const isWall = (value, level) => Math.floor(value * levels) >= level ? 1 : 0;

const getNoiseValue = (x, y) => isWall(openSimplex.noise2D(x / noiseScale, y / noiseScale) * 0.5 + 0.5, 1);

const getCell = (x, y) => cells[getKey(x, y)];

const getCellValue = (x, y) => getCell(x, y)?.value;

const getCellImage = (x, y) => getCell(x, y)?.image;

const setCell = (x, y, cell) => {
  cells[getKey(x, y)] = cell;

  // TODO: renderChunk();
};

const setCellValue = (x, y, value) => {
  const cell = cells[getKey(x, y)];

  if (cell) {
    cell.value = value;
  }

  // TODO: renderChunk();
};

const setCellImage = (x, y, image) => {
  const cell = cells[getKey(x, y)];

  if (cell) {
    cell.image = image;
  }

  // TODO: renderChunk();
};

const createCell = (x, y) => {
  const cell = getCell(x, y);

  if (cell) {
    return cell;
  }

  const newCell = {
    gridX: x,
    gridY: y,
    value: getNoiseValue(x, y),
    chunks: []
  };
  setCell(x, y, newCell);

  return newCell;
}

const getChunk = (x, y) => chunks[getKey(x, y)];

const setChunk = (x, y, chunk) => chunks[getKey(x, y)] = chunk;

// gridX and gridY are the coordinates of the upper-left corner, size is the size in cells
const createChildChunk = (gridX, gridY, size, parents) => {
  const chunk = {
    size,
    gridX,
    gridY,
    image: null,
    parents,
    children: null,
    cell: null,
    timeout: null
  };

  if (!parents) {
    parents = [];
  }
  parents = [chunk, ...parents];

  // Chunks bigger than 1 (= 2x2) contain chunks half the size
  if (size > 0) {
    const childSize = size - 1;

    // Number of cells the child chunks are wide and high
    const childCellSize = Math.pow(2, childSize);

    chunk.children = {};

    const createChild = (x, y) => chunk.children[getKey(x, y)] = createChildChunk(gridX + childCellSize * x, gridY + childCellSize * y, childSize, parents);

    createChild(0, 0);
    createChild(1, 0);
    createChild(1, 1);
    createChild(0, 1);
  } else {
    // If the chunk is 1x1, then it will contain a single cell instead of 4 chunks
    chunk.cell = createCell(gridX, gridY);
    chunk.cell.chunks = parents;
    loadCellImage(gridX, gridY);
    tryRerenderChunkRecursive(chunk);
  }

  return chunk;
}

// Gets or creates and gets the chunk at the given coords. x and y are in chunk coords
const createChunk = (x, y) => {
  const chunk = getChunk(x, y);

  if (chunk) {
    return chunk;
  }

  const chunkCellSize = Math.pow(2, chunkSize);
  const newChunk = createChildChunk(x * chunkCellSize, y * chunkCellSize, chunkSize);
  setChunk(x, y, newChunk);

  return newChunk;
}

let chunkRenderer;

// x and y are in screen coords
const drawChunk = (chunk, x, y) => {
  if (!chunk) {
    return;
  }

  const chunkCellSize = Math.pow(2, chunk.size);

  push();

  if (chunk.timeout) {
    stroke('red');
    strokeWeight((chunk.size + 1) * 2);
  } else {
    stroke('green');
    strokeWeight(chunk.size + 1);
  }
  noFill();

  rect(x, y, chunkCellSize * cellSize, chunkCellSize * cellSize);
  pop();

  if (chunk.image) {
    image(chunk.image, x, y);
  } else if (chunk.size > 0) {
    Object.values(chunk.children).forEach((child) => {
      // TODO: Das kann ruhig am Start der Methode passieren statt außerhalb
      const coords = createVector(child.gridX, child.gridY).mult(cellSize).add(viewport.offset)
      drawChunk(child, coords.x, coords.y);
    });
  } else {
    const coords = createVector(chunk.gridX, chunk.gridY).mult(cellSize).add(viewport.offset);
    const img = chunk.cell?.image;

    if (img) {
      image(img, coords.x, coords.y);
    }
  }
};

// TODO: Maybe have a slight delay in case more cells in the same chunk get edited
// TODO: Maybe make it so chunks combine into bigger and bigger chunks over time and split down into small chunks and smaller when you edit one or more cells
// Renders all the cells in a chunk to an image and saves it
const renderChunk = (chunk, force) => {
  clearTimeout(chunk.timeout);
  chunk.timeout = null;

  if (chunk.parents) {
    for (let parent of chunk.parents) {
      if (parent.timeout) {
        clearTimeout(parent.timeout);
        parent.timeout = null;
      }
    }
  }

  if (chunk.image) {
    // If we already have an image, just return that
    return chunk.image;
  } else if (chunk.size > 0) {
    // Render all child chunks and stitch their image together
    const size = Math.pow(2, chunk.size) * cellSize;
    const img = createImage(size, size);

    // TODO: save a combined state (maybe as 16^0, 16^1, 16^2, 16^3 x sub-chunk state) on chunks, and use stateRenderCache to save combined images

    for (let child of Object.values(chunk.children)) {
      const coords = createVector(child.gridX - chunk.gridX, child.gridY - chunk.gridY).mult(cellSize)

      let childImage;
      if (force) {
        childImage = renderChunk(child, true);
      } else {
        childImage = child.image;
      }

      // Abort if we have a child chunk that has no image yet
      if (!force && !childImage) {
        return null;
      }

      if (childImage) {
        img.copy(childImage, 0, 0, childImage.width, childImage.height, coords.x, coords.y, childImage.width, childImage.height);
      }
    };

    chunk.image = img;
    return img;
  } else {
    // If it's a 1x1 chunk, just return its cell's image (if there is one)
    const img = chunk.cell?.image;

    if (img) {
      chunk.image = img;
    }
    return chunk.image;
  }
};

// x and y are in grid coords
const loadCellImage = (x, y) => {
  const l = 1;
  createCell(x, y);
  createCell(x + 1, y);
  createCell(x + 1, y + 1);
  createCell(x, y + 1);

  const gridPos = createVector(x, y);

  if (!getCell(x,y).image) {
    const nwValue = sample(getCellValue(x, y), l);
    const neValue = sample(getCellValue(x + 1, y), l);
    const seValue = sample(getCellValue(x + 1, y + 1), l);
    const swValue = sample(getCellValue(x, y + 1), l);

    const state = isWall(getCellValue(x, y), l) * 8
      + isWall(getCellValue(x + 1, y), l) * 4
      + isWall(getCellValue(x + 1, y + 1), l) * 2
      + isWall(getCellValue(x, y + 1), l);

    const nw = createVector(0, 0);
    const n = createVector(0.5, 0);
    const ne = createVector(1, 0);
    const e = createVector(1, 0.5);
    const se = createVector(1, 1);
    const s = createVector(0.5, 1);
    const sw = createVector(0, 1);
    const w = createVector(0, 0.5);

    const img = renderCell(state, l / (levels - 1) * 255, l, nwValue, neValue, seValue, swValue, gridPos, nw, ne, se, sw, n, e, s, w);
    setCellImage(x, y, img);
  }
}

let wallTexture;
let floorTexture;

function preload() {
  floorTexture = loadImage('../assets/deepslate.png');
  wallTexture = loadImage('../assets/stone.png');
}

function setup() {
  frameRate(30);
  createCanvas(windowWidth, windowHeight, WEBGL);

  floorTexture = scaleImage(floorTexture, sizeFactor);
  wallTexture = scaleImage(wallTexture, sizeFactor);

  // noSmooth();
  // openSimplex = openSimplexNoise(random(42));
  openSimplex = openSimplexNoise(41);

  screenToWorld = (x, y) => createVector(x, y).sub(viewport.offset);
  worldToScreen = (x, y) => createVector(x, y).add(viewport.offset);
  worldToGrid = (x, y) => createVector(Math.round(x / cellSize), Math.round(y / cellSize));
  screenToGrid = (x, y) => {
    const world = screenToWorld(x, y);
    return worldToGrid(world.x, world.y);
  };
  gridToWorld = (x, y) => createVector(x * cellSize, y * cellSize);
  gridToScreen = (x, y) => {
    const world = gridToWorld(x, y);
    return worldToScreen(world.x, world.y);
  };
}

// x and y are in screen coords
const applyPencil = (x, y) => {
  const gridPos = screenToGrid(x, y);
  const worldPos = gridToWorld(gridPos.x, gridPos.y);
  const maxDistance = (pencilSize + 0.5) * cellSize;

  const changed = [];

  for (let j = -pencilSize; j <= pencilSize; j++) {
    for (let i = -pencilSize; i <= pencilSize; i++) {
      const cellGridPos = gridPos.copy().add(createVector(i, j));
      const cellWorldPos = gridToWorld(cellGridPos.x, cellGridPos.y);
      const distance = dist(cellWorldPos.x, cellWorldPos.y, worldPos.x, worldPos.y);

      if (distance > maxDistance) {
        continue;
      }

      // const distanceFactor = clamp(distance / maxDistance, 0, 1);
      // const inverseDistanceFactor = 1 - distanceFactor;
      // const strengthFactor = maxDistance > 0 ? inverseDistanceFactor : 1;
      // const strength = pencilStrength * strengthFactor;

      changed.push(...modifyCell(cellGridPos.x, cellGridPos.y, pencilStrength));
    }
  }

  for (let cell of new Set(changed)) {
    const {gridX, gridY} = cell;
    setCellImage(gridX, gridY, null);
    loadCellImage(gridX, gridY);
    for (let chunk of cell.chunks) {
      chunk.image = null;
    }
    tryRerenderChunkRecursive(cell.chunks[0], 300);
  }
}

const tryRerenderChunkRecursive = (chunk, delay) => {
  if (chunk.timeout) {
    clearTimeout(chunk.timeout);
  }

  if (chunk.parents) {
    for (let parent of chunk.parents) {
      if (parent.timeout) {
        clearTimeout(parent.timeout);
        parent.timeout = null;
      }
    }
  }

  chunk.timeout = setTimeout(() => {
    chunk.timeout = null;
    const img = renderChunk(chunk, false);
    if (img && chunk.parents) {
      const parent = chunk.parents[0];
      tryRerenderChunkRecursive(parent, delay);
    }
  }, delay || Math.random() * 100);
}

// x and y are in grid coords
const modifyCell = (x, y, strength) => {
  const oldValue = getCellValue(x, y);
  const newValue = mouseClickType;

  if (oldValue === newValue) {
    return [];
  }

  setCellValue(x, y, newValue);

  const changed = [];

  for (let j = -1; j < 1; j++) {
    for (let i = -1; i < 1; i++) {
      changed.push(getCell(x + i, y + j));
    }
  }

  return changed;
}

const increaseMouseClickType = (increase) => {
  // Calculate the current index based on the currently chosen value (has decimals)
  let mouseClickIndex = mouseClickType * (mouseClickTypes.length - 1);

  // Increase or decrease the index by 1
  mouseClickIndex += increase;

  // FIXME: Doesn't work right when picking via middle mouse
  // Round the index, if need be
  mouseClickIndex = Math.round(mouseClickIndex);

  // Make sure it's between 0 and the max value
  mouseClickIndex = clamp(mouseClickIndex, 0, mouseClickTypes.length - 1)

  mouseClickType = mouseClickTypes[mouseClickIndex];
  console.log('Set value to', mouseClickType);
}

// ---------- MOUSE HANDLING ----------

function mouseWheel(event) {
  increaseMouseClickType(-Math.sign(event.delta));

  // Return FALSE to block page scrolling
  return false;
}

function mousePressed(event) {
  // We only care for left-clicks
  if (event.which === 1) {
    mouseDown = true;

    applyPencil(event.x, event.y);
  } else if (event.which === 2) {
    const {x, y} = screenToGrid(event.x, event.y);

    // FIXME: Doesn't work right
    mouseClickType = getCellValue(x, y) * (mouseClickTypes.length - 1);
    increaseMouseClickType(0);
  }
}

function mouseReleased(event) {
  // We only care for left-clicks
  if (event.which === 1) {
    mouseDown = false;
  }
}

function draw() {
  translate(windowWidth / -2, windowHeight / -2);

  if (keyIsDown(LEFT_ARROW)) {
    viewport.x -= cameraSpeed;
  }

  if (keyIsDown(RIGHT_ARROW)) {
    viewport.x += cameraSpeed;
  }

  if (keyIsDown(UP_ARROW)) {
    viewport.y -= cameraSpeed;
  }

  if (keyIsDown(DOWN_ARROW)) {
    viewport.y += cameraSpeed;
  }

  viewport.gridX = Math.floor(viewport.x / cellSize);
  viewport.gridY = Math.floor(viewport.y / cellSize);
  viewport.gridWidth = Math.ceil(width / cellSize);
  viewport.gridHeight = Math.ceil(height / cellSize);


  const chunkCellSize = Math.pow(2, chunkSize);
  viewport.chunkX = Math.floor(viewport.x / cellSize / chunkCellSize);
  viewport.chunkY = Math.floor(viewport.y / cellSize / chunkCellSize);
  viewport.chunkWidth = Math.ceil(width / cellSize / chunkCellSize);
  viewport.chunkHeight = Math.ceil(height / cellSize / chunkCellSize);

  viewport.offset = createVector(viewport.x, viewport.y).mult(-1);

  if (mouseDown) {
    applyPencil(mouseX, mouseY);
  }

  background(80);
  // for(let l = 0; l < levels; l++) {
  // const l = 1;
  // for(let j = viewport.gridY - cameraPadding; j < viewport.gridY + viewport.gridHeight + cameraPadding; j++) {
  //   for(let i = viewport.gridX - cameraPadding; i < viewport.gridX + viewport.gridWidth + cameraPadding; i++) {
  //     loadCellImage(i, j);
  //   }
  // }

  // for(let j = viewport.chunkY; j < viewport.chunkY + viewport.chunkHeight + 1; j++) {
  //   for(let i = viewport.chunkX; i < viewport.chunkX + viewport.chunkWidth + 1; i++) {
  //     const chunk = createChunk(i, j);
  //     renderChunk(chunk);
  //   }
  // }

  for(let j = viewport.chunkY; j < viewport.chunkY + viewport.chunkHeight + 1; j++) {
    for(let i = viewport.chunkX; i < viewport.chunkX + viewport.chunkWidth + 1; i++) {

      const chunk = createChunk(i, j);

      const coords = createVector(chunk.gridX, chunk.gridY).mult(cellSize).add(viewport.offset)

      drawChunk(chunk, coords.x, coords.y);
    }
  }

  // for(let j = viewport.gridY - cameraPadding; j < viewport.gridY + viewport.gridHeight + cameraPadding; j++) {
  //   for(let i = viewport.gridX - cameraPadding; i < viewport.gridX + viewport.gridWidth + cameraPadding; i++) {
  //     const cell = getCellValue(i, j);
  //     stroke(255 - cell * 255);
  //     strokeWeight(1);
  //     fill(cell * 255);
  //     const coords = createVector(i, j).mult(cellSize).add(viewport.offset);
  //     circle(coords.x, coords.y, cellSize * 0.4);
  //   }
  // }

  const m = screenToGrid(mouseX, mouseY);
  // image(getCellImage(m.x, m.y), mouseX, mouseY);

  const mScreen = gridToScreen(m.x, m.y);
  stroke('white');
  strokeWeight(1);
  noFill();
  circle(mScreen.x, mScreen.y, (pencilSize * 2 + 1) * cellSize);
}
