//// CONTSANTS & DEFINITIONS ////
Fiber = Npm.require("fibers");

// Play constants
var serverInterval = 100;  // Server run loop interval in milliseconds
var enemySpawnIntervalBase = 800;
var enemySpeed_min = 1;
var enemySpeed_max = 15;
var enemyRadius_big = 100;
var enemyRadius_small = 50;
var enemyBulletSpeed = 50;
var enemyBulletSpread = 12;
var enemyHealth_big = 300;
var enemyHealth_small = 50;
var powerupSpawnRate = 35;
var powerupSpeed = 30;

// Spawn boundaries for randomly spawned enemies
// Playing field is 1000x550
var spawnBound_xMin = 500;
var spawnBound_xMax = 900;
var spawnBound_yMin = 100;
var spawnBound_yMax = 450;

// Temporary //
var x_rand = 0;
var y_rand = 0;
var x_vel = 0;
var y_vel = 0;

// Calculates random ship vector movements
Meteor.setInterval(calculateRandomVelocity, 1100);
function calculateRandomVelocity() {
  x_rand = Math.random()*2 - 1;
  y_rand = Math.random()*2 - 1;
}

// Calculates spawn interval
var spawnInterval = enemySpawnIntervalBase; // This value changes via random function
Meteor.setInterval(spawnEnemies, spawnInterval);


//// PUBLISH TO THE CLIENT ////
Meteor.publish("ships", function () {
  return Ships.find({});
});

Meteor.publish("friendly_bullets", function () {
  return FriendlyBullets.find({});
});

Meteor.publish("enemy_bulets", function () {
  return EnemyBullets.find({});
});


//// SERVER RUN LOOP ////
Meteor.setInterval(serverLoop, serverInterval);

function serverLoop() {
  //Fiber(function() {
    // Clean up all objects that have become out of scope
    // For some reason this doesn't seem to be working on the deployed server
    Bullets.remove({$or: [{x: {$lt: -10}}, {x: {$gt: 1010}}]});
    //Bullets.remove({timeout: {$gt: 30}});
    //Bullets.remove({type: "hit"});  // Might need to run for loop check
    Ships.remove({health: {$lte: 0}}); // Might need to run for loop check
    Ships.remove({timeout: {$lte: 0}});
    Enemies.remove({health: {$lte: 0}});
    Enemies.remove({timeout: {$lte: 0}});
    Enemies.remove({$or: [{x: {$lt: -50}}, {x: {$gt: 1050}}, {y: {$lt: -50}}, {y: {$gt: 600}}]});
    Powerups.remove({$or: [{x: {$lt: -10}}, {x: {$gt: 1010}}]});
    // Increment bullet values, check for collisions and display explosions
    //UpdateBullets();
    IncrementBullets();
    CheckCollisions();

    // Decrement health of ships so that they do not stay in play forever
    TimeoutCheck();

    // Spawn powerups & update their locations
    SpawnPowerups();
    UpdatePowerups();

    // Move all enemies on the screen & make them shoot
    EnemiesMove();
    if(Ships.find().fetch().length > 0) {
      EnemiesShoot();
    }
  //}).run();
}


function TimeoutCheck() {
  var allShips = Ships.find().fetch();
  for(var i = 0; i < allShips.length; i++) {
    Ships.update(allShips[i]._id, {$inc: {timeout: -1}});
  }
  var allEnemies = Enemies.find().fetch();
  for(var i = 0; i < allEnemies.length; i++) {
    Enemies.update(allEnemies[i]._id, {$inc: {timeout: -1}});
  }
}

function SpawnPowerups() {
  var spawnRoll = Math.floor(Math.random() * powerupSpawnRate + 1);
    if(spawnRoll === 1) {  // Default is: 1 in 100 chance of spawning powerup; ~10 sec spawn interval.
      // Type of powerup to spawn.
      // 0 = health
      // 1 = weapon
      // 2 = clear screen
      var y_spawn = Math.floor(Math.random() * (spawnBound_yMax - spawnBound_yMin + 1)) + spawnBound_yMin;
      var typeRoll = Math.floor(Math.random() * 3);
      var powerupType;
      switch (typeRoll) {
        case 0:
          powerupType = "healthUp"
          break;
        case 1:
          powerupType = "levelUp"
          break;
        default:
          powerupType = "clearEnemies"
      }
      Powerups.insert({type: powerupType, x: 1000, y: y_spawn, x_vel: -1 * powerupSpeed, y_vel: 0, radius: 15})
    }    
}

function UpdatePowerups() {
  allPowerups = Powerups.find().fetch();
  for(var i = 0; i < allPowerups.length; i++) {
      var x_delta = allPowerups[i].x_vel;
      //var y_delta = allPowerups[i].y_vel;
    Powerups.update(allPowerups[i]._id, {$inc: {x: x_delta}});
  }
}

function IncrementBullets() {
  allBullets = Bullets.find().fetch();
  for(var i = 0; i < allBullets.length; i++) {
      var x_delta = allBullets[i].x_vel;
      var y_delta = allBullets[i].y_vel;
    Bullets.update(allBullets[i]._id, {$inc: {x: x_delta, y: y_delta}});
    //allBullets[i].timeout++;
    if(allBullets[i].type === "hit") {
      Bullets.remove(allBullets[i]._id);
    }
  }
}


function UpdateBullets() {
  allBullets = Bullets.find().fetch();
  for(var i = 0; i < allBullets.length; i++) {
      var x_delta = allBullets[i].x_vel;
      var y_delta = allBullets[i].y_vel;
    Bullets.update(allBullets[i]._id, {$inc: {x: x_delta, y: y_delta}});
  }
}

