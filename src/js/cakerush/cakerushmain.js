var lastUpKeydownTime = 0;
var lastDownKeydownTime = 0;
var lastLeftKeydownTime = 0;
var lastRightKeydownTime = 0;
var keyUpLag = 500;
var upKey = 87;
var leftKey = 65;
var rightKey = 68;
var downKey = 83;
//var upKey = 38;
//var leftKey = 37;
//var rightKey = 39;
//var downKey = 40;

var STAGE_HEIGHT = 500;
var STAGE_WIDTH = 700;
var STAGE_TOP_Y_BOUND = 220;
var STAGE_BOTTOM_Y_BOUND = STAGE_HEIGHT-5;
var STAGE_LEFT_X_BOUND = 40;
var STAGE_RIGHT_X_BOUND = STAGE_WIDTH-40;

var canvas;
var stage;
var background;
var spritesImage;
var spriteSheet;
var characters;
var deadCharacterIds;
var colors;
var socket;
var localPlayerId;
var lastTime;
var lastHeartbeatTime;
var lastHealthPenaltyTime;
var lastDeadCharacterPurgeTime;
var enemyInterval;
var lastEnemyTime;
var keyPressedDown;
var keyPressedUp;
var keyPressedLeft;
var keyPressedRight;
var keyPressedSpace;
var viewModel;
var sendLocalPlayerMotion;
var iGotCake;

// initialize the whole game site
function init() {
  // attach the easelJS stage to the canvas
  canvas = document.getElementById("gameCanvas");
  stage = new createjs.Stage(canvas);

  // initialize arrays
  characters = [];
  deadCharacterIds = [];

  // setup the viewmodel for knockout
  var viewModelMaker = function () {
    var self = this;

    // in game data
    self.points = ko.observable();
    self.health = ko.observable();
    self.gameStarted = ko.observable();
    self.currentRoomId = ko.observable();
    self.dead = ko.observable();
    self.playerColor = ko.observable();

    // room stats
    self.totalRooms = ko.observable();
    self.playersInRooms = ko.observable();

    // room list
    self.rooms = ko.observableArray();

    // this initiates room join with server
    self.joinRoom = function (room) {
      var data = {};
      data.playerId = localPlayerId;
      data.roomId = room.roomId;
      socket.emit('joinRoom', data);
    };

    // requests updated room list from server
    self.getRoomUpdate = function () {
      socket.emit('getRooms');
    };

    // returns player to room list
    self.returnToRoomList = function () {
      socket.emit('leaveRoom', {roomId: viewModel.currentRoomId()});
      stage.removeAllChildren();
      stage.removeAllEventListeners();
      self.getRoomUpdate();
      self.gameStarted(false);
    };

    // adds points to current score
    self.awardPoints = function (points) {
      self.points(self.points() + points);
    };

    // resets game state for a new game
    self.newGameReset = function () {
      self.points(0);
      self.health(100);
      self.gameStarted(false);
      self.dead(false);
    };
  };

  // instantiate viewmodel and register with knockout
  viewModel = new viewModelMaker();
  ko.applyBindings(viewModel);

  // connect to server
  //socket = io.connect(location.protocol + '//' + location.host + '/sockets/cakerush');
  socket = io.connect('http://localhost:3000/sockets/cakerush');

  // register callbacks for server messages
  socket.on('connectionReply', loadRoomsAndMyId);
  socket.on('roomJoined', startGame);
  socket.on('updatedRoomList', updateRooms);
  socket.on('connectionRefused', viewModel.getRoomUpdate);
  socket.on('clientReceive', handleGameDataReceivedFromServer);
  socket.on('playerDisconnected', handlePlayerDisconnect);
  socket.on('remotePlayerDied', handlePlayerDied);
  socket.emit('playerConnect');

  // load background
  background = new createjs.Bitmap("/images/cakerush/background.png");

  createjs.Sound.registerSound({id:'test', src:'/sounds/test.mp3'});

  handleImageLoad();
  // load sprite sheet
  //spritesImage = new Image();
  //spritesImage.onload = handleImageLoad;
  //spritesImage.src = "/images/cakerush/sprites.png";
}

// sets player id and room data from server message
function loadRoomsAndMyId(data) {
  localPlayerId = data.playerId;
  updateRooms(data);
}

// updates room stats and list from data message
function updateRooms(data) {
  viewModel.totalRooms(data.totalRooms);
  viewModel.playersInRooms(data.playersInRooms);
  viewModel.rooms(data.rooms);
}

function handlePlayerDisconnect(data) {
  handlePlayerDied(data);
}

