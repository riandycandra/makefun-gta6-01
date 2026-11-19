// main.js - Master game loop, camera orchestration, state machine, and bullet physics

import { City } from './city.js';
import { Player } from './player.js';
import { TrafficManager } from './traffic.js';
import { PoliceManager } from './police.js';
import { MissionManager } from './missions.js';
import { AudioManager } from './audio.js';
import { StorageManager } from './storage.js';
import { InputManager } from './input.js';
import { HUD } from './hud.js';
import { Renderer } from './render.js';
import { CONFIG } from './config.js';

class Game {
  constructor() {
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d');
    this.statusEl = document.getElementById('status');

    this.resize();
    window.addEventListener('resize', () => this.resize());

    this.city = new City();
    this.player = new Player(1800, 1800); // Start in city center
    this.traffic = new TrafficManager(this.city);
    this.police = new PoliceManager();
    this.missions = new MissionManager();
    this.audio = new AudioManager();
    this.storage = new StorageManager();
    this.input = new InputManager(this.canvas);
    this.hud = new HUD();
    this.renderer = new Renderer(this.canvas);

    this.bullets = [];
    this.camera = { x: this.player.x, y: this.player.y };
    this.state = 'title'; // 'title', 'playing', 'wasted', 'busted'

    this.lastTime = performance.now();
    this.timeOfDay = 0.75; // Sunset/Night vibe

    // Try loading saved game
    this.storage.load(this.player, this.missions);

    this.checkUrlParams();
    this.bindEvents();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  resize() {
    this.canvas.width = window.innerWidth || CONFIG.CANVAS_WIDTH;
    this.canvas.height = window.innerHeight || CONFIG.CANVAS_HEIGHT;
  }

  checkUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const shot = params.get('shot');
    if (shot === 'start') {
      this.state = 'title';
    } else if (shot === 'play' || shot === 'action' || shot === 'night') {
      this.state = 'playing';
      // Setup action scenario for screenshot
      if (shot === 'action') {
        this.player.wantedLevel = 3;
        this.player.tryEnterVehicle(this.traffic.vehicles, null);
        this.police.spawnPoliceCruiser(this.player, this.city);
      }
      if (shot === 'night') {
        this.timeOfDay = 0.95;
      }
    } else if (shot === 'end') {
      this.state = 'wasted';
    }
  }

  bindEvents() {
    const startHandler = () => {
      if (this.state === 'title') {
        this.state = 'playing';
        this.audio.init();
      } else if (this.state === 'wasted' || this.state === 'busted') {
        this.respawn();
      }
    };
    window.addEventListener('click', startHandler);
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyR' && (this.state === 'wasted' || this.state === 'busted')) {
        this.respawn();
      } else if (this.state === 'title') {
        startHandler();
      }
    });
  }

  respawn() {
    this.player.hp = 100;
    this.player.armor = 50;
    this.player.wantedLevel = 0;
    this.player.isWasted = false;
    this.player.isBusted = false;
    this.player.x = 1800;
    this.player.y = 1800;
    this.police.clearPolice();
    this.state = 'playing';
  }

  update(dt) {
    if (this.state !== 'playing') return;

    this.input.updateWorldAim(this.camera);
    this.city.update(dt);
    this.player.update(dt, this.input, this.city, this.traffic.vehicles, this.bullets, this.audio);
    this.traffic.update(dt, this.player, this.city, this.bullets, this.audio);
    this.police.update(dt, this.player, this.city, this.bullets, this.audio);
    this.missions.update(dt, this.player, this.audio);
    this.updateBullets(dt);
    this.renderer.updateParticles(dt);

    // Smooth Camera Follow
    const targetX = this.player.x;
    const targetY = this.player.y;
    this.camera.x += (targetX - this.camera.x) * 0.12;
    this.camera.y += (targetY - this.camera.y) * 0.12;

    if (this.player.isWasted) this.state = 'wasted';
    if (this.player.isBusted) this.state = 'busted';

    // Auto-save periodically
    if (Math.random() < 0.005) {
      this.storage.save(this.player, this.missions);
    }
  }

  updateBullets(dt) {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx;
      b.y += b.vy;
      b.traveled += Math.hypot(b.vx, b.vy);

      // Range expiration
      if (b.traveled >= b.range) {
        this.bullets.splice(i, 1);
        continue;
      }

      // Building collision
      const col = this.city.checkCollision(b.x, b.y, 4);
      if (col.collided) {
        this.renderer.addParticle(b.x, b.y, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, '#f59e0b', 2, 0.2);
        this.bullets.splice(i, 1);
        continue;
      }

      // Check hit against vehicles
      const allVehicles = [...this.traffic.vehicles, ...this.police.policeVehicles];
      if (this.player.currentVehicle) allVehicles.push(this.player.currentVehicle);

      let hitVehicle = false;
      for (const v of allVehicles) {
        if (v.destroyed) continue;
        if (b.isPlayer && v.isPlayer) continue;
        if (Math.hypot(v.x - b.x, v.y - b.y) < v.width * 0.7) {
          v.takeDamage(b.damage, this.audio);
          this.renderer.addParticle(b.x, b.y, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4, '#fbbf24', 3, 0.3);
          hitVehicle = true;
          break;
        }
      }
      if (hitVehicle) {
        this.bullets.splice(i, 1);
        continue;
      }

      // Check hit against player (from police bullets)
      if (!b.isPlayer) {
        if (Math.hypot(this.player.x - b.x, this.player.y - b.y) < this.player.radius) {
          this.player.takeDamage(b.damage);
          this.renderer.addParticle(b.x, b.y, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, '#ef4444', 3, 0.4);
          this.bullets.splice(i, 1);
          continue;
        }
      } else {
        // Player shot pedestrian or cop
        for (const p of this.traffic.pedestrians) {
          if (p.dead) continue;
          if (Math.hypot(p.x - b.x, p.y - b.y) < p.radius + 3) {
            p.hp -= b.damage;
            this.traffic.triggerPanicNear(b.x, b.y, 300);
            if (p.hp <= 0) {
              p.dead = true;
              this.player.stats.kills++;
              this.player.cash += 85;
              if (this.player.wantedLevel === 0) this.player.wantedLevel = 1;
            }
            this.renderer.addParticle(b.x, b.y, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, '#ef4444', 3, 0.4);
            this.bullets.splice(i, 1);
            break;
          }
        }
      }
    }
  }

  render() {
    this.renderer.render(this.camera, this.city, this.player, this.traffic, this.police, this.bullets, this.timeOfDay);

    if (this.state === 'playing') {
      this.hud.draw(this.ctx, this.canvas.width, this.canvas.height, this.player, this.city, this.traffic, this.police, this.missions);
    } else if (this.state === 'title') {
      this.renderer.drawStartScreen(this.canvas.width, this.canvas.height);
    } else if (this.state === 'wasted') {
      this.renderer.drawEndScreen(this.canvas.width, this.canvas.height, 'WASTED');
    } else if (this.state === 'busted') {
      this.renderer.drawEndScreen(this.canvas.width, this.canvas.height, 'BUSTED');
    }
  }

  loop(timestamp) {
    const dt = Math.min(0.05, (timestamp - this.lastTime) / 1000);
    this.lastTime = timestamp;

    this.update(dt);
    this.render();

    requestAnimationFrame(this.loop);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
