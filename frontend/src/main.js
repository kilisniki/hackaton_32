import kaboom from "kaboom";
import {v4 as uuidv4} from 'uuid';
import Victor from 'victor';

// Start game
kaboom()
setBackground([212, 110, 179])
// ОБЩИЕ переменные
const SPEED = 480;
const MOVEMENT_DURATION = 0.2;
const SEND_MY_STATE_EVERY = 100;
let leaderBoard;
let currentWorldState;
let shotCooldown = 1_000; // 3 секунды
let lastShot = 0;
const globalPlayer = {
	id: null,
	nickname: null,
	level: 1,
	damage: 1,
	bulletSpeed: 1,
	health: 10,
	maxHealth: 10,
	levelScore: 0,
	texture: 'bullet',
	gameObj: null,
	serverState: null
};
const clientWorldState = {
	player: globalPlayer,
	players: {},
	bullets: {},
	shelters: {},
	gains: {}
};


// Load assets
loadSprite("bean", "/sprites/bean.png")
loadSprite("texture_1", "/sprites/bean.png")

loadSprite("coin", "/sprites/coin.png")
loadSprite("grass", "/sprites/grass.png")
loadSprite("shelter", "/sprites/shelter.png")
loadSprite("lb-desk", "/sprites/lb-desk.png")
loadSprite("portal", "/sprites/portal.png")
loadSprite("bullet", "/sprites/bullet.png")



loadSound("score", "/examples/sounds/score.mp3")
const FONT = "apl386"
loadFont(FONT, "/examples/fonts/apl386.ttf", { outline: 4, filter: "linear" })


// UTILS START
// создание загрузка пользователя
function createUser(nickname) {
	const user = { id: uuidv4(), nickname };
	localStorage.setItem('user', JSON.stringify(user));
}
function getUser() {
	let user = localStorage.getItem('user');
	if (user) {
		try {
			user = JSON.parse(user);
			console.log('user setted!');
			clientWorldState.player.id = user.id;
			clientWorldState.player.nickname = user.nickname;
		} catch (e) {
			console.log('user broken', e);
			user = undefined;
		}
	}
	return user;
}

const getLbText = () => {
	let leaderBoardMock = [
		{ id: '', nickname: '1234567890', score: 90 },
		{ id: '', nickname: '1234567890', score: 91 },
		{ id: '', nickname: '1234567890', score: 92 },
		{ id: '', nickname: '1234567890', score: 93 },
		{ id: '', nickname: '1234567890', score: 94 },
		{ id: '', nickname: '1234567890', score: 95 },
		{ id: '', nickname: '1234567890', score: 96 },
		{ id: '', nickname: '1234567890', score: 97 },
		{ id: '', nickname: '1234567890', score: 98 },
		{ id: '', nickname: '1234567890', score: 99 },
		{ id: 'a', nickname: '1234567890', score: 1 },
	];

	const currLeaderBoard = leaderBoard || leaderBoardMock;
	let lbText = "";
	currLeaderBoard.sort((a,b) => b.score - a.score);
	let playerScore;
	let playerIndex;
	currLeaderBoard.forEach((el, i) => {
		if (el.id === clientWorldState.player.id || 'a') {
			playerScore = el;
			playerIndex = i+1;
		}
		if (i > 8) return; // ограничение вывода рейтинга
		lbText += `${i+1}. ${el.nickname} - ${el.score}\n`;
	});
	lbText += '. . .\n';
	if (playerScore && playerIndex > 8) {
		lbText += `${playerIndex}. ${playerScore.nickname} - ${playerScore.score}\n`
	}
	return  lbText;
}

function vectorToAngle(x, y) {
	let angle = Math.atan2(y, x) * (180 / Math.PI);
	if (angle < 0) {
		angle += 360;
	}
	return angle;
}

function createOtherPlayerObj (level, state) {
	const player = level.add([
		pos(state.x, state.y),
		anchor("center"),
		sprite(state.texture),
		"otherPlayer",
		state.id
	]);
	// player.onCollide("bullet", (element) => {
	// 	console.log(127, element);
	// 	sendEvent(EVENTS.COLLIDE, { playerId: state.id, bulletId: element.id })
	// })
	return player;
}