function handlePlayerDied(data) {
  //trigger player death
  _.find(characters, {id: data.playerId}).die();
}

// parses spritesheet image into animations on an easelJS spritesheet object
function handleImageLoad() {
  // data about the organization of the sprite sheet
  var spriteData = {
    images: ["/images/cakerush/cake.png", "/images/cakerush/fatBlue.png", "/images/cakerush/fatRed.png",
      "/images/cakerush/fatYellow.png", "/images/cakerush/fatGreen.png"],
    frames: [
        //startx, starty, sizex, sizey, which file in the array, registrationx, registrationy
      //[0, 0, 80, 80, 0, 40, 0],
      //[80, 0, 80, 80, 0, 40, 0],
      //[160, 0, 80, 80, 0, 40, 0],
      //[240, 0, 80, 80, 0, 40, 0],
      //[320, 0, 80, 80, 0, 40, 0],

      //cake
      [0, 0, 360, 360, 0, 180, 220], //0
      //blue
      [0, 0, 69, 191, 1, 34, 191], // 1 side step 1
      [69, 0, 69, 191, 1, 34, 191], // 2 side step 2
      [138, 0, 69, 191, 1, 34, 191], // 3 side stand
      [0, 191, 69, 191, 1, 34, 191], // 4 front stand
      [69, 191, 69, 191, 1, 34, 191], // 5 front step 1
      [138, 191, 69, 191, 1, 34, 191], // 6 front step 2
      [0, 382, 69, 191, 1, 34, 191], // 7 back stand
      [69, 382, 69, 191, 1, 34, 191], // 8 back step 1
      [138, 382, 69, 191, 1, 34, 191], // 9 back step 2
      //red
      [0, 0, 69, 191, 2, 34, 191], // 10 side step 1
      [69, 0, 69, 191, 2, 34, 191], // 11 side step 2
      [138, 0, 69, 191, 2, 34, 191], // 12 side stand
      [0, 191, 69, 191, 2, 34, 191], // 13 front stand
      [69, 191, 69, 191, 2, 34, 191], // 14 front step 1
      [138, 191, 69, 191, 2, 34, 191], // 15 front step 2
      [0, 382, 69, 191, 2, 34, 191], // 16 back stand
      [69, 382, 69, 191, 2, 34, 191], // 17 back step 1
      [138, 382, 69, 191, 2, 34, 191], // 18 back step 2
      //yellow
      [0, 0, 69, 191, 3, 34, 191], // 19 side step 1
      [69, 0, 69, 191, 3, 34, 191], // 20 side step 2
      [138, 0, 69, 191, 3, 34, 191], // 21 side stand
      [0, 191, 69, 191, 3, 34, 191], // 22 front stand
      [69, 191, 69, 191, 3, 34, 191], // 23 front step 1
      [138, 191, 69, 191, 3, 34, 191], // 24 front step 2
      [0, 382, 69, 191, 3, 34, 191], // 25 back stand
      [69, 382, 69, 191, 3, 34, 191], // 26 back step 1
      [138, 382, 69, 191, 3, 34, 191], // 27 back step 2
      //green
      [0, 0, 69, 191, 4, 34, 191], // 28 side step 1
      [69, 0, 69, 191, 4, 34, 191], // 29 side step 2
      [138, 0, 69, 191, 4, 34, 191], // 30 side stand
      [0, 191, 69, 191, 4, 34, 191], // 31 front stand
      [69, 191, 69, 191, 4, 34, 191], // 32 front step 1
      [138, 191, 69, 191, 4, 34, 191], // 33 front step 2
      [0, 382, 69, 191, 4, 34, 191], // 34 back stand
      [69, 382, 69, 191, 4, 34, 191], // 35 back step 1
      [138, 382, 69, 191, 4, 34, 191] // 36 back step 2
    ],
    animations: {
      //bluestand: 0,
      //bluewalk: { frames: [1, 0, 2, 0], frequency: 6 },
      //blueattack: { frames: [0, 3, 4, 3], frequency: 6 },

      cake: 0,
      bluesidestand:3,
      bluefrontstand:4,
      bluebackstand:7,
      bluesidewalk: { frames: [3,1,3,2], frequency: 6},
      bluefrontwalk: { frames: [4,5,4,6], frequency: 6},
      bluebackwalk: { frames: [7,8,7,9], frequency: 6},
      redsidestand:12,
      redfrontstand:13,
      redbackstand:16,
      redsidewalk: { frames: [12,10,12,11], frequency: 6},
      redfrontwalk: { frames: [13,14,13,15], frequency: 6},
      redbackwalk: { frames: [16,17,16,18], frequency: 6},
      yellowsidestand:21,
      yellowfrontstand:22,
      yellowbackstand:25,
      yellowsidewalk: { frames: [21,19,21,20], frequency: 6},
      yellowfrontwalk: { frames: [22,23,22,24], frequency: 6},
      yellowbackwalk: { frames: [25,26,25,27], frequency: 6},
      greensidestand:30,
      greenfrontstand:31,
      greenbackstand:34,
      greensidewalk: { frames: [30,28,30,29], frequency: 6},
      greenfrontwalk: { frames: [31,32,31,33], frequency: 6},
      greenbackwalk: { frames: [34,35,34,36], frequency: 6}


    }
  };

  // initialize the spritesheet object
  spriteSheet = new createjs.SpriteSheet(spriteData);
}

