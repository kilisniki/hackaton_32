import kaboom from "kaboom";
import {v4 as uuidv4} from 'uuid';
import Victor from 'victor';

// Start game
kaboom()
setBackground([212, 110, 179])
// ОБЩИЕ переменные
const SPEED = 480
let leaderBoard;
let currentWorldState;
const globalPlayer = {
	id: null,
	nickname: null,
	level: 1,
	damage: 1,
	bulletSpeed: 1,
	health: 10,
	maxHealth: 10,
	levelScore: 0,
	texture: 'texture_1',
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

function createBulletObj (level, state) {
	console.log(state.direction.x, state.direction.y);
	let angle = vectorToAngle(state.direction.x, state.direction.y) - 90;

	console.log('angle',angle)
	const gameObj = level.add([
		pos(state.coordinates.x, state.coordinates.y),
		anchor("center"),
		// move({x: state.direction.x, y: state.direction.y}, 100),
		sprite('bullet'),
		rotate(0),
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

// UTILS END

// СОКЕТЫ START ----------------------------------------------------------------------------------
const EVENTS = {
	REGISTER: 'REGISTER',
	LEADERBOARD: 'LEADERBOARD',
	WORLDSTATE: 'WORLDSTATE',
	PLAYERSTATE: 'PLAYERSTATE',
	SHOT: 'SHOT'
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
		globalPlayer.levelScore = 1;
		globalPlayer.health = 1;

		// TODO
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
			level: globalPlayer.level,
			maxHealth: globalPlayer.maxHealth,
			texture: 'texture_1',
			x: globalPlayer.gameObj.pos.x,
			y: globalPlayer.gameObj.pos.y
		});
	}, 100);
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
		const user = getUser();
		sendEvent(EVENTS.REGISTER, user);
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
	subscribeToLeaderBoard(lbText);

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
		const click = mousePos();
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
		const myDirection = new Victor(
			to.x - from.x,
			to.y - from.y
		).normalize();
		console.log(from, to, myDirection);

		//const direction = player.pos.sub(click).unit()
		//console.log(direction, myDirection);

		const bulletState = {
			id: uuidv4(),
			damage: clientWorldState.player.damage,
			userId: clientWorldState.player.id,
			coordinates: from,
			direction: {
				x: myDirection.x,
				y: myDirection.y
			},
			bulletSpeed: globalPlayer.bulletSpeed
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

	startSendState();
})
// LEADERBOARD SCENE END ----------------------------------------------------------------------


// BATTLEGROUND SCENE START -------------------------------------------------------------------
scene('battleground', async () => {

	//
	startSendState();
})
// BATTLEGROUND SCENE END -------------------------------------------------------------------


function start () {
	const user = getUser();
	if (!user) {
		go('welcome', { kek: 'lol' });
	} else {
		go('leaderboard', { kek: 'lol' });
	}
}

start();
