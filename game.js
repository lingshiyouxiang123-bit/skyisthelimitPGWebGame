const state = {
  baseName: "基地-01",
  aircraftName: "航空器-01",
  aircraftType: null,
  prepPoints: 0,
  resourcePoints: 50,
  meritPoints: 0,
  prepRate: 0,
  resourceRate: 0,
  meritRate: 0,
  staff: {
    total: 6,
    idle: 1,
    ops: 2,
    eng: 2,
    intel: 1,
  },
  staffNames: ["人员-01", "人员-02", "人员-03", "人员-04", "人员-05", "人员-06"],
  showKC: true,
  kcTotal: 0,
  enableAttrition: false,
  settingsLocked: false,
  upgrades: [
    { id: "ops", name: "作战指挥塔", level: 1, max: 10, cost: 80, bonus: 0.18 },
    { id: "supply", name: "补给仓库", level: 1, max: 10, cost: 70, bonus: 0.14 },
    { id: "training", name: "训练甲板", level: 1, max: 10, cost: 90, bonus: 0.03 },
  ],
  missionsByType: {
    air: [
      {
        id: "air-patrol",
        name: "空域侦察",
        prepCost: 18,
        duration: 18,
        reward: 40,
        rewardMerit: 1,
        detail: "完成条件：存活 30 秒后抵达边界脱离。",
      },
      {
        id: "air-intercept",
        name: "拦截任务",
        prepCost: 28,
        duration: 24,
        reward: 70,
        rewardMerit: 2,
        detail: "完成条件：击毁高价值目标后抵达边界脱离。",
      },
      {
        id: "air-sweep",
        name: "制空清扫",
        prepCost: 42,
        duration: 32,
        reward: 110,
        rewardMerit: 3,
        detail: "完成条件：清除场上全部敌机。",
      },
    ],
    ground: [
      {
        id: "ground-strike",
        name: "纵深打击",
        prepCost: 22,
        duration: 22,
        reward: 55,
        rewardMerit: 1,
        detail: "完成条件：消灭全部地面目标。",
      },
      {
        id: "ground-blockade",
        name: "封锁区域",
        prepCost: 34,
        duration: 28,
        reward: 85,
        rewardMerit: 2,
        detail: "完成条件：30 秒内不放过超过 1 个目标，达标后抵达边界脱离。",
      },
      {
        id: "ground-raid",
        name: "远程突袭",
        prepCost: 48,
        duration: 36,
        reward: 130,
        rewardMerit: 4,
        detail: "完成条件：击毁高价值目标后抵达边界脱离。",
      },
    ],
  },
  missions: [],
  selectedMission: null,
  missionActive: null,
  missionTime: 0,
  log: [],
  needsRender: false,
};

const DEBUG_MODE = window.DEBUG_MODE === true;
const DEBUG_SPEED = Number.isFinite(window.DEBUG_SPEED) ? window.DEBUG_SPEED : DEBUG_MODE ? 5 : 1;
const TICK_MS = 1000;
const MIN_MISSION_TIME = 120;
const SAVE_KEY = "skyweb.save.v1";

const dom = {
  baseNameDisplay: document.querySelector("#baseNameDisplay"),
  aircraftNameDisplay: document.querySelector("#aircraftNameDisplay"),
  aircraftTypeDisplay: document.querySelector("#aircraftTypeDisplay"),
  prepPoints: document.querySelector("#prepPoints"),
  prepPointsMain: document.querySelector("#prepPointsMain"),
  resourcePoints: document.querySelector("#resourcePoints"),
  meritPoints: document.querySelector("#meritPoints"),
  prepRate: document.querySelector("#prepRate"),
  resourceRate: document.querySelector("#resourceRate"),
  meritRate: document.querySelector("#meritRate"),
  kcTotalDisplay: document.querySelector("#kcTotalDisplay"),
  opsLevel: document.querySelector("#opsLevel"),
  opsBonus: document.querySelector("#opsBonus"),
  supplyLevel: document.querySelector("#supplyLevel"),
  supplyBonus: document.querySelector("#supplyBonus"),
  trainingLevel: document.querySelector("#trainingLevel"),
  trainingBonus: document.querySelector("#trainingBonus"),
  aircraftStatus: document.querySelector("#aircraftStatus"),
  aircraftProgress: document.querySelector("#aircraftProgress"),
  missionList: document.querySelector("#missionList"),
  launchMission: document.querySelector("#launchMission"),
  staffTotal: document.querySelector("#staffTotal"),
  staffIdle: document.querySelector("#staffIdle"),
  staffOps: document.querySelector("#staffOps"),
  staffEng: document.querySelector("#staffEng"),
  staffIntel: document.querySelector("#staffIntel"),
  staffRoster: document.querySelector("#staffRoster"),
  recruitStaff: document.querySelector("#recruitStaff"),
  upgradeList: document.querySelector("#upgradeList"),
  logFeed: document.querySelector("#logFeed"),
  saveGame: document.querySelector("#saveGame"),
  loadGame: document.querySelector("#loadGame"),
  loadFileInput: document.querySelector("#loadFileInput"),
  kcOption: document.querySelector("#kcOption"),
  attritionOption: document.querySelector("#attritionOption"),
  aircraftSelect: document.querySelector("#aircraftSelect"),
  combatOverlay: document.querySelector("#combatOverlay"),
  combatCanvas: document.querySelector("#combatCanvas"),
  combatMissionName: document.querySelector("#combatMissionName"),
  combatTimer: document.querySelector("#combatTimer"),
  combatLock: document.querySelector("#combatLock"),
  combatTargets: document.querySelector("#combatTargets"),
  combatHits: document.querySelector("#combatHits"),
  combatGunHits: document.querySelector("#combatGunHits"),
  combatHitAlert: document.querySelector("#combatHitAlert"),
  combatKC: document.querySelector("#combatKC"),
  combatKCBlock: document.querySelector("#combatKCBlock"),
  combatResult: document.querySelector("#combatResult"),
  combatResultTitle: document.querySelector("#combatResultTitle"),
  combatResultText: document.querySelector("#combatResultText"),
  combatRetry: document.querySelector("#combatRetry"),
  combatAbort: document.querySelector("#combatAbort"),
};

const radarDirs = Array.from(
  document.querySelectorAll(".combat-radar .radar-dir")
);

const fmt = (value) => Math.floor(value);
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pointer = { x: 0, y: 0, has: false };