// start a game
function startGame(data) {
  // set the room id based on server message
  viewModel.currentRoomId(data.roomId);

  // initialize time trackers
  lastTime = 0;
  lastHeartbeatTime = 0;
  lastHealthPenaltyTime = 0;
  lastEnemyTime = 0;
  lastDeadCharacterPurgeTime = 0;
  enemyInterval = 1000;

  // set key press flags to false
  keyPressedDown = false;
  keyPressedUp = false;
  keyPressedLeft = false;
  keyPressedRight = false;
  keyPressedSpace = false;
  sendLocalPlayerMotion = false;

  // clear arrays
  characters.length = 0;
  deadCharacterIds.length = 0;

  // strip stage and add background
  stage.removeAllChildren();
  stage.removeAllEventListeners();
  stage.addChild(background);

  // setup player colors
  colors = [];
  colors.push({color: 'red', unused: true});
  colors.push({color: 'green', unused: true});
  colors.push({color: 'blue', unused: true});
  colors.push({color: 'yellow', unused: true});

  // add vertically and horizontally flipped animations to spritesheet
  createjs.SpriteSheetUtils.addFlippedFrames(spriteSheet, true, true, false);

  // instantiate local player
  addNewPlayer({
    id: localPlayerId,
    spritex: Math.floor(Math.random() * (STAGE_RIGHT_X_BOUND - STAGE_LEFT_X_BOUND) + STAGE_LEFT_X_BOUND),
    spritey: Math.floor(Math.random() * (STAGE_BOTTOM_Y_BOUND - STAGE_TOP_Y_BOUND) + STAGE_TOP_Y_BOUND),
    updown: 0,
    leftright: 0,
    facingLeftright: -1
  });

  // reset viewmodel game state
  viewModel.newGameReset();

  viewModel.playerColor(_.find(characters, {id: localPlayerId}).color);

  // set flag that game has started
  viewModel.gameStarted(true);

  // attach key press functions to document events
  document.onkeydown = handleKeyDown;
  //document.onkeyup = handleKeyUp;

  // set preferred frame rate to 60 frames per second and
  // use requestanimationframe if available
  createjs.Ticker.useRAF = true;
  createjs.Ticker.setFPS(60);

  // start the game loop
  if (!createjs.Ticker.hasEventListener("tick")) {
    createjs.Ticker.addEventListener("tick", tick);
  }

  if (data.shouldGenerateFirstCake){
    characters.push(generateCake());
  }

  //randomizeKeyBindings();
}

