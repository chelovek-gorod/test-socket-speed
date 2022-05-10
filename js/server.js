'use strict';

const updateTimeout = 10; 
let lastUpdateTimeStamp = updateTimeout;

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
let cruiseSpeed = 4
let maxSpeed = 9;
let accPass = 0.02;
let accHard = 0.05;
let turnSpeed = 1.0; // 0.5 -- 1 -- 1.5 -- 2.5 -- 4.5

class Plane {
  constructor(id) {
    this.id = id;
    this.x = (C_WIDTH / 2) - planeHalfWidth;
    this.y = C_HEIGHT + planeHalfHeight;
    this.direction = 270;
    this.speed = cruiseSpeed;

    this.directionChanging = 0; // -1; 0; +1
    this.speedChanging = 0; // -1; 0; +1
  }

  update(delay) {
    if (this.directionChanging != 0) {
      direction = (360 + direction + this.directionChanging * turnSpeed) % 360;
    }
  
    if (this.speedChanging != 0) {
      if (this.speedChanging > 0) this.speed = (this.speed < maxSpeed) ? this.speed + accHard : maxSpeed;
      else this.speed = (this.speed > minSpeed) ? this.speed - accHard : minSpeed;
    } else if (this.speed != cruiseSpeed) {
      if (this.speed < cruiseSpeed) this.speed = ((this.speed + accPass) < cruiseSpeed) ? (this.speed + accPass) : cruiseSpeed;
      if (this.speed > cruiseSpeed) this.speed = ((this.speed - accPass) > cruiseSpeed) ? (this.speed - accPass) : cruiseSpeed;
    }
  
    let currentSpeed = this.speed * delay / updateTimeout;
  
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
const lastUpdateDate = 'SV-001 [10-05-2022]';

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
      case 'plane' : getPlane(data); break;
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
console.log(`last update date is ${lastUpdateDate}`);

function getConnect(clientSocket) {
  let id = getId();

  let client = new Client(id, clientSocket);
  clientsArr.push(client);

  let data = {
    id : id,
    updateTimeout : updateTimeout
  }

  clientSocket.send(JSON.stringify({ action: 'connect', data: data }));
}

function getPlane(data) {
  planesArr.push(data);
}

function getUpdate(data) {
  let targetPlane = planesArr.find(plane => plane.id == data.id);
  targetPlane.x = data.x;
  targetPlane.y = data.y;
  targetPlane.direction = data.direction;
  targetPlane.speed = data.speed;
}

function updateLoop() {
  let timeStamp = Date.now();
  let delay = (lastUpdateTimeStamp) ? timeStamp - lastUpdateTimeStamp : 0;
  lastUpdateTimeStamp = timeStamp;

  planesAr.forEach( plane => plane.update(delay));

  let message = JSON.stringify({
    action: 'update',
    data: {
      planesArr: planesArr,
      delay: delay
    } });
  clientsArr.forEach( client => client.socket.send(message) );

  //setTimeout(updateLoop, updateTimeout);
}
//updateLoop();
setInterval(updateLoop, updateTimeout);

function getUnknownAction(action, data) {
  console.log('-- WRONG ACTION --');
  console.log(`action: ${action}; data:`);
  console.log(data);
  console.log('-- -- --');
}