//// CONTSANTS & DEFINITIONS ////
Fiber = Npm.require("fibers");

var serverInterval = 100;  // Server run loop interval in milliseconds
var spawnEnemyInterval = 1500;
var enemySpeed_min = 1;
var enemySpeed_max = 15;
var enemyRadius = 50;
var enemyBulletSpeed = 50;
var enemyBulletSpread = 15;

// Spawn boundaries for randomly spawned enemies
// Playing field is 1000x600
var spawnBound_xMin = 500;
var spawnBound_xMax = 900;
var spawnBound_yMin = 100;
var spawnBound_yMax = 500;

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
    Bullets.remove({type: "hit"});  // Might need to run for loop check
    Ships.remove({health: {$lte: 0}}); // Might need to run for loop check
    Ships.remove({timeout: {$lte: 0}});
    Enemies.remove({health: {$lte: 0}});
    Enemies.remove({timeout: {$lte: 0}});
    Enemies.remove({$or: [{x: {$lt: -50}}, {x: {$gt: 1050}}, {y: {$lt: -50}}, {y: {$gt: 650}}]});

    // Decrement health of ships so that they do not stay in play forever
    TimeoutCheck();

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

//// ENEMIES ////
Meteor.setInterval(spawnEnemies, spawnEnemyInterval);

function spawnEnemies() {
  //Fiber(function() {
    var x_spawn = Math.floor(Math.random() * (spawnBound_xMax - spawnBound_xMin + 1)) + spawnBound_xMin;
    var y_spawn = Math.floor(Math.random() * (spawnBound_yMax - spawnBound_yMin + 1)) + spawnBound_yMin;
    var enemySpeed = Math.floor(Math.random() * (enemySpeed_max - enemySpeed_min + 1)) + enemySpeed_min;
    Enemies.insert({x: x_spawn, y: y_spawn, x_vel: x_rand, y_vel: y_rand, health: 50, timeout: 200, radius: enemyRadius, speed: enemySpeed});
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
    var fireChance = Math.floor(Math.random() * 7);
    if(fireChance === 1) {  // 1 in 6 chance of firing
      fireBullet("enemy", [(allEnemies[i].x - 6),(allEnemies[i].y)], [-1 * enemyBulletSpeed,(Math.random()*2 - 1) * enemyBulletSpread], 5);
    }
  }
}

function fireBullet(type, position, velocity, damage) {
  Bullets.insert({type: type, damage: damage, x: position[0], y: position[1], x_vel: velocity[0], y_vel: velocity[1], radius: 1});
}