// main game loop
function tick() {
  // get current time
  var now = Date.now();

  // get difference in time since last frame
  // this makes the game logic run independent of frame rate
  var deltaTime = now - lastTime;

  if (now - lastHealthPenaltyTime > 500){
    lastHealthPenaltyTime = now;
    var player = _.find(characters, {id: localPlayerId});
    player.takeDamage(1);
    player.detectCakeCollision(_.find(characters, {id: 'cake'}));
    if (iGotCake){
      var localCakeIndex = _.indexOf(characters, _.find(characters, {id: 'cake'}));
      characters[localCakeIndex] = generateCake();
    }
  }
  if (keyPressedUp && now - lastUpKeydownTime > keyUpLag)
    handleKeyUp({keyCode: upKey});
  if (keyPressedDown && now - lastDownKeydownTime > keyUpLag)
    handleKeyUp({keyCode: downKey});
  if (keyPressedLeft && now - lastLeftKeydownTime > keyUpLag)
    handleKeyUp({keyCode: leftKey});
  if (keyPressedRight && now - lastRightKeydownTime > keyUpLag)
    handleKeyUp({keyCode: rightKey});

  // move all of the characters
  for (var i = 0; i < characters.length; i++)
    if (characters[i])
      characters[i].move(deltaTime);

  // sort depth layers by reinsertion based on y value
  var sortedCharacters = _.sortBy(characters, function (character) {
    return character.sprite.y;
  });
  // strip the stage
  stage.removeAllChildren();
  // reinsert the stage
  stage.addChild(background);
  // reinsert the characters in sorted order
  for (var i = 0; i < sortedCharacters.length; i++)
    stage.addChild(sortedCharacters[i].sprite);

  // send game data if motion occurred, any local character attacked,
  // or just a heartbeat every 500 milliseconds
  if (iGotCake || sendLocalPlayerMotion || now - lastHeartbeatTime > 500) {
    sendLocalPlayerMotion = false;
    sendGameDataToServer();
    lastHeartbeatTime = now;
  }

  // fixes for characters that need to happen after sending game data
  for (var i = 0; i < characters.length; i++) {
    // remove characters that are out of health or have not been updated
    if (characters[i].health <= 0 || now - characters[i].lastUpdateTime > 3000)
      characters[i].die();
  }

  // strip the dead from characters array;
  // sprite will not be reinserted to stage during sorting on next tick
  characters = _.where(characters, {dead: false});

  // purge dead characters after they have been dead more than 10 seconds
  if (now - lastDeadCharacterPurgeTime > 3001) {
    deadCharacterIds = _.filter(deadCharacterIds, function (id) {
      return now - id.time > 3001;
    });
    lastDeadCharacterPurgeTime = now;
  }

  // update stage graphics
  stage.update();
  lastTime = now;
}

function randomizeKeyBindings() {
  //assign new upKey
  upKey = Math.floor(Math.random()*25)+65;
  //assign new downKey
  do {
    downKey = Math.floor(Math.random()*25)+65;
  }
  while (upKey == downKey);
  //assign new rightKey
  do {
    rightKey = Math.floor(Math.random()*25)+65;
  }
  while (upKey == rightKey || downKey == rightKey);
  //assign new leftKey
  do{
    leftKey = Math.floor(Math.random()*25)+65;
  }
  while (upKey == leftKey || downKey == leftKey || rightKey == leftKey);
}

// handle key down event - returns true for non game keys, false otherwise
function handleKeyDown(e) {
  // use common key handling code with custom switch callback
  return handleKeySignals(e, function (e, player) {
    var nonGameKeyPressed = true;
    var now = Date.now();
    switch (e.keyCode) {
      case leftKey:
        if (!keyPressedLeft && now - lastLeftKeydownTime > keyUpLag) {
          keyPressedLeft = true;
          player.startLeftMotion();
        }
        lastLeftKeydownTime = now;
        nonGameKeyPressed = false;
        break;
      case rightKey:
        if (!keyPressedRight && now - lastRightKeydownTime > keyUpLag) {
          keyPressedRight = true;
          player.startRightMotion();
        }
        lastRightKeydownTime = now;
        nonGameKeyPressed = false;
        break;
      case downKey:
        if (!keyPressedDown && now - lastDownKeydownTime > keyUpLag) {
          keyPressedDown = true;
          player.startDownMotion();
        }
        lastDownKeydownTime = now;
        nonGameKeyPressed = false;
        break;
      case upKey:
        if (!keyPressedUp && now - lastUpKeydownTime > keyUpLag) {
          keyPressedUp = true;
          player.startUpMotion();
        }
        lastUpKeydownTime = now;
        nonGameKeyPressed = false;
        break;
    }
    // return necessary to tell the browser whether it should handle the
    // key separately; don't want game keys being passed back to the
    // browser
    return nonGameKeyPressed;
  });
}

// handle key up event - returns true for non game keys, false otherwise
function handleKeyUp(e) {
  // use common key handling code with custom switch callback
  return handleKeySignals(e, function (e, player) {
    var nonGameKeyPressed = true;
    switch (e.keyCode) {
      case leftKey:
        if (keyPressedLeft){
          keyPressedLeft = false;
          player.stopLeftRightMotion();
        }
        nonGameKeyPressed = false;
        break;
      case rightKey:
        if (keyPressedRight){
          keyPressedRight = false;
          player.stopLeftRightMotion();
        }
        nonGameKeyPressed = false;
        break;
      case downKey:
        if (keyPressedDown){
          keyPressedDown = false;
          player.stopUpDownMotion();
        }
        nonGameKeyPressed = false;
        break;
      case upKey:
        if (keyPressedUp){
          keyPressedUp = false;
          player.stopUpDownMotion();
        }
        nonGameKeyPressed = false;
        break;
    }
    // return necessary to tell the browser whether it should handle the
    // key separately; don't want game keys being passed back to the
    // browser
    return nonGameKeyPressed;
  });
}

