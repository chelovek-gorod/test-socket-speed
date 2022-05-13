'use strict'

const client_version = 'CV-010 [13-05-2022]';
console.log('CLIENT', client_version);

/*****************
 *  INTERFACE
 */

const clientsCounter = document.getElementById('clientsCounter');
const connectionId = document.getElementById('connectionId');

const directionSpan = document.getElementById('directionSpan');
const speedSpan = document.getElementById('speedSpan');

let connectionIs = false;
let myId;
let mySpeed = 0;
let myDirection = 0;

let updateTimeout;
let lastUpdateTimeStamp;
let timeout;

let testArr = [];

/*****************
 *  CONTROLLERS
 */

const RAD = Math.PI / 180;

// turns and turn speed
let toLeftIs = false;
let toRightIs = false;
let turnSpeed = 0.5; // 0.5 -- 1 -- 1.5 -- 2.5 -- 4.5

// speed and acceleration
let speedCountK = 100;
let minSpeed = 1;
let cruiseSpeed = 2;
let maxSpeed = 4;
let accPass = 0.01;
let accHard = 0.02;
let accelerationIs = false;
let slowdownIs = false;

let myPlane;

document.addEventListener('keydown', (event) => {
  switch(event.code) {
    case 'KeyA' : toLeftIs = true; break;
    case 'KeyD' : toRightIs = true; break;
    case 'KeyW' : accelerationIs = true; break;
    case 'KeyS' : slowdownIs = true; break;
  }
});

document.addEventListener('keyup', (event) => {
  switch(event.code) {
    case 'KeyA' : toLeftIs = false; break;
    case 'KeyD' : toRightIs = false; break;
    case 'KeyW' : accelerationIs = false; break;
    case 'KeyS' : slowdownIs = false; break;
  }
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

let planesArr = [];

function drawPlane (image, frame, plane) {
  let { id, x, y, direction } = plane;
  let frameY = (id != myId) ? planeHeight : 0;
  
  ctx.save();
  ctx.translate(x + planeHalfWidth, y + planeHalfHeight);
  ctx.rotate(direction * RAD);
  ctx.translate(-(x + planeHalfWidth), -(y + planeHalfHeight));
  ctx.drawImage(image, frame, frameY, planeWidth, planeHeight, x, y, planeWidth, planeHeight);
  ctx.restore();

  if (id === myId) {
    myDirection = direction;
    mySpeed = plane.speed;
  }
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
      directionSpan.innerHTML = myDirection;
      speedSpan.innerHTML = Math.round(mySpeed * speedCountK);
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
const socketURL = 'wss://mars-server-euro.herokuapp.com';
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
  planesArr = data.planesArr;
  updateTimeout = data.updateTimeout;
  myId = data.id;
  connectionId.innerText = myId;
  setInterval(sendUpdate, updateTimeout * 2);
}

function updatePlane(plane, timeout) {
  let currentSpeed = plane.speed * timeout / updateTimeout;

  let angle = RAD * plane.direction;
  plane.x += Math.cos(angle) * currentSpeed;
  plane.y += Math.sin(angle) * currentSpeed;

  if (plane.x > (C_WIDTH + planeHalfWidth)) plane.x -= C_WIDTH + planeWidth;
  else if (plane.x < -planeHalfWidth) plane.x += C_WIDTH + planeWidth;

  if (plane.y > (C_HEIGHT + planeHalfHeight)) plane.y -= C_HEIGHT + planeWidth;
  else if (plane.y < -planeHalfHeight) plane.y += C_HEIGHT + planeWidth;
}

function getUpdate(data) {
  planesArr = data.planesArr;
  let timeStamp = Date.now();
  timeout = (lastUpdateTimeStamp) ? data.timeout + (timeStamp - lastUpdateTimeStamp) : data.timeout;
  lastUpdateTimeStamp = timeStamp;
  
  planesArr.forEach(plane => updatePlane(plane, timeout));
  testArr.push({ timeout : timeout, planesArr : planesArr });
  if(testArr.length % 1000 === 0) console.log(testArr);
  
  if (planesArr.length > 0) connectionIs = true;
  else connectionIs = false;
}

function sendUpdate() {
  let directionChanging = (toLeftIs != toRightIs) ? (toLeftIs ? -1 : 1) : 0;
  let speedChanging = (accelerationIs != slowdownIs) ? (slowdownIs ? -1 : 1) : 0;

  if (directionChanging !== 0 || speedChanging !== 0) {
    SOCKET.send(JSON.stringify({ action: 'update', data: { id : myId, directionChanging : directionChanging, speedChanging : speedChanging } }));
  }
}

function getUnknownAction(action, data) {
  console.group('-- unknown action --');
  console.log('action:', action);
  console.log(data);
  console.groupEnd();
}