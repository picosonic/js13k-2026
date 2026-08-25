// JS 13k 2026 entry
// Not yet named

// Global constants
const XMAX=640;
const YMAX=360;
const TARGETFPS=60;

const TILEWIDTH=16;
const TILEHEIGHT=16;
const TILESPERROW=8;
const MOVESPEED=8;
const JUMPSPEED=12;

const KEYNONE=0;
const KEYLEFT=1;
const KEYUP=2;
const KEYRIGHT=4;
const KEYDOWN=8;
const KEYACTION=16;

const TILENONE=0;

const BGCOLOUR="rgb(128,168,209)";

const PNGPREFIX="data:image/png;base64,";

// Game state
var gs={
  // animation frame of reference
  step:(1/TARGETFPS), // target step time @ 60 fps
  acc:0, // accumulated time since last frame
  lasttime:0, // time of last frame

  fps:0, // current FPS
  frametimes:[], // array of frame times

  // physics in pixels per frame @ 60fps
  gravity:0.8,
  terminalvelocity:10,
  friction:1,

  // Canvas
  canvas:null,
  ctx:null,
  scale:1, // Changes when resizing window

  // Tilemap image
  tilemap:null,
  tilemapflip:null,

  // Main character
  x:0, // x position
  y:0, // y position
  sx:0, // start x position (for current level)
  sy:0, // start y position (for current level)
  vs:0, // vertical speed
  hs:0, // horizontal speed
  jump:false, // jumping
  fall:false, // falling
  dir:0, // direction (-1=left, 0=none, 1=right)
  speed:MOVESPEED, // walking speed
  jumpspeed:JUMPSPEED, // jumping speed
  flip:false, // if player is horizontally flipped

  // Level attributes
  level:0, // Level number (0 based)
  width:0, // Width of level in tiles
  height:0, // Height of level in tiles

  // Input
  keystate:KEYNONE,
  padstate:KEYNONE,
  gamepad:-1, // Gamepad index
  gamepadbuttons:[], // Button mapping
  gamepadaxes:[], // Axes mapping
  gamepadaxesval:[], // Axes values

  // Timeline for animation
  timeline:new timelineobj(), // timeline for general animation

  // Debug flag
  debug:false
};

// Random number generator
function rng()
{
  return Math.random();
}

// Handle resize events
function playfieldsize()
{
  var height=window.innerHeight;
  var ratio=XMAX/YMAX;
  var width=Math.floor(height*ratio);
  var top=0;
  var left=Math.floor((window.innerWidth/2)-(width/2));

  if (width>window.innerWidth)
  {
    width=window.innerWidth;
    ratio=YMAX/XMAX;
    height=Math.floor(width*ratio);

    left=0;
    top=Math.floor((window.innerHeight/2)-(height/2));
  }

  gs.scale=(height/YMAX);

  gs.canvas.style.top=top+"px";
  gs.canvas.style.left=left+"px";
  gs.canvas.style.transformOrigin='0 0';
  gs.canvas.style.transform='scale('+gs.scale+')';
}

// Draw tile
function drawtile(tileid, x, y)
{
  gs.ctx.drawImage(gs.tilemap, (tileid*TILEWIDTH) % (TILESPERROW*TILEWIDTH), Math.floor((tileid*TILEWIDTH) / (TILESPERROW*TILEWIDTH))*TILEHEIGHT, TILEWIDTH, TILEHEIGHT, x, y, TILEWIDTH, TILEHEIGHT);
}

// Draw sprite in current state
function drawsprite(x, y)
{
  gs.ctx.fillStyle='red';
  gs.ctx.fillRect(x, y, 32, 32);
}

// Check if player has left the map
function offmapcheck()
{
//TODO remove
return;

  if ((gs.x<(0-TILEWIDTH)) || ((gs.x+1)>gs.width*TILEWIDTH) || (gs.y>gs.height*TILEHEIGHT))
  {
    gs.x=gs.sx;
    gs.y=gs.sy;
    gs.speed=MOVESPEED;
  }
}