function distance(x,y) {
  return Math.sqrt(square(x.x - y.x) + square(x.y - y.y));
}

function square(x) {
  return x*x;
}

// Checks if a collides with b
function collide(a,b) {
  var dist = distance(a,b) - a.radius - b.radius;
  if(dist <= 0) {
    return true;
  }
  else {
    return false;
  }
}

// Check all collisions for elements in play
function CheckCollisions() {
  allBullets = Bullets.find().fetch();
  allEnemies = Enemies.find().fetch();
  allShips = Ships.find().fetch();
  allPowerups = Powerups.find().fetch();

  // Check friendly bullets hitting enemy ships
  for(var i = 0; i < allBullets.length; i++) {
    for(var j = 0; j < allEnemies.length; j++) {
      if(collide(allBullets[i],allEnemies[j]) && 
        (allBullets[i].type === "friendly" || 
         allBullets[i].type === "friendly power" || 
         allBullets[i].type === "friendly superpower")) {
        bulletContact(allBullets[i].x, allBullets[i].y);
        Enemies.update(allEnemies[j]._id, {$inc: {health: (-1 * allBullets[i].damage)}});
        Bullets.remove(allBullets[i]._id);
        //Ships.update(Session.get("current_user"), {$inc: {health: 5}});
      }
    }

    // Check enemy bullets hitting friendly ships
    for(var k = 0; k < allShips.length; k++) {
      if(collide(allBullets[i],allShips[k]) && allBullets[i].type === "enemy") {
        bulletContact(allBullets[i].x, allBullets[i].y);
        Ships.update(allShips[k]._id, {$inc: {health: (-1 * allBullets[i].damage)}});
        Bullets.remove(allBullets[i]._id);
      }
    }
  }

  // Check powerup collisions
  for(var i = 0; i < allShips.length; i++) {
    for(var j = 0; j < allPowerups.length; j++) {
      if(collide(allShips[i],allPowerups[j])) {
        switch(allPowerups[j].type) {
          case 'healthUp':
            Ships.update(allShips[i]._id, {$inc: {health: 25}});
            Powerups.remove(allPowerups[j]._id);
            break;
          case 'levelUp':
            Ships.update(allShips[i]._id, {$inc: {level: 1}});
            Powerups.remove(allPowerups[j]._id);
            break;
          default:
            Enemies.remove({});
            Powerups.remove(allPowerups[j]._id);
        }
      }
    }
  }
}

function bulletContact(x,y) {
  Bullets.insert({type: "hit", damage: 0, x: x, y: y, x_vel: 0, y_vel: 0, timeout: 0});
}


//// ENEMIES ////
function CalculateEnemySpawnInterval() {
  var randomAdd = Math.floor(Math.random() * ((1000 - 0 + 1)) + 0);
  spawnInterval = enemySpawnIntervalBase + randomAdd;
}

function spawnEnemies() {
  //Fiber(function() {
    var x_spawn = Math.floor(Math.random() * (spawnBound_xMax - spawnBound_xMin + 1)) + spawnBound_xMin;
    var y_spawn = Math.floor(Math.random() * (spawnBound_yMax - spawnBound_yMin + 1)) + spawnBound_yMin;

    // Spawn two different types of enemies
    var enemyRoll = Math.floor(Math.random() * 11);
    if(enemyRoll === 1) {  // 1 in 10 chance of big enemy
      var enemySpeed = Math.floor(Math.random() * ((enemySpeed_max / 2) - enemySpeed_min + 1)) + enemySpeed_min;
      Enemies.insert({type: 2, x: x_spawn, y: y_spawn, x_vel: x_rand, y_vel: y_rand, health: enemyHealth_big, timeout: 200, radius: enemyRadius_big, speed: enemySpeed});
    }
    else {
      var enemySpeed = Math.floor(Math.random() * (enemySpeed_max - enemySpeed_min + 1)) + enemySpeed_min;
      Enemies.insert({type: 1, x: x_spawn, y: y_spawn, x_vel: x_rand, y_vel: y_rand, health: enemyHealth_small, timeout: 200, radius: enemyRadius_small, speed: enemySpeed});
    }

    CalculateEnemySpawnInterval(); // Calculates new random spawn interval
  //}).run();
}

function EnemiesMove() {
  var allEnemies = Enemies.find().fetch();
  for(var i = 0; i < allEnemies.length; i++) {
    var keepMoving = Math.floor(Math.random() * 6);
    if(keepMoving === 1) {  // 1 in 5 chance of recalculating random movement vector
      Enemies.update(allEnemies[i]._id, {$inc: {x_vel: (x_rand * allEnemies[i].speed), y_vel: (y_rand * allEnemies[i].speed)}});
    }
    Enemies.update(allEnemies[i]._id, {$inc: {x: allEnemies[i].x_vel, y: allEnemies[i].y_vel}});
  }
}

function EnemiesShoot() {
  var allEnemies = Enemies.find().fetch();
  for(var i = 0; i < allEnemies.length; i++) {
    var fireChance;
    if(allEnemies[i].type === 1) {
      fireChance = Math.floor(Math.random() * 9);  // 1 in 8 chance of firing
    }
    else {
      fireChance = Math.floor(Math.random() * 5);  // 1 in 4 chance of firing
    }

    if(fireChance === 1) { 
      fireBullet("enemy", [(allEnemies[i].x - 6),(allEnemies[i].y)], [-1 * enemyBulletSpeed,(Math.random()*2 - 1) * enemyBulletSpread], 5, 1);
    }
  }
}

function fireBullet(type, position, velocity, damage, radius) {
  Bullets.insert({type: type, damage: damage, radius: radius, x: position[0], y: position[1], x_vel: velocity[0], y_vel: velocity[1], timeout: 0});
}
