'use strict';

const lastUpdateDate = 'SV-010 [13-05-2022]';
console.log(`last update date is ${lastUpdateDate}`);

const updateTimeout = 5; 
let lastUpdateTimeStamp;

/*****************
 *  CLIENTS
 */

class Client {
  constructor(id, socket) {
    this.id = id;
    this.socket = socket;
  }
};
let clientsArr = [];

function countId() {
  let counter = 0;
  return function() {
    return counter++;
  }
}
var getId = countId();

/*****************
 *  PLANES
 */

const RAD = Math.PI / 180;

const C_WIDTH = 1200;
const C_HEIGHT = 600;

const planeWidth = 100;
const planeHeight = 100;
const planeHalfWidth = 50;
const planeHalfHeight = 50;

// speed and acceleration
let minSpeed = 1;
let cruiseSpeed = 2;
let maxSpeed = 4;
let accPass = 0.01;
let accHard = 0.02;
let turnSpeed = 0.5; // 0.5 -- 1 -- 1.5 -- 2.5 -- 4.5

class Plane {
  constructor(id) {
    this.id = id;
    this.x = (C_WIDTH / 2) - planeHalfWidth;
    this.y = C_HEIGHT + planeHalfHeight;
    this.direction = 270;
    this.speed = cruiseSpeed;
    this.speedChange = false;
  }

  update(timeout) {
    if (this.speedChange) this.speedChange = false;
    else if (this.speed != cruiseSpeed) {
      if (this.speed < cruiseSpeed) this.speed = ((this.speed + accPass) < cruiseSpeed) ? (this.speed + accPass) : cruiseSpeed;
      if (this.speed > cruiseSpeed) this.speed = ((this.speed - accPass) > cruiseSpeed) ? (this.speed - accPass) : cruiseSpeed;
    }

    let currentSpeed = this.speed * timeout / updateTimeout;
  
    let angle = RAD * this.direction;
    this.x += Math.cos(angle) * currentSpeed;
    this.y += Math.sin(angle) * currentSpeed;
  
    if (this.x > (C_WIDTH + planeHalfWidth)) this.x -= C_WIDTH + planeWidth;
    else if (this.x < -planeHalfWidth) this.x += C_WIDTH + planeWidth;
  
    if (this.y > (C_HEIGHT + planeHalfHeight)) this.y -= C_HEIGHT + planeWidth;
    else if (this.y < -planeHalfHeight) this.y += C_HEIGHT + planeWidth;
  }
};

let planesArr = [];

/*****************
 *  CONNECTION
 */

const WebSocket = require('ws');

const usedPort = process.env.PORT || 6789;
const socketServer = new WebSocket.Server({ port: usedPort });
socketServer.on('connection', onConnect);

// IF NEW CONNECTION
function onConnect(clientSocket) {
  console.log('-- get new connection --');

  clientSocket.on('message', function (message) {
    let { action, data } = JSON.parse(message);
    switch (action) {
      case 'connect' : getConnect(clientSocket); break;
      case 'update' : getUpdate(data); break;
      default : getUnknownAction(action, data);
    }
  });

  clientSocket.on('close', function () {
    let disconnectedClient = clientsArr.find(client => client.socket === clientSocket);

    planesArr = planesArr.filter(plane => plane.id !== disconnectedClient.id);
    clientsArr = clientsArr.filter(client => client.socket !== clientSocket);

    let message = JSON.stringify({ action: 'out', data: disconnectedClient.id });
    clientsArr.forEach(client => client.socket.send(message));

    console.log(`-- client with id ${disconnectedClient.id} disconnect`);
  });

}
// SERVER START CONSOLE INFO
console.log(`server start on port ${usedPort}`);

function getConnect(clientSocket) {
  let id = getId();

  let client = new Client(id, clientSocket);
  clientsArr.push(client);

  let plane = new Plane(id);
  planesArr.push(plane);

  let data = {
    id : id,
    updateTimeout : updateTimeout,
    planesArr : planesArr
  }

  clientSocket.send(JSON.stringify({ action: 'connect', data: data }));
}

function getUpdate(data) {
  let targetPlane = planesArr.find(plane => plane.id == data.id);
  
  if (data.directionChanging != 0) {
    targetPlane.direction = (360 + targetPlane.direction + data.directionChanging * turnSpeed) % 360;
  }

  if (data.speedChanging != 0) {
    targetPlane.speedChange = true;
    if (data.speedChanging > 0) targetPlane.speed = (targetPlane.speed < maxSpeed) ? targetPlane.speed + accHard : maxSpeed;
    else targetPlane.speed = (targetPlane.speed > minSpeed) ? targetPlane.speed - accHard : minSpeed;
  }
}

function updateLoop() {
  let timeStamp = Date.now();
  let timeout = (lastUpdateTimeStamp) ? timeStamp - lastUpdateTimeStamp : 10;
  lastUpdateTimeStamp = timeStamp;

  planesArr.forEach( plane => plane.update(timeout));

  let message = JSON.stringify({
    action: 'update',
    data: {
      planesArr: planesArr,
      timeout: timeout
    } });
  clientsArr.forEach( client => client.socket.send(message) );
}
setInterval(updateLoop, updateTimeout);

function getUnknownAction(action, data) {
  console.log('-- WRONG ACTION --');
  console.log(`action: ${action}; data:`);
  console.log(data);
  console.log('-- -- --');
}