const applyStartupSettings = () => {
  if (state.settingsLocked) return;
  if (dom.kcOption) {
    state.showKC = dom.kcOption.checked;
    dom.kcOption.disabled = true;
  }
  if (dom.attritionOption) {
    state.enableAttrition = dom.attritionOption.checked;
    dom.attritionOption.disabled = true;
  }
  state.settingsLocked = true;
};

const syncSettingsUI = () => {
  if (dom.kcOption) {
    dom.kcOption.checked = state.showKC;
    dom.kcOption.disabled = state.settingsLocked;
  }
  if (dom.attritionOption) {
    dom.attritionOption.checked = state.enableAttrition;
    dom.attritionOption.disabled = state.settingsLocked;
  }
};

const addLog = (text) => {
  state.log.unshift({
    text,
    time: new Date().toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  });
  state.log = state.log.slice(0, 12);
};

const getUpgrade = (id) => state.upgrades.find((item) => item.id === id);

const calcRates = () => {
  const opsUpgrade = getUpgrade("ops");
  const supplyUpgrade = getUpgrade("supply");
  const training = getUpgrade("training");
  const opsBonus = opsUpgrade.level * opsUpgrade.bonus + state.staff.ops * 0.05;
  const supplyBonus = supplyUpgrade.level * supplyUpgrade.bonus + state.staff.eng * 0.04;
  const intelBonus = state.staff.intel * 0.02;

  state.prepRate = 0.45 + opsBonus + intelBonus + state.staff.total * 0.01;
  state.resourceRate = 0.18 + supplyBonus + state.staff.eng * 0.02;
  state.meritRate =
    state.meritPoints > 0
      ? 0.01 + training.level * training.bonus + state.staff.intel * 0.005
      : 0;
};

const getMeritScale = () => {
  const factor = 1 + Math.min(0.8, state.meritPoints / 500);
  return {
    duration: factor,
    reward: factor,
    rewardMerit: 1 + Math.min(0.6, state.meritPoints / 600),
  };
};

const updateAircraftType = (type) => {
  if (!state.settingsLocked) {
    applyStartupSettings();
  }
  state.aircraftType = type;
  state.missions = [...state.missionsByType[type]];
  state.selectedMission = state.missions[0]?.id ?? null;
  dom.aircraftTypeDisplay.textContent = type === "air" ? "对空" : "对地";
  dom.aircraftSelect.classList.add("hidden");
  addLog(`航空器型号确认：${dom.aircraftTypeDisplay.textContent}`);
  render();
};

const serializeState = () => ({
  baseName: state.baseName,
  aircraftName: state.aircraftName,
  aircraftType: state.aircraftType,
  prepPoints: state.prepPoints,
  resourcePoints: state.resourcePoints,
  meritPoints: state.meritPoints,
  staff: state.staff,
  staffNames: state.staffNames,
  upgrades: state.upgrades,
  selectedMission: state.selectedMission,
  showKC: state.showKC,
  kcTotal: state.kcTotal,
  enableAttrition: state.enableAttrition,
  settingsLocked: state.settingsLocked,
});

const applyLoadedState = (data) => {
  if (!data || typeof data !== "object") return false;
  state.baseName = data.baseName || state.baseName;
  state.aircraftName = data.aircraftName || state.aircraftName;
  state.aircraftType = data.aircraftType || state.aircraftType;
  state.prepPoints = Number.isFinite(data.prepPoints) ? data.prepPoints : state.prepPoints;
  state.resourcePoints = Number.isFinite(data.resourcePoints)
    ? data.resourcePoints
    : state.resourcePoints;
  state.meritPoints = Number.isFinite(data.meritPoints) ? data.meritPoints : state.meritPoints;
  if (data.staff && typeof data.staff === "object") {
    state.staff = {
      total: data.staff.total ?? state.staff.total,
      idle: data.staff.idle ?? state.staff.idle,
      ops: data.staff.ops ?? state.staff.ops,
      eng: data.staff.eng ?? state.staff.eng,
      intel: data.staff.intel ?? state.staff.intel,
    };
  }
  if (Array.isArray(data.staffNames)) {
    state.staffNames = data.staffNames.slice(0);
  }
  if (Array.isArray(data.upgrades)) {
    data.upgrades.forEach((item) => {
      const target = state.upgrades.find((u) => u.id === item.id);
      if (!target) return;
      target.level = Math.min(target.max, Math.max(1, item.level || target.level));
    });
  }
  state.selectedMission = data.selectedMission || state.selectedMission;
  state.showKC = data.showKC ?? state.showKC;
  state.kcTotal = Number.isFinite(data.kcTotal) ? data.kcTotal : state.kcTotal;
  state.enableAttrition = data.enableAttrition ?? state.enableAttrition;
  state.settingsLocked = data.settingsLocked ?? state.settingsLocked;
  if (state.aircraftType) {
    state.missions = [...state.missionsByType[state.aircraftType]];
    if (!state.missions.find((m) => m.id === state.selectedMission)) {
      state.selectedMission = state.missions[0]?.id ?? null;
    }
    dom.aircraftTypeDisplay.textContent = state.aircraftType === "air" ? "对空" : "对地";
    dom.aircraftSelect.classList.add("hidden");
  } else {
    dom.aircraftSelect.classList.remove("hidden");
  }
  syncSettingsUI();
  calcRates();
  render();
  return true;
};

const saveGame = () => {
  const payload = serializeState();
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "skyweb-save.json";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  addLog("存档已导出。");
};

const loadGameFromText = (text) => {
  try {
    const data = JSON.parse(text);
    if (combat.active) {
      closeCombat();
    }
    if (!applyLoadedState(data)) {
      addLog("存档无效，读取失败。");
      return;
    }
    addLog("存档读取完成。");
  } catch (error) {
    addLog("存档损坏，读取失败。");
  }
};

const loadGame = () => {
  if (!dom.loadFileInput) {
    addLog("无法读取存档文件。");
    return;
  }
  dom.loadFileInput.value = "";
  dom.loadFileInput.click();
};

const bindEditable = (element, onSave) => {
  if (!element) return;
  element.addEventListener("dblclick", () => {
    if (element.classList.contains("editing")) return;
    element.dataset.original = element.textContent;
    element.contentEditable = "true";
    element.classList.add("editing");
    const range = document.createRange();
    range.selectNodeContents(element);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    element.focus();
  });

  const finish = (cancel = false) => {
    if (!element.classList.contains("editing")) return;
    const value = element.textContent.trim();
    element.contentEditable = "false";
    element.classList.remove("editing");
    if (cancel || !value) {
      element.textContent = element.dataset.original;
    } else if (value !== element.dataset.original) {
      onSave(value);
    }
    if (state.needsRender) {
      state.needsRender = false;
      render();
    }
  };

  element.addEventListener("blur", () => finish(false));
  element.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      finish(false);
    }
    if (event.key === "Escape") {
      event.preventDefault();
      finish(true);
    }
  });
};

