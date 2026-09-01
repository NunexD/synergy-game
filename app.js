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

// --- UI UPDATES ---
function renderShop() {
    const shopContainer = document.getElementById("shop-container");
    shopContainer.innerHTML = "";

    for (let i = 0; i < shopSlots.length; i++) {
        const unit = shopSlots[i];
        const cardElement = document.createElement("div");

        cardElement.className = "card-slot";
        cardElement.innerHTML = `
            <div style="font-size: 2.5rem;">${unit.icon}</div>
            <strong style="margin-top: 5px;">${unit.name}</strong>
            <div style="margin-top: auto;">❤️ ${unit.hp} | ⚔️ ${unit.dmg}</div>
            <div style="font-size: 0.8rem; margin-top: 5px; color: var(--btn-color);">Cost: 🪙${unit.cost}</div>
        `;

        shopContainer.appendChild(cardElement);
    }
}

// Initialize the game by rolling the shop once when the page loads
rollShop();