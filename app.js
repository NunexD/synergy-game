// --- GAME STATE ---
let playerStats = { coins: 10, lives: 5, round: 1 };
let shopSlots = [null, null, null];
let teamSlots = [null, null, null];
let enemySlots = [null, null, null];

let draggedIndex = null; // Remembers which unit you are dragging

const unitDatabase = [
    { id: "knight", name: "Knight", icon: "🛡️", hp: 5, dmg: 2, cost: 3 },
    { id: "goblin", name: "Goblin", icon: "👺", hp: 2, dmg: 4, cost: 3 },
    { id: "cleric", name: "Cleric", icon: "✨", hp: 3, dmg: 1, cost: 3 },
    { id: "wolf", name: "Dire Wolf", icon: "🐺", hp: 4, dmg: 3, cost: 3 }
];

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
function getRandomInt(max) { return Math.floor(Math.random() * max); }

// --- DRAFT PHASE LOGIC ---
function rollShop() {
    for (let i = 0; i < 3; i++) {
        shopSlots[i] = { ...unitDatabase[getRandomInt(unitDatabase.length)] };
    }
    renderShop();
}

function buyUnit(shopIndex) {
    const unit = shopSlots[shopIndex];
    if (!unit) return;
    if (playerStats.coins < unit.cost) { alert("Not enough coins!"); return; }

    const emptyTeamIndex = teamSlots.findIndex(slot => slot === null);
    if (emptyTeamIndex === -1) { alert("Team full! Drag a unit to the trash to sell."); return; }

    playerStats.coins -= unit.cost;
    teamSlots[emptyTeamIndex] = unit;
    shopSlots[shopIndex] = null;
    updateStatsUI();
    renderShop();
    renderTeamDraft();
}

// --- DRAG AND DROP LOGIC ---
function handleDragStart(e, index) {
    draggedIndex = index;
    e.target.classList.add("dragging");
}

function handleDragOver(e) {
    e.preventDefault(); // Required to allow dropping
    e.currentTarget.classList.add("drag-over");
}

function handleDragLeave(e) {
    e.currentTarget.classList.remove("drag-over");
}

function handleDropSwap(e, dropIndex) {
    e.preventDefault();
    e.currentTarget.classList.remove("drag-over");

    if (draggedIndex !== null && draggedIndex !== dropIndex) {
        // Swap the elements in the array
        const temp = teamSlots[draggedIndex];
        teamSlots[draggedIndex] = teamSlots[dropIndex];
        teamSlots[dropIndex] = temp;
        renderTeamDraft();
    }
}

function handleDropSell(e) {
    e.preventDefault();
    e.currentTarget.classList.remove("drag-over");

    if (draggedIndex !== null && teamSlots[draggedIndex]) {
        teamSlots[draggedIndex] = null;
        playerStats.coins += 1;
        updateStatsUI();
        renderTeamDraft();
    }
}

// --- RENDERING DRAFT UI ---
function renderShop() {
    const container = document.getElementById("shop-container");
    container.innerHTML = "";
    shopSlots.forEach((unit, i) => {
        const el = document.createElement("div");
        if (unit) {
            el.className = "card-slot";
            el.innerHTML = `
                <div style="font-size: 2.5rem;">${unit.icon}</div>
                <strong>${unit.name}</strong>
                <div>❤️ ${unit.hp} | ⚔️ ${unit.dmg}</div>
                <div style="font-size: 0.8rem; color: var(--btn-color);">🪙${unit.cost}</div>
            `;
            el.onclick = () => buyUnit(i);
        } else {
            el.className = "card-slot empty"; el.innerText = "Sold";
        }
        container.appendChild(el);
    });
}

function renderTeamDraft() {
    const container = document.getElementById("team-container");
    container.innerHTML = "";
    teamSlots.forEach((unit, i) => {
        const el = document.createElement("div");

        if (unit) {
            el.className = "card-slot";
            el.draggable = true;
            el.innerHTML = `
                <div style="font-size: 2.5rem;">${unit.icon}</div>
                <strong>${unit.name}</strong>
                <div>❤️ ${unit.hp} | ⚔️ ${unit.dmg}</div>
            `;
            // Attach Drag Events for swapping
            el.addEventListener("dragstart", (e) => handleDragStart(e, i));
            el.addEventListener("dragend", (e) => e.target.classList.remove("dragging"));
        } else {
            el.className = "card-slot empty"; el.innerText = "Empty";
        }

        // Always allow dropping on a slot (empty or full)
        el.addEventListener("dragover", handleDragOver);
        el.addEventListener("dragleave", handleDragLeave);
        el.addEventListener("drop", (e) => handleDropSwap(e, i));

        container.appendChild(el);
    });
}

