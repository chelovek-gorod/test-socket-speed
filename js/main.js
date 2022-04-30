'use strict'

const client_version = 'CV-000 [30-04-2022]';
console.log('CLIENT', client_version);

/*****************
 *  INTERFACE
 */

const clientsCounter = document.getElementById('clientsCounter');
const connectionId = document.getElementById('connectionId');
const clientSpan = document.getElementById('clientSpan');
const serverSpan = document.getElementById('serverSpan');
const setSPSSpan = document.getElementById('setSPSSpan');
const clientServerClientSpan = document.getElementById('clientServerClientSpan');
const serverClientServerSpan = document.getElementById('serverClientServerSpan');

const counterSpan = document.getElementById('counterSpan');
const frameSpan = document.getElementById('frameSpan');

let counter = 0;

let connectionIs = false;
let myId;
let sps = 6;
let spsArr = [1, 2, 3, 4, 5, 6, 10, 12, 15, 20, 30, 60];
let spsStep = Math.round( 60 / spsArr[sps] ); // 60 / 12 = 5; 

setSPSSpan.innerText = spsArr[sps];

let timeStampServer = 0;

/*****************
 *  CONTROLLERS
 */

function clickAdd() {
  if (sps < 11) sps++;
  setSPSSpan.innerText = spsArr[sps];
  spsStep = Math.round( 60 / spsArr[sps] );
}

function clickSubtract() {
  if (sps > 0) sps--;
  setSPSSpan.innerText = spsArr[sps];
  spsStep = Math.round( 60 / spsArr[sps] );
}

document.addEventListener('keyup', (event) => {
  switch(event.code) {
    case 'NumpadAdd' :;
    case 'Equal' : if (sps < 11) sps++; break;

    case 'NumpadSubtract' :;
    case 'Minus' : if (sps > 0) sps--; break;
  }

  setSPSSpan.innerText = spsArr[sps];
  spsStep = Math.round( 60 / spsArr[sps] );
});

function openNewClient() {
  window.open( 'https://chelovek-gorod.github.io/test-socket-speed/', '_blank' );
}

function restartPage() {
  document.location.reload();
}

/*****************
 *  FRAME TIMER
 */

let frame = 0;
function animate() {
  if ((frame % 60) % spsStep === 0) {
     if (connectionIs) sendUpdate();
  }

  if ((frame % 60) === 0) updateDataChangeInfo();

  frame++;

  counterSpan.innerText = counter;
  frameSpan.innerText = frame;
  
  window.requestAnimationFrame(animate);
}
setTimeout(animate, 5000);

/*****************
 *  CONNECTION
 */

// 'ws://192.168.100.51:6789';
// 'wss://mars-game-server.herokuapp.com'
// 'ws://localhost:6789'
const socketURL = 'wss://mars-test-socket.herokuapp.com'; 
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
      case 'connect' : getConnect(socket, data); break;
      case 'update' : getUpdate(data); break;
      default : getWrongActionInResponse(action, data);
    }
  };
  
  socket.onclose = function(event) {
    connectionIs = false;
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
    connectionIs = false;
    console.group('-- socket on error --');
    console.log(' - connection error:');
    console.log(' - ' + error);
    console.groupEnd();
  };

}
connection();

function getConnect(socket, data) {
  SOCKET = socket;
  connectionId.innerText = myId =  data;
  connectionIs = true;
}

function sendUpdate() {
  SOCKET.send(JSON.stringify({
    action: 'update',
    data: { id: myId, timeStampServer: timeStampServer, timeStampClient: Date.now() }
  }));
}

function getUpdate(data) {
  timeStampServer = data.timeStampServer;
  if (counter > 0) {
    // update client timeout
    clientSpan.innerText = ((+clientSpan.innerText * counter) + (Date.now() - data.timeStampClient)) / (counter + 1);

    // update server timeout
    if (counter === 1) serverSpan.innerText = data.timeoutServer;
    else serverSpan.innerText = ((+serverSpan.innerText * (counter - 1)) + data.timeoutServer) / counter;
    
  } else {
    clientSpan.innerText = Date.now() - data.timeStampClient;
  }
  counter++;
}

function updateDataChangeInfo() {
  clientServerClientSpan.innerText = 1000 / (+clientSpan.innerText);
  serverClientServerSpan.innerText = 1000 / (+serverSpan.innerText);
}