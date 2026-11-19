// render.js - 2.5D perspective renderer, dynamic lighting, particle effects, and screen shaders

import { CONFIG } from './config.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
  }

  addParticle(x, y, vx, vy, color, size, life) {
    this.particles.push({ x, y, vx, vy, color, size, life, maxLife: life });
  }

  updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.94;
      p.vy *= 0.94;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  render(camera, city, player, traffic, police, bullets, timeOfDay = 0.8) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.save();
    // Fill background (ocean/water outside map)
    ctx.fillStyle = CONFIG.COLORS.WATER;
    ctx.fillRect(0, 0, w, h);

    // Apply Camera Transform
    ctx.translate(w / 2 - camera.x, h / 2 - camera.y);

    // 1. Draw World Landmass & Ground
    ctx.fillStyle = "#1e222d";
    ctx.fillRect(0, 0, city.width, city.height);

    // 2. Draw Roads & Intersections
    this.drawRoads(ctx, city);

    // 3. Draw Vehicle Skidmarks
    this.drawSkidmarks(ctx, traffic, police, player);

    // 4. Draw Pedestrians
    this.drawPedestrians(ctx, traffic.pedestrians);

    // 5. Draw Vehicles (Civilian + Police + Player if in car)
    this.drawVehicles(ctx, traffic.vehicles, police.policeVehicles, player);

    // 6. Draw Player on foot
    if (!player.inVehicle) {
      this.drawPlayer(ctx, player);
    }

    // 7. Draw Bullets & Projectiles
    this.drawBullets(ctx, bullets);

    // 8. Draw Particles (Smoke, Sparks, Debris)
    this.drawParticles(ctx);

    // 9. Draw 2.5D Buildings with height extrusion and neon signs
    this.drawBuildings(ctx, city, camera);

    // 10. Draw Lighting / Night Overlay
    this.drawLightingOverlay(ctx, city, camera, player, traffic, police, timeOfDay);

    ctx.restore();
  }

  drawRoads(ctx, city) {
    // Road asphalt
    ctx.fillStyle = CONFIG.COLORS.ASPHALT;
    for (const rd of city.roads) {
      ctx.fillRect(rd.x, rd.y, rd.w, rd.h);
    }

    // Road markings
    ctx.strokeStyle = CONFIG.COLORS.ASPHALT_LINE_YELLOW;
    ctx.lineWidth = 3;
    ctx.setLineDash([]);
    for (const rd of city.roads) {
      ctx.beginPath();
      if (rd.axis === "x") {
        ctx.moveTo(rd.x, rd.center);
        ctx.lineTo(rd.x + rd.w, rd.center);
      } else {
        ctx.moveTo(rd.center, rd.y);
        ctx.lineTo(rd.center, rd.y + rd.h);
      }
      ctx.stroke();
    }

    // White dashed lane markings
    ctx.strokeStyle = CONFIG.COLORS.ASPHALT_LINE_WHITE;
    ctx.lineWidth = 2;
    ctx.setLineDash([16, 16]);
    for (const rd of city.roads) {
      ctx.beginPath();
      if (rd.axis === "x") {
        ctx.moveTo(rd.x, rd.center - 35);
        ctx.lineTo(rd.x + rd.w, rd.center - 35);
        ctx.moveTo(rd.x, rd.center + 35);
        ctx.lineTo(rd.x + rd.w, rd.center + 35);
      } else {
        ctx.moveTo(rd.center - 35, rd.y);
        ctx.lineTo(rd.center - 35, rd.y + rd.h);
        ctx.moveTo(rd.center + 35, rd.y);
        ctx.lineTo(rd.center + 35, rd.y + rd.h);
      }
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  drawSkidmarks(ctx, traffic, police, player) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    const allCars = [...traffic.vehicles, ...police.policeVehicles];
    if (player.currentVehicle) allCars.push(player.currentVehicle);

    for (const v of allCars) {
      for (const sm of v.skidMarks) {
        ctx.beginPath();
        ctx.arc(sm.x, sm.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  drawPedestrians(ctx, pedestrians) {
    for (const p of pedestrians) {
      if (p.dead) {
        // Splatter pool
        ctx.fillStyle = "#881337";
        ctx.beginPath();
        ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);

      // Shadow
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.beginPath();
      ctx.ellipse(2, 4, 7, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Body & Shoulders
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, 7, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      // Head
      ctx.fillStyle = "#fed7aa";
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  drawVehicles(ctx, civilian, police, player) {
    const all = [...civilian, ...police];
    if (player.currentVehicle && !all.includes(player.currentVehicle)) {
      all.push(player.currentVehicle);
    }

    for (const v of all) {
      if (v.destroyed) {
        // Burnt wreck
        ctx.save();
        ctx.translate(v.x, v.y);
        ctx.rotate(v.angle);
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(-v.length / 2, -v.width / 2, v.length, v.width);
        ctx.restore();
        continue;
      }

      ctx.save();
      ctx.translate(v.x, v.y);
      ctx.rotate(v.angle);

      // Car Shadow
      ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
      ctx.fillRect(-v.length / 2 + 5, -v.width / 2 + 6, v.length, v.width);

      // Chassis Body
      ctx.fillStyle = v.color;
      ctx.beginPath();
      ctx.roundRect(-v.length / 2, -v.width / 2, v.length, v.width, 6);
      ctx.fill();

      // Police livery stripes
      if (v.isPolice) {
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(-v.length / 6, -v.width / 2, v.length / 3, v.width);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 9px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("POLICE", 0, 3);

        // Flashing lightbar
        const blink = Math.floor(performance.now() / 150) % 2 === 0;
        ctx.fillStyle = blink ? "#ef4444" : "#2563eb";
        ctx.fillRect(-2, -v.width / 2 + 2, 6, 8);
        ctx.fillStyle = blink ? "#2563eb" : "#ef4444";
        ctx.fillRect(-2, v.width / 2 - 10, 6, 8);
      }

      // Windshield & Windows
      ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
      ctx.fillRect(-v.length * 0.15, -v.width * 0.4, v.length * 0.45, v.width * 0.8);

      // Headlights / Taillights
      ctx.fillStyle = "#fef08a";
      ctx.fillRect(v.length / 2 - 3, -v.width / 2 + 3, 3, 6);
      ctx.fillRect(v.length / 2 - 3, v.width / 2 - 9, 3, 6);

      ctx.fillStyle = "#ef4444";
      ctx.fillRect(-v.length / 2, -v.width / 2 + 3, 3, 6);
      ctx.fillRect(-v.length / 2, v.width / 2 - 9, 3, 6);

      ctx.restore();
    }
  }

  drawPlayer(ctx, player) {
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);

    // Player Shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    ctx.beginPath();
    ctx.ellipse(2, 5, 11, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Torso (Cyan/Teal Hawaiian floral shirt)
    ctx.fillStyle = "#06b6d4";
    ctx.beginPath();
    ctx.ellipse(0, 0, 9, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // Arms & Hands holding weapon
    ctx.fillStyle = "#fed7aa";
    ctx.beginPath();
    ctx.arc(8, 7, 4, 0, Math.PI * 2);
    ctx.arc(8, -7, 4, 0, Math.PI * 2);
    ctx.fill();

    // Weapon representation
    ctx.fillStyle = "#334155";
    ctx.fillRect(6, -2, 12, 4);

    // Head
    ctx.fillStyle = "#fed7aa";
    ctx.beginPath();
    ctx.arc(-2, 0, 6, 0, Math.PI * 2);
    ctx.fill();

    // Aviator sunglasses
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(1, -4, 3, 8);

    ctx.restore();
  }

  drawBullets(ctx, bullets) {
    ctx.fillStyle = "#fbbf24";
    for (const b of bullets) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawParticles(ctx) {
    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;
    }
  }

  drawBuildings(ctx, city, camera) {
    // 2.5D building extrusion based on distance from camera
    const nearby = city.getNearbyBuildings(camera.x, camera.y, 850);

    for (const b of nearby) {
      const hScale = (b.height / 1000) * 0.45;
      const offsetX = (b.x + b.w / 2 - camera.x) * hScale;
      const offsetY = (b.y + b.h / 2 - camera.y) * hScale;

      // Base footprint
      ctx.fillStyle = b.wallColor;
      ctx.fillRect(b.x, b.y, b.w, b.h);

      // Roof (shifted by height perspective offset)
      const rx = b.x + offsetX;
      const ry = b.y + offsetY;

      // Extruded side walls connecting base to roof
      ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(rx, ry);
      ctx.lineTo(rx + b.w, ry);
      ctx.lineTo(b.x + b.w, b.y);
      ctx.fill();

      // Top Roof plate
      ctx.fillStyle = b.roofColor;
      ctx.fillRect(rx, ry, b.w, b.h);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.strokeRect(rx, ry, b.w, b.h);

      // Neon Sign if present
      if (b.sign) {
        ctx.font = "bold 13px sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = b.signColor || CONFIG.COLORS.NEON_PINK;
        ctx.shadowColor = b.signColor || CONFIG.COLORS.NEON_PINK;
        ctx.shadowBlur = 10;
        ctx.fillText(b.sign, rx + b.w / 2, ry + b.h / 2 + 4);
        ctx.shadowBlur = 0;
      }
    }
  }

  drawLightingOverlay(ctx, city, camera, player, traffic, police, timeOfDay) {
    // Night ambient darkening
    ctx.fillStyle = `rgba(10, 14, 26, ${0.45 * timeOfDay})`;
    ctx.fillRect(camera.x - this.canvas.width / 2 - 50, camera.y - this.canvas.height / 2 - 50, this.canvas.width + 100, this.canvas.height + 100);

    // Headlight illumination cones for vehicles
    const all = [...traffic.vehicles, ...police.policeVehicles];
    if (player.currentVehicle) all.push(player.currentVehicle);

    ctx.save();
    for (const v of all) {
      if (v.destroyed) continue;
      const fx = Math.cos(v.angle);
      const fy = Math.sin(v.angle);
      const startX = v.x + fx * (v.length / 2);
      const startY = v.y + fy * (v.length / 2);

      const grad = ctx.createRadialGradient(startX, startY, 10, startX + fx * 140, startY + fy * 140, 160);
      grad.addColorStop(0, "rgba(254, 240, 138, 0.35)");
      grad.addColorStop(1, "rgba(254, 240, 138, 0)");

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.arc(startX, startY, 170, v.angle - 0.45, v.angle + 0.45);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  drawStartScreen(w, h) {
    const ctx = this.ctx;
    ctx.fillStyle = "rgba(10, 14, 26, 0.92)";
    ctx.fillRect(0, 0, w, h);

    ctx.textAlign = "center";

    // Title
    ctx.font = "900 54px 'Impact', sans-serif";
    ctx.fillStyle = "#f43f5e";
    ctx.shadowColor = "#f43f5e";
    ctx.shadowBlur = 20;
    ctx.fillText("VICE PALMS: SYNDICATE", w / 2, h / 2 - 80);

    ctx.font = "italic bold 22px sans-serif";
    ctx.fillStyle = "#38bdf8";
    ctx.shadowColor = "#38bdf8";
    ctx.shadowBlur = 10;
    ctx.fillText("OPEN-WORLD CRIME & CARJACKING", w / 2, h / 2 - 35);
    ctx.shadowBlur = 0;

    // Instructions
    ctx.font = "16px sans-serif";
    ctx.fillStyle = "#cbd5e1";
    ctx.fillText("WASD / Arrows: Move & Drive  |  F / Enter: Steal / Enter Vehicle  |  Mouse: Aim & Shoot", w / 2, h / 2 + 30);
    ctx.fillText("1-5: Select Weapons (Fists, 9mm, SMG, Shotgun, AR)  |  Shift: Sprint  |  Space: Handbrake", w / 2, h / 2 + 60);

    // Call to action
    const pulse = Math.floor(performance.now() / 450) % 2 === 0;
    ctx.font = "bold 24px sans-serif";
    ctx.fillStyle = pulse ? "#facc15" : "#ca8a04";
    ctx.fillText("CLICK ANYWHERE OR PRESS ANY KEY TO PLAY", w / 2, h / 2 + 130);
  }

  drawEndScreen(w, h, reason = "WASTED") {
    const ctx = this.ctx;
    ctx.fillStyle = "rgba(10, 14, 26, 0.85)";
    ctx.fillRect(0, 0, w, h);

    ctx.textAlign = "center";
    ctx.font = "900 68px 'Impact', sans-serif";
    ctx.fillStyle = reason === "BUSTED" ? "#2563eb" : "#dc2626";
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 25;
    ctx.fillText(reason, w / 2, h / 2 - 20);
    ctx.shadowBlur = 0;

    ctx.font = "bold 20px sans-serif";
    ctx.fillStyle = "#f8fafc";
    ctx.fillText("PRESS R OR CLICK TO RESPAWN", w / 2, h / 2 + 50);
  }
}
