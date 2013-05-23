// MongoDB Collections

Ships = new Meteor.Collection("ships");
Bullets = new Meteor.Collection("bullets");
Enemies = new Meteor.Collection("enemies");
//EnemyBullets = new Meteor.Collection("enemy_bullets");


//// CLIENT AND SERVER FUNCTIONS ////
function fireBullet(friendlyOrEnemy, velocity, damage) {
  Bullets.insert({side: friendlyOrEnemy, damage: damage, x: x_percent, y: y_percent, x_vel: velocity[0], y_vel: velocity[1], radius: 1});
}