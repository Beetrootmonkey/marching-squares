// All the cells in the world
let cells = {};

// All the chunks in the world
let chunks = {};

// Method to construct a key for 'cells' or 'chunks'
const getKey = (x, y) => x + ' ' + y;

// Cell size in pixels (width and height)
let cellSize = 40;

// Chunk size in cells (width and height)
// Big chunks means less chunks to draw, but a bigger image to render/reconstruct when modifying a chunk
let chunkSize = 4

// Scale of the OpenSimplexNoise
let noiseScale = 10;
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

const pencilStrength = 0.5;

// Radius in cell size excluding the middle (0 is a single cell, 1 is 3x3 cells, 2 is 5x5, ...)
const pencilSize = 2;

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

const drawLine = (a, b) => {
  stroke('white');
  strokeWeight(1);
  line(a.x, a.y, b.x, b.y);
}

const vtx = (corner) => {
  return vertex(corner.x, corner.y);
};

const edge = (cornerA, cornerB, valueA, valueB) => {
  const avg = (valueA + valueB) * 0.5;
  // const diff = cornerB.sub()
  // return vtx(createVector());
  // const avg = 0.5;
  if (isNaN(avg)) {
    console.error('avg is NaN:', valueA, valueB);
  }
  vtx(cornerB.copy().sub(cornerA).mult(avg).add(cornerA));
};

const drawState = (state, color, nwValue, neValue, seValue, swValue, nw, ne, se, sw, n, e, s, w) => {
  noStroke();
  fill(color);
  switch(state) {
    case 0b0001:
      beginShape();
      edge(nw, sw, nwValue, swValue);
      edge(sw, se, swValue, seValue);
      vtx(sw);
      endShape(CLOSE);
      // drawLine(w, s);
      break;
    case 0b0010:
      beginShape();
      edge(sw, se, swValue, seValue);
      edge(ne, se, neValue, seValue);
      vtx(se);
      endShape(CLOSE);
      // drawLine(e, s);
      break;
    case 0b0011:
      beginShape();
      edge(nw, sw, nwValue, swValue);
      edge(ne, se, neValue, seValue);
      vtx(se);
      vtx(sw);
      endShape(CLOSE);
      // drawLine(w, e);
      break;
    case 0b0100:
      beginShape();
      edge(nw, ne, nwValue, neValue);
      vtx(ne);
      edge(ne, se, neValue, seValue);
      endShape(CLOSE);
      // drawLine(n, e);
      break;
    case 0b0101:
      beginShape();
      edge(nw, ne, nwValue, neValue);
      vtx(ne);
      edge(ne, se, neValue, seValue);
      endShape(CLOSE);
      beginShape();
      edge(nw, sw, nwValue, swValue);
      edge(sw, se, swValue, seValue);
      vtx(sw);
      endShape(CLOSE);
      // drawLine(n, e);
      // drawLine(w, s);
      break;
    case 0b0110:
      beginShape();
      edge(nw, ne, nwValue, neValue);
      vtx(ne);
      vtx(se);
      edge(sw, se, swValue, seValue);
      endShape(CLOSE);
      // drawLine(n, s);
      break;
    case 0b0111:
      beginShape();
      edge(nw, ne, nwValue, neValue);
      vtx(ne);
      vtx(se);
      vtx(sw);
      edge(nw, sw, nwValue, swValue);
      endShape(CLOSE);
      // drawLine(n, w);
      break;
    case 0b1000:
      beginShape();
      edge(nw, ne, nwValue, neValue);
      edge(nw, sw, nwValue, swValue);
      vtx(nw);
      endShape(CLOSE);
      // drawLine(n, w);
      break;
    case 0b1001:
      beginShape();
      edge(nw, ne, nwValue, neValue);
      edge(sw, se, swValue, seValue);
      vtx(sw);
      vtx(nw);
      endShape(CLOSE);
      // drawLine(n, s);
      break;
    case 0b1010:
      beginShape();
      edge(nw, ne, nwValue, neValue);
      edge(nw, sw, nwValue, swValue);
      vtx(nw);
      endShape(CLOSE);
      beginShape();
      edge(ne, se, neValue, seValue);
      vtx(se);
      edge(sw, se, swValue, seValue);
      endShape(CLOSE);
      // drawLine(n, w);
      // drawLine(e, s);
      break;
    case 0b1011:
      beginShape();
      edge(nw, ne, nwValue, neValue);
      edge(ne, se, neValue, seValue);
      vtx(se);
      vtx(sw);
      vtx(nw);
      endShape(CLOSE);
      // drawLine(n, e);
      break;
    case 0b1100:
      beginShape();
      vtx(nw);
      vtx(ne);
      edge(ne, se, neValue, seValue);
      edge(nw, sw, nwValue, swValue);
      endShape(CLOSE);
      // drawLine(w, e);
      break;
    case 0b1101:
      beginShape();
      edge(ne, se, neValue, seValue);
      edge(sw, se, swValue, seValue);
      vtx(sw);
      vtx(nw);
      vtx(ne);
      endShape(CLOSE);
      // drawLine(e, s);
      break;
    case 0b1110:
      beginShape();
      vtx(nw);
      vtx(ne);
      vtx(se);
      edge(sw, se, swValue, seValue);
      edge(nw, sw, nwValue, swValue);
      endShape(CLOSE);
      // drawLine(w, s);
      break;
    case 0b1111:
      beginShape();
      vtx(nw);
      vtx(ne);
      vtx(se);
      vtx(sw);
      endShape(CLOSE);
  }
}

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const sample = (value, level) => {
  return value;
}

