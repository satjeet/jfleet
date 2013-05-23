//// RUN CONSTANTS ////
var framerate = 50;  // x frames per second
var friendlyBulletspeed = 100;
var enemyBulletSpeed = 80;

var windowx = 960;
var windowy = 600;


//// INITIALIZERS ////
var hud = document.getElementById("hud");
var current_user;
Meteor.startup(function() {
  current_user = Ships.insert({name: "Test", x: 0, y: 0, health: 100, radius: 5, timeout: 120000});
  Session.set("current_user", current_user);
})

var x_percent = 0;
var y_percent = 0;
var last_x = 0;
var last_y = 0;



//// MAIN RUN LOOP ////
var mousePos;
window.onmousemove = handleMouseMove;
setInterval(run, 100);



function handleMouseMove(event) {
  event = event || window.event;
  mousePos = {
    x: event.clientX,
    y: event.clientY
  };
}

function run() {
  if (mousePos) {
    // Get width & height of the window in the run loop in case people
    // scale the window size during the game
    windowWidth = window.innerWidth;
    windowHeight = window.innerHeight;

    // Convert x & y coordinates to percentages to scale for all screens
    x_percent = (mousePos.x / windowWidth) * 100;
    y_percent = (mousePos.y / windowHeight) * 100;

    // Reset the inactivity timer if there is movement
    if(last_x != x_percent || last_y != y_percent) {
      Ships.update(Session.get("current_user"), {$set: {timeout: 100}});
    }

    // Update current user's ship's location to follow the mouse
    Ships.update(Session.get("current_user"), {$set: {x: x_percent, y: y_percent}});

    last_x = x_percent;
    last_y = y_percent;

    UpdateBullets();
    CheckCollisions();

    //WriteHealth();

    // Shoot bullets with mouse clicks
    window.onmousedown = function() {
      if(Ships.findOne(Session.get("current_user"))) {
        fireBullet("friendly", [7,0], 15);
      }
    }
  }
  else {
    return [0, 0];
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
  for(var i = 0; i < allBullets.length; i++) {
    for(var j = 0; j < allEnemies.length; j++) {
      if(collide(allBullets[i],allEnemies[j]) && allBullets[i].type === "friendly") {
        bulletContact(allBullets[i].x, allBullets[i].y);
        Enemies.update(allEnemies[j]._id, {$inc: {health: (-1 * allBullets[i].damage)}});
        Bullets.remove(allBullets[i]._id);
        //Ships.update(Session.get("current_user"), {$inc: {health: 5}});
      }
    }
    for(var k = 0; k < allShips.length; k++) {
      if(collide(allBullets[i],allShips[k]) && allBullets[i].type === "enemy") {
        bulletContact(allBullets[i].x, allBullets[i].y);
        Ships.update(allShips[k]._id, {$inc: {health: (-1 * allBullets[i].damage)}});
        Bullets.remove(allBullets[i]._id);
      }
    }
  }
}

function WriteHealth() {
  allShips = Ships.find().fetch();
  for (var i = 0; i < allShips.length; i++) {
    hud.innerHTML = allShips[i].health;
  }
}

function fireBullet(type, velocity, damage) {
  Bullets.insert({type: type, damage: damage, x: x_percent, y: y_percent, x_vel: velocity[0], y_vel: velocity[1], radius: 1});
}

function bulletContact(x,y) {
  Bullets.insert({type: "hit", damage: 0, x: x, y: y});
}

Template.players.ships = function() {
  return Ships.find({});
}

Template.enemies.enemy_ships = function() {
  return Enemies.find({});
}

Template.bullets.bullets = function() {
  return Bullets.find({});
}

Template.hud.health = function() {
  return Ships.findOne(Session.get("current_user")).health;
}