function createBulletObj (level, state) {
	console.log(state.direction.x, state.direction.y);
	let angle = vectorToAngle(state.direction.x, state.direction.y) - 90;

	console.log('angle',angle)
	const gameObj = level.add([
		pos(state.coordinates.x, state.coordinates.y),
		anchor("center"),
		sprite('bullet'),
		rotate(angle),
		"bullet",
		state.id
	])
	// gameObj.angle = angle;
	const resultX = gameObj.pos.x + state.direction.x * 100 * 100;
	const resultY = gameObj.pos.y + state.direction.y * 100 * 100;
	gameObj.tween = tween(
		vec2(gameObj.pos.x, gameObj.pos.y),
		vec2(resultX, resultY),
		100, // здесь должна быть функция от пинга
		(val) => {
			gameObj.pos = val;
			// unit.engineData.gameObj.pos = val
		}
	)
	return gameObj;
}

function createPlayerObj (level) {
	const gameObj = level.add([
		sprite("bean"),
		area(),
		body(),
		anchor("center"),
		pos(1000, 1000),
		"player",
	]);
	globalPlayer.gameObj = gameObj;
	return gameObj;
}

function deleteOldUnits (newState) {
	const field = 'players';
	// TODO bullets, shelters
	const newPlayers = newState
		.players
		.reduce(
			(acc, el) =>
			{
				console.log('acc', acc);
				acc[el.id] = el;
				return acc
			},
			{});
	for (const playerId in clientWorldState[field]) { // проходимся по всем текущим игрокам
		const playerOnServer = newPlayers[playerId]; // достаем player
		if (!playerOnServer) {
			// не нашли в новом состоянии юнит, удаляем объект
			destroy(clientWorldState[playerId].gameObj);
			delete clientWorldState[playerId];
		}
	}
}

function createOrUpdateUnits (level, newState) {
	//const field = 'players';
	// TODO bullets, shelters
	const newPlayers = newState.players.reduce((acc, el)=>{ acc[el.id] = el; return acc; }, {});
	for (const playerId in newPlayers) { // проходимся по всем игрокам с сервера
		const playerOnServer = newPlayers[playerId]; // достаем player
		if(playerId === globalPlayer.id) {
			globalPlayer.health = playerOnServer.health;
			globalPlayer.levelScore = playerOnServer.levelScore;
			globalPlayer.serverState = playerOnServer;
			// TODO обработка смерти
		}
		const exitedUnit = clientWorldState.players[playerId];
		if (exitedUnit) {
			if (exitedUnit.gameObj.tween) {
				exitedUnit.gameObj.tween.cancel()
			}
			exitedUnit.gameObj.tween = tween(
				vec2(exitedUnit.gameObj.pos.x, exitedUnit.gameObj.pos.y),
				vec2(playerOnServer.x, playerOnServer.y),
				MOVEMENT_DURATION,
				(val) => exitedUnit.gameObj.pos = val
			)
			// TODO смерть, смена текстуры
		} else {
			const newPlayerUnit = createOtherPlayerObj(level, playerOnServer);
			clientWorldState.players[playerOnServer.id] = {
				id: playerOnServer.id,
				gameObj: newPlayerUnit
			};
		}
	}
}


// UTILS END

// СОКЕТЫ START ----------------------------------------------------------------------------------
const EVENTS = {
	REGISTER: 'REGISTER',
	LEADERBOARD: 'LEADERBOARD',
	WORLDSTATE: 'WORLDSTATE',
	PLAYERSTATE: 'PLAYERSTATE',
	SHOT: 'SHOT',
	COLLIDE: 'COLLIDE'
}
let connected;
const CLIENT_SCOKET = new WebSocket('ws://deathmatch-ws-production.up.railway.app'); // ws://localhost:8080/
CLIENT_SCOKET.onopen = (event) => {
	connected = event;
	console.log('connected successful');
};
function sendEvent(event, payload) {
	if (!connected) {
		console.log('not connected');
		return;
	}
	CLIENT_SCOKET.send(JSON.stringify({ event: event, data: payload }));
}
// Объект, в котором будут храниться обработчики для разных типов событий
const eventHandlers = {};
// Функция для добавления обработчика определенного типа события
function addEventHandler(eventType, handler) {
	if (!eventHandlers[eventType]) {
		eventHandlers[eventType] = [];
	}
	eventHandlers[eventType].push(handler);
}

// Функция для удаления обработчика определенного типа события
function removeEventHandler(eventType, handler) {
	if (eventHandlers[eventType]) {
		eventHandlers[eventType] = eventHandlers[eventType].filter(h => h !== handler);
		if (eventHandlers[eventType].length === 0) {
			delete eventHandlers[eventType];
		}
	}
}
CLIENT_SCOKET.onmessage = (event) => {
	console.log(event.data);
	const eventData = JSON.parse(event.data);
	const eventType = eventData.event;
	const eventPayload = eventData.data;

	if (eventHandlers[eventType]) {
		eventHandlers[eventType].forEach(handler => handler(eventPayload));
	} else {
		console.log('No handlers for:', eventType);
	}
}

