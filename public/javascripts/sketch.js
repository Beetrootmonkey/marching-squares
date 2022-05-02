let grid = {};
let cellSize = 40;

let noiseScale = 10;
let openSimplex;

// Amount of distinct values
// 1 means 0
// 2 means 0 and 0.5
// 3 mean 0, 0.33 and 0.67
// 4 means 0, 0.25, 0.5 and 0.75
const levels = 2;

const cameraSpeed = 20;
const cameraPadding = 2;

const mouseClickTypes = new Array(levels).fill(0).map((e, i) => i / (levels - 1));

// Which sample rate index to "place" on left-click
let mouseClickIndex = 0;

// Which sample rate value to "place" on left-click, can have values of the sampleRates array
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
    console.log('avg == null:', valueA, valueB);
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

const getKey = (x, y) => x + ' ' + y

const getCell = (x, y) => grid[getKey(x, y)];

const setCell = (x, y, value) => grid[getKey(x, y)] = value;

const getNoiseValue = (x, y) => openSimplex.noise2D(x / noiseScale, y / noiseScale) + 0.5;

const createCell = (x, y) => {
  if (getCell(x, y) == null) {
    setCell(x, y, getNoiseValue(x, y));
  }

  return getCell(x, y);
}

function setup() {
  frameRate(60);
  createCanvas(windowWidth, windowHeight);
  // noSmooth();
  // openSimplex = openSimplexNoise(random(42));
  openSimplex = openSimplexNoise(41);

  screenToWorld = (x, y) => createVector(x, y).sub(viewport.offset);
  worldToScreen = (x, y) => createVector(x, y).add(viewport.offset);

  for(let j = 0; j <= height / cellSize; j++) {
    grid[j] = [];
    for(let i = 0; i <= width / cellSize; i++) {
      createCell(i, j);
    }
  }
}

// ---------- MOUSE HANDLING ----------

function mouseWheel(event) {
  mouseClickIndex -= Math.sign(event.delta);
  mouseClickIndex = clamp(mouseClickIndex, 0, mouseClickTypes.length - 1)

  mouseClickType = mouseClickTypes[mouseClickIndex];
  console.log('Set value to', mouseClickType);

  // Return FALSE to block page scrolling
  return false;
}

function mousePressed(event) {
  // We only care for left-clicks
  if (event.which === 1) {
    mouseDown = true;
    
    const worldPos = screenToWorld(event.x, event.y);

    const mouseGridX = Math.round(worldPos.x / cellSize);
    const mouseGridY = Math.round(worldPos.y / cellSize);
    setCell(mouseGridX, mouseGridY, mouseClickType);
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
    
  const worldPos = screenToWorld(mouseX, mouseY);
  const mouseGridX = Math.round(worldPos.x / cellSize);
  const mouseGridY = Math.round(worldPos.y / cellSize);

  if (mouseDown) {
    setCell(mouseGridX, mouseGridY, mouseClickType);
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

  const mouseScreenPos = worldToScreen(mouseGridX * cellSize, mouseGridY * cellSize);

  stroke(255 - mouseClickType * 255);
  strokeWeight(1);
  fill(mouseClickType * 255);
  circle(mouseScreenPos.x, mouseScreenPos.y, cellSize);
}
