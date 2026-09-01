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

    // 1. If the slot is empty (already sold), do nothing
    if (!unit) return;

    // 2. Check if the player has enough coins
    if (playerStats.coins < unit.cost) {
        alert("Not enough coins!");
        return;
    }

    // 3. Find the first empty slot in the player's team array
    const emptyTeamIndex = teamSlots.findIndex(slot => slot === null);

    // If findIndex returns -1, it means there are no null (empty) slots
    if (emptyTeamIndex === -1) {
        alert("Your team is full!");
        return;
    }

    // 4. Execute the purchase
    playerStats.coins -= unit.cost;      // Pay for it
    teamSlots[emptyTeamIndex] = unit;    // Move unit to the team array
    shopSlots[shopIndex] = null;         // Remove unit from the shop array

    // 5. Update the visual interface to reflect the changes
    updateStatsUI();
    renderShop();
    renderTeam();
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
            // Render an available unit
            cardElement.className = "card-slot";
            cardElement.innerHTML = `
                <div style="font-size: 2.5rem;">${unit.icon}</div>
                <strong style="margin-top: 5px;">${unit.name}</strong>
                <div style="margin-top: auto;">❤️ ${unit.hp} | ⚔️ ${unit.dmg}</div>
                <div style="font-size: 0.8rem; margin-top: 5px; color: var(--btn-color);">Cost: 🪙${unit.cost}</div>
            `;
            // Attach the click event to buy this specific unit
            cardElement.onclick = () => buyUnit(i);
        } else {
            // Render a sold out slot
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
            // Render a purchased unit (no cost shown)
            cardElement.className = "card-slot";
            cardElement.innerHTML = `
                <div style="font-size: 2.5rem;">${unit.icon}</div>
                <strong style="margin-top: 5px;">${unit.name}</strong>
                <div style="margin-top: auto;">❤️ ${unit.hp} | ⚔️ ${unit.dmg}</div>
            `;
        } else {
            // Render an empty placeholder
            cardElement.className = "card-slot empty";
            cardElement.innerText = "Empty Slot";
        }

        teamContainer.appendChild(cardElement);
    }
}

// Initialize the game state on load
updateStatsUI();
renderTeam();
rollShop();