function subscribeToLeaderBoard (lbTextGameObject) {
	addEventHandler(EVENTS.REGISTER, (payload) => {
		leaderBoard = payload;
		lbTextGameObject.text = getLbText();
	});
}

function subscribeToWorldState (level, player) {
	addEventHandler(EVENTS.WORLDSTATE, (payload) => {
		/*
		* нам нужно:
		* 1. Пройтись по всем players, bullets ... найти: удаленные
		* 2. Удалить из clientWorldState удаленные
		* 3. Удалить из level удаленные
		* 4. Остальные - обновить / создать
		* 5. Создание игроков, буллетсов - добавляем эвенты onCollision()
		* 6. Обновляется игроков: у тех у кого health = 0 - ставим texture = death
		* 7. Обновление буллетс - анимация
		* 8. Если у нас health = 0 - завершаем игру, переводим на новый экран
		* 9. Создание,Обновление shatters
		* 10. Создание, обновление улучшений
		*
		* */
		console.log('world state received');
		deleteOldUnits(payload);
		createOrUpdateUnits(level, payload);
		globalPlayer.levelScore = 1;
		globalPlayer.health = 1;
		// TODO

		currentWorldState = payload;
	});
}

// отправка местоположения раз в N времени
let interval;
function startSendState () {
	interval = setInterval(() => {
		if (!globalPlayer.gameObj) {
			return;
		}
		sendEvent(EVENTS.PLAYERSTATE, {
			id: globalPlayer.id,
			level: globalPlayer.level,
			health: globalPlayer.health,
			maxHealth: globalPlayer.maxHealth,
			texture: 'texture_1',
			x: globalPlayer.gameObj.pos.x,
			y: globalPlayer.gameObj.pos.y
		});
	}, SEND_MY_STATE_EVERY);
}
function stopSendState () {
	clearInterval(interval);
}

// РАЗРЫВ DISCONNECT
// TODO
CLIENT_SCOKET.onerror = function(error) {
	// TODO здесь добавить обработку отрыва соединения
	alert(`[error]`);
};
CLIENT_SCOKET.onclose = function(event) {
	if (event.wasClean) {
		alert(`[close] Connection closed cleanly, code=${event.code} reason=${event.reason}`);
	} else {
		// e.g. server process killed or network down event.code is usually 1006 in this case
		alert('[close] Connection died');
	}
};
// СОКЕТЫ END ----------------------------------------------------------------------------



















// WELCOME SCENE START ---------------------------------------------------------------
scene('welcome', async ({ levelIdx, score}) => {
	let curSize = 48
	const pad = 24

	const welcomeMessage = add([
		text('Введи свой никнейм, дракон!', {
			font: FONT,
			color: [0 , 0, 0],
		}),
		pos(width() / 2, height() / 2 + 108 - curSize),
		anchor("center")
	])

// Add a game object with text() component + options
	const input = add([
		//pos(pad),
		pos(width() / 2, height() / 2 + 108),
		anchor("center"),
		text("", {
			font: FONT,
			// It'll wrap to next line if the text width exceeds the width option specified here
			width: width() - pad * 2,
			// The height of character
			size: curSize,
			// Text alignment ("left", "center", "right", default "left")
			align: "center",
			lineSpacing: 8,
			letterSpacing: 2,
			// Transform each character for special effects
			transform: (idx, ch) => ({
				color: hsl2rgb((time() * 0.2 + idx * 0.1) % 1, 0.7, 0.8),
				pos: vec2(0, wave(-4, 4, time() * 4 + idx * 0.5)),
				scale: wave(1, 1.2, time() * 3 + idx),
				angle: wave(-9, 9, time() * 3 + idx),
			}),
		}),
	]);

	// Like onKeyPressRepeat() but more suitable for text input.
	onCharInput((ch) => {
		if (input.text.length <= 10) {
			input.text += ch
		}
	})
	onKeyPressRepeat("enter", () => {
		// создание пользователя
		if (leaderBoard) {
			const alreadyExists = leaderBoard.find(el => el.nickname === input.text);
			if (alreadyExists) {
				welcomeMessage.text = 'Such nickname already exists';
				return;
			}
		}
		createUser(input.text);
		go('leaderboard');
	})

	// Delete last character
	onKeyPressRepeat("backspace", () => {
		input.text = input.text.substring(0, input.text.length - 1)
	})
});
// WELCOME SCENE END -------------------------------------------------------------------