function collide(px, py, pw, ph)
{
  // Check for horizontal screen edge collision
  if (px<=(0-(TILEWIDTH/5))) return true;
  if ((px+(TILEWIDTH/3))>=(gs.width*TILEWIDTH)) return true;

  // Check for vertical screen edge collision
  if (py>(gs.height*TILEHEIGHT)) return true;

  return TILENONE;
}

// Collision check with player hitbox, return tile
function playerlook(x, y)
{
  return collide(x+(TILEWIDTH/3), y+((TILEHEIGHT/5)*2), TILEWIDTH/3, (TILEHEIGHT/5)*3);
}

// Collision check with player hitbox, true/flase
function playercollide(x, y)
{
  return (parseInt(playerlook(x, y), 10)!=TILENONE);
}

// Check if player on the ground or falling
function groundcheck()
{
  // Check if we are on the ground
  if (playercollide(gs.x, gs.y+1))
  {
    gs.vs=0;
    gs.jump=false;
    gs.fall=false;

    // Check for jump pressed
    if ((ispressed(KEYUP)) || (ispressed(KEYACTION)))
    {
      gs.jump=true;

      gs.vs=-gs.jumpspeed;
    }
  }
  else
  {
    // We're in the air, increase falling speed until we're at terminal velocity
    if (gs.vs<gs.terminalvelocity)
      gs.vs+=gs.gravity;

    // Set falling flag when vertical speed is positive
    if (gs.vs>0)
      gs.fall=true;
  }
}

// Process jumping
function jumpcheck()
{
  // When jumping ..
  if (gs.jump)
  {
    // Check if losing altitude
    if (gs.vs>=0)
    {
      gs.jump=false;
      gs.fall=true;
    }
  }
}

// Move player by appropriate amount, up to a collision
function collisioncheck()
{
  var loop;

  // Check for vertical collisions
  if ((gs.vs!=0) && (playercollide(gs.x, gs.y+gs.vs)))
  {
    loop=TILEHEIGHT;
    // A collision occured, so move the character until it hits
    while ((!playercollide(gs.x, gs.y+(gs.vs>0?1:-1))) && (loop>0))
    {
      gs.y+=(gs.vs>0?1:-1);
      loop--;
    }

    // Stop vertical movement
    gs.vs=0;

    // If mid jump, start descent
    if (gs.jump)
    {
      gs.jump=false;
      gs.fall=true;

      gs.vs+=gs.gravity;
    }
  }

  gs.y=Math.floor(gs.y+gs.vs);
}

function standcheck()
{
  // When no horizontal movement pressed, slow down by friction
  if (((!ispressed(KEYLEFT)) && (!ispressed(KEYRIGHT))) ||
      ((ispressed(KEYLEFT)) && (ispressed(KEYRIGHT))))
  {
    // Going left
    if (gs.dir==-1)
    {
      if (gs.hs<0)
      {
        gs.hs+=gs.friction;
      }
      else
      {
        gs.hs=0;
        gs.dir=0;
      }
    }

    // Going right
    if (gs.dir==1)
    {
      if (gs.hs>0)
      {
        gs.hs-=gs.friction;
      }
      else
      {
        gs.hs=0;
        gs.dir=0;
      }
    }
  }
}

// Update player movements
function updatemovements()
{
  // Go left if moving left
  if (gs.dir==-1)
    gs.x-=MOVESPEED;

  // Check for LHS collision
  if (gs.x<(0-TILEWIDTH))
  {
    gs.x=0-TILEWIDTH;
    gs.dir=0;
  }

  // Go right if moving right
  if (gs.dir==1)
    gs.x+=MOVESPEED;

  // Check for RHS collision
  if (gs.x>(XMAX-TILEWIDTH))
  {
    gs.x=XMAX-TILEWIDTH;
    gs.dir=0;
  }

  // Check if player has left the map
  offmapcheck();

  // Check if player on the ground or falling
  groundcheck();

  // Process jumping
  jumpcheck();

  // Move player by appropriate amount, up to a collision
  collisioncheck();

  // If no input detected, slow the player using friction
  standcheck();

  // When a movement key is pressed, adjust players speed and direction
  if (gs.keystate!=KEYNONE)
  {
    // Left key
    if ((ispressed(KEYLEFT)) && (!ispressed(KEYRIGHT)))
    {
      gs.hs=-gs.speed;
      gs.dir=-1;
      gs.flip=false;
    }

    // Right key
    if ((ispressed(KEYRIGHT)) && (!ispressed(KEYLEFT)))
    {
      gs.hs=gs.speed;
      gs.dir=1;
      gs.flip=true;
    }
  }
}

