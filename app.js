// --- GAME STATE ---
let playerStats = { coins: 10, lives: 5, round: 1 };
let shopSlots = [null, null, null];
let teamSlots = [null, null, null];
let benchSlots = [null, null, null, null, null];
let enemySlots = [null, null, null];
let draggedItem = null;

const unitDatabase = [
    { id: "knight", name: "Knight", icon: "🛡️", hp: 5, dmg: 2, cost: 3 },
    { id: "goblin", name: "Goblin", icon: "👺", hp: 2, dmg: 4, cost: 3 },
    { id: "cleric", name: "Cleric", icon: "✨", hp: 3, dmg: 1, cost: 3 },
    { id: "wolf", name: "Dire Wolf", icon: "🐺", hp: 4, dmg: 3, cost: 3 }
];

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
function getRandomInt(max) { return Math.floor(Math.random() * max); }

// --- DRAFT & ECONOMY LOGIC ---
function rollShop() {
    for (let i = 0; i < 3; i++) {
        shopSlots[i] = { ...unitDatabase[getRandomInt(unitDatabase.length)], level: 1 };
    }
    renderShop();
}

function rerollShop() {
    if (playerStats.coins >= 1) {
        playerStats.coins -= 1;
        rollShop();
        updateStatsUI();
    } else {
        alert("Not enough coins to reroll!");
    }
}

function buyUnit(shopIndex) {
    const unit = shopSlots[shopIndex];
    if (!unit) return;
    if (playerStats.coins < unit.cost) { alert("Not enough coins!"); return; }

    let emptyBenchIndex = benchSlots.findIndex(s => s === null);
    let emptyTeamIndex = teamSlots.findIndex(s => s === null);

    if (emptyBenchIndex !== -1) {
        benchSlots[emptyBenchIndex] = unit;
    } else if (emptyTeamIndex !== -1) {
        teamSlots[emptyTeamIndex] = unit;
    } else {
        alert("Team and Bench are completely full! Sell something first.");
        return;
    }

    playerStats.coins -= unit.cost;
    shopSlots[shopIndex] = null;

    checkAndMerge();
    updateStatsUI();
    renderShop();
    renderAllDraft();
}

function checkAndMerge() {
    let allActiveSlots = [
        ...teamSlots.map((u, i) => ({ unit: u, loc: 'team', index: i })),
        ...benchSlots.map((u, i) => ({ unit: u, loc: 'bench', index: i }))
    ].filter(s => s.unit !== null);

    let didMerge = false;

    for (let level = 1; level <= 2; level++) {
        let groups = {};
        allActiveSlots.filter(s => s.unit.level === level).forEach(s => {
            if (!groups[s.unit.id]) groups[s.unit.id] = [];
            groups[s.unit.id].push(s);
        });

        for (let id in groups) {
            if (groups[id].length >= 3) {
                let toMerge = groups[id].slice(0, 3);
                let targetLoc = toMerge.find(s => s.loc === 'team') || toMerge[0];

                toMerge.forEach(s => {
                    if (s.loc === 'team') teamSlots[s.index] = null;
                    if (s.loc === 'bench') benchSlots[s.index] = null;
                });

                let baseData = unitDatabase.find(u => u.id === id);
                let newLevel = level + 1;
                let statMult = newLevel === 2 ? 2 : 4;

                let upgradedUnit = {
                    ...baseData,
                    level: newLevel,
                    hp: baseData.hp * statMult,
                    dmg: baseData.dmg * statMult
                };

                if (targetLoc.loc === 'team') teamSlots[targetLoc.index] = upgradedUnit;
                if (targetLoc.loc === 'bench') benchSlots[targetLoc.index] = upgradedUnit;

                didMerge = true;
                break;
            }
        }
    }

    if (didMerge) {
        checkAndMerge();
    }
}

// --- DRAG, DROP LOGIC ---
function handleDragStart(e, arrayName, index) {
    draggedItem = { arrayName, index };
    e.target.classList.add("dragging");
}

function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add("drag-over");
}

function handleDragLeave(e) {
    e.currentTarget.classList.remove("drag-over");
}

function handleDropSwap(e, dropArrayName, dropIndex) {
    e.preventDefault();
    e.currentTarget.classList.remove("drag-over");

    if (draggedItem) {
        let sourceArray = draggedItem.arrayName === 'team' ? teamSlots : benchSlots;
        let targetArray = dropArrayName === 'team' ? teamSlots : benchSlots;

        let sourceUnit = sourceArray[draggedItem.index];
        let targetUnit = targetArray[dropIndex];

        sourceArray[draggedItem.index] = targetUnit;
        targetArray[dropIndex] = sourceUnit;

        renderAllDraft();
    }
}

