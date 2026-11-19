// hud.js - GTA-style HUD, circular radar minimap, wanted stars, health/armor, and mission tracker

import { CONFIG } from './config.js';

export class HUD {
  constructor() {
    this.radarRadius = 90;
    this.radarMargin = 30;
  }

  draw(ctx, width, height, player, city, traffic, police, missions) {
    // 1. Draw Circular Radar Minimap (Bottom-Left)
    this.drawRadar(ctx, height, player, city, traffic, police, missions);

    // 2. Top-Right: Wanted Level, Cash, Health & Armor, Weapon
    this.drawStatsHUD(ctx, width, player);

    // 3. Top-Center: Mission Objective Tracker Banner
    this.drawMissionBanner(ctx, width, missions);

    // 4. Vehicle Speedometer & Info
    if (player.inVehicle && player.currentVehicle) {
      this.drawSpeedometer(ctx, width, height, player.currentVehicle);
    }
  }

  drawRadar(ctx, height, player, city, traffic, police, missions) {
    const rx = this.radarMargin + this.radarRadius;
    const ry = height - this.radarMargin - this.radarRadius;
    const r = this.radarRadius;

    ctx.save();
    // Clip circular radar
    ctx.beginPath();
    ctx.arc(rx, ry, r, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = player.wantedLevel > 0 ? (Math.floor(performance.now() / 250) % 2 === 0 ? "#ef4444" : "#3b82f6") : "#334155";
    ctx.stroke();
    ctx.clip();

    // Transform radar coordinates centered on player
    ctx.translate(rx, ry);
    const radarScale = 0.08;

    // Draw roads on radar
    ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
    ctx.lineWidth = 8 * radarScale * 5;
    for (const rd of city.roads) {
      const rx1 = (rd.x - player.x) * radarScale;
      const ry1 = (rd.y - player.y) * radarScale;
      const rw = rd.w * radarScale;
      const rh = rd.h * radarScale;
      ctx.strokeRect(rx1, ry1, rw, rh);
    }

    // Draw Mission Objective Blip
    const obj = missions.getActiveObjective();
    if (obj) {
      const ox = (obj.x - player.x) * radarScale;
      const oy = (obj.y - player.y) * radarScale;
      const pulse = 1 + Math.sin(performance.now() * 0.008) * 0.3;

      ctx.fillStyle = "#eab308";
      ctx.beginPath();
      ctx.arc(ox, oy, 6 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Draw Traffic Cars
    ctx.fillStyle = "rgba(148, 163, 184, 0.6)";
    for (const v of traffic.vehicles) {
      if (v.isPlayer || v.destroyed) continue;
      const vx = (v.x - player.x) * radarScale;
      const vy = (v.y - player.y) * radarScale;
      if (Math.hypot(vx, vy) < r) {
        ctx.fillRect(vx - 2, vy - 2, 4, 4);
      }
    }

    // Draw Police Cars
    for (const pv of police.policeVehicles) {
      const px = (pv.x - player.x) * radarScale;
      const py = (pv.y - player.y) * radarScale;
      if (Math.hypot(px, py) < r) {
        ctx.fillStyle = Math.floor(performance.now() / 200) % 2 === 0 ? "#ef4444" : "#3b82f6";
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw Player Triangle in center of radar
    ctx.restore();
    ctx.save();
    ctx.translate(rx, ry);
    ctx.rotate(player.angle);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(-6, -5);
    ctx.lineTo(-4, 0);
    ctx.lineTo(-6, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  drawStatsHUD(ctx, width, player) {
    const rx = width - 260;
    let ry = 25;

    // Wanted Stars
    for (let s = 1; s <= 5; s++) {
      const starX = rx + (s - 1) * 36;
      const active = s <= player.wantedLevel;
      const blink = player.wantedTimer > 15.0 && Math.floor(performance.now() / 300) % 2 === 0;

      ctx.save();
      ctx.translate(starX + 14, ry + 14);
      this.drawStar(ctx, 12, active && !blink ? "#eab308" : "rgba(255, 255, 255, 0.2)", active ? "#ca8a04" : "#475569");
      ctx.restore();
    }

    ry += 40;

    // Cash Counter
    ctx.font = "bold 26px 'Courier New', monospace";
    ctx.textAlign = "right";
    ctx.fillStyle = "#10b981";
    ctx.shadowColor = "rgba(16, 185, 129, 0.4)";
    ctx.shadowBlur = 8;
    ctx.fillText(`$${player.cash.toLocaleString()}`, width - 30, ry + 20);
    ctx.shadowBlur = 0;

    ry += 35;

    // Health Bar
    const barWidth = 180;
    const barHeight = 12;
    const barX = width - 30 - barWidth;

    // Health background
    ctx.fillStyle = "rgba(15, 23, 42, 0.7)";
    ctx.fillRect(barX, ry, barWidth, barHeight);
    ctx.fillStyle = "#22c55e";
    const hpPct = Math.max(0, player.hp / player.maxHp);
    ctx.fillRect(barX, ry, barWidth * hpPct, barHeight);

    ry += 18;

    // Armor Bar
    ctx.fillStyle = "rgba(15, 23, 42, 0.7)";
    ctx.fillRect(barX, ry, barWidth, barHeight);
    ctx.fillStyle = "#3b82f6";
    const armPct = Math.max(0, player.armor / player.maxArmor);
    ctx.fillRect(barX, ry, barWidth * armPct, barHeight);

    ry += 24;

    // Current Weapon & Ammo
    const wp = player.currentWeapon;
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "right";
    ctx.fillStyle = "#f8fafc";
    const ammoStr = wp.ammo === Infinity ? "∞" : `${wp.ammo}`;
    ctx.fillText(`${wp.name}  [${ammoStr}]`, width - 30, ry + 12);
  }

  drawMissionBanner(ctx, width, missions) {
    if (!missions.notification || missions.notificationTimer <= 0) return;

    ctx.save();
    const bx = width / 2;
    const by = 45;

    ctx.font = "900 18px sans-serif";
    ctx.textAlign = "center";
    const text = missions.notification;
    const tw = ctx.measureText(text).width + 50;

    ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
    ctx.fillRect(bx - tw / 2, by - 20, tw, 40);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#eab308";
    ctx.strokeRect(bx - tw / 2, by - 20, tw, 40);

    ctx.fillStyle = "#fef08a";
    ctx.fillText(text, bx, by + 6);
    ctx.restore();
  }

  drawSpeedometer(ctx, width, height, vehicle) {
    const sx = width - 110;
    const sy = height - 70;
    const speedKmh = Math.floor(Math.abs(vehicle.speed) * 14.5);

    ctx.save();
    ctx.fillStyle = "rgba(15, 23, 42, 0.8)";
    ctx.fillRect(sx - 70, sy - 25, 150, 60);
    ctx.strokeStyle = "#38bdf8";
    ctx.strokeRect(sx - 70, sy - 25, 150, 60);

    ctx.font = "bold 13px sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText(vehicle.name, sx + 5, sy - 5);

    ctx.font = "bold 24px 'Courier New', monospace";
    ctx.fillStyle = "#38bdf8";
    ctx.fillText(`${speedKmh} MPH`, sx + 5, sy + 22);
    ctx.restore();
  }

  drawStar(ctx, r, fill, stroke) {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      ctx.lineTo(Math.cos((18 + i * 72) * Math.PI / 180) * r, -Math.sin((18 + i * 72) * Math.PI / 180) * r);
      ctx.lineTo(Math.cos((54 + i * 72) * Math.PI / 180) * (r * 0.45), -Math.sin((54 + i * 72) * Math.PI / 180) * (r * 0.45));
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}