// Wire up the Sell Zone
const sellZone = document.getElementById("sell-zone");
sellZone.addEventListener("dragover", handleDragOver);
sellZone.addEventListener("dragleave", handleDragLeave);
sellZone.addEventListener("drop", handleDropSell);


// --- BATTLE PHASE LOGIC ---
async function startBattle() {
    if (!teamSlots.some(u => u !== null)) { alert("Draft at least one unit!"); return; }

    // Toggle UI visibility
    document.getElementById("draft-phase").style.display = "none";
    document.getElementById("battle-phase").style.display = "block";
    document.getElementById("next-round-btn").style.display = "none";
    document.getElementById("battle-log").innerHTML = `Round ${playerStats.round} begins!`;

    // Generate Enemy Team
    for (let i = 0; i < 3; i++) {
        enemySlots[i] = { ...unitDatabase[getRandomInt(unitDatabase.length)] };
    }

    // Create combat clones
    let combatTeam = JSON.parse(JSON.stringify(teamSlots));
    let combatEnemies = JSON.parse(JSON.stringify(enemySlots));

    renderArena(combatTeam, combatEnemies);
    await sleep(1000);

    let pIndex = 0; // Left-most index (visually closest to center due to row-reverse)
    let eIndex = 0; // Left-most index (visually closest to center)

    while (pIndex < 3 && eIndex < 3) {
        let pUnit = combatTeam[pIndex];
        let eUnit = combatEnemies[eIndex];

        if (!pUnit || pUnit.hp <= 0) { pIndex++; continue; }
        if (!eUnit || eUnit.hp <= 0) { eIndex++; continue; }

        let pEl = document.getElementById(`combat-p-${pIndex}`);
        let eEl = document.getElementById(`combat-e-${eIndex}`);

        // Attack Animation (Player lunges Right, Enemy lunges Left)
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

    // Resolve Round
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
    playerStats.coins += 2; // Basic round income
    updateStatsUI();

    // Toggle UI visibility back
    document.getElementById("battle-phase").style.display = "none";
    document.getElementById("draft-phase").style.display = "block";

    rollShop(); // Fresh shop for the new round
    renderTeamDraft(); // Reset your team visually back to full health
}

function renderArena(pTeam, eTeam) {
    const pContainer = document.getElementById("combat-player-container");
    const eContainer = document.getElementById("combat-enemy-container");
    pContainer.innerHTML = ""; eContainer.innerHTML = "";

    pTeam.forEach((unit, i) => {
        const el = document.createElement("div");
        el.id = `combat-p-${i}`;
        if (unit) {
            el.className = `card-slot ${unit.hp <= 0 ? 'anim-dead' : ''}`;
            el.innerHTML = `<div style="font-size: 2.5rem;">${unit.icon}</div><strong>${unit.name}</strong><div>❤️ ${unit.hp} | ⚔️ ${unit.dmg}</div>`;
        } else { el.className = "card-slot empty"; el.innerText = "Empty"; }
        pContainer.appendChild(el);
    });

    eTeam.forEach((unit, i) => {
        const el = document.createElement("div");
        el.id = `combat-e-${i}`;
        if (unit) {
            el.className = `card-slot ${unit.hp <= 0 ? 'anim-dead' : ''}`;
            el.innerHTML = `<div style="font-size: 2.5rem;">${unit.icon}</div><strong>${unit.name}</strong><div>❤️ ${unit.hp} | ⚔️ ${unit.dmg}</div>`;
        } else { el.className = "card-slot empty"; el.innerText = "Empty"; }
        eContainer.appendChild(el);
    });
}

function updateStatsUI() {
    document.getElementById("coins").innerText = playerStats.coins;
    document.getElementById("lives").innerText = playerStats.lives;
}

// --- INITIALIZATION ---
document.getElementById("battle-btn").onclick = startBattle;
document.getElementById("next-round-btn").onclick = returnToDraft;
updateStatsUI();
rollShop();
renderTeamDraft();