function handleDropSell(e) {
    e.preventDefault();
    e.currentTarget.classList.remove("drag-over");
    if (draggedItem) {
        let sourceArray = draggedItem.arrayName === 'team' ? teamSlots : benchSlots;
        let unitToSell = sourceArray[draggedItem.index];

        if (unitToSell) {
            sourceArray[draggedItem.index] = null;
            playerStats.coins += Math.pow(3, unitToSell.level - 1);
            updateStatsUI();
            renderAllDraft();
        }
    }
}

// --- RENDERING UI ---
function renderShop() {
    const container = document.getElementById("shop-container");
    container.innerHTML = "";
    shopSlots.forEach((unit, i) => {
        const el = document.createElement("div");
        if (unit) {
            el.className = "card-slot";
            el.innerHTML = `
                <div class="level-badge">⭐</div>
                <div style="font-size: 2.5rem;">${unit.icon}</div>
                <strong>${unit.name}</strong>
                <div>❤️ ${unit.hp} | ⚔️ ${unit.dmg}</div>
                <div style="font-size: 0.8rem; color: var(--btn-color);">🪙${unit.cost}</div>
            `;
            el.onclick = () => buyUnit(i);
        } else { el.className = "card-slot empty"; el.innerText = "Sold"; }
        container.appendChild(el);
    });
}

function createDraggableSlotHTML(unit, arrayName, index) {
    const el = document.createElement("div");
    if (unit) {
        el.className = "card-slot";
        el.draggable = true;
        const stars = "⭐".repeat(unit.level);
        el.innerHTML = `
            <div class="level-badge">${stars}</div>
            <div style="font-size: 2.5rem;">${unit.icon}</div>
            <strong>${unit.name}</strong>
            <div>❤️ ${unit.hp} | ⚔️ ${unit.dmg}</div>
        `;
        el.addEventListener("dragstart", (e) => handleDragStart(e, arrayName, index));
        el.addEventListener("dragend", (e) => e.target.classList.remove("dragging"));
    } else { el.className = "card-slot empty"; el.innerText = "Empty"; }

    el.addEventListener("dragover", handleDragOver);
    el.addEventListener("dragleave", handleDragLeave);
    el.addEventListener("drop", (e) => handleDropSwap(e, arrayName, index));
    return el;
}

function renderAllDraft() {
    const tContainer = document.getElementById("team-container");
    tContainer.innerHTML = "";
    teamSlots.forEach((u, i) => tContainer.appendChild(createDraggableSlotHTML(u, 'team', i)));

    const bContainer = document.getElementById("bench-container");
    bContainer.innerHTML = "";
    benchSlots.forEach((u, i) => bContainer.appendChild(createDraggableSlotHTML(u, 'bench', i)));
}

const sellZone = document.getElementById("sell-zone");
sellZone.addEventListener("dragover", handleDragOver);
sellZone.addEventListener("dragleave", handleDragLeave);
sellZone.addEventListener("drop", handleDropSell);

