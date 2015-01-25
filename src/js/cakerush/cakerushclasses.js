// Character constructor
var Character = function (options) {
  // setup Character common properties from options object as needed
  this.id = options.id;
  this.sprite = new createjs.BitmapAnimation(spriteSheet);
  this.sprite.x = options.x;
  this.sprite.y = options.y;
  this.sprite.scaleX = 1;
  this.sprite.scaleY = 1;
  this.updown = options.updown;
  this.leftright = options.leftright;
  this.facingLeftright = this.leftright;
  this.color = options.color;
  this.characterType = options.characterType;
  this.velocityFactor = .1;
  this.damageRadius = 50;
  this.damageRadiusSquared = this.damageRadius * this.damageRadius;
  this.health = options.health;
  this.stageBoundTrap = false;
  this.localAttackAnimationComplete = false;
  this.lastUpdateTime = Date.now();
  this.dead = false;

  // add sprite to the stage
  stage.addChild(this.sprite);
  stage.update();

  // setup animations on sprite sheet
  spriteSheet.getAnimation(this.color + 'sidestand').next = this.color + 'sidestand';
  spriteSheet.getAnimation(this.color + 'sidestand_h').next = this.color + 'sidestand_h';
  spriteSheet.getAnimation(this.color + 'sidewalk').next = this.color + 'sidewalk';
  spriteSheet.getAnimation(this.color + 'sidewalk_h').next = this.color + 'sidewalk_h';
  spriteSheet.getAnimation(this.color + 'frontstand').next = this.color + 'frontstand';
  spriteSheet.getAnimation(this.color + 'frontwalk').next = this.color + 'frontwalk';
  spriteSheet.getAnimation(this.color + 'backstand').next = this.color + 'backstand';
  spriteSheet.getAnimation(this.color + 'backwalk').next = this.color + 'backwalk';


  // start animation standing
  this.sprite.gotoAndPlay(this.getAnimationNameFor('stand'));
};

// updates character animation based on current direction components
Character.prototype.updateAnimation = function () {
  if ((this.updown != 0 || this.leftright != 0))
    this.sprite.gotoAndPlay(this.getAnimationNameFor('walk'));
  else
    this.sprite.gotoAndPlay(this.getAnimationNameFor('stand'));
};

// handles character movement based on current direction vector
Character.prototype.move = function (deltaTime) {
  // vertical/horizontal motiion
  if (this.updown == 0 || this.leftright == 0) {
    this.sprite.x += this.leftright * deltaTime * this.velocityFactor;
    this.sprite.y += this.updown * deltaTime * this.velocityFactor;
  }
  // diagonal motion
  else {
    this.sprite.x += this.leftright * deltaTime * this.velocityFactor * 0.70711;
    this.sprite.y += this.updown * deltaTime * this.velocityFactor * 0.70711;
  }


  // ensure character doesn't leave the game area
  if (this.sprite.x < STAGE_LEFT_X_BOUND)
    this.sprite.x = STAGE_LEFT_X_BOUND;
  else if (this.sprite.x > STAGE_RIGHT_X_BOUND)
    this.sprite.x = STAGE_RIGHT_X_BOUND;

  if (this.sprite.y < STAGE_TOP_Y_BOUND)
    this.sprite.y = STAGE_TOP_Y_BOUND;
  else if (this.sprite.y > STAGE_BOTTOM_Y_BOUND)
    this.sprite.y = STAGE_BOTTOM_Y_BOUND;
};

// assemble the animation name based on character color, animation
// type, and current direction
Character.prototype.getAnimationNameFor = function (animationType) {
  var direction = 'front';
  if (animationType === 'walk'){
    if (this.updown === -1) direction = 'back';
    if (this.updown === 1) direction = 'front';
    if (this.updown === 0) direction = 'side';
  }
  if (this.facingLeftright == 1 && direction !== 'front' && + direction  !== 'back')
    return this.color + direction + animationType + '_h';
  else
    return this.color + direction + animationType;
};

// ----- motion handling function section -----
// these functions set the direction of motion, direction the
// character faces, and the current animation based on which
// key is being pressed or released
Character.prototype.startLeftMotion = function () {
  this.leftright = -1;
  this.facingLeftright = this.leftright;
  this.sprite.gotoAndPlay(this.getAnimationNameFor('walk'));
};