const renderMissions = () => {
  dom.missionList.innerHTML = "";
  const scale = getMeritScale();
  state.missions.forEach((mission) => {
    const durationScaled = Math.max(
      MIN_MISSION_TIME,
      Math.round(mission.duration * scale.duration)
    );
    const rewardScaled = Math.round(mission.reward * scale.reward);
    const rewardMeritScaled = Math.max(
      1,
      Math.round(mission.rewardMerit * scale.rewardMerit)
    );
    const card = document.createElement("button");
    card.className = `mission ${mission.id === state.selectedMission ? "active" : ""}`;
    card.type = "button";
    card.innerHTML = `
      <div class="mission-title">
        <span>${mission.name}</span>
        <span>${mission.prepCost} 准备点</span>
      </div>
      <p>${mission.detail}</p>
      <p>耗时 ${durationScaled}s · 资源 ${rewardScaled} · 功勋 ${rewardMeritScaled}</p>
    `;
    card.addEventListener("click", () => {
      state.selectedMission = mission.id;
      renderMissions();
    });
    dom.missionList.appendChild(card);
  });
};

const renderUpgrades = () => {
  dom.upgradeList.innerHTML = "";
  state.upgrades.forEach((upgrade) => {
    const canUpgrade = upgrade.level < upgrade.max;
    const cost = upgrade.cost + upgrade.level * 25;
    const wrapper = document.createElement("div");
    wrapper.className = "upgrade";
    wrapper.innerHTML = `
      <strong>${upgrade.name} <span>Lv.${upgrade.level}/10</span></strong>
      <span>升级消耗 ${cost} 资源点</span>
    `;
    const btn = document.createElement("button");
    btn.className = "btn ghost";
    btn.textContent = canUpgrade ? "升级" : "已满级";
    btn.disabled = !canUpgrade;
    btn.addEventListener("click", () => {
      if (state.resourcePoints < cost) {
        addLog("资源点不足，无法执行升级。");
        return;
      }
      state.resourcePoints -= cost;
      upgrade.level += 1;
      addLog(`${upgrade.name} 提升至 Lv.${upgrade.level}`);
      calcRates();
      render();
    });
    wrapper.appendChild(btn);
    dom.upgradeList.appendChild(wrapper);
  });
};

const renderRoster = () => {
  dom.staffRoster.innerHTML = "";
  state.staffNames.forEach((nameValue, index) => {
    const item = document.createElement("div");
    item.className = "roster-name editable";
    item.textContent = nameValue;
    bindEditable(item, (value) => {
      state.staffNames[index] = value;
      addLog(`人员代号更新为 ${value}。`);
      render();
    });
    dom.staffRoster.appendChild(item);
  });
};

const renderLog = () => {
  dom.logFeed.innerHTML = "";
  state.log.forEach((entry) => {
    const line = document.createElement("div");
    line.className = "log-entry";
    line.textContent = `[${entry.time}] ${entry.text}`;
    dom.logFeed.appendChild(line);
  });
};

const renderNumbers = () => {
  dom.prepPoints.textContent = fmt(state.prepPoints);
  dom.prepPointsMain.textContent = fmt(state.prepPoints);
  dom.resourcePoints.textContent = fmt(state.resourcePoints);
  dom.meritPoints.textContent = fmt(state.meritPoints);
  dom.prepRate.textContent = `+${state.prepRate.toFixed(2)} / 秒`;
  dom.resourceRate.textContent = `+${state.resourceRate.toFixed(2)} / 秒`;
  dom.meritRate.textContent = `+${state.meritRate.toFixed(2)} / 秒`;
  if (dom.kcTotalDisplay) {
    dom.kcTotalDisplay.textContent = state.showKC ? state.kcTotal : "--";
  }
  dom.opsLevel.textContent = `Lv.${getUpgrade("ops").level}`;
  dom.supplyLevel.textContent = `Lv.${getUpgrade("supply").level}`;
  dom.trainingLevel.textContent = `Lv.${getUpgrade("training").level}`;
  dom.opsBonus.textContent = "准备点数增长";
  dom.supplyBonus.textContent = "资源点数增长";
  dom.trainingBonus.textContent = "功勋点增长";
  dom.staffTotal.textContent = state.staff.total;
  dom.staffIdle.textContent = state.staff.idle;
  dom.staffOps.textContent = state.staff.ops;
  dom.staffEng.textContent = state.staff.eng;
  dom.staffIntel.textContent = state.staff.intel;
  if (!dom.baseNameDisplay.classList.contains("editing")) {
    dom.baseNameDisplay.textContent = state.baseName;
  }
  if (!dom.aircraftNameDisplay.classList.contains("editing")) {
    dom.aircraftNameDisplay.textContent = state.aircraftName;
  }

  if (!state.missionActive) {
    dom.aircraftStatus.textContent = "待命";
    dom.aircraftProgress.style.width = "0%";
  } else {
    dom.aircraftStatus.textContent = `执行中 · ${state.missionActive.name}`;
    const duration = state.missionActive.durationScaled || state.missionActive.duration;
    const progress = Math.min(100, (state.missionTime / duration) * 100);
    dom.aircraftProgress.style.width = `${progress}%`;
  }
};

const render = () => {
  renderNumbers();
  renderMissions();
  renderUpgrades();
  renderRoster();
  renderLog();
};

const combat = {
  active: false,
  paused: false,
  mode: null,
  mission: null,
  timeLeft: 0,
  lastFrame: 0,
  width: 0,
  height: 0,
  player: null,
  mouse: { x: 0, y: 0 },
  bullets: [],
  missiles: [],
  bombs: [],
  targets: [],
  kcTotal: 0,
  canExit: false,
  specialTargetId: null,
  specialDestroyed: false,
  escapedTargets: 0,
  lockIndex: -1,
  threat: null,
  threatCooldown: 0,
  missileHits: 0,
  gunHits: 0,
  meritEarned: 0,
  killCount: 0,
  totalTargets: 0,
  gunCooldown: 0,
  gunFiring: false,
  missileCooldown: 0,
  bombCooldown: 0,
};

