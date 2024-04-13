import { createServer } from 'http';
import { readFileSync } from 'fs';
import { WebSocketServer } from 'ws';

const server = createServer({});
const wss = new WebSocketServer({ server });

wss.on('connection', function connection(ws) {
  ws.on('error', console.error);

  ws.on('message', function message(data) {
    console.log('received: %s', data);
  });

  ws.send(JSON.stringify({ myMessage: 'hello!' }));
});

server.listen(8080);
console.log('server listen 8080')
