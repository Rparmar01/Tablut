(function () {
  "use strict";

  var ASSETS = {
    attacker: "Assets/Tablut_Black_Piece.png",
    defender: "Assets/Tablut_White_Piece.png",
    king: "Assets/Tablut_King.png"
  };

  var DEFAULT_SETTINGS = {
    aiElo: 1500,
    aiDelay: 220,
    showLegalMoves: true,
    highlightLastMove: true
  };

  var menuScreen = document.getElementById("menuScreen");
  var settingsScreen = document.getElementById("settingsScreen");
  var gameScreen = document.getElementById("gameScreen");
  var singlePlayerModal = document.getElementById("singlePlayerModal");
  var localMultiplayerModal = document.getElementById("localMultiplayerModal");
  var boardGrid = document.getElementById("boardGrid");

  var eloSlider = document.getElementById("eloSlider");
  var eloValue = document.getElementById("eloValue");
  var aiDelaySlider = document.getElementById("aiDelaySlider");
  var aiDelayValue = document.getElementById("aiDelayValue");
  var showLegalMovesToggle = document.getElementById("showLegalMovesToggle");
  var lastMoveToggle = document.getElementById("lastMoveToggle");

  var singlePlayerButton = document.getElementById("singlePlayerButton");
  var localMultiplayerButton = document.getElementById("localMultiplayerButton");
  var settingsButton = document.getElementById("settingsButton");
  var quitButton = document.getElementById("quitButton");
  var saveSettingsButton = document.getElementById("saveSettingsButton");
  var resetSettingsButton = document.getElementById("resetSettingsButton");
  var settingsBackButton = document.getElementById("settingsBackButton");
  var confirmSinglePlayerButton = document.getElementById("confirmSinglePlayerButton");
  var cancelSinglePlayerButton = document.getElementById("cancelSinglePlayerButton");
  var confirmLocalMultiplayerButton = document.getElementById("confirmLocalMultiplayerButton");
  var cancelLocalMultiplayerButton = document.getElementById("cancelLocalMultiplayerButton");
  var newGameButton = document.getElementById("newGameButton");
  var menuButton = document.getElementById("menuButton");

  var modeLabel = document.getElementById("modeLabel");
  var turnChip = document.getElementById("turnChip");
  var statusTitle = document.getElementById("statusTitle");
  var statusText = document.getElementById("statusText");
  var capturedAttackers = document.getElementById("capturedAttackers");
  var capturedDefenders = document.getElementById("capturedDefenders");

  var singleSideButtons = Array.from(document.querySelectorAll("[data-single-side]"));
  var playerOneSideButtons = Array.from(document.querySelectorAll("[data-player-one-side]"));
  var playerTwoSideButtons = Array.from(document.querySelectorAll("[data-player-two-side]"));

  var state = TablutCore.initialState();
  var selected = null;
  var legalMoves = [];
  var mode = "multi";
  var settings = loadSettings();
  var pendingSingleSide = "defender";
  var pendingPlayerOneSide = "attacker";
  var humanSide = "defender";
  var aiSide = "attacker";
  var playerRoles = {
    attacker: "Player 1",
    defender: "Player 2"
  };
  var aiBusy = false;
  var aiRequestId = 0;
  var totalsCaptured = {
    attacker: 0,
    defender: 0
  };

  function loadSettings() {
    try {
      var saved = JSON.parse(window.localStorage.getItem("tablutSettings") || "{}");
      return {
        aiElo: Number.isFinite(Number(saved.aiElo)) ? Number(saved.aiElo) : DEFAULT_SETTINGS.aiElo,
        aiDelay: Number.isFinite(Number(saved.aiDelay)) ? Number(saved.aiDelay) : DEFAULT_SETTINGS.aiDelay,
        showLegalMoves: typeof saved.showLegalMoves === "boolean" ? saved.showLegalMoves : DEFAULT_SETTINGS.showLegalMoves,
        highlightLastMove: typeof saved.highlightLastMove === "boolean" ? saved.highlightLastMove : DEFAULT_SETTINGS.highlightLastMove
      };
    } catch (error) {
      return Object.assign({}, DEFAULT_SETTINGS);
    }
  }

  function saveSettings() {
    settings.aiElo = Number(eloSlider.value);
    settings.aiDelay = Number(aiDelaySlider.value);
    settings.showLegalMoves = showLegalMovesToggle.checked;
    settings.highlightLastMove = lastMoveToggle.checked;
    try {
      window.localStorage.setItem("tablutSettings", JSON.stringify(settings));
    } catch (error) {
      // The game still runs if a browser blocks local file storage.
    }
    updateSettingsUi();
    render();
  }

  function resetSettings() {
    settings = Object.assign({}, DEFAULT_SETTINGS);
    try {
      window.localStorage.setItem("tablutSettings", JSON.stringify(settings));
    } catch (error) {
      // The game still runs if a browser blocks local file storage.
    }
    updateSettingsUi();
    render();
  }

  function updateSettingsUi() {
    eloSlider.value = String(settings.aiElo);
    eloValue.textContent = String(settings.aiElo);
    aiDelaySlider.value = String(settings.aiDelay);
    aiDelayValue.textContent = settings.aiDelay + " ms";
    showLegalMovesToggle.checked = settings.showLegalMoves;
    lastMoveToggle.checked = settings.highlightLastMove;
    if (mode === "single") {
      modeLabel.textContent = "Single Player - AI " + settings.aiElo + " ELO";
    }
  }

  function setScreen(next) {
    menuScreen.classList.toggle("is-hidden", next !== "menu");
    settingsScreen.classList.toggle("is-hidden", next !== "settings");
    gameScreen.classList.toggle("is-hidden", next !== "game");
  }

  function openModal(modal) {
    singlePlayerModal.classList.add("is-hidden");
    localMultiplayerModal.classList.add("is-hidden");
    modal.classList.remove("is-hidden");
  }

  function closeModals() {
    singlePlayerModal.classList.add("is-hidden");
    localMultiplayerModal.classList.add("is-hidden");
  }

  function sideName(side) {
    return side === "attacker" ? "Attackers" : "Defenders";
  }

  function sideSingular(side) {
    return side === "attacker" ? "Attacker" : "Defender";
  }

  function activePlayerLabel(side) {
    if (mode === "single") {
      return side === humanSide ? "You" : "AI";
    }
    return playerRoles[side] || sideName(side);
  }

  function pieceName(piece) {
    if (!piece) return "";
    if (piece.type === "king") return "King";
    return piece.side === "attacker" ? "Attacker" : "Defender";
  }

  function isHumanTurn() {
    return mode === "multi" || state.turn === humanSide;
  }

  function selectedMoveTo(pos) {
    return legalMoves.find(function (move) {
      return move.to.r === pos.r && move.to.c === pos.c;
    });
  }

  function isSelectablePiece(pos, piece) {
    if (!piece || state.winner || aiBusy || !isHumanTurn()) return false;
    return piece.side === state.turn && TablutCore.getLegalMovesForPiece(state, pos).length > 0;
  }

  function createCell(r, c) {
    var cell = document.createElement("button");
    cell.type = "button";
    cell.className = "cell";
    cell.setAttribute("role", "gridcell");
    cell.setAttribute("aria-label", "Row " + (r + 1) + ", column " + (c + 1));
    cell.dataset.r = String(r);
    cell.dataset.c = String(c);
    cell.addEventListener("click", function () {
      handleCellClick({ r: r, c: c });
    });
    return cell;
  }

  function buildBoard() {
    boardGrid.textContent = "";
    for (var r = 0; r < TablutCore.SIZE; r += 1) {
      for (var c = 0; c < TablutCore.SIZE; c += 1) {
        boardGrid.appendChild(createCell(r, c));
      }
    }
  }

  function renderBoard() {
    Array.from(boardGrid.children).forEach(function (cell) {
      var r = Number(cell.dataset.r);
      var c = Number(cell.dataset.c);
      var pos = { r: r, c: c };
      var piece = state.board[r][c];
      var legal = settings.showLegalMoves && Boolean(selectedMoveTo(pos));
      var last = settings.highlightLastMove && state.lastMove &&
        ((state.lastMove.from.r === r && state.lastMove.from.c === c) ||
          (state.lastMove.to.r === r && state.lastMove.to.c === c));
      var special = TablutCore.isThrone(pos);
      var selectedHere = selected && selected.r === r && selected.c === c;
      var canSelect = isSelectablePiece(pos, piece);

      cell.className = "cell";
      if (special) cell.classList.add("special");
      if (legal) cell.classList.add("legal");
      if (last) cell.classList.add("last-move");
      if (selectedHere) cell.classList.add("selected");
      if (canSelect) cell.classList.add("can-select");
      cell.disabled = Boolean(state.winner || (aiBusy && mode === "single" && state.turn === aiSide));
      cell.textContent = "";

      if (piece) {
        var img = document.createElement("img");
        img.className = "piece" + (piece.type === "king" ? " king" : "");
        img.src = piece.type === "king" ? ASSETS.king : ASSETS[piece.side];
        img.alt = pieceName(piece);
        cell.appendChild(img);
      }
    });
  }

  function renderStatus() {
    turnChip.textContent = state.winner ? sideName(state.winner) + " Win" : sideName(state.turn);
    turnChip.classList.toggle("defender", state.winner === "defender" || (!state.winner && state.turn === "defender"));
    capturedAttackers.textContent = String(totalsCaptured.attacker);
    capturedDefenders.textContent = String(totalsCaptured.defender);

    if (state.winner) {
      statusTitle.textContent = sideName(state.winner) + " win";
      statusText.textContent = state.reason + " " + activePlayerLabel(state.winner) + " played " + sideSingular(state.winner) + ".";
      return;
    }

    if (aiBusy) {
      statusTitle.textContent = "AI thinking";
      statusText.textContent = "The AI is choosing a move at " + settings.aiElo + " ELO.";
      return;
    }

    statusTitle.textContent = activePlayerLabel(state.turn) + " to move";
    if (mode === "single" && state.turn !== humanSide) {
      statusText.textContent = "Waiting for the AI " + sideSingular(aiSide).toLowerCase() + " move.";
    } else if (selected) {
      statusText.textContent = settings.showLegalMoves
        ? legalMoves.length + " legal move" + (legalMoves.length === 1 ? "" : "s") + " highlighted."
        : legalMoves.length + " legal move" + (legalMoves.length === 1 ? "" : "s") + " available.";
    } else {
      statusText.textContent = "Select a " + (state.turn === "attacker" ? "dark attacker" : "light defender") + " piece.";
    }
  }

  function render() {
    renderBoard();
    renderStatus();
  }

  function clearSelection() {
    selected = null;
    legalMoves = [];
  }

  function selectPiece(pos) {
    selected = pos;
    legalMoves = TablutCore.getLegalMovesForPiece(state, pos);
  }

  function recordCaptures(captured) {
    captured.forEach(function (entry) {
      totalsCaptured[entry.piece.side] += 1;
    });
  }

  function makeMove(move) {
    var next = TablutCore.applyMove(state, move);
    recordCaptures(next.captured);
    state = next;
    clearSelection();
    render();
    scheduleAiIfNeeded();
  }

  function handleCellClick(pos) {
    if (state.winner || aiBusy || !isHumanTurn()) return;

    var chosenMove = selectedMoveTo(pos);
    if (chosenMove) {
      makeMove(chosenMove);
      return;
    }

    var piece = state.board[pos.r][pos.c];
    if (isSelectablePiece(pos, piece)) {
      selectPiece(pos);
    } else {
      clearSelection();
    }
    render();
  }

  function scheduleAiIfNeeded() {
    if (mode !== "single" || state.winner || state.turn !== aiSide) return;
    aiBusy = true;
    aiRequestId += 1;
    var requestId = aiRequestId;
    render();

    window.setTimeout(function () {
      if (requestId !== aiRequestId || mode !== "single" || state.winner || state.turn !== aiSide) {
        return;
      }
      var aiMove = TablutCore.chooseAiMove(state, settings.aiElo, aiSide);
      aiBusy = false;
      if (aiMove) {
        makeMove(aiMove);
      } else {
        state.winner = humanSide;
        state.reason = sideName(aiSide) + " have no legal moves.";
        render();
      }
    }, settings.aiDelay);
  }

  function startGame(nextMode) {
    closeModals();
    mode = nextMode;
    state = TablutCore.initialState();
    aiRequestId += 1;
    totalsCaptured = {
      attacker: 0,
      defender: 0
    };
    clearSelection();
    aiBusy = false;
    modeLabel.textContent = mode === "single"
      ? "Single Player - AI " + settings.aiElo + " ELO"
      : "Local Multiplayer - " + playerRoles.attacker + " attacks";
    setScreen("game");
    render();
    scheduleAiIfNeeded();
  }

  function startSinglePlayer() {
    humanSide = pendingSingleSide;
    aiSide = humanSide === "attacker" ? "defender" : "attacker";
    playerRoles = {
      attacker: humanSide === "attacker" ? "You" : "AI",
      defender: humanSide === "defender" ? "You" : "AI"
    };
    startGame("single");
  }

  function startLocalMultiplayer() {
    playerRoles = {
      attacker: pendingPlayerOneSide === "attacker" ? "Player 1" : "Player 2",
      defender: pendingPlayerOneSide === "defender" ? "Player 1" : "Player 2"
    };
    startGame("multi");
  }

  function setPendingSingleSide(side) {
    pendingSingleSide = side;
    singleSideButtons.forEach(function (button) {
      button.classList.toggle("is-active", button.dataset.singleSide === side);
    });
  }

  function setPendingPlayerOneSide(side) {
    pendingPlayerOneSide = side;
    playerOneSideButtons.forEach(function (button) {
      button.classList.toggle("is-active", button.dataset.playerOneSide === side);
    });
    playerTwoSideButtons.forEach(function (button) {
      button.classList.toggle("is-active", button.dataset.playerTwoSide !== side);
    });
  }

  function setPendingPlayerTwoSide(side) {
    setPendingPlayerOneSide(side === "attacker" ? "defender" : "attacker");
  }

  function quitApp() {
    window.close();
    window.setTimeout(function () {
      window.alert("Close this browser tab to quit Tablut.");
    }, 50);
  }

  function openSettings() {
    updateSettingsUi();
    setScreen("settings");
  }

  buildBoard();
  updateSettingsUi();
  setPendingSingleSide(pendingSingleSide);
  setPendingPlayerOneSide(pendingPlayerOneSide);
  render();

  eloSlider.addEventListener("input", function () {
    settings.aiElo = Number(eloSlider.value);
    updateSettingsUi();
  });
  aiDelaySlider.addEventListener("input", function () {
    settings.aiDelay = Number(aiDelaySlider.value);
    updateSettingsUi();
  });
  showLegalMovesToggle.addEventListener("change", function () {
    settings.showLegalMoves = showLegalMovesToggle.checked;
    render();
  });
  lastMoveToggle.addEventListener("change", function () {
    settings.highlightLastMove = lastMoveToggle.checked;
    render();
  });
  singlePlayerButton.addEventListener("click", function () {
    setPendingSingleSide(pendingSingleSide);
    openModal(singlePlayerModal);
  });
  localMultiplayerButton.addEventListener("click", function () {
    setPendingPlayerOneSide(pendingPlayerOneSide);
    openModal(localMultiplayerModal);
  });
  settingsButton.addEventListener("click", openSettings);
  quitButton.addEventListener("click", quitApp);
  saveSettingsButton.addEventListener("click", function () {
    saveSettings();
    setScreen("menu");
  });
  resetSettingsButton.addEventListener("click", resetSettings);
  settingsBackButton.addEventListener("click", function () {
    saveSettings();
    setScreen("menu");
  });
  confirmSinglePlayerButton.addEventListener("click", startSinglePlayer);
  cancelSinglePlayerButton.addEventListener("click", closeModals);
  confirmLocalMultiplayerButton.addEventListener("click", startLocalMultiplayer);
  cancelLocalMultiplayerButton.addEventListener("click", closeModals);
  newGameButton.addEventListener("click", function () {
    if (mode === "single") startSinglePlayer();
    else startLocalMultiplayer();
  });
  menuButton.addEventListener("click", function () {
    closeModals();
    clearSelection();
    aiBusy = false;
    aiRequestId += 1;
    setScreen("menu");
  });
  singleSideButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      setPendingSingleSide(button.dataset.singleSide);
    });
  });
  playerOneSideButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      setPendingPlayerOneSide(button.dataset.playerOneSide);
    });
  });
  playerTwoSideButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      setPendingPlayerTwoSide(button.dataset.playerTwoSide);
    });
  });
})();