const combatConfig = {
  playerSpeed: 180,
  gunSpeed: 380,
  enemySpeed: 90,
  groundSpeed: 45,
  enemyGunRange: 260,
  enemyAAGunRange: 320,
  enemyGunCooldownMin: 0.25,
  enemyGunCooldownMax: 0.55,
  enemyAAGunCooldownMin: 0.5,
  enemyAAGunCooldownMax: 0.9,
  missileSpeed: 220,
  bombRadius: 55,
  gunDamageLimit: 10,
  missileDamageLimit: 2,
};

const getCombatCanvas = () => {
  const rect = dom.combatOverlay.getBoundingClientRect();
  combat.width = Math.max(640, rect.width - 120);
  combat.height = Math.max(420, rect.height - 120);
  dom.combatCanvas.width = combat.width;
  dom.combatCanvas.height = combat.height;
};

const getTargetCount = () => combat.targets.filter((t) => !t.destroyed).length;

const setRadarThreat = (dirs) => {
  radarDirs.forEach((node) => {
    node.classList.toggle("active", dirs.includes(node.dataset.dir));
  });
};

const resetRadarThreat = () => {
  radarDirs.forEach((node) => {
    node.classList.remove("active");
  });
};

const createTargets = (missionId) => {
  combat.targets = [];
  combat.specialTargetId = null;
  combat.specialDestroyed = false;
  combat.escapedTargets = 0;
  const bonus = Math.min(6, Math.floor(state.meritPoints / 150));
  const base = combat.mode === "air" ? 3 : 4;
  const total = base + bonus;
  const isBlockade = missionId === "ground-blockade";
  const hasSpecial = missionId === "air-intercept" || missionId === "ground-raid";
  const specialIndex = hasSpecial ? Math.floor(Math.random() * total) : -1;
  for (let i = 0; i < total; i += 1) {
    const isGround = combat.mode === "ground";
    const aa = isGround && Math.random() < 0.45;
    const isSpecial = hasSpecial && i === specialIndex;
    const groundMoving = isBlockade;
    const groundSpeedBase = combatConfig.groundSpeed * (isBlockade ? 0.5 : 1);
    const groundSpeed = groundSpeedBase * (0.8 + Math.random() * 0.4);
    let groundVx = 0;
    let groundVy = 0;
    if (groundMoving) {
      const side = Math.floor(Math.random() * 4);
      const drift = (Math.random() - 0.5) * groundSpeed * 0.6;
      if (side === 0) {
        groundVx = -groundSpeed;
        groundVy = drift;
      } else if (side === 1) {
        groundVx = groundSpeed;
        groundVy = drift;
      } else if (side === 2) {
        groundVx = drift;
        groundVy = -groundSpeed;
      } else {
        groundVx = drift;
        groundVy = groundSpeed;
      }
    }
    const id = `t-${i}-${Date.now()}`;
    const kcValue = isGround
      ? isSpecial
        ? randomInt(1, 30)
        : groundMoving
        ? randomInt(5, 20)
        : randomInt(10, 100)
      : isSpecial
      ? randomInt(2, 10)
      : randomInt(1, 2);
    const aaBoost = isBlockade && aa && groundMoving;
    combat.targets.push({
      id,
      type: isGround ? "ground" : "air",
      x: 80 + Math.random() * (combat.width - 160),
      y: 80 + Math.random() * (combat.height - 160),
      vx: isGround ? groundVx : (Math.random() - 0.5) * combatConfig.enemySpeed,
      vy: isGround ? groundVy : (Math.random() - 0.5) * combatConfig.enemySpeed,
      hp: isSpecial ? (isGround ? 4 : 3) : isGround ? 2 : 1,
      evade: 0,
      aa,
      aaBoost,
      gunSpeed: aaBoost ? combatConfig.gunSpeed * 2.2 : combatConfig.gunSpeed,
      gunRangeMultiplier: aaBoost ? 2.1 : 1,
      special: isSpecial,
      moving: groundMoving,
      escaped: false,
      kcValue,
      shootCooldown: 1 + Math.random() * 2.5,
      destroyed: false,
    });
    if (isSpecial) {
      combat.specialTargetId = id;
    }
  }
  combat.totalTargets = total;
};

const resetCombat = (mission) => {
  combat.mode = state.aircraftType;
  combat.mission = mission;
  combat.timeLeft = mission.durationScaled;
  combat.player = {
    x: combat.width / 2,
    y: combat.height / 2,
    heading: 0,
  };
  combat.mouse = { x: combat.width / 2, y: combat.height / 2 };
  combat.bullets = [];
  combat.missiles = [];
  combat.bombs = [];
  combat.kcTotal = 0;
  combat.canExit = false;
  combat.lockIndex = -1;
  combat.threat = null;
  combat.threatCooldown = 2 + Math.random() * 2;
  combat.missileHits = 0;
  combat.gunHits = 0;
  combat.hitNotice = "";
  combat.hitNoticeTimer = 0;
  combat.meritEarned = 0;
  combat.killCount = 0;
  combat.gunCooldown = 0;
  combat.missileCooldown = 0;
  combat.bombCooldown = 0;
  combat.gunFiring = false;
  createTargets(mission.id);
  setRadarThreat([]);
};

const openCombat = (mission) => {
  combat.active = true;
  combat.paused = false;
  dom.combatOverlay.classList.remove("hidden");
  dom.combatResult.classList.add("hidden");
  dom.combatAbort.classList.remove("hidden");
  getCombatCanvas();
  resetCombat(mission);
  if (dom.combatKCBlock) {
    dom.combatKCBlock.classList.toggle("hidden", !state.showKC);
  }
  combat.lastFrame = performance.now();
  updateCombatHud();
  requestAnimationFrame(combatLoop);
};

const closeCombat = () => {
  combat.active = false;
  dom.combatOverlay.classList.add("hidden");
  resetRadarThreat();
};

const updateCombatHud = () => {
  dom.combatMissionName.textContent = combat.mission?.name ?? "--";
  dom.combatTimer.textContent = Math.max(0, Math.ceil(combat.timeLeft));
  dom.combatTargets.textContent = getTargetCount();
  dom.combatHits.textContent = combat.missileHits;
  dom.combatGunHits.textContent = combat.gunHits;
  const lockTarget = combat.targets.filter((t) => !t.destroyed)[combat.lockIndex];
  dom.combatLock.textContent = lockTarget ? `目标-${combat.lockIndex + 1}` : "无";
  if (dom.combatHitAlert) {
    dom.combatHitAlert.textContent = combat.hitNotice || "--";
  }
  if (dom.combatKC) {
    dom.combatKC.textContent = state.showKC ? combat.kcTotal : "--";
  }
};