// Update game state
function update()
{
  updatemovements();
}

// Redraw game frame
function redraw()
{
  gs.ctx.fillStyle=BGCOLOUR;
  gs.ctx.fillRect(0, 0, gs.canvas.width, gs.canvas.height);

  drawsprite(gs.x, gs.y);
}

// Request animation frame callback
function rafcallback(timestamp)
{
  if (gs.debug)
  {
    // Calculate FPS
    while ((gs.frametimes.length>0) && (gs.frametimes[0]<=(timestamp-1000)))
      gs.frametimes.shift(); // Remove all entries older than a second

    gs.frametimes.push(timestamp); // Add current time
    gs.fps=gs.frametimes.length; // FPS = length of times in array
  }

  // First time round, just save epoch
  if (gs.lasttime>0)
  {
    // Determine accumulated time since last call
    gs.acc+=((timestamp-gs.lasttime) / 1000);

    // If it's more than 15 seconds since last call, reset
    if ((gs.acc>gs.step) && ((gs.acc/gs.step)>(60*15)))
      gs.acc=gs.step*2;

    // Process "steps" since last call
    while (gs.acc>gs.step)
    {
      update();

      gs.acc-=gs.step;
    }

    redraw();
  }

  // Remember when we were last called
  gs.lasttime=timestamp;

  // Request we are called on the next frame
  window.requestAnimationFrame(rafcallback);
}

// Called once init is complete
function start()
{
  gs.timeline.reset();

  gs.width=38;
  gs.height=21;

  window.requestAnimationFrame(rafcallback);
}

// Entry point
function init()
{
  // Initialise stuff
  document.onkeydown=function(e)
  {
    e = e || window.event;
    updatekeystate(e, 1);
chipt.start(); // TODO
  };

  document.onkeyup=function(e)
  {
    e = e || window.event;
    updatekeystate(e, 0);
  };

  // Stop things from being dragged around
  window.ondragstart=function(e)
  {
    e = e || window.event;
    e.preventDefault();
  };

  // Ignore mouse
  window.onmousedown=function(e)
  {
    e.preventDefault();
  };

  // Set up canvas
  gs.canvas=document.getElementById("canvas");
  gs.ctx=gs.canvas.getContext("2d");
  gs.ctx.imageSmoothingEnabled=false; // don't blur when scaling

  window.addEventListener("resize", function() { playfieldsize(); });

  playfieldsize();

  // Once image has loaded, create flipped one
  gs.tilemap=new Image;
  gs.tilemap.onload=function()
  {
    // Create a flipped version of the spritesheet
    // https://stackoverflow.com/questions/21610321/javascript-horizontally-flip-an-image-object-and-save-it-into-a-new-image-objec
    var c=document.createElement('canvas');
    var ctx=c.getContext('2d');
    c.width=gs.tilemap.width;
    c.height=gs.tilemap.height;
    ctx.scale(-1, 1);
    ctx.drawImage(gs.tilemap, -gs.tilemap.width, 0);

    gs.tilemapflip=new Image;
    gs.tilemapflip.onload=function()
    {
      // Start
      start();
    };
    gs.tilemapflip.src=c.toDataURL();
  };
  gs.tilemap.src=PNGPREFIX+tilemap;
}

// Run the init() once page has loaded
window.onload=function() { init(); };
