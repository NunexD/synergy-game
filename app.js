// --- GAME STATE ---
let playerStats = { coins: 10, lives: 5 };
let shopSlots = [null, null, null];
let teamSlots = [null, null, null];
let enemySlots = [null, null, null];
let inCombat = false; // Prevents selling while fighting

// --- UNIT DATABASE ---
const unitDatabase = [
    { id: "knight", name: "Knight", icon: "🛡️", hp: 5, dmg: 2, cost: 3 },
    { id: "goblin", name: "Goblin", icon: "👺", hp: 2, dmg: 4, cost: 3 },
    { id: "cleric", name: "Cleric", icon: "✨", hp: 3, dmg: 1, cost: 3 },
    { id: "wolf", name: "Dire Wolf", icon: "🐺", hp: 4, dmg: 3, cost: 3 }
];

// --- UTILITIES ---
function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// --- DRAFTING & ECONOMY LOGIC ---
function rollShop() {
    for (let i = 0; i < 3; i++) {
        shopSlots[i] = { ...unitDatabase[getRandomInt(unitDatabase.length)] };
    }
    renderShop();
}

function buyUnit(shopIndex) {
    if (inCombat) return; // Lock shop during battle

    const unit = shopSlots[shopIndex];
    if (!unit) return;

    if (playerStats.coins < unit.cost) {
        alert("Not enough coins!");
        return;
    }

    const emptyTeamIndex = teamSlots.findIndex(slot => slot === null);
    if (emptyTeamIndex === -1) {
        alert("Your team is full! Sell a unit first.");
        return;
    }

    playerStats.coins -= unit.cost;
    teamSlots[emptyTeamIndex] = unit;
    shopSlots[shopIndex] = null;

    updateStatsUI();
    renderShop();
    renderTeam();
}

function sellUnit(teamIndex) {
    if (inCombat) return; // Lock selling during battle

    const unit = teamSlots[teamIndex];
    if (!unit) return;

    // Remove unit and refund 1 coin
    teamSlots[teamIndex] = null;
    playerStats.coins += 1;

    updateStatsUI();
    renderTeam();
}

// --- ASYNC BATTLE LOGIC ---
async function executeBattle() {
    const btn = document.getElementById("battle-btn");
    const log = document.getElementById("battle-log");

    if (!teamSlots.some(u => u !== null)) {
        alert("Draft at least one unit first!");
        return;
    }

    // 1. Lock the UI
    inCombat = true;
    btn.disabled = true;
    log.innerHTML = "Battle starting...";

    // 2. Generate a FULL random enemy team (No empty slots!)
    for (let i = 0; i < 3; i++) {
        enemySlots[i] = { ...unitDatabase[getRandomInt(unitDatabase.length)] };
    }
    renderEnemies();
    await sleep(1000);

    let combatTeam = JSON.parse(JSON.stringify(teamSlots));
    let combatEnemies = JSON.parse(JSON.stringify(enemySlots));

    let pIndex = 0;
    let eIndex = 0;

    // 3. Continuous Combat: Fight until one entire team is dead
    while (pIndex < 3 && eIndex < 3) {
        let pUnit = combatTeam[pIndex];
        let eUnit = combatEnemies[eIndex];

        // Skip to the next slot if this unit is dead or empty
        if (!pUnit || pUnit.hp <= 0) {
            pIndex++;
            continue;
        }
        if (!eUnit || eUnit.hp <= 0) {
            eIndex++;
            continue;
        }

        let pEl = document.getElementById(`team-${pIndex}`);
        let eEl = document.getElementById(`enemy-${eIndex}`);

        // Attack Animation
        if(pEl) pEl.classList.add("anim-attack");
        if(eEl) eEl.classList.add("anim-attack");
        await sleep(300);

        // Deal Damage
        pUnit.hp -= eUnit.dmg;
        eUnit.hp -= pUnit.dmg;

        // Re-render
        renderTeam(combatTeam);
        renderEnemies(combatEnemies);

        // Damage Shake Animation
        pEl = document.getElementById(`team-${pIndex}`);
        eEl = document.getElementById(`enemy-${eIndex}`);
        if(pEl) pEl.classList.add("anim-damage");
        if(eEl) eEl.classList.add("anim-damage");

        await sleep(400);
    }

    // 4. Determine Winner (No Draws Allowed! If everyone dies, you lose)
    let pAlive = combatTeam.some(u => u && u.hp > 0);

    if (pAlive) {
        playerStats.coins += 4;
        log.innerHTML = `<span style="color: #50fa7b;">Victory!</span> You wiped out the enemy. +4 Coins!`;
    } else {
        playerStats.lives -= 1;
        log.innerHTML = `<span style="color: #ff5555;">Defeat!</span> Your team was wiped out. -1 Life.`;
    }

    updateStatsUI();

    // 5. Cleanup
    if (playerStats.lives <= 0) {
        log.innerHTML += `<br><span style="color: #ff5555; font-weight: bold;">GAME OVER!</span> Refresh page to restart.`;
    } else {
        await sleep(2500);
        enemySlots = [null, null, null];
        renderEnemies();
        renderTeam(); // Restores original fully-healed team UI
        rollShop();
        btn.disabled = false;
        inCombat = false;
        log.innerHTML = "Draft your team, then click Battle to fight!";
    }
}

