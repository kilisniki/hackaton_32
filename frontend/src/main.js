import kaboom from "kaboom"

// СОКЕТЫ
const CLIENT_SCOKET = new WebSocket('ws://localhost:8080/');
// CLIENT_SCOKET.send("Here's some text that the server is urgently awaiting!");
CLIENT_SCOKET.onopen = (event) => {
	CLIENT_SCOKET.send("Here's some text that the server is urgently awaiting!");
};
CLIENT_SCOKET.onmessage = (event) => {
	// TODO здесь добавить switch case по эвентам
	const data = JSON.parse(event.data);
	console.log(data);
};

// РАЗРЫВ DISCONNECT
CLIENT_SCOKET.onerror = function(error) {
	// TODO здесь добавить обработку отрыва соединения
	alert(`[error]`);
};
CLIENT_SCOKET.onclose = function(event) {
	// TODO здесь добавить обработку отрыва соединения
	if (event.wasClean) {
		alert(`[close] Connection closed cleanly, code=${event.code} reason=${event.reason}`);
	} else {
		// e.g. server process killed or network down
		// event.code is usually 1006 in this case
		alert('[close] Connection died');
	}
};

// Start game
kaboom()


// ИНИЦИАЛИЗАЦИЯ ИГРЫ

// Load assets
loadSprite("bean", "/sprites/bean.png")
loadSprite("coin", "/sprites/coin.png")
loadSprite("grass", "/sprites/grass.png")
loadSound("score", "/examples/sounds/score.mp3")

const SPEED = 480

// Setup a basic level
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
	"=      @                      =",
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
			sprite("bean"),
			area(),
			body(),
			anchor("bot"),
			"player",
		],
		"=": () => [
			sprite("grass"),
			area(),
			body({ isStatic: true }),
			anchor("bot"),
		],
		"$": () => [
			sprite("coin"),
			area(),
			anchor("bot"),
			"coin",
		],
	},
});

const esb = {
	on: (event, func) => {}
}

esb.on('worldState', () => {})

// PLAYER BLOCK
// Get the player object from tag
const player = level.get("player")[0]

player.onUpdate(() => {
	// Set the viewport center to player.pos
	camPos(player.worldPos())
})

// PLAYER.camera BLOCK
camScale(1) // scale
player.onPhysicsResolve(() => {
	// Set the viewport center to player.pos
	camPos(player.worldPos())
})

onClick(() => {
	// Use toWorld() to transform a screen-space coordinate (like mousePos()) to the world-space coordinate, which has the camera transform applied
	addKaboom(toWorld(mousePos()))
})

player.onCollide("coin", (coin) => {
	destroy(coin)
	play("score")
	score++
	// Zoooom in!
	// camScale(2)
})

onKeyDown("left", () => player.move(-SPEED, 0))
onKeyDown("right", () => player.move(+SPEED, 0))
onKeyDown("up", () => player.move(0, -SPEED))
onKeyDown("down", () => player.move(0, +SPEED))


// UI BLOCK
let score = 0
// Add a ui layer with fixed() component to make the object not affected by camera
const ui = add([
	fixed(),
])
// Add a score counter
ui.add([
	text("0"),
	pos(12),
	{ update() { this.text = score } },
])
