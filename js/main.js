'use strict'

const client_version = 'CV-019 [14-05-2022]';
console.log('CLIENT', client_version);

/*****************
 *  MUSIC
 */

const propellerSound1 = new Audio();
const propellerSound2 = new Audio();
propellerSound1.src = propellerSound2.src = './src/sounds/propeller.mp3';

document.body.onclick = function() {
  propellerSound1.play();
  setTimeout(() => propellerSound2.play(), 9000);
};

propellerSound1.addEventListener('ended', () => {
  propellerSound1.play();
});

propellerSound2.addEventListener('ended', () => {
  propellerSound2.play();
});

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

let clouds64ReadyIs = false;
let clouds83ReadyIs = false;

const cloudImage64 = new Image();
cloudImage64.src = './src/images/clouds_64.png';

const cloud64Width = 600;
const cloud64Height = 400;
const cloud64HalfWidth = 300;
const cloud64HalfHeight = 200;

const cloudImage83 = new Image();
cloudImage83.src = './src/images/clouds_83.png';

const cloud83Width = 800;
const cloud83Height = 300;
const cloud83HalfWidth = 400;
const cloud83HalfHeight = 150;

let heighCloudsArr = [];
let lowCloudsArr = [];

class Cloud {
  constructor(type, img, speed, x, y) {
    this.img = (type === 64) ? cloudImage64 : cloudImage83;
    this.frameX = img * ((type === 64) ? cloud64Width : cloud83Width);
    this.frameY = getRandomInt(2) * ((type === 64) ? cloud64Height : cloud83Height);
    this.width = (type === 64) ? cloud64Width : cloud83Width;
    this.height = (type === 64) ? cloud64Height : cloud83Height;
    this.x = x - ((type === 64) ? cloud64HalfWidth : cloud83HalfWidth);
    this.y = y - ((type === 64) ? cloud64HalfHeight : cloud83HalfHeight);
    this.speed = speed;
  }

  draw() {
    ctx.drawImage(this.img, this.frameX, this.frameY, this.width, this.height, this.x, this.y, this.width, this.height);
    this.x -= this.speed;
    if (this.x < -this.width) this.x = C_WIDTH;
  }
};

const smokeImage = new Image();
smokeImage.src = './src/images/smoke32_10x8.png';

const smokeWidth = 32;
const smokeHeight = 32;
const smokeStepsX = 10;
const smokeStepsY = 8;

let smokeArr = [];

class Smoke {
  constructor(x, y) {
    this.x = (x - 16.5) | 0;  
    this.y = (y - 16.5) | 0;
    this.frameX = 0;
    this.frameY = 0;
    this.maxFrameX = smokeWidth * smokeStepsX;
    this.maxFrameY = smokeHeight * smokeStepsY;
  }

  draw() {
    ctx.drawImage(smokeImage, this.frameX, this.frameY, smokeWidth, smokeHeight, this.x, this.y, smokeWidth, smokeHeight);
    if (frame % 3 === 0) {
      this.frameX += smokeWidth;

      if (this.frameX === this.maxFrameX) {
        this.frameX = 0;
        this.frameY += smokeHeight;
      }
    }
  }
};

// constructor(type, img, speed, x, y)
lowCloudsArr.push(new Cloud(64, 0, .2, 110, 0));
lowCloudsArr.push(new Cloud(83, 1, .3, 990, 330));
lowCloudsArr.push(new Cloud(64, 2, .5, 880, 550));
lowCloudsArr.push(new Cloud(83, 3, .4, 330, 110));
lowCloudsArr.push(new Cloud(64, 4, .2, 1200, 440));
lowCloudsArr.push(new Cloud(83, 5, .3, 220, 220));

heighCloudsArr.push(new Cloud(83, 0, .5, 550, 385));
heighCloudsArr.push(new Cloud(64, 1, .4, 1100, 165));
heighCloudsArr.push(new Cloud(83, 2, .2, 440, 495));
heighCloudsArr.push(new Cloud(64, 3, .3, 770, 275));
heighCloudsArr.push(new Cloud(83, 4, .5, 0, 600));
heighCloudsArr.push(new Cloud(64, 5, .4, 660, 55));

function getRandomInt(size) {
  return Math.floor(Math.random() * size);
}

function drawPlane (image, frame, plane) {
  let { id, x, y, direction, speed } = plane;
  let frameY = (id != myId) ? planeHeight : 0;

  let timeStamp = Date.now();
  let timeout = (lastUpdateTimeStamp) ? (timeStamp - lastUpdateTimeStamp) : 0;

  let currentSpeed = speed * timeout / updateTimeout;

  let angle = RAD * plane.direction;
  x += Math.cos(angle) * currentSpeed;
  y += Math.sin(angle) * currentSpeed;
  /*
  x = ~~ (0.5 + x);
  y = ~~ (0.5 + y);
  */
  x = (0.5 + x) | 0;
  y = (0.5 + y) | 0;

  if (x > (C_WIDTH + planeWidth)) x -= C_WIDTH + planeWidth;
  else if (x < -planeWidth) x += C_WIDTH + planeWidth;

  if (y > (C_HEIGHT + planeHeight)) y -= C_HEIGHT + planeWidth;
  else if (y < -planeHeight) y += C_HEIGHT + planeWidth;
  
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(direction * RAD);
  ctx.translate(-(x), -(y));
  ctx.drawImage(image, frame, frameY, planeWidth, planeHeight, x - planeHalfWidth, y - planeHalfHeight, planeWidth, planeHeight);
  ctx.restore();

  if (id === myId) {
    myDirection = direction;
    mySpeed = speed;
  }

  if (frame % 2 === 0) smokeArr.push(new Smoke(x, y));
}

let frame = 0;
const background = new Image();
background.src = './src/images/map.jpg';

function animate() {
  ctx.clearRect(0, 0, C_WIDTH, C_HEIGHT);
    
  if (connectionIs) {
    //ctx.drawImage(background,0,0);

    lowCloudsArr.forEach( cloud => cloud.draw() );

    smokeArr.forEach( smoke => smoke.draw() );
    smokeArr = smokeArr.filter(item => item.frameY < item.maxFrameY);

    let planeFrame = (frame % planeFrames) * planeWidth;
    planesArr.forEach( plane => drawPlane (planeImage, planeFrame, plane) );

    heighCloudsArr.forEach( cloud => cloud.draw() );

    if (frame % 6 == 0) {
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
