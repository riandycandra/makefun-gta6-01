// input.js - Keyboard, mouse, and game control inputs

export class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.up = false;
    this.down = false;
    this.left = false;
    this.right = false;
    this.sprint = false;
    this.handbrake = false;
    this.shoot = false;
    this.actionEnter = false;
    this.weaponKey = null;

    this.aimX = 0;
    this.aimY = 0;
    this.canvasMouseX = 0;
    this.canvasMouseY = 0;

    this.setupListeners();
  }

  setupListeners() {
    window.addEventListener("keydown", (e) => {
      const code = e.code;
      if (code === "KeyW" || code === "ArrowUp") this.up = true;
      if (code === "KeyS" || code === "ArrowDown") this.down = true;
      if (code === "KeyA" || code === "ArrowLeft") this.left = true;
      if (code === "KeyD" || code === "ArrowRight") this.right = true;
      if (code === "ShiftLeft" || code === "ShiftRight") this.sprint = true;
      if (code === "Space") this.handbrake = true;
      if (code === "KeyF" || code === "Enter") this.actionEnter = true;

      if (code === "Digit1") this.weaponKey = 1;
      if (code === "Digit2") this.weaponKey = 2;
      if (code === "Digit3") this.weaponKey = 3;
      if (code === "Digit4") this.weaponKey = 4;
      if (code === "Digit5") this.weaponKey = 5;
    });

    window.addEventListener("keyup", (e) => {
      const code = e.code;
      if (code === "KeyW" || code === "ArrowUp") this.up = false;
      if (code === "KeyS" || code === "ArrowDown") this.down = false;
      if (code === "KeyA" || code === "ArrowLeft") this.left = false;
      if (code === "KeyD" || code === "ArrowRight") this.right = false;
      if (code === "ShiftLeft" || code === "ShiftRight") this.sprint = false;
      if (code === "Space") this.handbrake = false;
    });

    this.canvas.addEventListener("mousemove", (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      this.canvasMouseX = (e.clientX - rect.left) * scaleX;
      this.canvasMouseY = (e.clientY - rect.top) * scaleY;
    });

    this.canvas.addEventListener("mousedown", (e) => {
      if (e.button === 0) this.shoot = true;
    });

    window.addEventListener("mouseup", (e) => {
      if (e.button === 0) this.shoot = false;
    });
  }

  updateWorldAim(camera) {
    this.aimX = camera.x - this.canvas.width / 2 + this.canvasMouseX;
    this.aimY = camera.y - this.canvas.height / 2 + this.canvasMouseY;
  }
}