const endCombat = (success) => {
  combat.paused = true;
  dom.combatResult.classList.remove("hidden");
  if (success) {
    dom.combatResultTitle.textContent = "任务完成";
    dom.combatResultText.textContent = `功勋 +${combat.meritEarned}`;
    dom.combatRetry.textContent = "返回";
    dom.combatAbort.classList.add("hidden");
  } else {
    dom.combatResultTitle.textContent = "任务失败";
    dom.combatResultText.textContent = "可重新开始或放弃任务。";
    dom.combatRetry.textContent = "重新开始";
    dom.combatAbort.classList.remove("hidden");
  }
};

const resolveCombatSuccess = () => {
  const reward = combat.mission.rewardScaled || combat.mission.reward;
  const rewardMerit = combat.mission.rewardMeritScaled || combat.mission.rewardMerit;
  state.resourcePoints += reward;
  state.meritPoints += rewardMerit + combat.meritEarned;
  addLog(
    `${state.aircraftName} 返回，回收资源 ${reward}，功勋 ${rewardMerit + combat.meritEarned}。`
  );
  state.missionActive = null;
  state.missionTime = 0;
  closeCombat();
  render();
};

const resolveCombatAbort = () => {
  addLog(`${state.aircraftName} 任务中止。`);
  state.missionActive = null;
  state.missionTime = 0;
  closeCombat();
  render();
};

const handleCombatRetry = () => {
  if (dom.combatRetry.textContent === "返回") {
    resolveCombatSuccess();
    return;
  }
  dom.combatResult.classList.add("hidden");
  combat.paused = false;
  resetCombat(combat.mission);
  updateCombatHud();
};

const handleCombatAbort = () => {
  resolveCombatAbort();
};

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const isPlayerAtEdge = () =>
  combat.player.x <= 8 ||
  combat.player.x >= combat.width - 8 ||
  combat.player.y <= 8 ||
  combat.player.y >= combat.height - 8;

const syncCombatMouse = () => {
  if (!combat.active || !pointer.has) return;
  const rect = dom.combatCanvas.getBoundingClientRect();
  const rawX = pointer.x - rect.left;
  const rawY = pointer.y - rect.top;
  combat.mouse.x = Math.max(0, Math.min(combat.width, rawX));
  combat.mouse.y = Math.max(0, Math.min(combat.height, rawY));
};

const applyKillRewards = (target, method) => {
  if (state.showKC) {
    const gained = target.kcValue || 0;
    combat.kcTotal += gained;
    state.kcTotal += gained;
  }
  if (target.special) {
    combat.specialDestroyed = true;
    combat.canExit = true;
  }
  combat.killCount += 1;
  if (target.type === "air") {
    combat.meritEarned += method === "gun" ? 4 : method === "missile" ? 3 : 0;
  } else {
    if (method === "gun") {
      combat.meritEarned += 6;
    } else if (method === "missile") {
      combat.meritEarned += 5;
    } else if (method === "bomb") {
      combat.meritEarned += 6;
    }
  }
};

const isPlayerInBombZone = () => {
  const dx = combat.player.x - combat.mouse.x;
  const dy = combat.player.y - combat.mouse.y;
  return Math.hypot(dx, dy) <= combatConfig.bombRadius;
};

const lockNextTarget = () => {
  const available = combat.targets.filter((t) => !t.destroyed);
  if (available.length === 0) {
    combat.lockIndex = -1;
    updateCombatHud();
    return;
  }
  combat.lockIndex = (combat.lockIndex + 1) % available.length;
  updateCombatHud();
};

const fireMissile = () => {
  if (combat.missileCooldown > 0) return;
  const available = combat.targets.filter((t) => !t.destroyed);
  if (available.length === 0) return;
  if (combat.lockIndex < 0) return;
  const target = available[combat.lockIndex];
  combat.missileCooldown = 0.9;
  combat.missiles.push({
    x: combat.player.x,
    y: combat.player.y,
    targetId: target.id,
    speed: combatConfig.missileSpeed,
    owner: "player",
  });
};

const dropBomb = () => {
  if (combat.bombCooldown > 0) return;
  combat.bombCooldown = 1.4;
  combat.bombs.push({
    x: combat.mouse.x,
    y: combat.mouse.y,
    timer: 0.6,
    radius: combatConfig.bombRadius,
    exploded: false,
    fade: 0.4,
  });
};

const fireGun = () => {
  if (combat.gunCooldown > 0) return;
  combat.gunCooldown = 0.12;
  const angle = combat.player.heading;
  combat.bullets.push({
    x: combat.player.x,
    y: combat.player.y,
    vx: Math.cos(angle) * combatConfig.gunSpeed,
    vy: Math.sin(angle) * combatConfig.gunSpeed,
    owner: "player",
  });
};

const spawnEnemyBullet = (enemy) => {
  const dx = combat.player.x - enemy.x;
  const dy = combat.player.y - enemy.y;
  const length = Math.hypot(dx, dy) || 1;
  const speed = enemy.gunSpeed || combatConfig.gunSpeed;
  combat.bullets.push({
    x: enemy.x,
    y: enemy.y,
    vx: (dx / length) * speed,
    vy: (dy / length) * speed,
    owner: "enemy",
    aaBoost: enemy.aaBoost === true,
  });
};

const createThreat = () => {
  const dirs = ["up", "right", "down", "left"];
  const index = Math.floor(Math.random() * 4);
  const primary = dirs[index];
  const addSecond = Math.random() < 0.35;
  const secondary =
    addSecond && Math.random() < 0.5
      ? dirs[(index + 1) % 4]
      : addSecond
      ? dirs[(index + 3) % 4]
      : null;
  const activeDirs = secondary ? [primary, secondary] : [primary];
  const opposite = {
    up: "down",
    right: "left",
    down: "up",
    left: "right",
  };
  combat.threat = {
    dirs: activeDirs,
    required: new Set(activeDirs.map((dir) => opposite[dir])),
    input: new Set(),
    deadline: performance.now() + 1200,
  };
  setRadarThreat(activeDirs);
};

const resolveThreatInput = () => {
  if (!combat.threat) return;
  const success = Array.from(combat.threat.required).every((dir) =>
    combat.threat.input.has(dir)
  );
  if (success) {
    combat.threat = null;
    resetRadarThreat();
    combat.threatCooldown = 2 + Math.random() * 2;
  }
};

