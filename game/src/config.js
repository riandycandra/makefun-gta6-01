// config.js - Global game configuration, constants and palettes

export const CONFIG = {
  CANVAS_WIDTH: 1280,
  CANVAS_HEIGHT: 720,
  WORLD_WIDTH: 3600,
  WORLD_HEIGHT: 3600,
  ROAD_WIDTH: 140,
  LANE_WIDTH: 70,
  BLOCK_SIZE: 600,
  CITY_NAME: "VICE PALMS",
  VERSION: "1.0.0",

  COLORS: {
    ASPHALT: "#1a1c23",
    ASPHALT_LINE_YELLOW: "#eab308",
    ASPHALT_LINE_WHITE: "rgba(255, 255, 255, 0.4)",
    SIDEWALK: "#333846",
    GRASS: "#143a29",
    WATER: "#0e3b5e",
    SAND: "#c29b62",
    BUILDING_ROOF: "#1e222d",
    BUILDING_WALL: "#151821",
    NEON_PINK: "#f43f5e",
    NEON_CYAN: "#06b6d4",
    NEON_PURPLE: "#a855f7",
    NEON_AMBER: "#f59e0b",
    POLICE_BLUE: "#2563eb",
    POLICE_RED: "#dc2626",
    HEALTH: "#22c55e",
    ARMOR: "#3b82f6",
    CASH: "#10b981",
  },

  WEAPONS: {
    FISTS: { id: "fists", name: "Fists", damage: 15, range: 45, fireRate: 350, ammo: Infinity, spread: 0.1 },
    PISTOL: { id: "pistol", name: "P99 9mm", damage: 32, range: 550, fireRate: 260, ammo: 150, spread: 0.05, speed: 18 },
    SMG: { id: "smg", name: "Viper SMG", damage: 24, range: 480, fireRate: 110, ammo: 300, spread: 0.12, speed: 20 },
    SHOTGUN: { id: "shotgun", name: "Street Sweeper", damage: 18, range: 380, fireRate: 650, ammo: 60, spread: 0.25, pellets: 6, speed: 16 },
    RIFLE: { id: "rifle", name: "Carbine AR", damage: 45, range: 750, fireRate: 140, ammo: 200, spread: 0.04, speed: 24 },
  },

  VEHICLES: {
    SPORTS: { id: "sports", name: "Infernus GT", maxSpeed: 11.5, accel: 0.28, brake: 0.45, turnSpeed: 0.065, grip: 0.88, color: "#f43f5e", width: 34, length: 64, hp: 350 },
    SEDAN: { id: "sedan", name: "Viceroy V8", maxSpeed: 9.0, accel: 0.20, brake: 0.35, turnSpeed: 0.055, grip: 0.84, color: "#3b82f6", width: 32, length: 60, hp: 400 },
    TRUCK: { id: "truck", name: "Bison 4x4", maxSpeed: 7.2, accel: 0.14, brake: 0.30, turnSpeed: 0.042, grip: 0.82, color: "#eab308", width: 38, length: 72, hp: 650 },
    POLICE: { id: "police", name: "VCPD Interceptor", maxSpeed: 10.5, accel: 0.26, brake: 0.42, turnSpeed: 0.060, grip: 0.86, color: "#ffffff", secondary: "#111827", width: 34, length: 62, hp: 450, isPolice: true },
  }
};
