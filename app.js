let playerStats = { coins: 10, lives: 5, round: 1 };
let shopSlots = [null, null, null];
let teamSlots = [null, null, null];
let benchSlots = [null, null, null, null, null];
let enemySlots = [null, null, null];
let draggedItem = null;

let isMultiplayer = false;
let roomCode = null;
let isHost = false;

let peer = null;
let conn = null;
let localReady = false;
let remoteReady = false;
let localNextReady = false;
let remoteNextReady = false;
let remoteTeamData = null;

const unitDatabase = [
    { id: "knight", name: "Knight", icon: "🛡️", hp: 5, dmg: 2, cost: 3 },
    { id: "goblin", name: "Goblin", icon: "👺", hp: 2, dmg: 4, cost: 3 },
    { id: "cleric", name: "Cleric", icon: "✨", hp: 3, dmg: 1, cost: 3 },
    { id: "wolf", name: "Dire Wolf", icon: "🐺", hp: 4, dmg: 3, cost: 3 }
];

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
function getRandomInt(max) { return Math.floor(Math.random() * max); }

// ==========================================
// LOCAL STORAGE & PERSISTENCE
// ==========================================

function saveGame() {
    const saveState = {
        playerStats, shopSlots, teamSlots, benchSlots, isMultiplayer, roomCode, isHost
    };
    localStorage.setItem("synergySave", JSON.stringify(saveState));
}

function abandonGame() {
    localStorage.removeItem("synergySave");
    location.reload(); // Refresh the page to reset everything
}

function initGame() {
    const savedData = localStorage.getItem("synergySave");
    if (savedData) {
        // Restore from Save
        const state = JSON.parse(savedData);
        playerStats = state.playerStats;
        shopSlots = state.shopSlots;
        teamSlots = state.teamSlots;
        benchSlots = state.benchSlots;
        isMultiplayer = state.isMultiplayer;
        roomCode = state.roomCode;
        isHost = state.isHost;

        document.getElementById("enemy-title").innerText = isMultiplayer ? "Rival Player" : "Enemy AI";

        if (isMultiplayer) {
            reconnectMultiplayer();
        }
        enterDraftPhase(false); // False means don't reroll the shop on load
    }
}

// ==========================================
// MULTIPLAYER LOBBY
// ==========================================

function startNewSingleplayer() {
    isMultiplayer = false;
    document.getElementById("enemy-title").innerText = "Enemy AI";
    enterDraftPhase(true); // True means roll a fresh shop
}

function generateRoomCode() { return Math.random().toString(36).substring(2, 6).toUpperCase(); }

function hostGame() {
    isHost = true;
    isMultiplayer = true;
    roomCode = generateRoomCode();
    document.getElementById("host-info").style.display = "block";
    document.getElementById("room-code").innerText = roomCode;

    peer = new Peer(roomCode); // Host uses the room code as their ID
    peer.on('connection', (connection) => {
        conn = connection;
        setupConnectionHandlers();
        conn.on('open', () => {
            conn.send({ type: 'START_GAME' });
            document.getElementById("enemy-title").innerText = "Rival Player";
            enterDraftPhase(true);
        });
    });
}

function joinGame() {
    roomCode = document.getElementById("join-code-input").value.toUpperCase();
    if (!roomCode) { alert("Please enter a room code."); return; }
    isHost = false;
    isMultiplayer = true;

    peer = new Peer();
    peer.on('open', () => {
        conn = peer.connect(roomCode);
        setupConnectionHandlers();
    });
}

function reconnectMultiplayer() {
    if (isHost) {
        // Re-establish as host
        peer = new Peer(roomCode);
        peer.on('connection', (connection) => {
            conn = connection;
            setupConnectionHandlers();
        });
    } else {
        // Re-establish as client
        peer = new Peer();
        peer.on('open', () => {
            conn = peer.connect(roomCode);
            setupConnectionHandlers();
        });
    }
}

function setupConnectionHandlers() {
    conn.on('data', (data) => {
        if (data.type === 'START_GAME') {
            document.getElementById("enemy-title").innerText = "Rival Player";
            enterDraftPhase(true);
        }
        else if (data.type === 'READY_UP') {
            remoteReady = true;
            remoteTeamData = data.team;
            checkMatchStart();
        }
        else if (data.type === 'NEXT_ROUND') {
            remoteNextReady = true;
            checkNextRoundStart();
        }
    });
}

