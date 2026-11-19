// traffic.js - Ambient civilian vehicles, pedestrian AI, and road pathing

import { Vehicle } from './vehicles.js';

export class TrafficManager {
  constructor(city) {
    this.city = city;
    this.vehicles = [];
    this.pedestrians = [];
    this.maxVehicles = 16;
    this.maxPedestrians = 28;

    this.initSpawn();
  }

  initSpawn() {
    // Populate city roads with initial civilian cars
    const types = ["SPORTS", "SEDAN", "TRUCK"];
    for (let i = 0; i < this.maxVehicles; i++) {
      const road = this.city.roads[Math.floor(Math.random() * this.city.roads.length)];
      const isX = road.axis === "x";
      const x = isX ? 200 + Math.random() * (this.city.width - 400) : road.center + (Math.random() > 0.5 ? 35 : -35);
      const y = isX ? road.center + (Math.random() > 0.5 ? 35 : -35) : 200 + Math.random() * (this.city.height - 400);
      const angle = isX ? (y > road.center ? 0 : Math.PI) : (x > road.center ? Math.PI / 2 : -Math.PI / 2);

      const type = types[Math.floor(Math.random() * types.length)];
      this.vehicles.push(new Vehicle(type, x, y, angle));
    }

    // Populate sidewalks with pedestrians
    for (let i = 0; i < this.maxPedestrians; i++) {
      const b = this.city.buildings[Math.floor(Math.random() * this.city.buildings.length)];
      const px = b.x - 12 + (Math.random() > 0.5 ? b.w + 24 : 0);
      const py = b.y - 12 + Math.random() * (b.h + 24);
      this.pedestrians.push(this.createPedestrian(px, py));
    }
  }

  createPedestrian(x, y) {
    const clothesColors = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6"];
    return {
      x,
      y,
      vx: 0,
      vy: 0,
      angle: Math.random() * Math.PI * 2,
      speed: 1.2 + Math.random() * 0.8,
      hp: 30,
      dead: false,
      panicked: false,
      panicTimer: 0,
      color: clothesColors[Math.floor(Math.random() * clothesColors.length)],
      radius: 10,
    };
  }

  update(dt, player, city, bullets, audio) {
    // Update civilian vehicles
    for (const v of this.vehicles) {
      if (v.isPlayer || v.destroyed) continue;

      // Simple lane-following AI
      const roadX = v.x;
      const roadY = v.y;
      const forwardX = Math.cos(v.angle);
      const forwardY = Math.sin(v.angle);

      // Check obstacle ahead
      let slowDown = false;
      const checkDist = 65;
      for (const other of this.vehicles) {
        if (other === v) continue;
        const d = Math.hypot(other.x - v.x, other.y - v.y);
        if (d < checkDist) {
          const dot = (other.x - v.x) * forwardX + (other.y - v.y) * forwardY;
          if (dot > 0) slowDown = true;
        }
      }

      // Check distance to player
      const dPlayer = Math.hypot(player.x - v.x, player.y - v.y);
      if (dPlayer < checkDist) {
        const dot = (player.x - v.x) * forwardX + (player.y - v.y) * forwardY;
        if (dot > 0) slowDown = true;
      }

      const input = {
        up: !slowDown,
        down: slowDown,
        left: false,
        right: false,
        handbrake: false,
      };

      v.update(dt, input, city, null);

      // Wrap around world edges
      if (v.x < 50) v.x = city.width - 60;
      if (v.x > city.width - 50) v.x = 60;
      if (v.y < 50) v.y = city.height - 60;
      if (v.y > city.height - 50) v.y = 60;
    }

    // Update pedestrians
    for (const p of this.pedestrians) {
      if (p.dead) continue;

      if (p.panicked) {
        p.panicTimer -= dt;
        if (p.panicTimer <= 0) p.panicked = false;
        // Run away from player
        const dx = p.x - player.x;
        const dy = p.y - player.y;
        p.angle = Math.atan2(dy, dx);
        p.vx = Math.cos(p.angle) * (p.speed * 2.2);
        p.vy = Math.sin(p.angle) * (p.speed * 2.2);
      } else {
        // Wander randomly
        if (Math.random() < 0.02) p.angle += (Math.random() - 0.5) * 1.5;
        p.vx = Math.cos(p.angle) * p.speed;
        p.vy = Math.sin(p.angle) * p.speed;
      }

      const nx = p.x + p.vx;
      const ny = p.y + p.vy;
      const col = city.checkCollision(nx, ny, p.radius);
      if (!col.collided) {
        p.x = nx;
        p.y = ny;
      } else {
        p.angle += Math.PI * 0.75;
      }

      // Check if vehicle hit pedestrian
      for (const v of this.vehicles) {
        if (Math.abs(v.speed) > 2.5 && Math.hypot(v.x - p.x, v.y - p.y) < v.length * 0.45) {
          p.hp -= 50;
          if (p.hp <= 0 && !p.dead) {
            p.dead = true;
            if (v.isPlayer && player.wantedLevel === 0) {
              player.wantedLevel = 1;
            }
          }
        }
      }
    }
  }

  triggerPanicNear(x, y, radius = 250) {
    for (const p of this.pedestrians) {
      if (Math.hypot(p.x - x, p.y - y) < radius) {
        p.panicked = true;
        p.panicTimer = 8.0;
      }
    }
  }
}
