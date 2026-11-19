// missions.js - Story campaign, mission progression, objectives, and rewards

export class MissionManager {
  constructor() {
    this.missions = [
      {
        id: 1,
        title: "The Delivery",
        giver: "Vincenzo 'The Viper'",
        dialog: "Welcome to Vice Palms, kid. Grab the package at Porto Diablo docks and deliver it to our safehouse in Little Havana.",
        target: { x: 2800, y: 2800, name: "Porto Diablo Docks" },
        destination: { x: 800, y: 2400, name: "Havana Safehouse" },
        reward: 1500,
        stage: 0, // 0: pick up, 1: deliver
      },
      {
        id: 2,
        title: "Carjack Royale",
        giver: "Vincenzo 'The Viper'",
        dialog: "A wealthy mark parked an Infernus GT at the Ocean Drive Casino. Boost it, shake the heat, and park it at our chop shop.",
        target: { x: 600, y: 600, name: "Ocean Casino" },
        destination: { x: 2200, y: 2600, name: "Chop Shop" },
        reward: 3000,
        stage: 0,
        policeTrigger: 2,
      },
      {
        id: 3,
        title: "Warehouse Raid",
        giver: "Vincenzo 'The Viper'",
        dialog: "Morales' cartel is hoarding our contraband in the Downtown industrial depot. Clear out the guards and take back the goods.",
        target: { x: 2600, y: 1200, name: "Downtown Warehouse" },
        destination: { x: 1200, y: 800, name: "Drop Point" },
        reward: 5000,
        stage: 0,
        enemiesToDefeat: 4,
        enemiesDefeated: 0,
      },
      {
        id: 4,
        title: "Downtown Bank Heist",
        giver: "Vincenzo 'The Viper'",
        dialog: "We're hitting Cyber Bank in Downtown Core. Drill the vault, bag the bearer bonds, and outrun the SWAT lockdown.",
        target: { x: 2400, y: 800, name: "Cyber Bank Vault" },
        destination: { x: 600, y: 3000, name: "Getaway Marina" },
        reward: 8000,
        stage: 0,
        policeTrigger: 3,
      },
      {
        id: 5,
        title: "Kingpin Takeover",
        giver: "Vincenzo 'The Viper'",
        dialog: "Tonight we end Don Morales once and for all. Take him down at the Sunset Penthouse and rule Vice Palms!",
        target: { x: 1400, y: 1400, name: "Sunset Penthouse" },
        destination: { x: 1800, y: 1800, name: "Syndicate HQ" },
        reward: 15000,
        stage: 0,
        policeTrigger: 4,
      },
    ];

    this.currentMissionIndex = 0;
    this.active = true;
    this.completedMissions = 0;
    this.notification = "NEW MISSION: " + this.currentMission.title;
    this.notificationTimer = 5.0;
  }

  get currentMission() {
    return this.missions[this.currentMissionIndex] || null;
  }

  update(dt, player, audio) {
    if (this.notificationTimer > 0) {
      this.notificationTimer -= dt;
    }

    const m = this.currentMission;
    if (!m) return;

    // Check objective completion
    if (m.stage === 0) {
      const dist = Math.hypot(m.target.x - player.x, m.target.y - player.y);
      if (dist < 60) {
        m.stage = 1;
        this.notification = "OBJECTIVE SECURED! Head to " + m.destination.name;
        this.notificationTimer = 5.0;
        if (m.policeTrigger && player.wantedLevel < m.policeTrigger) {
          player.wantedLevel = m.policeTrigger;
          player.wantedTimer = 0;
        }
        if (audio) audio.playImpact();
      }
    } else if (m.stage === 1) {
      const dist = Math.hypot(m.destination.x - player.x, m.destination.y - player.y);
      if (dist < 60) {
        // Mission passed!
        player.cash += m.reward;
        player.stats.missionsCompleted++;
        this.completedMissions++;
        this.notification = `MISSION PASSED! +$${m.reward}`;
        this.notificationTimer = 6.0;
        if (audio) audio.playMissionPassed();

        // Advance to next mission
        this.currentMissionIndex++;
        if (this.currentMission) {
          setTimeout(() => {
            if (this.currentMission) {
              this.notification = "NEW MISSION: " + this.currentMission.title;
              this.notificationTimer = 5.0;
            }
          }, 3500);
        } else {
          this.notification = "CONGRATULATIONS! YOU RULE VICE PALMS!";
          this.notificationTimer = 10.0;
        }
      }
    }
  }

  getActiveObjective() {
    const m = this.currentMission;
    if (!m) return null;
    return m.stage === 0 ? m.target : m.destination;
  }
}
