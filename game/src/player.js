// player.js - Player character movement, vehicle interaction, weapon inventory, and combat

import { CONFIG } from './config.js';

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 16;
    this.angle = 0;
    this.speed = 3.6;
    this.sprintSpeed = 5.8;

    this.vx = 0;
    this.vy = 0;

    this.hp = 100;
    this.maxHp = 100;
    this.armor = 50;
    this.maxArmor = 100;
    this.cash = 1250;

    this.wantedLevel = 0; // 0 to 5 stars
    this.wantedTimer = 0;
    this.isBusted = false;
    this.isWasted = false;

    // Vehicle interaction
    this.inVehicle = false;
    this.currentVehicle = null;

    // Weapon inventory
    this.weapons = [
      { ...CONFIG.WEAPONS.FISTS },
      { ...CONFIG.WEAPONS.PISTOL },
      { ...CONFIG.WEAPONS.SMG },
      { ...CONFIG.WEAPONS.SHOTGUN },
      { ...CONFIG.WEAPONS.RIFLE },
    ];
    this.currentWeaponIndex = 1; // Start with Pistol
    this.lastShotTime = 0;
    this.rollTimer = 0;

    this.stats = {
      kills: 0,
      copsEvaded: 0,
      carsHijacked: 0,
      missionsCompleted: 0,
    };
  }

  get currentWeapon() {
    return this.weapons[this.currentWeaponIndex];
  }

  update(dt, input, city, vehicles, bullets, audio) {
    if (this.isWasted || this.isBusted) return;

    if (this.hp <= 0) {
      this.isWasted = true;
      if (this.inVehicle) this.exitVehicle();
      return;
    }

    // Entering / Exiting vehicles ('F' key)
    if (input.actionEnter) {
      input.actionEnter = false; // consume press
      if (this.inVehicle) {
        this.exitVehicle();
      } else {
        this.tryEnterVehicle(vehicles, audio);
      }
    }

    if (this.inVehicle && this.currentVehicle) {
      // While in car, sync coordinates to car
      this.x = this.currentVehicle.x;
      this.y = this.currentVehicle.y;
      this.angle = this.currentVehicle.angle;

      if (this.currentVehicle.destroyed) {
        this.exitVehicle();
        this.takeDamage(40);
      }
      return;
    }

    // Foot movement
    const isSprinting = input.sprint && (input.up || input.down || input.left || input.right);
    const moveSpeed = isSprinting ? this.sprintSpeed : this.speed;

    let moveX = 0;
    let moveY = 0;
    if (input.up) moveY -= 1;
    if (input.down) moveY += 1;
    if (input.left) moveX -= 1;
    if (input.right) moveX += 1;

    if (moveX !== 0 && moveY !== 0) {
      const invLen = 1 / Math.SQRT2;
      moveX *= invLen;
      moveY *= invLen;
    }

    this.vx = moveX * moveSpeed;
    this.vy = moveY * moveSpeed;

    // Aim toward mouse cursor
    if (input.aimX !== undefined && input.aimY !== undefined) {
      this.angle = Math.atan2(input.aimY - this.y, input.aimX - this.x);
    }

    // Move & Collision
    const nextX = this.x + this.vx;
    const nextY = this.y + this.vy;

    const colX = city.checkCollision(nextX, this.y, this.radius);
    if (!colX.collided) this.x = nextX;

    const colY = city.checkCollision(this.x, nextY, this.radius);
    if (!colY.collided) this.y = nextY;

    // Weapon selection (1-5 keys)
    if (input.weaponKey) {
      const idx = input.weaponKey - 1;
      if (idx >= 0 && idx < this.weapons.length) {
        this.currentWeaponIndex = idx;
      }
      input.weaponKey = null;
    }

    // Shooting
    if (input.shoot) {
      this.shoot(bullets, audio);
    }

    // Wanted level decay when not in sight
    if (this.wantedLevel > 0) {
      this.wantedTimer += dt;
      if (this.wantedTimer > 25.0) {
        this.wantedLevel = Math.max(0, this.wantedLevel - 1);
        this.wantedTimer = 0;
      }
    }
  }

  shoot(bullets, audio) {
    const now = performance.now();
    const wp = this.currentWeapon;
    if (now - this.lastShotTime < wp.fireRate) return;
    if (wp.ammo <= 0) return;

    this.lastShotTime = now;
    if (wp.ammo !== Infinity) wp.ammo--;

    if (audio) audio.playGunshot(wp.id);

    // If shooting in public, increase wanted chance
    if (this.wantedLevel === 0 && Math.random() < 0.35) {
      this.wantedLevel = 1;
      this.wantedTimer = 0;
    }

    const muzzleDist = 24;
    const spawnX = this.x + Math.cos(this.angle) * muzzleDist;
    const spawnY = this.y + Math.sin(this.angle) * muzzleDist;

    if (wp.id === "fists") {
      bullets.push({
        x: spawnX,
        y: spawnY,
        vx: Math.cos(this.angle) * 12,
        vy: Math.sin(this.angle) * 12,
        damage: wp.damage,
        range: wp.range,
        traveled: 0,
        isPlayer: true,
        isMelee: true,
      });
      return;
    }

    const pellets = wp.pellets || 1;
    for (let i = 0; i < pellets; i++) {
      const spread = (Math.random() - 0.5) * wp.spread;
      const bAngle = this.angle + spread;
      bullets.push({
        x: spawnX,
        y: spawnY,
        vx: Math.cos(bAngle) * wp.speed,
        vy: Math.sin(bAngle) * wp.speed,
        damage: wp.damage,
        range: wp.range,
        traveled: 0,
        isPlayer: true,
      });
    }
  }

  tryEnterVehicle(vehicles, audio) {
    let closest = null;
    let closestDist = 70; // Enter radius

    for (const v of vehicles) {
      if (v.destroyed) continue;
      const d = Math.hypot(v.x - this.x, v.y - this.y);
      if (d < closestDist) {
        closest = v;
        closestDist = d;
      }
    }

    if (closest) {
      this.inVehicle = true;
      this.currentVehicle = closest;
      closest.driver = this;
      closest.isPlayer = true;
      this.stats.carsHijacked++;
      if (audio) audio.startRadio();

      // If stealing police car or in front of police, get wanted star
      if (closest.isPolice && this.wantedLevel === 0) {
        this.wantedLevel = 1;
        this.wantedTimer = 0;
      }
    }
  }

  exitVehicle() {
    if (!this.inVehicle || !this.currentVehicle) return;
    const v = this.currentVehicle;
    v.driver = null;
    v.isPlayer = false;

    // Disembark to the side of the car
    const rightX = -Math.sin(v.angle);
    const rightY = Math.cos(v.angle);
    this.x = v.x + rightX * (v.width * 0.8 + 15);
    this.y = v.y + rightY * (v.width * 0.8 + 15);

    this.inVehicle = false;
    this.currentVehicle = null;
  }

  takeDamage(amount) {
    if (this.armor > 0) {
      const armorAbsorb = Math.min(this.armor, amount * 0.65);
      this.armor -= armorAbsorb;
      amount -= armorAbsorb;
    }
    this.hp -= amount;
    if (this.hp <= 0) {
      this.isWasted = true;
    }
  }
}