function enterDraftPhase(freshRoll = true) {
    document.getElementById("main-menu").style.display = "none";
    document.getElementById("draft-phase").style.display = "block";
    document.getElementById("top-stats").style.display = "block";

    localReady = false; remoteReady = false;
    localNextReady = false; remoteNextReady = false;
    remoteTeamData = null;

    document.getElementById("ready-btn").style.display = "inline-block";
    document.getElementById("waiting-msg").style.display = "none";

    if (freshRoll) rollShop(); // Only roll if it's a new game or round
    updateUI(); // Visually update and save
}

// ==========================================
// CORE MECHANICS
// ==========================================

function rollShop() {
    for (let i = 0; i < 3; i++) shopSlots[i] = { ...unitDatabase[getRandomInt(unitDatabase.length)], level: 1 };
    updateUI();
}

function rerollShop() {
    if (playerStats.coins >= 1) { playerStats.coins -= 1; rollShop(); }
    else { alert("Not enough coins!"); }
}

function buyUnit(shopIndex) {
    const unit = shopSlots[shopIndex];
    if (!unit) return;
    if (playerStats.coins < unit.cost) { alert("Not enough coins!"); return; }

    let eBench = benchSlots.findIndex(s => s === null);
    let eTeam = teamSlots.findIndex(s => s === null);

    if (eBench !== -1) benchSlots[eBench] = unit;
    else if (eTeam !== -1) teamSlots[eTeam] = unit;
    else { alert("Bench is full!"); return; }

    playerStats.coins -= unit.cost;
    shopSlots[shopIndex] = null;

    checkAndMerge();
    updateUI();
}

function checkAndMerge() {
    let allSlots = [...teamSlots.map((u, i) => ({ u, loc: 'team', i })), ...benchSlots.map((u, i) => ({ u, loc: 'bench', i }))].filter(s => s.u !== null);
    let merged = false;

    for (let lvl = 1; lvl <= 2; lvl++) {
        let groups = {};
        allSlots.filter(s => s.u.level === lvl).forEach(s => {
            if (!groups[s.u.id]) groups[s.u.id] = [];
            groups[s.u.id].push(s);
        });

        for (let id in groups) {
            if (groups[id].length >= 3) {
                let toMerge = groups[id].slice(0, 3);
                let targetLoc = toMerge.find(s => s.loc === 'team') || toMerge[0];

                toMerge.forEach(s => { if (s.loc === 'team') teamSlots[s.i] = null; else benchSlots[s.i] = null; });

                let base = unitDatabase.find(u => u.id === id);
                let nLvl = lvl + 1;
                let mult = nLvl === 2 ? 2 : 4;

                let upg = { ...base, level: nLvl, hp: base.hp * mult, dmg: base.dmg * mult };
                if (targetLoc.loc === 'team') teamSlots[targetLoc.i] = upg; else benchSlots[targetLoc.i] = upg;
                merged = true; break;
            }
        }
    }
    if (merged) checkAndMerge();
}

// ==========================================
// DRAG & DROP
// ==========================================

function handleDragStart(e, arrayName, index) { draggedItem = { arrayName, index }; e.target.classList.add("dragging"); }
function handleDragOver(e) { e.preventDefault(); e.currentTarget.classList.add("drag-over"); }
function handleDragLeave(e) { e.currentTarget.classList.remove("drag-over"); }

function handleDropSwap(e, dropArrayName, dropIndex) {
    e.preventDefault(); e.currentTarget.classList.remove("drag-over");
    if (draggedItem) {
        let sArr = draggedItem.arrayName === 'team' ? teamSlots : benchSlots;
        let tArr = dropArrayName === 'team' ? teamSlots : benchSlots;
        let sUnit = sArr[draggedItem.index]; let tUnit = tArr[dropIndex];
        sArr[draggedItem.index] = tUnit; tArr[dropIndex] = sUnit;
        updateUI();
    }
}

function handleDropSell(e) {
    e.preventDefault(); e.currentTarget.classList.remove("drag-over");
    if (draggedItem) {
        let sArr = draggedItem.arrayName === 'team' ? teamSlots : benchSlots;
        if (sArr[draggedItem.index]) {
            playerStats.coins += Math.pow(3, sArr[draggedItem.index].level - 1);
            sArr[draggedItem.index] = null;
            updateUI();
        }
    }
}

// ==========================================
// BATTLE & SYNC
// ==========================================