const failThreat = () => {
  combat.missileHits += 1;
  combat.hitNotice = "飞机受击";
  combat.hitNoticeTimer = 1.5;
  combat.threat = null;
  resetRadarThreat();
  combat.threatCooldown = 2 + Math.random() * 2;
  if (combat.missileHits >= combatConfig.missileDamageLimit) {
    endCombat(false);
  }
};

const updateCombat = (dt) => {
  if (!combat.active || combat.paused) return;
  syncCombatMouse();
  combat.timeLeft = Math.max(0, combat.timeLeft - dt);
  if (combat.timeLeft <= 0) {
    endCombat(false);
    return;
  }
  const elapsed = (combat.mission?.durationScaled || 0) - combat.timeLeft;

  const dx = combat.mouse.x - combat.player.x;
  const dy = combat.mouse.y - combat.player.y;
  const dist = Math.hypot(dx, dy);
  if (dist > 6) {
    combat.player.x += (dx / dist) * combatConfig.playerSpeed * dt;
    combat.player.y += (dy / dist) * combatConfig.playerSpeed * dt;
    combat.player.heading = Math.atan2(dy, dx);
  }
  combat.player.x = Math.max(4, Math.min(combat.width - 4, combat.player.x));
  combat.player.y = Math.max(4, Math.min(combat.height - 4, combat.player.y));

  combat.targets.forEach((enemy) => {
    if (enemy.destroyed) return;
    const distToPlayer = distance(enemy, combat.player);
    const rangeBase = enemy.aa ? combatConfig.enemyAAGunRange : combatConfig.enemyGunRange;
    const gunRange = rangeBase * (enemy.gunRangeMultiplier || 1);
    const inGunRange = distToPlayer <= gunRange;
    if (enemy.type === "air") {
      enemy.x += enemy.vx * dt;
      enemy.y += enemy.vy * dt;
      if (enemy.x < 30 || enemy.x > combat.width - 30) {
        enemy.vx *= -1;
      }
      if (enemy.y < 30 || enemy.y > combat.height - 30) {
        enemy.vy *= -1;
      }
    } else if (enemy.moving) {
      enemy.x += enemy.vx * dt;
      enemy.y += enemy.vy * dt;
      if (
        !enemy.escaped &&
        (enemy.x < -20 ||
          enemy.x > combat.width + 20 ||
          enemy.y < -20 ||
          enemy.y > combat.height + 20)
      ) {
        enemy.escaped = true;
        enemy.destroyed = true;
        combat.escapedTargets += 1;
      }
    }
    if (enemy.evade > 0) {
      enemy.evade -= dt;
    }
    enemy.shootCooldown -= dt;
    if (enemy.shootCooldown <= 0) {
      if ((enemy.type === "air" || enemy.aa) && inGunRange) {
        spawnEnemyBullet(enemy);
        const min = enemy.aa ? combatConfig.enemyAAGunCooldownMin : combatConfig.enemyGunCooldownMin;
        const max = enemy.aa ? combatConfig.enemyAAGunCooldownMax : combatConfig.enemyGunCooldownMax;
        const boost = enemy.aaBoost ? 0.4 : 1;
        enemy.shootCooldown = (min + Math.random() * (max - min)) * boost;
      } else {
        enemy.shootCooldown = 0.2;
      }
    }
  });

  if (combat.mission?.id === "ground-blockade" && elapsed < 30 && combat.escapedTargets > 1) {
    endCombat(false);
    return;
  }

  if (combat.gunFiring) {
    fireGun();
  }
  combat.gunCooldown = Math.max(0, combat.gunCooldown - dt);
  combat.missileCooldown = Math.max(0, combat.missileCooldown - dt);
  combat.bombCooldown = Math.max(0, combat.bombCooldown - dt);

  combat.bullets = combat.bullets.filter((bullet) => {
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    if (
      bullet.x < -20 ||
      bullet.x > combat.width + 20 ||
      bullet.y < -20 ||
      bullet.y > combat.height + 20
    ) {
      return false;
    }
    if (bullet.owner === "enemy") {
      if (distance(bullet, combat.player) < 12) {
        combat.gunHits += 1;
        combat.hitNotice = "飞机受击";
        combat.hitNoticeTimer = 1.2;
        if (combat.gunHits >= combatConfig.gunDamageLimit) {
          endCombat(false);
        }
        return false;
      }
    } else {
      const hitTarget = combat.targets.find(
        (enemy) => !enemy.destroyed && distance(bullet, enemy) < 14
      );
      if (hitTarget) {
        hitTarget.hp -= 1;
        if (hitTarget.hp <= 0) {
          hitTarget.destroyed = true;
          applyKillRewards(hitTarget, "gun");
        }
        return false;
      }
    }
    return true;
  });

  combat.missiles = combat.missiles.filter((missile) => {
    const target = combat.targets.find((enemy) => enemy.id === missile.targetId);
    if (!target || target.destroyed) {
      return false;
    }
    const vx = target.x - missile.x;
    const vy = target.y - missile.y;
    const len = Math.hypot(vx, vy) || 1;
    missile.x += (vx / len) * missile.speed * dt;
    missile.y += (vy / len) * missile.speed * dt;
    if (len < 18) {
      const evadeChance = target.evade > 0 ? 0.45 : 0.2;
      if (Math.random() > evadeChance) {
        target.hp -= 2;
        if (target.hp <= 0) {
          target.destroyed = true;
          applyKillRewards(target, "missile");
        }
      } else {
        target.evade = 0.8;
      }
      return false;
    }
    return true;
  });

  combat.bombs = combat.bombs.filter((bomb) => {
    if (!bomb.exploded) {
      bomb.timer -= dt;
      if (bomb.timer <= 0) {
        bomb.exploded = true;
        combat.targets.forEach((enemy) => {
          if (!enemy.destroyed && enemy.type === "ground") {
            if (distance(bomb, enemy) <= bomb.radius) {
              enemy.hp -= 2;
              if (enemy.hp <= 0) {
                enemy.destroyed = true;
                applyKillRewards(enemy, "bomb");
              }
            }
          }
        });
      }
    } else {
      bomb.fade -= dt;
      if (bomb.fade <= 0) {
        return false;
      }
    }
    return true;
  });

  combat.threatCooldown -= dt;
  if (!combat.threat && combat.threatCooldown <= 0 && getTargetCount() > 0) {
    createThreat();
  }
  if (combat.threat && performance.now() > combat.threat.deadline) {
    failThreat();
  }

  const missionId = combat.mission?.id;
  if (missionId === "air-patrol" && elapsed >= 30) {
    combat.canExit = true;
  }
  if (missionId === "ground-blockade" && elapsed >= 30 && combat.escapedTargets <= 1) {
    combat.canExit = true;
  }
  if ((missionId === "air-intercept" || missionId === "ground-raid") && combat.specialDestroyed) {
    combat.canExit = true;
  }

  if (missionId === "air-sweep" && getTargetCount() === 0) {
    endCombat(true);
    return;
  }
  if (
    missionId === "ground-strike" &&
    combat.targets.every((target) => target.destroyed || target.type !== "ground")
  ) {
    endCombat(true);
    return;
  }
  if (
    (missionId === "air-patrol" ||
      missionId === "air-intercept" ||
      missionId === "ground-raid" ||
      missionId === "ground-blockade") &&
    combat.canExit &&
    isPlayerAtEdge()
  ) {
    endCombat(true);
    return;
  }

  if (state.missionActive) {
    state.missionTime = (state.missionActive.durationScaled || 0) - combat.timeLeft;
  }
  if (combat.hitNoticeTimer > 0) {
    combat.hitNoticeTimer = Math.max(0, combat.hitNoticeTimer - dt);
    if (combat.hitNoticeTimer === 0) {
      combat.hitNotice = "";
    }
  }
  renderNumbers();
  updateCombatHud();
};

