// All the cells in the world
let cells = {};

// All the chunks in the world
let chunks = {};

// Method to construct a key for 'cells' or 'chunks'
const getKey = (x, y) => x + ' ' + y;

// Cell size in pixels (width and height)
let cellSize = 64;

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

const renderCell = (state, color, level, nwValue, neValue, seValue, swValue, gridPos, nw, ne, se, sw, n, e, s, w) => {
  // noStroke();
  // fill(color);
  //tint(color, color, color);


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

  return img;
}

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const sample = (value, level) => {
  return value;
}

const isWall = (value, level) => Math.floor(value * levels) >= level ? 1 : 0;

const getNoiseValue = (x, y) => openSimplex.noise2D(x / noiseScale, y / noiseScale) * 0.5 + 0.5;

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
    value: getNoiseValue(x, y)
  };
  setCell(x, y, newCell);

  return newCell;
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

let wallTexture;
let floorTexture;

function preload() {
  floorTexture = loadImage('../assets/deepslate.png');
  wallTexture = loadImage('../assets/stone.png');
}

function setup() {
  frameRate(60);
  createCanvas(windowWidth, windowHeight, WEBGL);

  floorTexture = scaleImage(floorTexture, 4);
  wallTexture = scaleImage(wallTexture, 4);

  // noSmooth();
  // openSimplex = openSimplexNoise(random(42));
  openSimplex = openSimplexNoise(41);

  screenToWorld = (x, y) => createVector(x, y).sub(viewport.offset);
  worldToScreen = (x, y) => createVector(x, y).add(viewport.offset);
  worldToGrid = (x, y) => createVector(Math.floor(x / cellSize), Math.floor(y / cellSize));
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
  setCellValue(x, y, lerp(getCellValue(x, y), mouseClickType, strength));
  setCellImage(x, y, null);
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
  viewport.offset = createVector(viewport.x, viewport.y).mult(-1);

  if (mouseDown) {
    applyPencil(mouseX, mouseY);
  }

  background(80);
  // for(let l = 0; l < levels; l++) {
  const l = 1;
  for(let j = viewport.gridY - cameraPadding; j < viewport.gridY + viewport.gridHeight + cameraPadding; j++) {
    for(let i = viewport.gridX - cameraPadding; i < viewport.gridX + viewport.gridWidth + cameraPadding; i++) {

      createCell(i, j);
      createCell(i + 1, j);
      createCell(i + 1, j + 1);
      createCell(i, j + 1);

      const gridPos = createVector(i, j);

      if (!getCell(i,j).image) {
        const nwValue = sample(getCellValue(i, j), l);
        const neValue = sample(getCellValue(i + 1, j), l);
        const seValue = sample(getCellValue(i + 1, j + 1), l);
        const swValue = sample(getCellValue(i, j + 1), l);

        const state = isWall(getCellValue(i, j), l) * 8
          + isWall(getCellValue(i + 1, j), l) * 4
          + isWall(getCellValue(i + 1, j + 1), l) * 2
          + isWall(getCellValue(i, j + 1), l);

        const nw = createVector(0, 0);
        const n = createVector(0.5, 0);
        const ne = createVector(1, 0);
        const e = createVector(1, 0.5);
        const se = createVector(1, 1);
        const s = createVector(0.5, 1);
        const sw = createVector(0, 1);
        const w = createVector(0, 0.5);

        const img = renderCell(state, l / (levels - 1) * 255, l, nwValue, neValue, seValue, swValue, gridPos, nw, ne, se, sw, n, e, s, w);
        setCellImage(i, j, img);
      }

      const coords = gridPos.copy().mult(cellSize).add(viewport.offset);
      image(getCellImage(i, j), coords.x, coords.y);
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
  circle(mouseX, mouseY, (pencilSize + 1) * cellSize);

  rect(mScreen.x, mScreen.y, cellSize, cellSize);
}
