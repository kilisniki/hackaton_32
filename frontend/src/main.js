import kaboom from "kaboom";
import {v4 as uuidv4} from 'uuid';
import Victor from 'victor';

// Start game
kaboom()
setBackground([212, 110, 179])
// ОБЩИЕ переменные
const SPEED = 480;
const MOVEMENT_DURATION = 0.3;
const SEND_MY_STATE_EVERY = 100;
const ROOMS = {
	leaderBoard: 'leaderBoard',
	battleGround: 'battleGround'
};
let currentRoom;
let leaderBoard;
let currentWorldState;
let shotCooldown = 1_000; // 3 секунды
let lastShot = 0;
const globalPlayer = {
	id: null,
	nickname: null,
	gameObj: null,
	serverState: null
};
function setDefaultValues () {
	globalPlayer.level = 1;
	globalPlayer.damage = 1;
	globalPlayer.bulletSpeed = 500;
	globalPlayer.health = 10;
	globalPlayer.maxHealth = 10;
	globalPlayer.levelScore = 0;
	globalPlayer.texture = 'texture_1';
}
setDefaultValues();

const clientWorldState = {
	player: globalPlayer,
	players: {},
	bullets: {},
	shelters: {},
	gains: {}
};


// Load assets
loadSprite("bean", "/sprites/bean.png")
loadSprite("texture_1", "/sprites/texture_1.png")
loadSprite("texture_2", "/sprites/texture_2.png")
loadSprite("texture_3", "/sprites/texture_2.png")
loadSprite("texture_4", "/sprites/texture_2.png")
loadSprite("texture_5", "/sprites/texture_2.png")
loadSprite("coin", "/sprites/coin.png")
loadSprite("grass", "/sprites/grass.png")
loadSprite("shelter", "/sprites/shelter.png")
loadSprite("lb-desk", "/sprites/lb-desk.png")
loadSprite("portal", "/sprites/portal.png")
loadSprite("bullet", "/sprites/bullet.png")
loadSprite("rip", "/sprites/rip.png")
loadSprite("hidden", "/sprites/hidden.png")


loadSound("score", "/examples/sounds/score.mp3")
const FONT = "apl386"
loadFont(FONT, "/examples/fonts/apl386.ttf", { outline: 4, filter: "linear" })

let a = {};
let storage = {
	setItem: (name, value) => {
		a[name] = value;
	},
	getItem(name) {
		return a[name];
	}
}
const myStorage = storage // || localStorage; TODO при выкатке не забыть поменять

// UTILS START ------------------------------------------------------------------------------------>