// --- BATTLE PHASE LOGIC ---
async function startBattle() {
    if (!teamSlots.some(u => u !== null)) { alert("Draft at least one unit onto your Team!"); return; }

    document.getElementById("draft-phase").style.display = "none";
    document.getElementById("battle-phase").style.display = "block";
    document.getElementById("next-round-btn").style.display = "none";
    document.getElementById("battle-log").innerHTML = `Round ${playerStats.round} begins!`;

    // UPDATED SCALING: Gradual introduction of higher level enemies
    for (let i = 0; i < 3; i++) {
        let baseUnit = unitDatabase[getRandomInt(unitDatabase.length)];
        let enemyLevel = 1;

        if (playerStats.round >= 3 && i === 0) enemyLevel = 2; // Introduce 1 Lvl 2 on Round 3
        if (playerStats.round >= 4 && i <= 1) enemyLevel = 2;  // Two Lvl 2s on Round 4
        if (playerStats.round >= 5) enemyLevel = 2;            // All Lvl 2 on Round 5
        if (playerStats.round >= 7 && i === 0) enemyLevel = 3; // Introduce 1 Lvl 3 on Round 7
        if (playerStats.round >= 8) enemyLevel = 3;            // Hardcore late game

        let statMult = enemyLevel === 2 ? 2 : (enemyLevel === 3 ? 4 : 1);

        enemySlots[i] = {
            ...baseUnit,
            level: enemyLevel,
            hp: baseUnit.hp * statMult,
            dmg: baseUnit.dmg * statMult
        };
    }

    let combatTeam = JSON.parse(JSON.stringify(teamSlots));
    let combatEnemies = JSON.parse(JSON.stringify(enemySlots));

    renderArena(combatTeam, combatEnemies);
    await sleep(1000);

    let pIndex = 2;
    let eIndex = 0;

    while (pIndex >= 0 && eIndex < 3) {
        let pUnit = combatTeam[pIndex];
        let eUnit = combatEnemies[eIndex];

        if (!pUnit || pUnit.hp <= 0) { pIndex--; continue; }
        if (!eUnit || eUnit.hp <= 0) { eIndex++; continue; }

        let pEl = document.getElementById(`combat-p-${pIndex}`);
        let eEl = document.getElementById(`combat-e-${eIndex}`);

        if(pEl) pEl.classList.add("anim-attack");
        if(eEl) eEl.classList.add("anim-attack-reverse");
        await sleep(300);

        pUnit.hp -= eUnit.dmg;
        eUnit.hp -= pUnit.dmg;
        renderArena(combatTeam, combatEnemies);

        pEl = document.getElementById(`combat-p-${pIndex}`);
        eEl = document.getElementById(`combat-e-${eIndex}`);
        if(pEl) pEl.classList.add("anim-damage");
        if(eEl) eEl.classList.add("anim-damage");
        await sleep(400);
    }

    const pAlive = combatTeam.some(u => u && u.hp > 0);
    const log = document.getElementById("battle-log");

    if (pAlive) {
        playerStats.coins += 4;
        log.innerHTML = `<span style="color: #50fa7b;">Victory!</span> +4 Coins!`;
    } else {
        playerStats.lives -= 1;
        log.innerHTML = `<span style="color: #ff5555;">Defeat!</span> -1 Life.`;
    }

    updateStatsUI();

    if (playerStats.lives <= 0) {
        log.innerHTML += `<br><b>GAME OVER!</b> Refresh to try again.`;
    } else {
        document.getElementById("next-round-btn").style.display = "inline-block";
    }
}

function returnToDraft() {
    playerStats.round += 1;
    playerStats.coins += 5; // UPDATED: More base income per round
    updateStatsUI();
    document.getElementById("battle-phase").style.display = "none";
    document.getElementById("draft-phase").style.display = "block";
    rollShop();
    renderAllDraft();
}

function renderArena(pTeam, eTeam) {
    const pContainer = document.getElementById("combat-player-container");
    const eContainer = document.getElementById("combat-enemy-container");
    pContainer.innerHTML = ""; eContainer.innerHTML = "";

    pTeam.forEach((unit, i) => {
        const el = document.createElement("div");
        el.id = `combat-p-${i}`;
        if (unit) {
            const stars = "⭐".repeat(unit.level);
            el.className = `card-slot ${unit.hp <= 0 ? 'anim-dead' : ''}`;
            el.innerHTML = `<div class="level-badge">${stars}</div><div style="font-size: 2.5rem;">${unit.icon}</div><strong>${unit.name}</strong><div>❤️ ${unit.hp} | ⚔️ ${unit.dmg}</div>`;
        } else { el.className = "card-slot empty"; el.innerText = "Empty"; }
        pContainer.appendChild(el);
    });

    eTeam.forEach((unit, i) => {
        const el = document.createElement("div");
        el.id = `combat-e-${i}`;
        if (unit) {
            const stars = "⭐".repeat(unit.level);
            el.className = `card-slot ${unit.hp <= 0 ? 'anim-dead' : ''}`;
            el.innerHTML = `<div class="level-badge">${stars}</div><div style="font-size: 2.5rem;">${unit.icon}</div><strong>${unit.name}</strong><div>❤️ ${unit.hp} | ⚔️ ${unit.dmg}</div>`;
        } else { el.className = "card-slot empty"; el.innerText = "Empty"; }
        eContainer.appendChild(el);
    });
}

function updateStatsUI() {
    document.getElementById("coins").innerText = playerStats.coins;
    document.getElementById("lives").innerText = playerStats.lives;
    document.getElementById("round-display").innerText = playerStats.round;
}

document.getElementById("reroll-btn").onclick = rerollShop;
document.getElementById("battle-btn").onclick = startBattle;
document.getElementById("next-round-btn").onclick = returnToDraft;
updateStatsUI();
rollShop();
renderAllDraft();