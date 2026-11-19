// vehicles.js - Multi-class vehicle physics, drift simulation, damage, and siren lights

import { CONFIG } from './config.js';

export class Vehicle {
  constructor(typeKey, x, y, angle = 0, isPlayer = false) {
    const spec = CONFIG.VEHICLES[typeKey] || CONFIG.VEHICLES.SEDAN;
    this.typeKey = typeKey;
    this.name = spec.name;
    this.spec = spec;

    this.x = x;
    this.y = y;
    this.angle = angle;
    this.speed = 0;
    this.steer = 0;
    this.angularVelocity = 0;

    this.vx = 0;
    this.vy = 0;

    this.width = spec.width;
    this.length = spec.length;
    this.color = spec.color;
    this.secondary = spec.secondary || "#0f172a";

    this.hp = spec.hp;
    this.maxHp = spec.hp;
    this.destroyed = false;
    this.fireTimer = 0;

    this.driver = null;
    this.isPlayer = isPlayer;
    this.isPolice = !!spec.isPolice;
    this.sirenActive = !!spec.isPolice;

    this.skidMarks = [];
    this.headlights = true;
    this.hornTimer = 0;
  }

  update(dt, input, city, audio) {
    if (this.destroyed) return;

    if (this.hp <= 0 && !this.destroyed) {
      this.destroyed = true;
      if (audio) audio.playExplosion();
      return;
    }

    if (this.hp < this.maxHp * 0.25) {
      this.fireTimer += dt;
      this.hp -= dt * 6; // Burns down
    }

    let throttle = 0;
    let turn = 0;
    let brake = 0;

    if (input) {
      if (input.up) throttle = 1;
      if (input.down) {
        if (this.speed > 0.5) brake = 1;
        else throttle = -0.55;
      }
      if (input.left) turn = -1;
      if (input.right) turn = 1;
      if (input.handbrake) brake = 1.5;
    }

    // Steering response (turns faster at moderate speed, less at very high speed)
    const speedRatio = Math.abs(this.speed) / this.spec.maxSpeed;
    const effectiveTurn = this.spec.turnSpeed * (1 - speedRatio * 0.35);

    if (Math.abs(this.speed) > 0.1) {
      const dir = this.speed >= 0 ? 1 : -1;
      this.angle += turn * effectiveTurn * dir * (Math.min(1.2, Math.abs(this.speed) / 2));
    }

    // Acceleration & Braking
    if (throttle > 0) {
      this.speed += this.spec.accel * throttle;
      if (this.speed > this.spec.maxSpeed) this.speed = this.spec.maxSpeed;
    } else if (throttle < 0) {
      this.speed += this.spec.accel * throttle * 0.6;
      if (this.speed < -this.spec.maxSpeed * 0.4) this.speed = -this.spec.maxSpeed * 0.4;
    } else {
      // Rolling friction
      this.speed *= 0.965;
      if (Math.abs(this.speed) < 0.05) this.speed = 0;
    }

    if (brake > 0) {
      const bForce = this.spec.brake * brake;
      if (this.speed > 0) {
        this.speed = Math.max(0, this.speed - bForce);
      } else if (this.speed < 0) {
        this.speed = Math.min(0, this.speed + bForce);
      }
    }

    // Velocity decomposition with drift/lateral grip
    const forwardX = Math.cos(this.angle);
    const forwardY = Math.sin(this.angle);
    const rightX = -Math.sin(this.angle);
    const rightY = Math.cos(this.angle);

    const targetVx = forwardX * this.speed;
    const targetVy = forwardY * this.speed;

    const grip = brake > 1 ? 0.72 : this.spec.grip;
    this.vx = this.vx * (1 - grip) + targetVx * grip;
    this.vy = this.vy * (1 - grip) + targetVy * grip;

    // Check drift for skid marks & screech audio
    const lateralSpeed = Math.abs(this.vx * rightX + this.vy * rightY);
    if (lateralSpeed > 2.2 && Math.abs(this.speed) > 3.0) {
      const backX = this.x - forwardX * (this.length * 0.4);
      const backY = this.y - forwardY * (this.length * 0.4);
      this.skidMarks.push({
        x: backX,
        y: backY,
        alpha: Math.min(0.65, lateralSpeed * 0.15),
      });
      if (this.skidMarks.length > 200) this.skidMarks.shift();
      if (this.isPlayer && audio && Math.random() < 0.15) {
        audio.playScreech();
      }
    }

    // Next position
    const nextX = this.x + this.vx;
    const nextY = this.y + this.vy;

    // Building collision
    const col = city.checkCollision(nextX, nextY, this.length * 0.4);
    if (col.collided) {
      const impactSpeed = Math.hypot(this.vx, this.vy);
      if (impactSpeed > 2.0 && audio) audio.playImpact();
      this.hp -= impactSpeed * 4;
      this.speed *= -0.35;
      this.vx *= -0.3;
      this.vy *= -0.3;
    } else {
      this.x = nextX;
      this.y = nextY;
    }

    // Audio update for player car
    if (this.isPlayer && audio) {
      audio.setEnginePitch(this.speed / this.spec.maxSpeed, true);
      audio.setSirenActive(this.isPolice && this.sirenActive);
    }
  }

  takeDamage(amount, audio) {
    this.hp -= amount;
    if (this.hp <= 0 && !this.destroyed) {
      this.destroyed = true;
      if (audio) audio.playExplosion();
    }
  }
}