function handleReadyButton() {
    if (!teamSlots.some(u => u !== null)) { alert("Draft a unit first!"); return; }

    if (!isMultiplayer) startBattle();
    else {
        localReady = true;
        document.getElementById("ready-btn").style.display = "none";
        document.getElementById("waiting-msg").style.display = "block";
        if (conn && conn.open) conn.send({ type: 'READY_UP', team: teamSlots });
        checkMatchStart();
    }
}

function checkMatchStart() {
    if (localReady && remoteReady) {
        document.getElementById("waiting-msg").style.display = "none";
        enemySlots = JSON.parse(JSON.stringify(remoteTeamData));
        startBattle();
    }
}

async function startBattle() {
    document.getElementById("draft-phase").style.display = "none";
    document.getElementById("battle-phase").style.display = "block";
    document.getElementById("battle-log").innerHTML = `Round ${playerStats.round} begins!`;

    if (!isMultiplayer) {
        for (let i = 0; i < 3; i++) {
            let base = unitDatabase[getRandomInt(unitDatabase.length)];
            let eLvl = 1;
            if (playerStats.round >= 3 && i === 0) eLvl = 2;
            if (playerStats.round >= 4 && i <= 1) eLvl = 2;
            if (playerStats.round >= 5) eLvl = 2;
            if (playerStats.round >= 7 && i === 0) eLvl = 3;
            let mult = eLvl === 2 ? 2 : (eLvl === 3 ? 4 : 1);
            enemySlots[i] = { ...base, level: eLvl, hp: base.hp * mult, dmg: base.dmg * mult };
        }
    }

    let cTeam = JSON.parse(JSON.stringify(teamSlots));
    let cEnemies = JSON.parse(JSON.stringify(enemySlots));
    renderArena(cTeam, cEnemies);
    await sleep(1000);

    let pIndex = 2, eIndex = 0;
    while (pIndex >= 0 && eIndex < 3) {
        if (!cTeam[pIndex] || cTeam[pIndex].hp <= 0) { pIndex--; continue; }
        if (!cEnemies[eIndex] || cEnemies[eIndex].hp <= 0) { eIndex++; continue; }

        let pEl = document.getElementById(`combat-p-${pIndex}`);
        let eEl = document.getElementById(`combat-e-${eIndex}`);

        if(pEl) pEl.classList.add("anim-attack"); if(eEl) eEl.classList.add("anim-attack-reverse");
        await sleep(300);

        cTeam[pIndex].hp -= cEnemies[eIndex].dmg; cEnemies[eIndex].hp -= cTeam[pIndex].dmg;
        renderArena(cTeam, cEnemies);

        pEl = document.getElementById(`combat-p-${pIndex}`); eEl = document.getElementById(`combat-e-${eIndex}`);
        if(pEl) pEl.classList.add("anim-damage"); if(eEl) eEl.classList.add("anim-damage");
        await sleep(400);
    }

    if (cTeam.some(u => u && u.hp > 0)) {
        playerStats.coins += 4;
        document.getElementById("battle-log").innerHTML = `<span style="color: #50fa7b;">Victory!</span> +4 Coins!`;
    } else {
        playerStats.lives -= 1;
        document.getElementById("battle-log").innerHTML = `<span style="color: #ff5555;">Defeat!</span> -1 Life.`;
    }

    saveGame(); // Save before showing Game Over screen
    updateStatsUI();

    if (playerStats.lives <= 0) {
        document.getElementById("battle-log").innerHTML += `<br><b>GAME OVER!</b>`;
        document.getElementById("return-menu-btn").style.display = "inline-block";
        localStorage.removeItem("synergySave"); // Clear save if dead
    } else {
        document.getElementById("next-round-btn").style.display = "inline-block";
    }
}

function handleNextRoundButton() {
    if (!isMultiplayer) returnToDraft();
    else {
        localNextReady = true;
        document.getElementById("next-round-btn").style.display = "none";
        document.getElementById("waiting-next-msg").style.display = "block";
        if (conn && conn.open) conn.send({ type: 'NEXT_ROUND' });
        checkNextRoundStart();
    }
}

function checkNextRoundStart() {
    if (localNextReady && remoteNextReady) {
        document.getElementById("waiting-next-msg").style.display = "none";
        returnToDraft();
    }
}

function returnToDraft() {
    playerStats.round += 1;
    playerStats.coins += 5;

    document.getElementById("battle-phase").style.display = "none";
    document.getElementById("next-round-btn").style.display = "none";

    enterDraftPhase(true); // Roll new shop and save
}