// --- UI UPDATES ---
function updateStatsUI() {
    document.getElementById("coins").innerText = playerStats.coins;
    document.getElementById("lives").innerText = playerStats.lives;
}

function renderShop() {
    const container = document.getElementById("shop-container");
    container.innerHTML = "";
    for (let i = 0; i < shopSlots.length; i++) {
        const unit = shopSlots[i];
        const el = document.createElement("div");
        if (unit) {
            el.className = "card-slot";
            el.innerHTML = `
                <div style="font-size: 2.5rem;">${unit.icon}</div>
                <strong style="margin-top: 5px;">${unit.name}</strong>
                <div style="margin-top: auto;">❤️ ${unit.hp} | ⚔️ ${unit.dmg}</div>
                <div style="font-size: 0.8rem; margin-top: 5px; color: var(--btn-color);">Cost: 🪙${unit.cost}</div>
            `;
            el.onclick = () => buyUnit(i);
        } else {
            el.className = "card-slot empty";
            el.innerText = "Sold";
        }
        container.appendChild(el);
    }
}

function renderTeam(dataToRender = teamSlots) {
    const container = document.getElementById("team-container");
    container.innerHTML = "";
    for (let i = 0; i < dataToRender.length; i++) {
        const unit = dataToRender[i];
        const el = document.createElement("div");
        el.id = `team-${i}`;

        if (unit) {
            el.className = "card-slot";
            if (unit.hp <= 0) el.classList.add("anim-dead");

            // Replaced default stats display with a conditional to show "Sell" hint if not in combat
            const sellHintHTML = !inCombat && unit.hp > 0
                ? `<div style="font-size: 0.8rem; margin-top: 5px; color: #ff5555;">Click to Sell (🪙1)</div>`
                : '';

            el.innerHTML = `
                <div style="font-size: 2.5rem;">${unit.icon}</div>
                <strong style="margin-top: 5px;">${unit.name}</strong>
                <div style="margin-top: auto;">❤️ ${unit.hp} | ⚔️ ${unit.dmg}</div>
                ${sellHintHTML}
            `;

            // Allow selling only if not in combat and the unit is actually part of your real team
            if (!inCombat) {
                el.onclick = () => sellUnit(i);
            }
        } else {
            el.className = "card-slot empty";
            el.innerText = "Empty Slot";
        }
        container.appendChild(el);
    }
}

function renderEnemies(dataToRender = enemySlots) {
    const container = document.getElementById("enemy-container");
    container.innerHTML = "";
    for (let i = 0; i < dataToRender.length; i++) {
        const unit = dataToRender[i];
        const el = document.createElement("div");
        el.id = `enemy-${i}`;

        if (unit) {
            el.className = "card-slot";
            if (unit.hp <= 0) el.classList.add("anim-dead");
            el.innerHTML = `
                <div style="font-size: 2.5rem;">${unit.icon}</div>
                <strong style="margin-top: 5px;">${unit.name}</strong>
                <div style="margin-top: auto;">❤️ ${unit.hp} | ⚔️ ${unit.dmg}</div>
            `;
        } else {
            el.className = "card-slot empty";
            el.innerText = "No enemy";
        }
        container.appendChild(el);
    }
}

// --- INITIALIZATION ---
document.getElementById("battle-btn").onclick = executeBattle;
updateStatsUI();
renderTeam();
renderEnemies();
rollShop();