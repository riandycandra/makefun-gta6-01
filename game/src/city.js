// city.js - Procedural open-world city map, building layout, and collision system

import { CONFIG } from './config.js';

export class City {
  constructor() {
    this.width = CONFIG.WORLD_WIDTH;
    this.height = CONFIG.WORLD_HEIGHT;
    this.roadWidth = CONFIG.ROAD_WIDTH;
    this.blockSize = CONFIG.BLOCK_SIZE;

    this.buildings = [];
    this.roads = [];
    this.intersections = [];
    this.props = [];
    this.districts = [
      { name: "Ocean Drive", x: 0, y: 0, w: 1800, h: 1800, theme: "beach", color: "#f43f5e" },
      { name: "Downtown Core", x: 1800, y: 0, w: 1800, h: 1800, theme: "corporate", color: "#06b6d4" },
      { name: "Little Havana", x: 0, y: 1800, w: 1800, h: 1800, theme: "residential", color: "#f59e0b" },
      { name: "Porto Diablo Docks", x: 1800, y: 1800, w: 1800, h: 1800, theme: "industrial", color: "#a855f7" },
    ];

    this.gridSize = 200;
    this.spatialHash = new Map();

    this.generate();
  }

  generate() {
    // Generate main avenue road grid
    const cols = Math.floor(this.width / this.blockSize);
    const rows = Math.floor(this.height / this.blockSize);

    // Horizontal roads
    for (let r = 0; r <= rows; r++) {
      const y = r * this.blockSize;
      this.roads.push({
        x: 0,
        y: y - this.roadWidth / 2,
        w: this.width,
        h: this.roadWidth,
        axis: "x",
        center: y,
      });
    }

    // Vertical roads
    for (let c = 0; c <= cols; c++) {
      const x = c * this.blockSize;
      this.roads.push({
        x: x - this.roadWidth / 2,
        y: 0,
        w: this.roadWidth,
        h: this.height,
        axis: "y",
        center: x,
      });
    }

    // Intersections and traffic lights
    for (let r = 0; r <= rows; r++) {
      for (let c = 0; c <= cols; c++) {
        const x = c * this.blockSize;
        const y = r * this.blockSize;
        this.intersections.push({
          x: x - this.roadWidth / 2,
          y: y - this.roadWidth / 2,
          w: this.roadWidth,
          h: this.roadWidth,
          cx: x,
          cy: y,
          lightState: (r + c) % 2 === 0 ? "ns_green" : "ew_green",
          timer: 0,
        });
      }
    }

    // Generate city blocks & buildings
    const neonNames = [
      "VICE CASINO", "NEON SHORES", "CLUB TROPICANA", "AMMO NATION",
      "PALM RESORT", "PORT LOGISTICS", "HOTEL DEL SOL", "HAVANA BISTRO",
      "CYBER BANK", "VIPER LOUNGE", "SUNSET CONDOS", "KOBRA IMPORTS"
    ];

    let nameIdx = 0;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const blockX = c * this.blockSize + this.roadWidth / 2 + 15;
        const blockY = r * this.blockSize + this.roadWidth / 2 + 15;
        const blockW = this.blockSize - this.roadWidth - 30;
        const blockH = this.blockSize - this.roadWidth - 30;

        const district = this.getDistrictAt(blockX + blockW / 2, blockY + blockH / 2);

        // Partition block into buildings or plazas
        if (district.theme === "beach" && c === 0) {
          // Open beach park with palm trees on west ocean border
          for (let p = 0; p < 8; p++) {
            this.props.push({
              type: "palm_tree",
              x: blockX + 30 + Math.random() * (blockW - 60),
              y: blockY + 30 + Math.random() * (blockH - 60),
              radius: 18,
            });
          }
          continue;
        }

        // Subdivide block into 2x2 or 2x1 buildings
        const subCols = district.theme === "corporate" ? 2 : 2;
        const subRows = district.theme === "industrial" ? 1 : 2;
        const bw = (blockW - (subCols - 1) * 16) / subCols;
        const bh = (blockH - (subRows - 1) * 16) / subRows;

        for (let sc = 0; sc < subCols; sc++) {
          for (let sr = 0; sr < subRows; sr++) {
            const bx = blockX + sc * (bw + 16);
            const by = blockY + sr * (bh + 16);
            const height = district.theme === "corporate" ? 140 + Math.random() * 120 :
                           district.theme === "industrial" ? 50 + Math.random() * 40 :
                           district.theme === "beach" ? 70 + Math.random() * 60 : 45 + Math.random() * 35;

            const hasNeon = Math.random() > 0.45;
            const sign = hasNeon ? neonNames[nameIdx % neonNames.length] : null;
            if (hasNeon) nameIdx++;

            const building = {
              x: bx,
              y: by,
              w: bw,
              h: bh,
              height,
              theme: district.theme,
              roofColor: district.theme === "corporate" ? "#1e293b" :
                         district.theme === "beach" ? "#334155" :
                         district.theme === "industrial" ? "#374151" : "#475569",
              wallColor: "#0f172a",
              sign,
              signColor: hasNeon ? district.color : null,
              hasHelipad: district.theme === "corporate" && Math.random() > 0.6,
            };

            this.buildings.push(building);
            this.addToSpatialHash(building);
          }
        }

        // Street corner palm trees / hydrants
        this.props.push({ type: "palm_tree", x: blockX - 6, y: blockY - 6, radius: 12 });
        this.props.push({ type: "hydrant", x: blockX + blockW + 6, y: blockY - 6, radius: 6 });
      }
    }
  }

  getDistrictAt(x, y) {
    for (const d of this.districts) {
      if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d;
    }
    return this.districts[0];
  }

  addToSpatialHash(obj) {
    const minGX = Math.floor(obj.x / this.gridSize);
    const maxGX = Math.floor((obj.x + obj.w) / this.gridSize);
    const minGY = Math.floor(obj.y / this.gridSize);
    const maxGY = Math.floor((obj.y + obj.h) / this.gridSize);

    for (let gx = minGX; gx <= maxGX; gx++) {
      for (let gy = minGY; gy <= maxGY; gy++) {
        const key = `${gx},${gy}`;
        if (!this.spatialHash.has(key)) this.spatialHash.set(key, []);
        this.spatialHash.get(key).push(obj);
      }
    }
  }

  getNearbyBuildings(x, y, radius = 100) {
    const minGX = Math.floor((x - radius) / this.gridSize);
    const maxGX = Math.floor((x + radius) / this.gridSize);
    const minGY = Math.floor((y - radius) / this.gridSize);
    const maxGY = Math.floor((y + radius) / this.gridSize);

    const candidates = new Set();
    for (let gx = minGX; gx <= maxGX; gx++) {
      for (let gy = minGY; gy <= maxGY; gy++) {
        const bucket = this.spatialHash.get(`${gx},${gy}`);
        if (bucket) {
          for (const b of bucket) candidates.add(b);
        }
      }
    }
    return Array.from(candidates);
  }

  checkCollision(x, y, radius) {
    const buildings = this.getNearbyBuildings(x, y, radius + 20);
    for (const b of buildings) {
      // Circle vs AABB collision
      const closestX = Math.max(b.x, Math.min(x, b.x + b.w));
      const closestY = Math.max(b.y, Math.min(y, b.y + b.h));
      const dx = x - closestX;
      const dy = y - closestY;
      if (dx * dx + dy * dy < radius * radius) {
        return { collided: true, hit: b, normalX: dx, normalY: dy };
      }
    }
    // World boundary
    if (x - radius < 0 || x + radius > this.width || y - radius < 0 || y + radius > this.height) {
      return { collided: true, worldEdge: true };
    }
    return { collided: false };
  }

  update(dt) {
    // Update traffic lights
    for (const inter of this.intersections) {
      inter.timer += dt;
      if (inter.timer > 7.0) {
        inter.timer = 0;
        inter.lightState = inter.lightState === "ns_green" ? "ew_green" : "ns_green";
      }
    }
  }
}