Character.prototype.startRightMotion = function () {
  this.leftright = 1;
  this.facingLeftright = this.leftright;
  this.sprite.gotoAndPlay(this.getAnimationNameFor('walk'));
};

Character.prototype.startUpMotion = function () {
  this.updown = -1;
  this.sprite.gotoAndPlay(this.getAnimationNameFor('walk'));
};

Character.prototype.startDownMotion = function () {
  this.updown = 1;
  this.sprite.gotoAndPlay(this.getAnimationNameFor('walk'));
};

Character.prototype.stopLeftRightMotion = function () {
  if (this.leftright != 0)
    this.facingLeftright = this.leftright;

  this.leftright = 0;
  this.updateAnimation();
};

Character.prototype.stopUpDownMotion = function () {
  this.updown = 0;
  this.updateAnimation();
};

// handle taking damage, marking characters as dead, and
// updating viewmodel for local player's health
Character.prototype.takeDamage = function (damageAmount) {
  // decrement character health
  this.health -= damageAmount;

  // mark 0 health characters as dead
  if (this.health <= 0) {
    this.dead = true;
  }

  // update health on viewmodel for knockout if local player was damaged
  if (this.id == localPlayerId)
    viewModel.health(this.health);
};

// Player constructor
var Player = function (options) {
  // call base class constructor
  Character.call(this, options);
};

// establish that Player inherits from Character
Player.prototype = Object.create(Character.prototype);

// appends player data to message
Player.prototype.appendDataToMessage = function (data) {
  data.chars.push({
    id: this.id,
    leftright: this.leftright,
    facingLeftright: this.facingLeftright,
    updown: this.updown,
    spritex: this.sprite.x,
    spritey: this.sprite.y
  });

  // set update time on local models
  this.lastUpdateTime = Date.now();
};

// updates local character model based on data in characterData
Player.prototype.updateLocalCharacterModel = function (characterData) {
  // update position/direction and health data
  this.sprite.x = characterData.spritex;
  this.sprite.y = characterData.spritey;
  this.updown = 0.8 * characterData.updown;
  this.leftright = 0.8 * characterData.leftright;
  this.facingLeftright = characterData.facingLeftright;

  // mark as updated
  this.lastUpdateTime = Date.now();
  this.updateAnimation();
};

// handle player death
Player.prototype.die = function () {
  // add to dead list and mark as dead
  deadCharacterIds.push({id: this.id, time: Date.now()});
  this.dead = true;

  // update viewmodel and notify other players if local player died
  if (this.id == localPlayerId) {
    viewModel.dead(true);
    document.onkeydown = null;
    document.onkeyup = null;
    socket.emit('localPlayerDied', {playerId: localPlayerId, roomId: viewModel.currentRoomId()});
  }

  // release the color being used by the player
  _.find(colors, {color: this.color}).unused = true;
};

Player.prototype.detectCakeCollision = function(cake) {
    // calculate x and y distances
    var x = this.sprite.x - cake.sprite.x;
    var y = this.sprite.y - cake.sprite.y;

    if (x * x + y * y <= this.damageRadiusSquared)
    {
      iGotCake = true;
      viewModel.awardPoints(50);
      //todo better health algorithm
      this.health = 100;
      viewModel.health(this.health);
      //todo food coma/pass out
      handleKeyUp({keyCode: upKey});
      handleKeyUp({keyCode: downKey});
      handleKeyUp({keyCode: leftKey});
      handleKeyUp({keyCode: rightKey});
      randomizeKeyBindings();
    }
};

// Cake constructor
var Cake = function (options) {
  this.id = 'cake';
  this.sprite = new createjs.BitmapAnimation(spriteSheet);
  this.sprite.x = options.x;
  this.sprite.y = options.y;
  this.dead = false;

  // add sprite to the stage
  stage.addChild(this.sprite);
  stage.update();

  // start animation standing
  this.sprite.gotoAndPlay('cake');
};

Cake.prototype.move = function(){};
Cake.prototype.die = function(){};