// common code for key up/down events;
// takes a callback for handling unique elements of each
function handleKeySignals(e, switchHandler) {
  if (!e)
    e = window.event;
  var player = _.find(characters, {id: localPlayerId});
  var lastLeftright = player.leftright;
  var lastUpdown = player.updown;
  var nonGameKeyPressed = switchHandler(e, player);

  if (!nonGameKeyPressed && (lastLeftright != player.leftright || lastUpdown != player.updown || player.justAttacked))
    sendLocalPlayerMotion = true;
  return nonGameKeyPressed;
}

// sends current player's game state to server
function sendGameDataToServer() {
  // initialize data message
  var data = {};

  // attach room and player ids
  data.roomId = viewModel.currentRoomId();
  data.playerId = localPlayerId;

  // initialize character array
  data.chars = [];

  // find local player and pack player data on message
  var player = _.find(characters, {id: localPlayerId});
  if (player)
    player.appendDataToMessage(data);

  data.iGotCake = iGotCake;
  var localCake = _.find(characters, {id:'cake'});
  data.cake = { spritex: localCake.sprite.x, spritey: localCake.sprite.y};
  iGotCake = false;

  // ship data to the server
  socket.emit('clientSend', data);
}

// callback for handling game data shipped from the server;
// parses through the data and calls appropriate functions
// to sync the local game model with the received data
function handleGameDataReceivedFromServer(data) {
  // find local model of remote player
  var playerFound = _.find(characters, {id: data.playerId});
  // extract remote player data from data message
  var playerData = _.find(data.chars, {id: data.playerId});
  // if player exists, update local representation model
  if (playerFound && playerData)
    playerFound.updateLocalCharacterModel(playerData);
  // when player does not exist and was not recently killed, add them
  else if (playerData && !_.any(deadCharacterIds, {id: data.playerId}))
    addNewPlayer(playerData);

  var localCakeIndex = _.indexOf(characters, _.find(characters, {id: 'cake'}));
  if (localCakeIndex === -1)
  {
    characters.push(new Cake({x: data.cake.spritex, y: data.cake.spritey}));
  }
  else if (data.iGotCake) {
    characters[localCakeIndex].sprite.x = data.cake.spritex;
    characters[localCakeIndex].sprite.y = data.cake.spritey;
  }
}

// create a new local model for a player based on options object
function addNewPlayer(options) {
  // add the new player to the characters array
  characters.push(new Player({
    id: options.id,
    x: options.spritex,
    y: options.spritey,
    updown: options.updown,
    leftright: options.leftright,
    facingLeftright: options.facingLeftright,
    color: pickNewPlayerColor(),
    characterType: 'player',
    health: 100
  }));
}

// randomly issue an unused player color for a new player
function pickNewPlayerColor() {
  // start at a random color
  var colorIndex = Math.floor(Math.random() * 4);
  var result = false;
  // iterate over the colors array looking for the first unused color
  for (var i = 0; i < colors.length; i++) {
    if (colors[colorIndex].unused) {
      result = colors[colorIndex].color;
      colors[colorIndex].unused = false;
      break;
    }
    colorIndex = (colorIndex + 1) % colors.length;
  }
  // return the first unused color found
  return result;
}

function generateCake(){
  return new Cake({
    x: Math.floor(Math.random() * (STAGE_RIGHT_X_BOUND - STAGE_LEFT_X_BOUND) + STAGE_LEFT_X_BOUND),
    y: Math.floor(Math.random() * (STAGE_BOTTOM_Y_BOUND - STAGE_TOP_Y_BOUND) + STAGE_TOP_Y_BOUND)
  });
}

//function addNewZombie(options) {
//  // add the new zombie to the characters array
//  characters.push(new Zombie({
//    id: options.id,
//    x: options.spritex,
//    y: options.spritey,
//    updown: options.updown,
//    leftright: options.leftright,
//    facingLeftright: options.facingLeftright,
//    ownerId: options.ownerId,
//    color: 'zombie',
//    characterType: 'zombie',
//    targetId: options.targetId,
//    health: 100
//  }));
//}
//
//  // add the new zombie
//  addNewZombie({
//    id: uuid.v4(),
//    spritex: x,
//    spritey: Math.floor(Math.random() * 220) + 200,
//    updown: 0,
//    leftright: 0,
//    facingLeftright: 1,
//    ownerId: localPlayerId,
//    targetId: localPlayerId
//  });
//}