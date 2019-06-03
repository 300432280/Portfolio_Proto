/*
May 31th 2019
Yan Liu
*/
'use strict';

// flags to decide the channel status
var isChannelReady = false;
var isInitiator = false;
var isStarted = false;

var configuration = null;
//RTC connection object
var pc;

// two clients
var remoteStream;
var localStream;

//RTC data channel object
var dataChannel;

//text area from html
var dataChannelSend = document.querySelector('textarea#dataChannelSend');
var dataChannelReceive = document.querySelector('textarea#dataChannelReceive');

//declair three buttoms
var startButton = document.querySelector('button#startButton');
var sendButton = document.querySelector('button#sendButton');
var closeButton = document.querySelector('button#closeButton');

//declare what happen when click on buttons
startButton.onclick = createPeerConnection;
sendButton.onclick = sendData;
//closeButton.onclick = closeDataChannels;

//ice server, stun server
var pcConfig = {
  'iceServers': [{
    'urls': 'stun:stun.l.google.com:19302'
  }]
};

// Set up audio and video regardless of what devices are present.
var sdpConstraints = {
  offerToReceiveAudio: true,
  offerToReceiveVideo: true
};

//////////////////socket setup on client end/////////////

//give room name
var room = 'Test';
// Could prompt for room name:
// room = prompt('Enter room name:');

//socket object
var socket = io.connect();

//socket emit a message to create or join the room
if (room !== '') {
  socket.emit('create or join', room);
  console.log('Attempted to create or  join room', room);
}

//if the message received is "created"
socket.on('created', function(room) {
  console.log('Created room ' + room);
  isInitiator = true;
});

//if the message received is "full"
socket.on('full', function(room) {
  console.log('Room ' + room + ' is full');
});

//if the message received is "join"
socket.on('join', function (room){
  console.log('Another peer made a request to join room ' + room);
  console.log('This peer is the initiator of room ' + room + '!');
  isChannelReady = true;
});

//if the message received is "joined"
socket.on('joined', function(room) {
  console.log('joined: ' + room);
  isChannelReady = true;
  isInitiator = false;
  createPeerConnection;
});

//if the message received is "log"
socket.on('log', function(array) {
  console.log.apply(console, array);
});

//if the message received is "ipaddr"
socket.on('ipaddr', function(ipaddr) {
  console.log('Server IP address is: ' + ipaddr);
  // updateRoomURL(ipaddr);
});

//if the message received is "ready"
socket.on('ready', function() {
  console.log('Socket is ready');
  createPeerConnection;
});

//if the message received is "message"
socket.on('message', function(message) {
  console.log('Client received message:', message);
  signalingMessageCallback(message);
});

//////////////////////socket setup end//////////////////////////

// send message with "message" type to socket
function sendMessage(message) {
  console.log('Client sending message: ', message);
  socket.emit('message', message);
}

function enableStartButton() {
  startButton.disabled = false;
}

function disableSendButton() {
  sendButton.disabled = true;
}

// use signaling to communication between two clients
function signalingMessageCallback(message) {
  if (message.type === 'offer') {
    console.log('Got offer. Sending answer to peer.');
    pc.setRemoteDescription(new RTCSessionDescription(message), function() {},
                                  logError);
    pc.createAnswer(onLocalSessionCreated, logError);

  } else if (message.type === 'answer') {
    console.log('Got answer.');
    pc.setRemoteDescription(new RTCSessionDescription(message), function() {},
                                  logError);

  } else if (message.type === 'candidate') {
    pc.addIceCandidate(new RTCIceCandidate({
      candidate: message.candidate
    }));

  }
}

function createPeerConnection() {
  console.log('Creating Peer connection as initiator?', isInitiator, 'config:',
              configuration);
  console.log('fdssssssssssssssss');
  //construct peer connection
  pc = new RTCPeerConnection(configuration);
  console.log('2222222222222222222222222222');
  //triggered by an event occured on ice candidate 
  //and send out message of type "candidate" to socket
  pc.onicecandidate = function(event) {
    console.log('icecandidate event:', event);
    if (event.candidate) {
      sendMessage({
        type: 'candidate',
        label: event.candidate.sdpMLineIndex,
        id: event.candidate.sdpMid,
        candidate: event.candidate.candidate
      });
    } else {
      console.log('End of candidates.');
    }
  };
  console.log('3333333333333333333333333333333333');
  //if the room is created by this client 
  //we create a data channel with label "sendDataChannel"
  //and choose what to happen to the data channel
  //then create offer fo the connection
  // else we watch the event happen on the data channel, and react to them
  if (isInitiator) {
    console.log('Creating Data Channel');
    dataChannel = pc.createDataChannel('sendDataChannel');
    onDataChannelCreated(dataChannel);

    console.log('Creating an offer');
    pc.createOffer(onLocalSessionCreated, logError);
    console.log('44444444444444444444444444');
  } else {
    pc.ondatachannel = function(event) {
      console.log('ondatachannel:', event.channel);
      dataChannel = event.channel;
      onDataChannelCreated(dataChannel);
    };
    console.log('55555555555555555555555555');
  }
  console.log('6666666666666666666666666666');
}

//what happen on the created data channel
function onDataChannelCreated(channel) {
  console.log('onDataChannelCreated:', channel);

  //what to do when the channel is opened
  //enable bottoms
  channel.onopen = function() {
    console.log('CHANNEL opened!!!');
    startButton.disabled = false;
    sendButton.disabled = false;
  };

  //what to do when the channel is closed
  //disable bottoms
  channel.onclose = function () {
    console.log('Channel closed.');
    sendButton.disabled = true;
    startButton.disabled = true;
  };

  //what happen when channel receives message
  channel.onmessage = function () {
    console.log('Received Message !!!!!!!!!!!');
    dataChannelReceive.value = event.data;
  };

}

//set local description
//and send out local description of type "message", used as an offer
function onLocalSessionCreated(desc) {
  console.log('local session created:', desc);
  pc.setLocalDescription(desc, function() {
    console.log('sending local desc:', pc.localDescription);
    sendMessage(pc.localDescription);
  }, logError);
}

// send the data over
function sendData() {
  var data = dataChannelSend.value;
  dataChannel.send(data);
  console.log('Sent Data: ' + data);
}


function logError(err) {
  if (!err) return;
  if (typeof err === 'string') {
    console.warn(err);
  } else {
    console.warn(err.toString(), err);
  }
}