'use strict'

const client_version = 'CV-016 [13-05-2022]';
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

const cloudImage = new Image();
cloudImage.src = './src/images/clouds.png';

const cloudWidth = 500;
const cloudHeight = 280;

let heighCloudsArr = [];
let lowCloudsArr = [];

class Cloud {
  constructor(frameX, frameY, speed, x, y) {
    this.frameX = frameX * cloudWidth;
    this.frameY = frameY * cloudHeight;
    this.speed = 1 + speed;
    this.x = x;
    this.y = y;
  }

  draw() {
    ctx.drawImage(cloudImage, this.frameX, this.frameY, cloudWidth, cloudHeight, this.x, this.y, cloudWidth, cloudHeight);
    this.x -= this.speed;
    if (this.x < -cloudWidth) this.x = C_WIDTH + cloudWidth;
  }
};

const smokeImage = new Image();
smokeImage.src = './src/images/smoke.png';

const smokeWidth = 100;
const smokeHeight = 100;
const smokeMaxFrame = smokeWidth * 10;

let smokeArr = [];

class Smoke {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.frame = 0;
    this.counter = 0;
    this.nextFrameCount = 6;
  }

  draw() {
    ctx.drawImage(smokeImage, this.frame, 0, smokeWidth, smokeHeight, this.x, this.y, smokeWidth, smokeHeight);
    this.counter++;
    if (this.counter === this.nextFrameCount) {
      this.counter = 0;
      this.frame += smokeWidth;
    }
  }
};

setTimeout(() => lowCloudsArr.push(new Cloud(0, 1, -1, C_WIDTH + cloudWidth, -90)), 600);
setTimeout(() => lowCloudsArr.push(new Cloud(1, 1, 0, C_WIDTH + cloudWidth, 90)), 2400);
setTimeout(() => lowCloudsArr.push(new Cloud(0, 1, +1, C_WIDTH + cloudWidth, 250)), 4800);
setTimeout(() => lowCloudsArr.push(new Cloud(1, 1, -1, C_WIDTH + cloudWidth, 430)), 7200);

setTimeout(() => heighCloudsArr.push(new Cloud(0, 0, +1, C_WIDTH + cloudWidth, -180)), 1800);
setTimeout(() => heighCloudsArr.push(new Cloud(1, 0, 0, C_WIDTH + cloudWidth, 20)), 3600);
setTimeout(() => heighCloudsArr.push(new Cloud(0, 0, 0, C_WIDTH + cloudWidth, 300)), 6000);
setTimeout(() => heighCloudsArr.push(new Cloud(1, 0, -1, C_WIDTH + cloudWidth, 550)), 8400);

function drawPlane (image, frame, plane) {
  let { id, x, y, direction, speed } = plane;
  let frameY = (id != myId) ? planeHeight : 0;

  let timeStamp = Date.now();
  let timeout = (lastUpdateTimeStamp) ? (timeStamp - lastUpdateTimeStamp) : 0;

  let currentSpeed = speed * timeout / updateTimeout;

  let angle = RAD * plane.direction;
  x += Math.cos(angle) * currentSpeed;
  y += Math.sin(angle) * currentSpeed;

  if (x > (C_WIDTH + planeWidth)) x -= C_WIDTH + planeWidth;
  else if (x < -planeWidth) x += C_WIDTH + planeWidth;

  if (y > (C_HEIGHT + planeHeight)) y -= C_HEIGHT + planeWidth;
  else if (y < -planeHeight) y += C_HEIGHT + planeWidth;
  
  ctx.save();
  ctx.translate(x + planeHalfWidth, y + planeHalfHeight);
  ctx.rotate(direction * RAD);
  ctx.translate(-(x + planeHalfWidth), -(y + planeHalfHeight));
  ctx.drawImage(image, frame, frameY, planeWidth, planeHeight, x, y, planeWidth, planeHeight);
  ctx.restore();

  if (id === myId) {
    myDirection = direction;
    mySpeed = speed;
  }

  if (frame % 12 === 0) smokeArr.push(new Smoke(x, y,));
}

let frame = 0;
const background = new Image();
background.src = './src/images/map.jpg';

function animate() {
  ctx.clearRect(0, 0, C_WIDTH, C_HEIGHT);
    
  if (connectionIs) {
    ctx.drawImage(background,0,0);

    lowCloudsArr.forEach( cloud => cloud.draw() );

    smokeArr.forEach( smoke => smoke.draw() );
    smokeArr = smokeArr.filter(item => item.frame < smokeMaxFrame);

    let planeFrame = (frame % planeFrames) * planeWidth;
    planesArr.forEach( plane => drawPlane (planeImage, planeFrame, plane) );

    heighCloudsArr.forEach( cloud => cloud.draw() );

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

function getUpdate(data) {
  planesArr = data.planesArr;
  lastUpdateTimeStamp = Date.now() - data.timeout;
  
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