const isWall = (value, level) => {
  return Math.floor(value * levels) >= level ? 1 : 0;
}

const getCell = (x, y) => cells[getKey(x, y)];

const setCell = (x, y, value) => {
  cells[getKey(x, y)] = value

  // TODO: renderChunk();
};

const getNoiseValue = (x, y) => openSimplex.noise2D(x / noiseScale, y / noiseScale) + 0.5;

const createCell = (x, y) => {
  if (getCell(x, y) == null) {
    setCell(x, y, getNoiseValue(x, y));
  }

  return getCell(x, y);
}

// Draws the saved image on the screen
const drawChunk = (x, y) => {
  // TODO: Implement
};

// TODO: Maybe have a slight delay in case more cells in the same chunk get edited
// TODO: Maybe make it so chunks combine into bigger and bigger chunks over time and split down into small chunks and smaller when you edit one or more cells
// Renders all the cells in a chunk to an image and saves it
const renderChunk = (x, y) => {
  // TODO: Implement
};

function setup() {
  frameRate(60);
  createCanvas(windowWidth, windowHeight);
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
}

// x and y are in screen coords
const applyPencil = (x, y) => {
  const worldPos = screenToWorld(x, y);
  const gridPos = worldToGrid(worldPos.x, worldPos.y);
  const maxDistance = pencilSize * cellSize;

  for (let j = -pencilSize; j <= pencilSize; j++) {
    for (let i = -pencilSize; i <= pencilSize; i++) {
      const cellGridPos = gridPos.copy().add(createVector(i, j));
      const cellWorldPos = gridToWorld(cellGridPos.x, cellGridPos.y);
      const distance = dist(cellWorldPos.x, cellWorldPos.y, worldPos.x, worldPos.y);
      const distanceFactor = clamp(distance / maxDistance, 0, 1);
      const inverseDistanceFactor = 1 - distanceFactor;
      const strengthFactor = maxDistance > 0 ? inverseDistanceFactor : 1;
      const strength = pencilStrength * strengthFactor;

      modifyCell(cellGridPos.x, cellGridPos.y, strength);
    }
  }
}

// x and y are in grid coords
const modifyCell = (x, y, strength) => {
  setCell(x, y, lerp(getCell(x, y), mouseClickType, strength));
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
    mouseClickType = getCell(x, y) * (mouseClickTypes.length - 1);
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
  viewport.offset = createVector(viewport.x, viewport.y).mult(-1);

  if (mouseDown) {
    applyPencil(mouseX, mouseY);
  }

  background(0);
  for(let l = 0; l < levels; l++) {
    for(let j = viewport.gridY - cameraPadding; j < viewport.gridY + viewport.gridHeight + cameraPadding; j++) {
      for(let i = viewport.gridX - cameraPadding; i < viewport.gridX + viewport.gridWidth + cameraPadding; i++) {

        createCell(i, j);
        createCell(i + 1, j);
        createCell(i + 1, j + 1);
        createCell(i, j + 1);

        const nwValue = sample(getCell(i, j), l);
        const neValue = sample(getCell(i + 1, j), l);
        const seValue = sample(getCell(i + 1, j + 1), l);
        const swValue = sample(getCell(i, j + 1), l);

        const state = isWall(getCell(i, j), l) * 8
          + isWall(getCell(i + 1, j), l) * 4
          + isWall(getCell(i + 1, j + 1), l) * 2
          + isWall(getCell(i, j + 1), l);

        const nw = createVector(i, j).mult(cellSize).add(viewport.offset);
        const n = createVector(i + 0.5, j).mult(cellSize).add(viewport.offset);
        const ne = createVector(i + 1, j).mult(cellSize).add(viewport.offset);
        const e = createVector(i + 1, j + 0.5).mult(cellSize).add(viewport.offset);
        const se = createVector(i + 1, j + 1).mult(cellSize).add(viewport.offset);
        const s = createVector(i + 0.5, j + 1).mult(cellSize).add(viewport.offset);
        const sw = createVector(i, j + 1).mult(cellSize).add(viewport.offset);
        const w = createVector(i, j + 0.5).mult(cellSize).add(viewport.offset);

        drawState(state, l / (levels - 1) * 255, nwValue, neValue, seValue, swValue, nw, ne, se, sw, n, e, s, w);
      }
    }
  }

  // for(let l = 0; l < levels; l++) {
  //   for(let j = viewport.gridY - cameraPadding; j < viewport.gridY + viewport.gridHeight + cameraPadding; j++) {
  //     for(let i = viewport.gridX - cameraPadding; i < viewport.gridX + viewport.gridWidth + cameraPadding; i++) {

  //       createCell(i, j);

  //       const cell = getCell(i, j);
  //       stroke(255 - cell * 255);
  //       strokeWeight(1);
  //       fill(cell * 255);
  //       circle(i * cellSize, j * cellSize, cellSize * 0.4);
  //     }
  //   }
  // }
  
  stroke(255 - mouseClickType * 255);
  strokeWeight(1);
  fill(mouseClickType * 255);
  circle(mouseX, mouseY, (pencilSize + 1) * cellSize);
}
