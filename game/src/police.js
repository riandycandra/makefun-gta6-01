// police.js - Wanted level management, police vehicle pursuit, officer AI, and roadblocks

import { Vehicle } from './vehicles.js';

export class PoliceManager {
  constructor() {
    this.officers = [];
    this.policeVehicles = [];
    this.spawnTimer = 0;
  }

  update(dt, player, city, bullets, audio) {
    if (player.wantedLevel <= 0) {
      this.clearPolice();
      return;
    }

    this.spawnTimer += dt;
    const maxCars = Math.min(6, player.wantedLevel * 2);

    // Filter out destroyed vehicles
    this.policeVehicles = this.policeVehicles.filter(v => !v.destroyed);

    // Spawn police cruisers if below target
    if (this.policeVehicles.length < maxCars && this.spawnTimer > 3.0) {
      this.spawnTimer = 0;
      this.spawnPoliceCruiser(player, city);
    }

    // Update police cruisers AI
    for (const pv of this.policeVehicles) {
      this.updatePoliceVehicleAI(pv, player, city, bullets, audio);
    }

    // Check if player is busted (player stopped near cop car on foot)
    if (!player.inVehicle && player.wantedLevel > 0) {
      for (const pv of this.policeVehicles) {
        const dist = Math.hypot(pv.x - player.x, pv.y - player.y);
        if (dist < 45 && Math.hypot(player.vx, player.vy) < 0.5 && Math.abs(pv.speed) < 1.0) {
          player.isBusted = true;
          break;
        }
      }
    }
  }

  spawnPoliceCruiser(player, city) {
    // Find nearby road intersection out of player camera view (400-700px away)
    const angle = Math.random() * Math.PI * 2;
    const dist = 550 + Math.random() * 200;
    const sx = Math.max(100, Math.min(city.width - 100, player.x + Math.cos(angle) * dist));
    const sy = Math.max(100, Math.min(city.height - 100, player.y + Math.sin(angle) * dist));

    const cruiser = new Vehicle("POLICE", sx, sy, angle + Math.PI);
    cruiser.sirenActive = true;
    this.policeVehicles.push(cruiser);
  }

  updatePoliceVehicleAI(pv, player, city, bullets, audio) {
    const dx = player.x - pv.x;
    const dy = player.y - pv.y;
    const dist = Math.hypot(dx, dy);
    const targetAngle = Math.atan2(dy, dx);

    // Angle difference
    let angleDiff = targetAngle - pv.angle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    const input = {
      up: dist > 50,
      down: dist < 35,
      left: angleDiff < -0.15,
      right: angleDiff > 0.15,
      handbrake: Math.abs(angleDiff) > 1.2 && Math.abs(pv.speed) > 5.0,
    };

    pv.update(1 / 60, input, city, null);

    // High wanted levels: police shoot at player
    if (player.wantedLevel >= 3 && dist < 380 && Math.random() < 0.03) {
      if (audio) audio.playGunshot("pistol");
      const bAngle = targetAngle + (Math.random() - 0.5) * 0.15;
      bullets.push({
        x: pv.x + Math.cos(pv.angle) * 30,
        y: pv.y + Math.sin(pv.angle) * 30,
        vx: Math.cos(bAngle) * 16,
        vy: Math.sin(bAngle) * 16,
        damage: 12,
        range: 450,
        traveled: 0,
        isPlayer: false,
      });
    }
  }

  clearPolice() {
    this.policeVehicles = [];
    this.officers = [];
  }
}
