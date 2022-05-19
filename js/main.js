'use strict'

const client_version = 'CV-000 [19-05-2022]';
console.log('CLIENT', client_version);

/*****************
 *  TEST
 */

let testArr = [];
let testTimeStamp;

function test() {
  let time = Date.now();
  if (testTimeStamp) testArr.push(time - testTimeStamp);
  testTimeStamp = time;
  let testArrSize = testArr.length;
  if (testArrSize > 9999) {
    let min = Infinity;
    let max = 0;
    let sum = 0;
    testArr.forEach(value => {
      if (value < min) min = value;
      if (value > max) max = value;
      sum += value;
    });
    let mid = Math.ceil(sum / testArrSize);
    console.log(`TEST: min = ${min}; mid = ${mid}; max = ${max}; (count timeout = ${Date.now() - time})`);
    testArr = [];
  }
}

/*****************
 *  MUSIC
 */

const propellerSound1 = new Audio();
const propellerSound2 = new Audio();
propellerSound1.src = propellerSound2.src = './src/sounds/propeller.mp3';

// document.body.onclick = startPlaneSound;

function startPlaneSound () {
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
const hpSpan = document.getElementById('hpSpan');
const missilesSpan = document.getElementById('missilesSpan');

let connectionIs = false;
let myId;
let mySpeed = 0;
let myDirection = 0;
let myHP = 0;
let myMissiles;

let updateTimeout;
let lastUpdateTimeStamp;
let timeStamp;
let timeout;
let speedModifier;

/*****************
 *  CONTROLLERS
 */

const RAD = Math.PI / 180;

// turns and turn speed
let toLeftIs = false;
let toRightIs = false;
let turnSpeed = 0.5; // 0.5 -- 1 -- 1.5 -- 2.5 -- 4.5

// speed and acceleration
let RealSpeedRatio = 100;
let minSpeed = 1;
let cruiseSpeed = 2;
let maxSpeed = 4;
let accPass = 0.01;
let accHard = 0.02;
let accelerationIs = false;
let slowdownIs = false;

// missiles shut
let missileLaunchIs = false;

// missiles shut
let shootingIs = false;

document.addEventListener('keydown', (event) => {
  switch(event.code) {
    case 'KeyA' : toLeftIs = true; break;
    case 'KeyD' : toRightIs = true; break;
    case 'KeyW' : accelerationIs = true; break;
    case 'KeyS' : slowdownIs = true; break;

    case 'ArrowLeft' : toLeftIs = true; break;
    case 'ArrowRight' : toRightIs = true; break;
    case 'ArrowUp' : accelerationIs = true; break;
    case 'ArrowDown' : slowdownIs = true; break;

    case 'Space' : shootingIs = true; break;
  }
});

document.addEventListener('keyup', (event) => {
  switch(event.code) {
    case 'KeyA' : toLeftIs = false; break;
    case 'KeyD' : toRightIs = false; break;
    case 'KeyW' : accelerationIs = false; break;
    case 'KeyS' : slowdownIs = false; break;

    case 'ArrowLeft' : toLeftIs = false; break;
    case 'ArrowRight' : toRightIs = false; break;
    case 'ArrowUp' : accelerationIs = false; break;
    case 'ArrowDown' : slowdownIs = false; break;

    case 'ControlRight' : missileLaunchIs = true; break;
    case 'ControlLeft' : missileLaunchIs = true; break;

    case 'Space' : shootingIs = false; break;
  }
  console.log('keypress', event.code);
});

/*****************
 *  CANVAS
 */

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const C_WIDTH = canvas.width = 1200;
const C_HEIGHT = canvas.height = 600;

// PLANE

const planeImage = new Image();
planeImage.src = './src/images/planes.png';

const planeFrames = 4;
const planeWidth = 100;
const planeHeight = 100;
const planeHalfWidth = 50;
const planeHalfHeight = 50;

const planeWidthWithC = C_WIDTH + planeWidth;
const planeHeightWithC = C_HEIGHT + planeHeight;

let planesArr = [];

// MISSILE

const missileImage = new Image();
missileImage.src = './src/images/missile40.png';

const missileWidth = 40;
const missileHeight = 40;
const missileHalfWidth = 20;
const missileHalfHeight = 20;

let missilesArr = [];

// BULLET

const bulletImage = new Image();
bulletImage.src = './src/images/bullet8.png';

const bulletWidth = 4;
const bulletHeight = 4;
const bulletHalfWidth = 2;
const bulletHalfHeight = 2;

let bulletsArr = [];

// CLOUDS

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

function setClouds() {
  // constructor(type, img, speed, x, y)
  lowCloudsArr.push(new Cloud(64, 0, 0.2, 0, 240));
  lowCloudsArr.push(new Cloud(64, 1, 0.3, 240, 360));
  lowCloudsArr.push(new Cloud(64, 2, 0.5, 480, 0));
  lowCloudsArr.push(new Cloud(64, 3, 0.4, 720, 120));
  lowCloudsArr.push(new Cloud(64, 4, 0.2, 960, 600));
  lowCloudsArr.push(new Cloud(64, 5, 0.3, 1200, 480));

  heighCloudsArr.push(new Cloud(83, 0, 0.5, 120, 60));
  heighCloudsArr.push(new Cloud(83, 1, 0.4, 360, 590));
  heighCloudsArr.push(new Cloud(83, 2, 0.2, 840, 420));
  heighCloudsArr.push(new Cloud(83, 3, 0.3, 1180, 180));
}
setClouds();

function getRandomInt(size) {
  return Math.floor(Math.random() * size);
}

// SMOKE

const smokeImage = new Image();
smokeImage.src = './src/images/smoke32_10x8.png';

const smokeGrayImage = new Image();
smokeGrayImage.src = './src/images/smoke_gray32_10x8.png';

const smokeDarkImage = new Image();
smokeDarkImage.src = './src/images/smoke_dark32_10x8.png';

const smokeWidth = 32;
const smokeHeight = 32;
const smokeStepsX = 10;
const smokeStepsY = 8;

let smokeArr = [];

class Smoke {

  constructor(x, y, image) {
    this.image = image
    this.x = x - 16; // (x - 15.5) | 0;  
    this.y = y - 16; // (y - 15.5) | 0;
    this.frameX = 0;
    this.frameY = 0;
    this.maxFrameX = smokeWidth * smokeStepsX;
    this.maxFrameY = smokeHeight * smokeStepsY;
  }

  draw() {
    ctx.drawImage(this.image, this.frameX, this.frameY, smokeWidth, smokeHeight, this.x, this.y, smokeWidth, smokeHeight);
    if (frame % 3 === 0) {
      this.frameX += smokeWidth;

      if (this.frameX === this.maxFrameX) {
        this.frameX = 0;
        this.frameY += smokeHeight;
      }
    }
  }

};

// MISSILE SMOKE

const missileSmokeImage = new Image();
missileSmokeImage.src = './src/images/smoke16_10x8.png';

const missileSmokeWidth = 16;
const missileSmokeHeight = 16;
const missileSmokeStepsX = 10;
const missileSmokeStepsY = 8;

let missileSmokeArr = [];

class MissileSmoke {

  constructor(x, y) {
    this.x = x - 8; // (x - 7.5) | 0;  
    this.y = y - 8; // (y - 7.5) | 0;
    this.frameX = 0;
    this.frameY = 0;
    this.maxFrameX = missileSmokeWidth * missileSmokeStepsX;
    this.maxFrameY = missileSmokeHeight * missileSmokeStepsY;
  }

  draw() {
    ctx.drawImage(missileSmokeImage, this.frameX, this.frameY, missileSmokeWidth, missileSmokeHeight, this.x, this.y, missileSmokeWidth, missileSmokeHeight);

    this.frameX += missileSmokeWidth;

    if (this.frameX === this.maxFrameX) {
      this.frameX = 0;
      this.frameY += missileSmokeHeight;
    }
  }

};

// EXPLOSION

const explosionImage = new Image();
explosionImage.src = './src/images/explosion256_8x8.png';

const explosionWidth = 256;
const explosionHeight = 256;
const explosionStepsX = 8;
const explosionStepsY = 8;

let explosionsArr = [];

class Explosion {

  constructor(x, y) {
    this.x = x - 128; // (x - 127.5) | 0;  
    this.y = y - 128; // (y - 127.5) | 0;
    this.frameX = 0;
    this.frameY = 0;
    this.maxFrameX = explosionWidth * explosionStepsX;
    this.maxFrameY = explosionHeight * explosionStepsY;
  }

  draw() {
    ctx.drawImage(explosionImage, this.frameX, this.frameY, explosionWidth, explosionHeight, this.x, this.y, explosionWidth, explosionHeight);

    this.frameX += explosionWidth;

    if (this.frameX === this.maxFrameX) {
      this.frameX = 0;
      this.frameY += explosionHeight;
    }
  }

};

// SPARKS

const sparkImage = new Image();
sparkImage.src = './src/images/sparks32.png';

const sparkWidth = 32;
const sparkHeight = 32;
const sparkStepsX = 9;

let sparksArr = [];

class Spark {

  constructor(x, y) {
    this.x = x - 16; // (x - 127.5) | 0;  
    this.y = y - 16; // (y - 127.5) | 0;
    this.frameX = 0;
    this.maxFrameX = explosionWidth * explosionStepsX;
  }

  draw() {
    ctx.drawImage(sparkImage, this.frameX, 0, sparkWidth, sparkHeight, this.x, this.y, sparkWidth, sparkHeight);

    this.frameX += sparkWidth;
  }

};

// DRAW

function drawPlane (plane, frame) {
  let { id, x, y, direction, angle, angleX, angleY, speed, hp, half_hp, low_hp, missiles } = plane;
  let frameY = planeHeight;

  let currentSpeed = speed * speedModifier;

  x += angleX * currentSpeed;
  y += angleY * currentSpeed;
  /*
  x = ~~ (0.5 + x);
  y = ~~ (0.5 + y);
  
  x = (0.5 + x) | 0;
  y = (0.5 + y) | 0;
  */
  if (x > (planeWidthWithC)) x -= planeWidthWithC;
  else if (x < -planeWidth) x += planeWidthWithC;

  if (y > (planeHeightWithC)) y -= planeHeightWithC;
  else if (y < -planeHeight) y += planeHeightWithC;

  if (id === myId) {
    frameY = 0;
    myDirection = direction;
    mySpeed = speed;
    myHP = hp;
    myMissiles = missiles;
  }
  
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.translate(-(x), -(y));
  ctx.drawImage(planeImage, frame, frameY, planeWidth, planeHeight, x - planeHalfWidth, y - planeHalfHeight, planeWidth, planeHeight);
  ctx.restore();

  let smokeImg = (hp > half_hp) ? smokeImage : (hp > low_hp) ? smokeGrayImage : smokeDarkImage;
  smokeArr.push(new Smoke(x, y, smokeImg));
}

function drawMissile(missile) {
  let { x, y, angle, angleX, angleY, speed } = missile;

  missileSmokeArr.push(new MissileSmoke(x, y));

  let currentSpeed = speed * speedModifier;

  x += angleX * currentSpeed;
  y += angleY * currentSpeed;
  /*
  x = ~~ (0.5 + x);
  y = ~~ (0.5 + y);
  
  x = (0.5 + x) | 0;
  y = (0.5 + y) | 0;
  */
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.translate(-(x), -(y));
  ctx.drawImage(missileImage, 0, 0, missileWidth, missileHeight, x - missileHalfWidth, y - missileHalfHeight, missileWidth, missileHeight);
  ctx.restore();

  missileSmokeArr.push(new MissileSmoke(x, y));
}

function drawBullet(bullet) {
  let { x, y, angleX, angleY, speed } = bullet;

  let currentSpeed = speed * speedModifier;

  x += angleX * currentSpeed;
  y += angleY * currentSpeed;
  /*
  x = ~~ (0.5 + x);
  y = ~~ (0.5 + y);
  
  x = (0.5 + x) | 0;
  y = (0.5 + y) | 0;
  */
  ctx.drawImage(bulletImage, 0, 0, bulletWidth, bulletHeight, x - bulletHalfWidth, y - bulletHalfHeight, bulletWidth, bulletHeight);
}

// ANIMATE 

let frame = 0;

function animate() {
  ctx.clearRect(0, 0, C_WIDTH, C_HEIGHT);
    
  if (connectionIs) {

    timeStamp = Date.now();
    timeout = (lastUpdateTimeStamp) ? (timeStamp - lastUpdateTimeStamp) : 0;
    speedModifier = timeout / updateTimeout;

    lowCloudsArr.forEach( cloud => cloud.draw() );

    missileSmokeArr = missileSmokeArr.filter(item => item.frameY < item.maxFrameY);
    missileSmokeArr.forEach( missileSmoke => missileSmoke.draw() );

    missilesArr.forEach( missile => drawMissile(missile) );

    bulletsArr.forEach( bullet => drawBullet(bullet) );

    smokeArr = smokeArr.filter(item => item.frameY < item.maxFrameY);
    smokeArr.forEach( smoke => smoke.draw() );

    explosionsArr = explosionsArr.filter(item => item.frameY < item.maxFrameY);
    explosionsArr.forEach( explosion => explosion.draw() );

    let planeFrame = (frame % planeFrames) * planeWidth;
    planesArr.forEach( plane => drawPlane (plane, planeFrame) );

    heighCloudsArr.forEach( cloud => cloud.draw() );
 
    sparksArr = sparksArr.filter(item => item.frameX < item.maxFrameX);
    sparksArr.forEach( spark => spark.draw() );

    if (frame % 12 == 0) {
      clientsCounter.innerText = planesArr.length;
      directionSpan.innerHTML = Math.round((360 + myDirection) % 360);
      speedSpan.innerHTML = Math.round(mySpeed * RealSpeedRatio);
      hpSpan.innerHTML = myHP;
      missilesSpan.innerHTML = myMissiles;
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

// user key generator
const myKey = Math.floor(Math.random() * (9999 - 1000)) + 1000;

function connection() {
  console.log('-- connection request --');

  let socket = new WebSocket(socketURL);

  socket.onopen = function () {
    console.log('-- socket on open-- ');
    socket.send(JSON.stringify({ action: 'connect', data: myKey }));
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
  setInterval(sendUpdate, updateTimeout);
}

function getUpdate(data) {
  planesArr = data.planesArr;
  missilesArr = data.missilesArr;
  bulletsArr = data.bulletsArr;
  data.explosionsArr.forEach(explosion => explosionsArr.push(new Explosion(explosion.x, explosion.y)));
  data.sparksArr.forEach(spark => sparksArr.push(new Spark(spark.x, spark.y)));
  lastUpdateTimeStamp = Date.now() - data.timeout;

  test();

  if (planesArr.length > 0) connectionIs = true;
  else connectionIs = false;
}

function sendUpdate() {
  let directionChanging = (toLeftIs != toRightIs) ? (toLeftIs ? -1 : 1) : 0;
  let speedChanging = (accelerationIs != slowdownIs) ? (slowdownIs ? -1 : 1) : 0;

  if (directionChanging !== 0 || speedChanging !== 0 || missileLaunchIs || shootingIs) {
    SOCKET.send(JSON.stringify({ action: 'update',
      data: {
        id : myId,
        key : myKey,
        directionChanging : directionChanging,
        speedChanging : speedChanging,
        missileLaunchIs : missileLaunchIs,
        shootingIs : shootingIs
      }
    }));

    if (missileLaunchIs) missileLaunchIs = false;
  }
}

function getUnknownAction(action, data) {
  console.group('-- unknown action --');
  console.log('action:', action);
  console.log(data);
  console.groupEnd();
}