const drawTriangle = (ctx, x, y, size, angle, color) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(size, 0);
  ctx.lineTo(-size * 0.5, size * 0.6);
  ctx.lineTo(-size * 0.5, -size * 0.6);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
};

const drawSquare = (ctx, x, y, size, color) => {
  ctx.fillStyle = color;
  ctx.fillRect(x - size / 2, y - size / 2, size, size);
};

const renderCombat = () => {
  if (!combat.active) return;
  const ctx = dom.combatCanvas.getContext("2d");
  ctx.clearRect(0, 0, combat.width, combat.height);
  ctx.fillStyle = "rgba(4, 6, 10, 0.85)";
  ctx.fillRect(0, 0, combat.width, combat.height);

  ctx.strokeStyle = "rgba(80, 120, 200, 0.08)";
  ctx.lineWidth = 1;
  for (let x = 0; x < combat.width; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, combat.height);
    ctx.stroke();
  }
  for (let y = 0; y < combat.height; y += 60) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(combat.width, y);
    ctx.stroke();
  }

  if (combat.mode === "ground") {
    const inZone = isPlayerInBombZone();
    ctx.strokeStyle = inZone ? "rgba(0, 255, 122, 0.6)" : "rgba(255, 255, 255, 0.25)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(combat.mouse.x, combat.mouse.y, combatConfig.bombRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.fillRect(combat.mouse.x - 3, combat.mouse.y - 3, 6, 6);
  }

  combat.bombs.forEach((bomb) => {
    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
    ctx.lineWidth = 2;
    const radius = bomb.exploded ? bomb.radius * (1 + (0.4 - bomb.fade)) : 10;
    ctx.beginPath();
    ctx.arc(bomb.x, bomb.y, radius, 0, Math.PI * 2);
    ctx.stroke();
  });

  combat.targets.forEach((enemy, index) => {
    if (enemy.destroyed) return;
    const color = enemy.special ? "rgba(255, 217, 61, 0.95)" : "rgba(255, 80, 80, 0.9)";
    const fade = enemy.evade > 0 ? 0.35 : 1;
    ctx.globalAlpha = fade;
    if (enemy.type === "air") {
      drawTriangle(
        ctx,
        enemy.x,
        enemy.y,
        enemy.special ? 14 : 12,
        Math.atan2(enemy.vy, enemy.vx),
        color
      );
      if (enemy.special) {
        ctx.strokeStyle = "rgba(255, 217, 61, 0.7)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, 18, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else {
      drawSquare(ctx, enemy.x, enemy.y, enemy.special ? 18 : 14, color);
      if (enemy.special) {
        ctx.strokeStyle = "rgba(255, 217, 61, 0.7)";
        ctx.lineWidth = 2;
        ctx.strokeRect(enemy.x - 12, enemy.y - 12, 24, 24);
      }
    }
    ctx.globalAlpha = 1;
    if (index === combat.lockIndex) {
      ctx.strokeStyle = "rgba(255, 80, 80, 0.9)";
      ctx.lineWidth = 2;
      ctx.strokeRect(enemy.x - 16, enemy.y - 16, 32, 32);
    }
  });

  combat.bullets.forEach((bullet) => {
    if (bullet.owner === "player") {
      ctx.fillStyle = "#00ff7a";
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, 3, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    ctx.fillStyle = bullet.aaBoost ? "rgba(255, 217, 61, 0.95)" : "rgba(255, 80, 80, 0.9)";
    ctx.save();
    ctx.translate(bullet.x, bullet.y);
    ctx.rotate(Math.atan2(bullet.vy, bullet.vx));
    const size = bullet.aaBoost ? 6 : 4;
    const width = bullet.aaBoost ? 3.5 : 2.5;
    ctx.beginPath();
    ctx.moveTo(size, 0);
    ctx.lineTo(0, width);
    ctx.lineTo(-size, 0);
    ctx.lineTo(0, -width);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  });

  combat.missiles.forEach((missile) => {
    if (missile.owner !== "player") return;
    ctx.fillStyle = "#00ff7a";
    ctx.beginPath();
    ctx.arc(missile.x, missile.y, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  drawTriangle(
    ctx,
    combat.player.x,
    combat.player.y,
    14,
    combat.player.heading,
    "#00ff7a"
  );
};

const combatLoop = (timestamp) => {
  if (!combat.active) return;
  const dt = Math.min(0.05, (timestamp - combat.lastFrame) / 1000);
  combat.lastFrame = timestamp;
  updateCombat(dt);
  renderCombat();
  requestAnimationFrame(combatLoop);
};

const launchSelectedMission = () => {
  if (!state.aircraftType) {
    addLog("未配置航空器型号，任务锁定。");
    return;
  }
  if (state.missionActive) {
    addLog("航空器正在任务中，无法重复出击。");
    return;
  }
  const mission = state.missions.find((item) => item.id === state.selectedMission);
  if (!mission) return;
  if (state.prepPoints < mission.prepCost) {
    addLog("准备点数不足，等待补充。");
    return;
  }
  const scale = getMeritScale();
  const durationScaled = Math.max(
    MIN_MISSION_TIME,
    Math.round(mission.duration * scale.duration)
  );
  const rewardScaled = Math.round(mission.reward * scale.reward);
  const rewardMeritScaled = Math.max(
    1,
    Math.round(mission.rewardMerit * scale.rewardMerit)
  );
  state.prepPoints -= mission.prepCost;
  state.missionActive = {
    ...mission,
    durationScaled,
    rewardScaled,
    rewardMeritScaled,
  };
  state.missionTime = 0;
  addLog(`${state.aircraftName} 执行任务：${mission.name}`);
  openCombat(state.missionActive);
  render();
};

const updateTick = () => {
  state.prepPoints += state.prepRate * DEBUG_SPEED;
  state.resourcePoints += state.resourceRate * DEBUG_SPEED;
  if (state.meritPoints > 0) {
    state.meritPoints += state.meritRate * DEBUG_SPEED;
  }
  if (state.settingsLocked && state.enableAttrition) {
    const chance = 0.003 * DEBUG_SPEED;
    if (state.staff.total > 0 && Math.random() < chance) {
      const pool = [
        { key: "idle", count: state.staff.idle },
        { key: "ops", count: state.staff.ops },
        { key: "eng", count: state.staff.eng },
        { key: "intel", count: state.staff.intel },
      ];
      const total = pool.reduce((sum, item) => sum + item.count, 0);
      if (total > 0) {
        let pick = randomInt(1, total);
        let selected = pool[0].key;
        for (const item of pool) {
          pick -= item.count;
          if (pick <= 0) {
            selected = item.key;
            break;
          }
        }
        if (state.staff[selected] > 0) {
          state.staff[selected] -= 1;
        }
        state.staff.total = Math.max(0, state.staff.total - 1);
        const reasons = ["调任", "KIA", "MIA"];
        const reason = reasons[randomInt(0, reasons.length - 1)];
        let name = "人员-未知";
        if (state.staffNames.length > 0) {
          const index = randomInt(0, state.staffNames.length - 1);
          name = state.staffNames.splice(index, 1)[0];
        }
        addLog(`${name} ${reason}。`);
        calcRates();
        render();
      }
    }
  }
  if (!combat.active) {
    renderNumbers();
  }
  renderMissions();
};

bindEditable(dom.baseNameDisplay, (value) => {
  state.baseName = value;
  addLog(`基地代号更新为 ${value}。`);
  render();
});

bindEditable(dom.aircraftNameDisplay, (value) => {
  state.aircraftName = value;
  addLog(`航空器代号更新为 ${value}。`);
  render();
});

dom.launchMission.addEventListener("click", launchSelectedMission);

dom.recruitStaff.addEventListener("click", () => {
  const cost = 40 + state.staff.total * 6;
  if (state.resourcePoints < cost) {
    addLog("资源点不足，无法补充人员。");
    return;
  }
  state.resourcePoints -= cost;
  state.staff.total += 1;
  state.staff.idle += 1;
  const name = `人员-${String(state.staff.total).padStart(2, "0")}`;
  state.staffNames.push(name);
  addLog(`人员补充：${name}。`);
  calcRates();
  render();
});

document.querySelectorAll("[data-staff]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.staff;
    if (state.staff.idle <= 0) {
      addLog("待命人员不足，无法追加编制。");
      return;
    }
    state.staff[target] += 1;
    state.staff.idle -= 1;
    const label = target === "ops" ? "作战指挥" : target === "eng" ? "工程维护" : "情报分析";
    addLog(`新增编制：${label} +1。`);
    calcRates();
    render();
  });
});

dom.aircraftSelect.querySelectorAll("[data-aircraft]").forEach((btn) => {
  btn.addEventListener("click", () => {
    updateAircraftType(btn.dataset.aircraft);
  });
});

document.querySelectorAll("[data-aircraft-switch]").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (state.missionActive) {
      addLog("航空器正在任务中，无法切换机型。");
      return;
    }
    updateAircraftType(btn.dataset.aircraftSwitch);
  });
});

