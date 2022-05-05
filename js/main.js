'use strict'

const client_version = 'CV-000 [5-05-2022]';
console.log('CLIENT', client_version);

/*****************
 *  INTERFACE
 */

const clientsCounter = document.getElementById('clientsCounter');
const connectionId = document.getElementById('connectionId');

const directionSpan = document.getElementById('directionSpan');
const speedSpan = document.getElementById('speedSpan');

const serverSpeedSpan = document.getElementById('serverSpeedSpan');
const clientSpeedSpan = document.getElementById('clientSpeedSpan');

let connectionIs = false;
let myId;

let clientSocketTimeout = 20;
let serverSocketTimeout = 0;

/*****************
 *  CONTROLLERS
 */

const RAD = Math.PI / 180;

// turns and turn speed
let toLeftIs = false;
let toRightIs = false;
let turnSpeed = 1.5; // 0.5 -- 1 -- 1.5 -- 2.5 -- 4.5

// speed and acceleration
let minSpeed = 1;
let cruiseSpeed = 4
let maxSpeed = 9;
let accPass = 0.02;
let accHard = 0.05;
let accelerationIs = false;
let slowdownIs = false;

let myPlane;

let shiftLeftIs = false;
let shiftRightIs = false;

document.addEventListener('keydown', (event) => {
  switch(event.code) {
    case 'KeyA' : toLeftIs = true; break;
    case 'KeyD' : toRightIs = true; break;
    case 'KeyW' : accelerationIs = true; break;
    case 'KeyS' : slowdownIs = true; break;

    case 'ShiftLeft' : shiftLeftIs = true; break;
    case 'ShiftRight' : shiftRightIs = true; break;
  }
});

document.addEventListener('keyup', (event) => {
  switch(event.code) {
    case 'KeyA' : toLeftIs = false; break;
    case 'KeyD' : toRightIs = false; break;
    case 'KeyW' : accelerationIs = false; break;
    case 'KeyS' : slowdownIs = false; break;

    case 'ShiftLeft' : shiftLeftIs = false; break;
    case 'ShiftRight' : shiftRightIs = false; break;

    case 'NumpadAdd' : setSocketSpeedSubtract(); break;
    case 'Equal' : setSocketSpeedSubtract(); break;

    case 'NumpadSubtract' : setSocketSpeedAdd(); break;
    case 'Minus' : setSocketSpeedAdd(); break;
  }
  console.log('event.code', event.code);
});

/*****************
 *  CANVAS
 */

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const C_WIDTH = canvas.width = 1200;
const C_HEIGHT = canvas.height = 600;

const planeImage = new Image();
planeImage.src = './src/images/planes.png';

const planeFrames = 4;
const planeWidth = 100;
const planeHeight = 100;
const planeHalfWidth = 50;
const planeHalfHeight = 50;

class Plane {
  constructor(id) {
    this.id = id;
    this.x = (C_WIDTH / 2) - planeHalfWidth;
    this.y = C_HEIGHT + planeHalfHeight;
    this.direction = 270;
    this.speed = cruiseSpeed;
  }
};
let planesArr = [];

function drawPlane (image, frame, plane) {
  let {id, x, y, direction, speed } = plane;
  let frameY = (id != myId) ? planeHeight : 0;
  ctx.save();
  ctx.translate(x + planeHalfWidth, y + planeHalfHeight);
  ctx.rotate(direction * RAD);
  ctx.translate(-(x + planeHalfWidth), -(y + planeHalfHeight));
  ctx.drawImage(image, frame, frameY, planeWidth, planeHeight, x, y, planeWidth, planeHeight);
  ctx.restore();
}

let frame = 0;
const background = new Image();
background.src = './src/images/map.jpg';

function animate() {
  ctx.clearRect(0, 0, C_WIDTH, C_HEIGHT);
    
  if (connectionIs) {
    ctx.drawImage(background,0,0);

    let planeFrame = (frame % planeFrames) * planeWidth;
    planesArr.forEach( plane => drawPlane (planeImage, planeFrame, plane) );

    if (frame % 12 == 0) {
      clientsCounter.innerText = planesArr.length;
      directionSpan.innerHTML = myPlane.direction;
      speedSpan.innerHTML = Math.round(myPlane.speed * 50);

      serverSpeedSpan.innerText = serverSocketTimeout;
      clientSpeedSpan.innerText = clientSocketTimeout;
    }
  }

  frame++;
  window.requestAnimationFrame(animate);
}
animate();

