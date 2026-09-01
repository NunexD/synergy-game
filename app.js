// --- GAME STATE ---
// This holds the current status of the player's run
let playerStats = {
    coins: 10,
    lives: 5
};

// These arrays will hold the active units in the shop and on the player's team
let shopSlots = [null, null, null];
let teamSlots = [null, null, null];

// --- UNIT DATABASE ---
// This is the master list of every character in the game.
// We use emojis for art to keep it lightweight and fun!
const unitDatabase = [
    {
        id: "knight",
        name: "Knight",
        icon: "🛡️",
        hp: 5,
        dmg: 2,
        cost: 3,
        description: "Solid early game defender."
    },
    {
        id: "goblin",
        name: "Goblin",
        icon: "👺",
        hp: 2,
        dmg: 4,
        cost: 3,
        description: "High damage, but fragile."
    },
    {
        id: "cleric",
        name: "Cleric",
        icon: "✨",
        hp: 3,
        dmg: 1,
        cost: 3,
        description: "Synergy: Buffs allies (coming soon!)"
    },
    {
        id: "wolf",
        name: "Dire Wolf",
        icon: "🐺",
        hp: 4,
        dmg: 3,
        cost: 3,
        description: "A balanced fighter."
    }
];

// Quick test to make sure the file is connected properly
console.log("Game Loaded! Found " + unitDatabase.length + " units in the database.");