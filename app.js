// --- GAME STATE ---
let playerStats = {
    coins: 10,
    lives: 5
};

let shopSlots = [null, null, null];
let teamSlots = [null, null, null];

// --- UNIT DATABASE ---
const unitDatabase = [
    { id: "knight", name: "Knight", icon: "🛡️", hp: 5, dmg: 2, cost: 3 },
    { id: "goblin", name: "Goblin", icon: "👺", hp: 2, dmg: 4, cost: 3 },
    { id: "cleric", name: "Cleric", icon: "✨", hp: 3, dmg: 1, cost: 3 },
    { id: "wolf", name: "Dire Wolf", icon: "🐺", hp: 4, dmg: 3, cost: 3 }
];

// --- SHOP LOGIC ---
function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}

function rollShop() {
    for (let i = 0; i < 3; i++) {
        const randomIndex = getRandomInt(unitDatabase.length);
        shopSlots[i] = { ...unitDatabase[randomIndex] };
    }
    renderShop();
}

// --- BUYING LOGIC ---
function buyUnit(shopIndex) {
    const unit = shopSlots[shopIndex];
    if (!unit) return;

    if (playerStats.coins < unit.cost) {
        alert("Not enough coins!");
        return;
    }

    const emptyTeamIndex = teamSlots.findIndex(slot => slot === null);
    if (emptyTeamIndex === -1) {
        alert("Your team is full!");
        return;
    }

    playerStats.coins -= unit.cost;
    teamSlots[emptyTeamIndex] = unit;
    shopSlots[shopIndex] = null;

    updateStatsUI();
    renderShop();
    renderTeam();
}

// --- BATTLE LOGIC ---
function executeBattle() {
    // 1. Check if the player actually drafted anyone
    const hasUnits = teamSlots.some(slot => slot !== null);
    if (!hasUnits) {
        alert("You need at least one unit to battle!");
        return;
    }

    // 2. Calculate Team Power (Sum of all HP and DMG)
    let teamHP = 0;
    let teamDMG = 0;
    for (let i = 0; i < teamSlots.length; i++) {
        if (teamSlots[i]) {
            teamHP += teamSlots[i].hp;
            teamDMG += teamSlots[i].dmg;
        }
    }
    const teamTotal = teamHP + teamDMG;

    // 3. Generate a Random Enemy
    // Enemy stats scale slightly from 5 up to 14 HP, and 3 up to 8 DMG
    const enemyHP = getRandomInt(10) + 5;
    const enemyDMG = getRandomInt(6) + 3;
    const enemyTotal = enemyHP + enemyDMG;

    const battleLog = document.getElementById("battle-log");

    // 4. Resolve Combat and Update State
    if (teamTotal >= enemyTotal + 3) {
        // Crushing Victory
        playerStats.coins += 4;
        battleLog.innerHTML = `<span style="color: #50fa7b;">Flawless Victory!</span> Your team (Power: ${teamTotal}) crushed the enemy (Power: ${enemyTotal}). +4 Coins!`;
    } else if (teamTotal >= enemyTotal) {
        // Close Victory
        playerStats.coins += 3;
        battleLog.innerHTML = `<span style="color: #f1fa8c;">Close Win!</span> Your team (Power: ${teamTotal}) barely beat the enemy (Power: ${enemyTotal}). +3 Coins!`;
    } else {
        // Defeat
        playerStats.lives -= 1;
        battleLog.innerHTML = `<span style="color: #ff5555;">Defeat!</span> The enemy (Power: ${enemyTotal}) overpowered your team (Power: ${teamTotal}). -1 Life.`;
    }

    // 5. Check for Game Over
    if (playerStats.lives <= 0) {
        battleLog.innerHTML = `<span style="color: #ff5555; font-weight: bold;">GAME OVER!</span> You ran out of lives. Refresh the page to try again.`;
        document.getElementById("battle-btn").disabled = true; // Disable button
    } else {
        // 6. Prep for the next round
        rollShop();
    }

    updateStatsUI();
}

// --- UI UPDATES ---
function updateStatsUI() {
    document.getElementById("coins").innerText = playerStats.coins;
    document.getElementById("lives").innerText = playerStats.lives;
}

function renderShop() {
    const shopContainer = document.getElementById("shop-container");
    shopContainer.innerHTML = "";

    for (let i = 0; i < shopSlots.length; i++) {
        const unit = shopSlots[i];
        const cardElement = document.createElement("div");

        if (unit) {
            cardElement.className = "card-slot";
            cardElement.innerHTML = `
                <div style="font-size: 2.5rem;">${unit.icon}</div>
                <strong style="margin-top: 5px;">${unit.name}</strong>
                <div style="margin-top: auto;">❤️ ${unit.hp} | ⚔️ ${unit.dmg}</div>
                <div style="font-size: 0.8rem; margin-top: 5px; color: var(--btn-color);">Cost: 🪙${unit.cost}</div>
            `;
            cardElement.onclick = () => buyUnit(i);
        } else {
            cardElement.className = "card-slot empty";
            cardElement.innerText = "Sold";
        }
        shopContainer.appendChild(cardElement);
    }
}

function renderTeam() {
    const teamContainer = document.getElementById("team-container");
    teamContainer.innerHTML = "";

    for (let i = 0; i < teamSlots.length; i++) {
        const unit = teamSlots[i];
        const cardElement = document.createElement("div");

        if (unit) {
            cardElement.className = "card-slot";
            cardElement.innerHTML = `
                <div style="font-size: 2.5rem;">${unit.icon}</div>
                <strong style="margin-top: 5px;">${unit.name}</strong>
                <div style="margin-top: auto;">❤️ ${unit.hp} | ⚔️ ${unit.dmg}</div>
            `;
        } else {
            cardElement.className = "card-slot empty";
            cardElement.innerText = "Empty Slot";
        }
        teamContainer.appendChild(cardElement);
    }
}

// --- INITIALIZATION ---
// Wire up the Battle Button to our new function
document.getElementById("battle-btn").onclick = executeBattle;

updateStatsUI();
renderTeam();
rollShop();