// ==========================================
// CONSOLIDATED UI & RENDER UPDATES
// ==========================================

function updateUI() {
    updateStatsUI();
    renderShop();
    renderAllDraft();
    saveGame(); // Automatically saves state every time UI changes
}

function updateStatsUI() {
    document.getElementById("coins").innerText = playerStats.coins;
    document.getElementById("lives").innerText = playerStats.lives;
    document.getElementById("round-display").innerText = playerStats.round;
}

function renderShop() {
    const cont = document.getElementById("shop-container"); cont.innerHTML = "";
    shopSlots.forEach((u, i) => {
        const el = document.createElement("div");
        if (u) {
            el.className = "card-slot"; el.onclick = () => buyUnit(i);
            el.innerHTML = `<div class="level-badge">⭐</div><div style="font-size: 2.5rem;">${u.icon}</div><strong>${u.name}</strong><div>❤️ ${u.hp} | ⚔️ ${u.dmg}</div><div style="font-size: 0.8rem; color: var(--btn-color);">🪙${u.cost}</div>`;
        } else { el.className = "card-slot empty"; el.innerText = "Sold"; }
        cont.appendChild(el);
    });
}

function createDragHTML(u, arrName, i) {
    const el = document.createElement("div");
    if (u) {
        el.className = "card-slot"; el.draggable = true;
        el.innerHTML = `<div class="level-badge">${"⭐".repeat(u.level)}</div><div style="font-size: 2.5rem;">${u.icon}</div><strong>${u.name}</strong><div>❤️ ${u.hp} | ⚔️ ${u.dmg}</div>`;
        el.addEventListener("dragstart", e => handleDragStart(e, arrName, i));
        el.addEventListener("dragend", e => e.target.classList.remove("dragging"));
    } else { el.className = "card-slot empty"; el.innerText = "Empty"; }
    el.addEventListener("dragover", handleDragOver); el.addEventListener("dragleave", handleDragLeave); el.addEventListener("drop", e => handleDropSwap(e, arrName, i));
    return el;
}

function renderAllDraft() {
    const tCont = document.getElementById("team-container"); tCont.innerHTML = "";
    teamSlots.forEach((u, i) => tCont.appendChild(createDragHTML(u, 'team', i)));
    const bCont = document.getElementById("bench-container"); bCont.innerHTML = "";
    benchSlots.forEach((u, i) => bCont.appendChild(createDragHTML(u, 'bench', i)));
}

function renderArena(pT, eT) {
    const pC = document.getElementById("combat-player-container"); pC.innerHTML = "";
    const eC = document.getElementById("combat-enemy-container"); eC.innerHTML = "";
    pT.forEach((u, i) => {
        const el = document.createElement("div"); el.id = `combat-p-${i}`;
        if (u) { el.className = `card-slot ${u.hp <= 0 ? 'anim-dead' : ''}`; el.innerHTML = `<div class="level-badge">${"⭐".repeat(u.level)}</div><div style="font-size: 2.5rem;">${u.icon}</div><strong>${u.name}</strong><div>❤️ ${u.hp} | ⚔️ ${u.dmg}</div>`; }
        else { el.className = "card-slot empty"; el.innerText = "Empty"; } pC.appendChild(el);
    });
    eT.forEach((u, i) => {
        const el = document.createElement("div"); el.id = `combat-e-${i}`;
        if (u) { el.className = `card-slot ${u.hp <= 0 ? 'anim-dead' : ''}`; el.innerHTML = `<div class="level-badge">${"⭐".repeat(u.level)}</div><div style="font-size: 2.5rem;">${u.icon}</div><strong>${u.name}</strong><div>❤️ ${u.hp} | ⚔️ ${u.dmg}</div>`; }
        else { el.className = "card-slot empty"; el.innerText = "Empty"; } eC.appendChild(el);
    });
}

const sZ = document.getElementById("sell-zone");
sZ.addEventListener("dragover", handleDragOver); sZ.addEventListener("dragleave", handleDragLeave); sZ.addEventListener("drop", handleDropSell);

document.getElementById("reroll-btn").onclick = rerollShop;
document.getElementById("ready-btn").onclick = handleReadyButton;
document.getElementById("next-round-btn").onclick = handleNextRoundButton;

// NEW: Boot up sequence
initGame();