/*****************
 *  CONNECTION
 */

// 'wss://mars-game-server.herokuapp.com'
// 'wss://mars-server-euro.herokuapp.com'
// 'ws://localhost:6789'
// 'ws://192.168.100.51:6789'
// 'ws://192.168.0.122:6789'
const socketURL = 'wss://mars-game-server.herokuapp.com';
let SOCKET;

function connection() {
  console.log('-- connection request --');

  let socket = new WebSocket(socketURL);

  socket.onopen = function () {
    console.log('-- socket on open-- ');
    socket.send(JSON.stringify({ action: 'connect' }));
  };
  
  socket.onmessage = function (message) {
    let { action, data } = JSON.parse(message.data);
    switch (action) {
      case 'connect' :
        SOCKET = socket;
        getConnect(data);
        break;
      case 'plane' : getPlane(data); break;
      case 'update' : getUpdate(data); break;
      default : getUnknownAction(action, data);
    }
  };
  
  socket.onclose = function(event) {
    if (event.wasClean) {
      console.group('-- socket on close --');
      console.log(' - clean close connection');
      console.log(' - code: ${event.code}');
      console.log(' - reason: ${event.reason}');
      console.groupEnd();
    } else {
      console.group('-- socket on close --');
      console.log(' - connection terminated:');
      console.log(' - ' + event);
      console.groupEnd();
    }
    setTimeout(connection, 5000);
  };
  
  socket.onerror = function(error) {
    console.group('-- socket on error --');
    console.log('connection error:');
    console.log(error);
    console.groupEnd();
  };

}
connection();

function getConnect(data) {
  myId = data;
  connectionId.innerText = data;
  myPlane = new Plane(myId);
  SOCKET.send(JSON.stringify({ action: 'plane', data: myPlane }));
  sendUpdate();
}

function getUpdate(data) {
  planesArr = data.planesArr;
  serverSocketTimeout = data.socketTimeout;
  
  if (planesArr.length > 0) connectionIs = true;
  else connectionIs = false;
}

function sendUpdate() {
  let { x, y, direction, speed } = myPlane;

  let turnAngle = (toLeftIs != toRightIs) ? (toLeftIs ? -turnSpeed : turnSpeed) : 0;
  if (turnAngle != 0) {
    direction = (360 + direction + turnAngle) % 360;
  }

  if (accelerationIs != slowdownIs) {
    if (accelerationIs) speed = (speed < maxSpeed) ? speed + accHard : maxSpeed;
    if (slowdownIs) speed = (speed > minSpeed) ? speed - accHard : minSpeed;
  } else if (speed != cruiseSpeed) {
    if (speed < cruiseSpeed) speed = ((speed + accPass) < cruiseSpeed) ? (speed + accPass) : cruiseSpeed;
    if (speed > cruiseSpeed) speed = ((speed - accPass) > cruiseSpeed) ? (speed - accPass) : cruiseSpeed;
  }

  let angle = RAD * direction;
  x += Math.cos(angle) * speed;
  y += Math.sin(angle) * speed;

  if (x > (C_WIDTH + planeHalfWidth)) x -= C_WIDTH + planeWidth;
  else if (x < -planeHalfWidth) x += C_WIDTH + planeWidth;

  if (y > (C_HEIGHT + planeHalfHeight)) y -= C_HEIGHT + planeWidth;
  else if (y < -planeHalfHeight) y += C_HEIGHT + planeWidth;

  myPlane = { id: myId, x: x, y: y, direction: direction, speed: speed }
  SOCKET.send(JSON.stringify({ action: 'update', data: myPlane }));

  setTimeout(sendUpdate, clientSocketTimeout);
}

function getUnknownAction(action, data) {
  console.group('-- unknown action --');
  console.log('action:', action);
  console.log(data);
  console.groupEnd();
}

//

function setSocketSpeedSubtract() {
  if (shiftLeftIs || shiftRightIs) {
    SOCKET.send(JSON.stringify({ action: 'setSocketSpeed', data: -1 }));
  } else {
    if (clientSocketTimeout > 2) clientSocketTimeout--;
  }
}

function setSocketSpeedAdd() {
  if (shiftLeftIs || shiftRightIs) {
    SOCKET.send(JSON.stringify({ action: 'setSocketSpeed', data: 1 }));
  } else {
    if (clientSocketTimeout < 1000) clientSocketTimeout++;
  }
}