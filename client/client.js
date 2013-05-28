//// RUN CONSTANTS ////
var framerate = 12;  // x milliseconds between frames
var friendlyBulletspeed = 80;
var playerTimeout = 1200;  // Player timeout in deciseconds
var playerRadius = 40;

var windowx = 1000;
var windowy = 550;


//// INITIALIZERS ////
var hud = document.getElementById("hud");
var current_user;
Meteor.startup(function() {
  current_user = Ships.insert({name: "Test", x: 0, y: 0, health: 100, level: 1, radius: playerRadius, timeout: playerTimeout});
  Session.set("current_user", current_user);
})

var current_x = 0;
var current_y = 0;
var last_x = 0;
var last_y = 0;



//// MAIN RUN LOOP ////
var mousePos;
window.onmousemove = handleMouseMove;
Meteor.setInterval(run, framerate);



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
    current_x = mousePos.x;
    current_y = mousePos.y;

    // Reset the inactivity timer if there is movement
    if(last_x != current_x || last_y != current_y) {
      Ships.update(Session.get("current_user"), {$set: {timeout: playerTimeout}});
    }

    // Update current user's ship's location to follow the mouse
    Ships.update(Session.get("current_user"), {$set: {x: current_x, y: current_y}});

    last_x = current_x;
    last_y = current_y;

    

    //WriteHealth();

    // Shoot bullets with mouse clicks
    window.onmousedown = function() {
      current_ship = Ships.findOne(Session.get("current_user"));
      if(current_ship) {
        // Shooting pattern varies depending on current_user's level
        switch(current_ship.level) {
          case 1:
            fireBullet("friendly", [friendlyBulletspeed,0], 15, 1);
            break;
          case 2:
            fireBullet("friendly", [friendlyBulletspeed,1], 15, 1);
            fireBullet("friendly", [friendlyBulletspeed,-1], 15, 1);
            break;
          case 3:
            fireBullet("friendly", [friendlyBulletspeed,0], 15, 1);
            fireBullet("friendly", [friendlyBulletspeed,2], 15, 1);
            fireBullet("friendly", [friendlyBulletspeed,-2], 15, 1);  
            break;
          case 4:
            fireBullet("friendly power", [friendlyBulletspeed + 20,0], 25, 1);
            break;
          case 5:
            fireBullet("friendly power", [friendlyBulletspeed + 20,1], 25, 1);
            fireBullet("friendly power", [friendlyBulletspeed + 20,-1], 25, 1);
            break;
          case 6: 
            fireBullet("friendly power", [friendlyBulletspeed + 20,0], 25, 1);
            fireBullet("friendly power", [friendlyBulletspeed + 20,2], 25, 1);
            fireBullet("friendly power", [friendlyBulletspeed + 20,-2], 25, 1);
            break;
          default:
            fireBullet("friendly superpower", [friendlyBulletspeed + 40,0], 75, 12);
        }
      }
    }
  }
  else {
    return [0, 0];
  }
}



function WriteHealth() {
  allShips = Ships.find().fetch();
  for (var i = 0; i < allShips.length; i++) {
    hud.innerHTML = allShips[i].health;
  }
}

function fireBullet(type, velocity, damage, radius) {
  Bullets.insert({type: type, damage: damage, radius: radius, x: current_x, y: current_y, x_vel: velocity[0], y_vel: velocity[1], timeout: 0});
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

Template.powerups.powerups = function() {
  return Powerups.find({});
}

Template.hud.health = function() {
  return Ships.findOne(Session.get("current_user")).health;
}