dom.combatRetry.addEventListener("click", handleCombatRetry);

dom.combatAbort.addEventListener("click", handleCombatAbort);

if (dom.saveGame) {
  dom.saveGame.addEventListener("click", saveGame);
}

if (dom.loadGame) {
  dom.loadGame.addEventListener("click", loadGame);
}

if (dom.loadFileInput) {
  dom.loadFileInput.addEventListener("change", () => {
    const file = dom.loadFileInput.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      loadGameFromText(String(reader.result || ""));
    };
    reader.readAsText(file);
  });
}

dom.combatCanvas.addEventListener("contextmenu", (event) => {
  event.preventDefault();
});

const updateCombatMouse = (event) => {
  pointer.x = event.clientX;
  pointer.y = event.clientY;
  pointer.has = true;
  syncCombatMouse();
};

dom.combatCanvas.addEventListener("mousemove", updateCombatMouse);
window.addEventListener("mousemove", updateCombatMouse);

dom.combatCanvas.addEventListener("mousedown", (event) => {
  if (!combat.active || combat.paused) return;
  if (event.button === 2) {
    lockNextTarget();
    return;
  }
  if (event.button === 0) {
    const available = combat.targets.filter((t) => !t.destroyed);
    if (combat.lockIndex >= 0 && available[combat.lockIndex]) {
      fireMissile();
    }
  }
});

document.addEventListener("keydown", (event) => {
  if (!combat.active || combat.paused) return;
  if (event.code === "Space") {
    if (combat.mode === "air") {
      combat.gunFiring = true;
    } else if (!event.repeat && isPlayerInBombZone()) {
      dropBomb();
    }
  }
  const map = {
    ArrowUp: "up",
    ArrowRight: "right",
    ArrowDown: "down",
    ArrowLeft: "left",
    KeyW: "up",
    KeyD: "right",
    KeyS: "down",
    KeyA: "left",
  };
  const dir = map[event.code];
  if (dir && combat.threat) {
    combat.threat.input.add(dir);
    resolveThreatInput();
  }
});

document.addEventListener("keyup", (event) => {
  if (event.code === "Space" && combat.mode === "air") {
    combat.gunFiring = false;
  }
});

window.addEventListener("resize", () => {
  if (!combat.active) return;
  getCombatCanvas();
});

calcRates();
syncSettingsUI();
addLog("系统就绪。");
render();
setInterval(updateTick, TICK_MS);