// LEADERBOARD SCENE START --------------------------------------------------------------
scene('leaderboard', async () => {
	const user = getUser();
	sendEvent(EVENTS.REGISTER, user);

	camScale(1);
	const level = addLevel([
		"===============================",
		"=                             =",
		"=                             =",
		"=                             =",
		"=                             =",
		"=                             =",
		"=                             =",
		"=                             =",
		"=                             =",
		"=                             =",
		"=                             =",
		"=                             =",
		"=                             =",
		"=                             =",
		"=                             =",
		"=                             =",
		"=                           @ =",
		"=                             =",
		"=                             =",
		"=                             =",
		"=                             =",
		"=                             =",
		"=                             =",
		"=                             =",
		"=                 $           =",
		"=                             =",
		"=                             =",
		"=                             =",
		"=                             =",
		"=                             =",
		"=                             =",
		"==============================="
	], {
		tileWidth: 64,
		tileHeight: 64,
		pos: vec2(32, 32),
		tiles: {
			"@": () => [
				sprite("portal"),
				area(),
				anchor("center"),
				"portal"
			],
			"=": () => [
				sprite("grass"),
				area(),
				body({ isStatic: true }),
				anchor("center"),
			],
			"$": () => [
				sprite("shelter"),
				area(),
				anchor("center"),
				"shelter",
			],
		},
	});

	let player = createPlayerObj(level);

	// добавление лидерборда
	const lb = add([
		sprite("lb-desk"),
		area(),
		body({ isStatic: true }),
		pos(750, 0),
		scale(0.5)
	])
	const lbText = lb.add([
		text("", {
			font: FONT,
			align: 'left',
			//width: width() - pad * 2,
			lineSpacing: 6,
			transform: (idx, ch) => ({
				color: hsl2rgb((time() * 0.1 + idx * 0.1) % 1, 0.7, 0.8),
				pos: vec2(0, wave(-4, 4, time() * 4 + idx * 0.5)),
				scale: wave(1, 1.2, time() * 3 + idx),
				angle: wave(-9, 9, time() * 3 + idx),
			}),
		}),
		pos(520, 430),
	]);

	// подписываемся на все события
	subscribeToLeaderBoard(lbText);
	subscribeToWorldState(level);
	startSendState();

	player.onUpdate(() => {
		// Set the viewport center to player.pos
		camPos(player.worldPos())
	})
	player.onPhysicsResolve(() => {
		// Set the viewport center to player.pos
		camPos(player.worldPos())
	})

	// стрельба, выстрел
	onClick(() => {
		if (Date.now() - lastShot < shotCooldown) {
			return;
		}
		lastShot = Date.now();
		const click = toWorld(mousePos());
		//k.addKaboom(k.mousePos()); // TODO spell animation
		addKaboom(toWorld(mousePos()))
		const from = {
			x: globalPlayer.gameObj.pos.x,
			y: globalPlayer.gameObj.pos.y
		};
		const to = {
			x: click.x,
			y: click.y
		};
		const direction = new Victor(
			to.x - from.x,
			to.y - from.y
		).normalize();
		const bulletState = {
			id: uuidv4(),
			damage: clientWorldState.player.damage,
			userId: clientWorldState.player.id,
			coordinates: from,
			direction: {
				x: direction.x,
				y: direction.y
			},
			bulletSpeed: globalPlayer.bulletSpeed,
			createdAt: Date.now()
		}
		sendEvent(EVENTS.SHOT, bulletState);
		const gameObj = createBulletObj(level, bulletState);
		clientWorldState.bullets[bulletState.id] = {
			gameObj: gameObj,
			serverState: bulletState
		};
	})

	player.onCollide("portal", () => {
		stopSendState();
		go("battleground", {});
	})

	onKeyDown("left", () => player.move(-SPEED, 0))
	onKeyDown("right", () => player.move(+SPEED, 0))
	onKeyDown("up", () => player.move(0, -SPEED))
	onKeyDown("down", () => player.move(0, +SPEED))
})
// LEADERBOARD SCENE END ----------------------------------------------------------------------


// BATTLEGROUND SCENE START -------------------------------------------------------------------
scene('battleground', async () => {

	//
	startSendState();
})
// BATTLEGROUND SCENE END -------------------------------------------------------------------

// WAIT CONNECT
scene('waitconnect', async () => {
	let interval;
	interval = setInterval(()=> {
		if (!connected) {
			return;
		}
		clearInterval(interval);
		const user = getUser();
		if (!user) {
			go('welcome', { kek: 'lol' });
		} else {
			go('leaderboard', { kek: 'lol' });
		}
	}, 1000)
})

function start () {
	go('waitconnect');
}

start();
