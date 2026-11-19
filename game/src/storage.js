// storage.js - LocalStorage persistence for player save game and stats

export class StorageManager {
  constructor() {
    this.key = "VICE_PALMS_SAVE_V1";
  }

  save(player, missions) {
    try {
      const data = {
        cash: player.cash,
        hp: player.hp,
        armor: player.armor,
        weapons: player.weapons.map(w => ({ id: w.id, ammo: w.ammo })),
        currentMissionIndex: missions.currentMissionIndex,
        completedMissions: missions.completedMissions,
        stats: player.stats,
        savedAt: Date.now(),
      };
      localStorage.setItem(this.key, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  }

  load(player, missions) {
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) return false;
      const data = JSON.parse(raw);

      if (data.cash !== undefined) player.cash = data.cash;
      if (data.hp !== undefined) player.hp = Math.max(20, data.hp);
      if (data.armor !== undefined) player.armor = data.armor;
      if (data.currentMissionIndex !== undefined) {
        missions.currentMissionIndex = Math.min(missions.missions.length - 1, data.currentMissionIndex);
      }
      if (data.completedMissions !== undefined) {
        missions.completedMissions = data.completedMissions;
      }
      if (data.stats) {
        player.stats = { ...player.stats, ...data.stats };
      }
      return true;
    } catch {
      return false;
    }
  }

  clear() {
    try {
      localStorage.removeItem(this.key);
    } catch {}
  }
}