// создание загрузка пользователя
function createUser(nickname) {
	const user = { id: uuidv4(), nickname };
	myStorage.setItem('user', JSON.stringify(user));
}
function getUser() {
	let user = myStorage.getItem('user');
	if (user) {
		try {
			user = JSON.parse(user);
			clientWorldState.player.id = user.id;
			clientWorldState.player.nickname = user.nickname;
		} catch (e) {
			console.error('user broken', e);
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
	console.log('create user!!!');
	const player = level.add([
		pos(state.x, state.y),
		anchor("center"),
		area(),
		sprite(state.texture),
		"otherPlayer",
		state.id
	]);
	if (currentRoom === ROOMS.battleGround) {
		const healthbar = addHealthBar(player, state.maxHealth);
		player.use({
			setHP(health) {
				healthbar.set(health);
			}
		})
	}

	return player
}

function addHealthBar (player, maxHealth) {
	const healthBarWidth = 64;
	const healthbar = player.add([
		rect(healthBarWidth, 10),
		pos(-30, 40),
		color(107, 201, 108),
		{
			max: maxHealth,
			set(hp) {
				this.width = healthBarWidth * hp / this.max
				console.log('width', this.width, hp, this.max);
				this.flash = true
			},
		},
	])

	healthbar.onUpdate(() => {
		if (healthbar.flash) {
			healthbar.color = rgb(255, 255, 255)
			healthbar.flash = false
		} else {
			healthbar.color = rgb(127, 255, 127)
		}
	})

	return healthbar;
}

function createBulletObj (level, state) {
	let angle = vectorToAngle(state.direction.x, state.direction.y) - 90;

	const bullet = level.add([
		pos(state.coordinates.x, state.coordinates.y),
		anchor("center"),
		sprite('bullet'),
		area(),
		rotate(angle),
		"bullet",
		state.id
	])

	return bullet
}

function updateBulletObj () {
	// TODO вынести на сервер, а сюда добавить twittle
	const resultX = gameObj.pos.x + state.direction.x * 100 * 100;
	const resultY = gameObj.pos.y + state.direction.y * 100 * 100;
	gameObj.tween = tween(
		vec2(gameObj.pos.x, gameObj.pos.y),
		vec2(resultX, resultY),
		100, // здесь должна быть функция от пинга
		(val) => {
			gameObj.pos = val;
		}
	)
}

function createPlayerObj (level) {
	const rand = {
		x: Math.random() * 1800 + 64,
		y: Math.random() * 1920 + 64
	}
	const gameObj = level.add([
		sprite(globalPlayer.texture),
		area(),
		body(),
		anchor("center"),
		pos(rand.x, rand.y),
		"player",
	]);
	globalPlayer.gameObj = gameObj;

	if (currentRoom === ROOMS.battleGround) {
		const healthbar = addHealthBar(gameObj, globalPlayer.maxHealth);
		gameObj.use({
			setHP(health) {
				healthbar.set(health);
			}
		})
	}
	return gameObj;
}

// эта функция проходится по основным сущностям и удаляет их с игрового поля
// у всех сущностей должен быть id и {id gameObj} в состоянии на клиенте
function deleteOldUnits (newState) {
	const fields = ['players', 'bullets', 'gains', 'shelters'];
	for (const field of fields) {
		const serverUnits = newState[field].reduce((acc, el) => { acc[el.id] = el; return acc }, {});
		for (const unitId in clientWorldState[field]) { // проходимся по всем текущим сущностям
			const unitStateOnServer = serverUnits[unitId]; // достаем сущность
			if (!unitStateOnServer) {
				destroy(clientWorldState[field][unitId].gameObj);
				delete clientWorldState[field][unitId];
			}
		}
	}
}

function clearWorld () {
	deleteOldUnits({ players: [], bullets: [], gains: [], shelters: []});
}

function createOrUpdateUnits (level, newState) {
	const fields = ['players', 'bullets', 'gains', 'shelters'];
	console.log('create or update!!!')
	for (const field of fields) {
		if (field === 'bullets') {
			console.log('BULLLETS!')
		}
		const existedUnits = newState[field].reduce((acc, el)=>{ acc[el.id] = el; return acc; }, {});
		for (const playerId in existedUnits) { // проходимся по всем сущностям с сервера
			const unitOnServer = existedUnits[playerId]; // достаем сущность
			if(playerId === globalPlayer.id) {
				globalPlayer.serverState = unitOnServer;
				globalPlayer.health = unitOnServer.health;
				globalPlayer.levelScore = 0 || unitOnServer.levelScore;
				globalPlayer.level = getUpdateLevel(globalPlayer.levelScore);
				globalPlayer.texture = getUpdateTexture(globalPlayer.level);
				globalPlayer.damage = getUpdateDamage(globalPlayer.level);
				// globalPlayer.health = 0; для теста
				if (globalPlayer.health === 0) {
					globalPlayer.gameObj.use(sprite('rip'));
					stopSendState();
					clearEventHandlers(EVENTS.PLAYERSTATE);
					clearEventHandlers(EVENTS.WORLDSTATE);
					clearEventHandlers(EVENTS.LEADERBOARD);
					clearWorld();
					go('lose');
				}
				continue;
			}
			let unitOnClient = clientWorldState[field][playerId];
			if (!unitOnClient) {
				console.log('CREATION');
				// есть на сервере, нет у нас - добавляем
				let newGameObj;
				switch (field) {
					case 'players':
						newGameObj = createOtherPlayerObj(level, unitOnServer);
						break;
					case 'bullets':
						newGameObj = createBulletObj(level, unitOnServer);
						break;
					case 'gains':
						break;
					case 'shelters':
						break;
					default:
						break;
				}
				unitOnClient = {
					id: unitOnServer.id,
					gameObj: newGameObj,
					serverState: unitOnServer
				};
				clientWorldState[field][unitOnServer.id] = unitOnClient;
			}
			// update animation
			if (unitOnClient.gameObj.tween) {
				unitOnClient.gameObj.tween.cancel()
			}
			if (unitOnClient.health === 0) { // поле есть только у players
				unitOnClient.gameObj.use(sprite('rip'));
			}
			if (field === 'players') {
				unitOnClient.gameObj.tween = tween(
					vec2(unitOnClient.gameObj.pos.x, unitOnClient.gameObj.pos.y),
					vec2(unitOnServer.x, unitOnServer.y),
					MOVEMENT_DURATION,
					(val) => unitOnClient.gameObj.pos = val
				)
			} else {
				unitOnClient.gameObj.tween = tween(
					vec2(unitOnClient.gameObj.pos.x, unitOnClient.gameObj.pos.y),
					vec2(unitOnServer.coordinates.x, unitOnServer.coordinates.y),
					MOVEMENT_DURATION,
					(val) => unitOnClient.gameObj.pos = val
				)
			}
			// update textures
			switch (field) {
				case 'players':
					if (unitOnClient.serverState.health > 0) unitOnClient.gameObj.use(sprite(unitOnClient.serverState.texture));
					else unitOnClient.gameObj.use(sprite('rip'));
					break;
				case 'bullets':
				case 'gains':
				case 'shelters':
				default:
					break;
			}
		}
	}
}

function addButton(txt, p, f) {
	// add a parent background object
	const btn = add([
		rect(300, 80, { radius: 8 }),
		pos(p),
		area(),
		scale(1),
		anchor("center"),
		outline(4),
	])

	// add a child object that displays the text
	const btnTxt = btn.add([
		text(txt),
		anchor("center"),
		color(0, 0, 0),
	])

	// onHoverUpdate() comes from area() component
	// it runs every frame when the object is being hovered
	btn.onHoverUpdate(() => {
		const t = time() * 10
		btn.color = hsl2rgb((t / 10) % 1, 0.6, 0.7)
		btn.scale = vec2(1.2)
		setCursor("pointer")
	})

	// onHoverEnd() comes from area() component
	// it runs once when the object stopped being hovered
	btn.onHoverEnd(() => {
		btn.scale = vec2(1)
		btn.color = rgb()
	})

	// onClick() comes from area() component
	// it runs once when the object is clicked
	btn.onClick(f)

	return {btn, btnTxt }
}

function getUpdateLevel (score) {
	if (score >= 20) {
		return 5
	}
	if (score >= 15) {
		return 4
	}
	if (score >= 10) {
		return 3;
	}
	if (score >= 5) {
		return 2;
	}
	return 1;
}

function getUpdateTexture (level) {
	switch (level) {
		case 5:
			return 'texture_5'
		case 4:
			return 'texture_4'
		case 3:
			return 'texture_3'
		case 2:
			return 'texture_2'
		case 1:
			return 'texture_1'
		default:
			return 'texture_1'
	}
}

function getUpdateDamage (level) {
	switch (level) {
		case 5:
			return 10
		case 4:
			return 8
		case 3:
			return 5
		case 2:
			return 4
		case 1:
			return 3
		default:
			return 'texture_1'
	}
}

function bulletCount (level) {
	if (level === 4) return 2;
	return 1;
}


// UTILS END ------------------------------------------------------------------------------------>

// СОКЕТЫ START ----------------------------------------------------------------------------------
const EVENTS = {
	REGISTER: 'REGISTER',
	LEADERBOARD: 'LEADERBOARD',
	WORLDSTATE: 'WORLDSTATE',
	PLAYERSTATE: 'PLAYERSTATE',
	SHOT: 'SHOT',
	COLLIDE: 'COLLIDE',
	PING: 'PING',
	BATTLLEND: 'BATTLLEND'
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
function clearEventHandlers(eventType) {
	eventHandlers[eventType] = []
}

CLIENT_SCOKET.onmessage = (event) => {
	const eventData = JSON.parse(event.data);
	console.log(eventData);
	const eventType = eventData.event;
	const eventPayload = eventData.data;

	if (eventHandlers[eventType]) {
		eventHandlers[eventType].forEach(handler => handler(eventPayload));
	} else {
		console.error('No handlers for:', eventType);
	}
}

addEventHandler(undefined, ()=>{console.log('pong')});

function subscribeToLeaderBoard (lbTextGameObject) {
	addEventHandler(EVENTS.LEADERBOARD, (payload) => {
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
		* 5. Создание игроков, буллетсов ...
		* 6. Обновляется игроков: у тех у кого health = 0 - ставим texture = death
		* 7. Обновление буллетс - анимация
		* 8. Если у нас health = 0 - завершаем игру, переводим на новый экран
		* 9. Создание,Обновление shatters
		* 10. Создание, обновление улучшений
		*
		* */
		deleteOldUnits(payload);
		createOrUpdateUnits(level, payload);
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
			texture: globalPlayer.texture,
			x: globalPlayer.gameObj.pos.x,
			y: globalPlayer.gameObj.pos.y
		});
	}, SEND_MY_STATE_EVERY);
}
function stopSendState () {
	clearInterval(interval);
}

addEventHandler(EVENTS.BATTLLEND, () => {
	if (currentRoom !== ROOMS.battleGround) {
		return;
	}
	stopSendState();
	clearEventHandlers(EVENTS.PLAYERSTATE);
	clearEventHandlers(EVENTS.WORLDSTATE);
	clearEventHandlers(EVENTS.LEADERBOARD);
	clearWorld();
	go('leaderboard')
});

// РАЗРЫВ DISCONNECT
CLIENT_SCOKET.onerror = function(error) {
	console.error('our socket error', error);
	// alert(`[error]`);
};
CLIENT_SCOKET.onclose = function(event) {
	if (event.wasClean) {
		alert(`[close] Connection closed. Page will be reload.`);
	} else {
		alert(`[close] Connection died. Page will be reload.`);
	}
	location.reload(true);
};
// СОКЕТЫ END ----------------------------------------------------------------------------






// WELCOME SCENE START ---------------------------------------------------------------
scene('welcome', async ({ levelIdx, score}) => {
	let curSize = 48
	const pad = 24

	const welcomeMessage = add([
		text('Enter your nickname, Dragon!', {
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
	currentRoom = ROOMS.leaderBoard;
	sendEvent(EVENTS.REGISTER, { ...user, room: currentRoom });

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
		"=                             =",
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
			]
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

  // обработка коллизий
	player.onCollide("portal", () => {
		stopSendState();
		clearEventHandlers(EVENTS.PLAYERSTATE);
		clearEventHandlers(EVENTS.WORLDSTATE);
		clearEventHandlers(EVENTS.LEADERBOARD);
		clearWorld();
		go("battleground", {});
	})

	onKeyDown("a", () => player.move(-SPEED, 0))
	onKeyDown("d", () => player.move(+SPEED, 0))
	onKeyDown("w", () => player.move(0, -SPEED))
	onKeyDown("s", () => player.move(0, +SPEED))
	onKeyDown("ф", () => player.move(-SPEED, 0))
	onKeyDown("в", () => player.move(+SPEED, 0))
	onKeyDown("ц", () => player.move(0, -SPEED))
	onKeyDown("ы", () => player.move(0, +SPEED))
})
// LEADERBOARD SCENE END ----------------------------------------------------------------------


// BATTLEGROUND SCENE START -------------------------------------------------------------------
scene('battleground', async () => {
	const user = getUser();
	currentRoom = ROOMS.battleGround;
	sendEvent(EVENTS.REGISTER, { ...user, room: currentRoom });
	camScale(1); // спорно

	const level = addLevel([
		"=======================================================",
		"=                                                     =",
		"=                                                     =",
		"=                                                     =",
		"=                                                     =",
		"=                                                     =",
		"=                                                     =",
		"=                                                     =",
		"=                                                     =",
		"=                                                     =",
		"=                                                     =",
		"=                                                     =",
		"=                                                     =",
		"=                                                     =",
		"=                                                     =",
		"=                                                     =",
		"=                                                     =",
		"=                                                     =",
		"=                                                     =",
		"=                                                     =",
		"=                                                     =",
		"=                                                     =",
		"=                                                     =",
		"=           $$$$                                      =",
		"=           $   $                                     =",
		"=           $    $                                    =",
		"=                                                     =",
		"=                                                     =",
		"=                                                     =",
		"=                                                     =",
		"=                                                     =",
		"======================================================="
	], {
		tileWidth: 64,
		tileHeight: 64,
		pos: vec2(32, 32),
		tiles: {
			"=": () => [
				sprite("grass"),
				area(),
				body({ isStatic: true }),
				anchor("center"),
			],
			"$": () => [
				sprite("shelter"),
				area(),
				body({ isStatic: true }),
				anchor("center"),
				"shelter",
			],
		},
	});

	let player = createPlayerObj(level);

	// подписываемся на все события
	subscribeToWorldState(level);
	startSendState();

	player.onUpdate(() => {
		camPos(player.worldPos())
	})
	player.onPhysicsResolve(() => {
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
		// const gameObj = createBulletObj(level, bulletState);
		// clientWorldState.bullets[bulletState.id] = {
		// 	id: bulletState.id,
		// 	gameObj: gameObj,
		// 	serverState: bulletState
		// };
	})

	// onCollide("bullet", "otherPlayer", (element1, element2) => {
	// 	let playerK, bulletK;
	// 	for (const playerId of Object.getOwnPropertyNames(clientWorldState.players)) {
	// 		const player = clientWorldState.players[playerId];
	// 		if (player.gameObj === element1) {
	// 			playerK = player
	// 			break;
	// 		}
	// 		if (player.gameObj === element2) {
	// 			playerK = player
	// 			break;
	// 		}
	// 	}
	// 	for (const bulletId of Object.getOwnPropertyNames(clientWorldState.bullets)) {
	// 		const bullet = clientWorldState.bullets[bulletId];
	// 		if (bullet.gameObj === element1) {
	// 			bulletK = bullet
	// 			break;
	// 		}
	// 		if (bullet.gameObj === element2) {
	// 			bulletK = bullet
	// 			break;
	// 		}
	// 	}
	// 	if (bulletK) {
	// 		bulletK.gameObj.use(sprite('hidden'));
	// 	}
	// 	if (!playerK || !bulletK) {
	// 		console.error('onCollide player-bullet error - entity not found', playerK, bulletK);
	// 		return;
	// 	}
	// 	sendEvent(EVENTS.COLLIDE, { playerId: playerK.id, bulletId: bulletK.id })
	// })
	onCollide("bullet", "shelter", (element1, element2) => {
		let shelterK, bulletK;
		for (const shelterId of Object.getOwnPropertyNames(clientWorldState.shelters)) {
			const shelter = clientWorldState.shelters[shelterId];
			if (shelter.gameObj === element1) {
				shelterK = shelter
				break;
			}
			if (shelter.gameObj === element2) {
				shelterK = shelter
				break;
			}
		}
		for (const bulletId of Object.getOwnPropertyNames(clientWorldState.bullets)) {
			const bullet = clientWorldState.bullets[bulletId];
			if (bullet.gameObj === element1) {
				bulletK = bullet
				break;
			}
			if (bullet.gameObj === element2) {
				bulletK = bullet
				break;
			}
		}
		if (bulletK) {
			bulletK.gameObj.use(sprite('hidden'));
		}
		if (!shelterK || !bulletK) {
			console.error('onCollide sheler-bullet error - entity not found', shelterK, bulletK);
			return;
		}
		sendEvent(EVENTS.COLLIDE, { shelterId: shelterK.id, bulletId: bulletK.id })
	})

	onKeyDown("a", () => player.move(-SPEED, 0))
	onKeyDown("d", () => player.move(+SPEED, 0))
	onKeyDown("w", () => player.move(0, -SPEED))
	onKeyDown("s", () => player.move(0, +SPEED))
	onKeyDown("ф", () => player.move(-SPEED, 0))
	onKeyDown("в", () => player.move(+SPEED, 0))
	onKeyDown("ц", () => player.move(0, -SPEED))
	onKeyDown("ы", () => player.move(0, +SPEED))
})
// BATTLEGROUND SCENE END -------------------------------------------------------------------


// LOSE SCENE ------------------------------------------------------------------------------->
scene("lose", (score) => {
	const startedAt = Date.now();

	add([
		sprite(globalPlayer.texture),
		pos(width() / 2, height() / 2 - 108),
		scale(3),
		anchor("center"),
	])

	// display score
	add([
		text(`Your score - ${globalPlayer.levelScore}`, { letterSpacing: 1 }),
		pos(width() / 2, height() / 2 + 108),
		scale(3),
		anchor("center"),
	])

	const WAIT_TIME = 5_000
	addButton("Leaderboard",
		vec2(width() / 2, height() / 2 + 208),
		() => {
			stopSendState();
			clearEventHandlers(EVENTS.PLAYERSTATE);
			clearEventHandlers(EVENTS.WORLDSTATE);
			clearEventHandlers(EVENTS.LEADERBOARD);
			clearWorld();
		go('leaderboard');
	})
	const battleButton = addButton("To Battle!", vec2(width() / 2, height() / 2 + 308), () => {
		const seconds = Math.ceil((WAIT_TIME - (Date.now() - startedAt)) / 1000);
		if (seconds > 0) return;
		stopSendState();
		clearEventHandlers(EVENTS.PLAYERSTATE);
		clearEventHandlers(EVENTS.WORLDSTATE);
		clearEventHandlers(EVENTS.LEADERBOARD);
		clearWorld();
		go('battleground');
	});
	battleButton.btnTxt.onUpdate(() => {
		const seconds = Math.ceil((WAIT_TIME - (Date.now() - startedAt)) / 1000);
		const text = seconds > 0 ? seconds : '';
		battleButton.btnTxt.text = `To Battle! ${text}`
	})

})
// LOSE SCENE -------------------------------------------------------------------------------<


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
	}, 500)
})

function start () {
	go('waitconnect');
}

start();
