// JS 13k 2026 entry
// Not yet named

// Global constants
const XMAX=320;
const YMAX=180;
const TARGETFPS=60;

const TILEWIDTH=18;
const TILEHEIGHT=18;
const TILEWIDTH2=TILEWIDTH/2;
const TILEHEIGHT2=TILEHEIGHT/2;
const TILESPERROW=20;

const SPRITEWIDTH=35;
const SPRITEHEIGHT=34;

const STATEINTRO=0;

const KEYNONE=0;
const KEYLEFT=1;
const KEYUP=2;
const KEYRIGHT=4;
const KEYDOWN=8;
const KEYACTION=16;

const MOVESPEED=3;
const JUMPSPEED=6; // jump height

// Tile ids
const TILENONE=0;

const BGCOLOUR="rgb(128,168,209)";

const PNGPREFIX="data:image/png;base64,";
const CHAROFFS=256;

// Game state
var gs={
  // animation frame of reference
  step:(1/TARGETFPS), // target step time @ 60 fps
  acc:0, // accumulated time since last frame
  lasttime:0, // time of last frame

  fps:0, // current FPS
  frametimes:[], // array of frame times

  // physics in pixels per frame @ 60fps
  gravity:0.25,
  terminalvelocity:10,
  friction:1,

  // Canvas
  canvas:null,
  ctx:null,
  scale:1, // Changes when resizing window

  // Tilemap image
  tilemap:null,
  tilesloaded:false,
  spritesheet:null,
  sprites:[],
  spritesflip:[],
  spritesloaded:false,

  // Main character
  x:0, // x position
  y:0, // y position
  sx:0, // start x position (for current level)
  sy:0, // start y position (for current level)
  vs:0, // vertical speed
  hs:0, // horizontal speed
  jump:false, // jumping
  fall:false, // falling
  dir:0, // direction when moving (-1=left, 0=none, 1=right)
  speed:MOVESPEED, // walking speed
  jumpspeed:JUMPSPEED, // jumping speed
  flip:false, // if player is horizontally flipped
  frame:0, // animation frame

  // Level attributes
  level:0, // Level number (0 based)
  width:0, // Width of level in tiles
  height:0, // Height of level in tiles
  xoffset:0, // current view offset from left (horizontal scroll)
  yoffset:0, // current view offset from top (vertical scroll)
  score:0, // score for the level

  // Input
  keystate:KEYNONE,
  padstate:KEYNONE,
  gamepad:-1, // Gamepad index
  gamepadbuttons:[], // Button mapping
  gamepadaxes:[], // Axes mapping
  gamepadaxesval:[], // Axes values

  // Tiles
  tiles:[], // copy of current level (to allow destruction)

  // Characters
  chars:[],

  // Game state
  state:STATEINTRO, // state machine

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
  // Don't draw tile 0 (background)
  if (tileid==0) return;

  // Clip to what's visible
  if (((x-gs.xoffset)<-TILEWIDTH) && // clip left
      ((x-gs.xoffset)>XMAX) && // clip right
      ((y-gs.yoffset)<-TILEHEIGHT) && // clip top
      ((y-gs.yoffset)>YMAX))   // clip bottom
    return;

  gs.ctx.drawImage(gs.tilemap, (tileid*TILEWIDTH) % (TILESPERROW*TILEWIDTH), Math.floor((tileid*TILEWIDTH) / (TILESPERROW*TILEWIDTH))*TILEHEIGHT, TILEWIDTH, TILEHEIGHT, x-gs.xoffset, y-gs.yoffset, TILEWIDTH, TILEHEIGHT);
}

// Draw sprite tile
function drawspritetile(sprite)
{
  // Don't draw sprite 0 (background)
  if (sprite.id==0) return;

  // Clip to what's visible
  if (((Math.floor(sprite.x)-gs.xoffset)<-TILEWIDTH) && // clip left
      ((Math.floor(sprite.x)-gs.xoffset)>XMAX) && // clip right
      ((Math.floor(sprite.y)-gs.yoffset)<-TILEHEIGHT) && // clip top
      ((Math.floor(sprite.y)-gs.yoffset)>YMAX))   // clip bottom
    return;

  drawtile(sprite.id, sprite.x, sprite.y);
}

function drawleg(ctx, x, y, leg, angle)
{
  ctx.save();

  ctx.translate(x, y);
  ctx.rotate((angle*Math.PI)/180);
  ctx.translate(-x-leg.a.x, -y-leg.a.y);

  ctx.drawImage(gs.spritesheet, leg.x, leg.y, leg.w, leg.h, x, y, leg.w, leg.h);

  ctx.restore();
}

// Draw unicorn sprite
function drawsprite(x, y, pose)
{
  gs.ctx.drawImage(gs.flip?gs.spritesflip[pose]:gs.sprites[pose], x-gs.xoffset, y-gs.yoffset);
}

function getImageURL(imgData, width, height, flip)
{
  var canvas = document.createElement('canvas');
  var ctx = canvas.getContext('2d');

  canvas.width = width;
  canvas.height = height;

  if (flip)
  {
    ctx.scale(-1, 1);
    ctx.drawImage(imgData, 0, 0, -width, height);
  }
  else
    ctx.putImageData(imgData, 0, 0);

  return canvas.toDataURL();
}

// Draw all the sprites to bitmaps
function createsprites()
{
  // x, y, width, height, hind_anchor(x, y), front_anchor(x, y)
  const body={x:0,y:0,w:30,h:23,hind:{x:9,y:21},front:{x:20,y:22}};
  // x, y, width, height, anchor(x, y)
  const hindleg={x:0,y:23,w:8,h:14,a:{x:5,y:2}};
  const frontleg={x:9,y:24,w:4,h:12,a:{x:2,y:1}};
  const frontlegbent={x:14,y:24,w:8,h:8,a:{x:1,y:1}};

  const poses=[
    // Standing
    {nf:frontleg, nfa:0, ff:frontleg, ffa:0, nha:0, fha:0},

    // Running
    {nf:frontleg, nfa:310, ff:frontleg, ffa:350, nha:30, fha:10},
    {nf:frontleg, nfa:330, ff:frontlegbent, ffa:80, nha:20, fha:5},
    {nf:frontlegbent, nfa:60, ff:frontlegbent, ffa:40, nha:330, fha:350},
    {nf:frontlegbent, nfa:30, ff:frontlegbent, ffa:0, nha:340, fha:30},
    {nf:frontlegbent, nfa:0, ff:frontleg, ffa:320, nha:0, fha:50},
    {nf:frontleg, nfa:290, ff:frontleg, ffa:330, nha:60, fha:40},

    // Jumping
    {nf:frontleg, nfa:270, ff:frontleg, ffa:270, nha:60, fha:50},
    
    // Falling
    {nf:frontlegbent, nfa:0, ff:frontlegbent, ffa:0, nha:0, fha:0}
  ];

  var c=document.createElement('canvas');
  var ctx=c.getContext('2d');

  c.width=SPRITEWIDTH*poses.length;
  c.height=SPRITEHEIGHT;

  for (var pose=0; pose<poses.length; pose++)
  {
    // Clear sprite frame
    ctx.clearRect(0, 0, c.width, c.height);

    //// Draw sprite ////

    // Draw far-side legs (slightly in shadow)
    ctx.filter='brightness(70%)';
    drawleg(ctx, (pose*SPRITEWIDTH)+body.hind.x+2, body.hind.y, hindleg, poses[pose].fha);
    drawleg(ctx, (pose*SPRITEWIDTH)+body.front.x+2, body.front.y, poses[pose].ff, poses[pose].ffa);
    ctx.filter='none';

    // Draw body
    ctx.drawImage(gs.spritesheet, body.x, body.y, body.w, body.h, (pose*SPRITEWIDTH), 0, body.w, body.h);

    // Draw near-side legs
    ctx.filter='brightness(95%)';
    drawleg(ctx, (pose*SPRITEWIDTH)+body.hind.x, body.hind.y, hindleg, poses[pose].nha);
    drawleg(ctx, (pose*SPRITEWIDTH)+body.front.x, body.front.y, poses[pose].nf, poses[pose].nfa);
    ctx.filter='none';

    // Capture sprite
    var SpriteData=ctx.getImageData((pose*SPRITEWIDTH), 0, SPRITEWIDTH, SPRITEHEIGHT);
    var sprite=new Image;
    sprite.src=getImageURL(SpriteData, SPRITEWIDTH, SPRITEHEIGHT, false);

    // Save sprite
    gs.sprites.push(sprite);

    // Capture flipped sprite
    var spriteflip=new Image;
    spriteflip.src=getImageURL(gs.sprites[pose], SPRITEWIDTH, SPRITEHEIGHT, true);

    // Save flipped sprite
    gs.spritesflip.push(spriteflip);
  }

  start();
}

// Check if player has left the map
function offmapcheck()
{
  if ((gs.x<(0-SPRITEWIDTH)) || ((gs.x+1)>gs.width*SPRITEWIDTH) || (gs.y>gs.height*SPRITEHEIGHT))
  {
    gs.x=gs.sx;
    gs.y=gs.sy;
    gs.speed=MOVESPEED;

    scrolltoplayer(false);
  }
}

// Check if area a overlaps with area b
function overlap(ax, ay, aw, ah, bx, by, bw, bh)
{
  // Check horizontally
  if ((ax<bx) && ((ax+aw))<=bx) return false; // a too far left of b
  if ((ax>bx) && ((bx+bw))<=ax) return false; // a too far right of b

  // Check vertically
  if ((ay<by) && ((ay+ah))<=by) return false; // a too far above b
  if ((ay>by) && ((by+bh))<=ay) return false; // a too far below b

  return true;
}

function collide(px, py, pw, ph)
{
  // Check for horizontal screen edge collision
  if (px<=(0-(SPRITEWIDTH/5))) return true;
  if ((px+(SPRITEWIDTH/3))>=(gs.width*SPRITEWIDTH)) return true;

  // Look through all the tiles for a collision
  for (var y=0; y<gs.height; y++)
  {
    for (var x=0; x<gs.width; x++)
    {
      var tile=parseInt(gs.tiles[(y*gs.width)+x]||1, 10);

      if ((tile-1)!=0)
      {
        if (overlap(px, py, pw, ph, x*TILEWIDTH, y*TILEHEIGHT, TILEWIDTH, TILEHEIGHT))
          return tile;
      }
    }
  }

  return TILENONE;
}

// Collision check with player hitbox, return tile
function playerlook(x, y)
{
  return collide(x+(SPRITEWIDTH/3), y+((SPRITEHEIGHT/5)*2), SPRITEWIDTH/3, (SPRITEHEIGHT/5)*3);
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

  // Check for horizontal collisions
  if ((gs.hs!=0) && (playercollide(gs.x+gs.hs, gs.y)))
  {
    loop=TILEWIDTH;
    // A collision occured, so move the character until it hits
    while ((!playercollide(gs.x+(gs.hs>0?1:-1), gs.y)) && (loop>0))
    {
      gs.x+=(gs.hs>0?1:-1);
      loop--;
    }

    // Stop horizontal movement
    gs.hs=0;
    gs.speed=MOVESPEED;
    gs.runtimer=0;
  }
  gs.x+=Math.floor(gs.hs);

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

// Slow the player using friction
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
      gs.flip=true;
    }

    // Right key
    if ((ispressed(KEYRIGHT)) && (!ispressed(KEYLEFT)))
    {
      gs.hs=gs.speed;
      gs.dir=1;
      gs.flip=false;
    }
  }
}

// Update game state
function update()
{
  updatemovements();

  gs.frame++;
  if (gs.frame>=(5*6)) gs.frame=1; 
}

function drawlevel()
{
  for (var y=0; y<gs.height; y++)
  {
    for (var x=0; x<gs.width; x++)
    {
      var tile=parseInt(gs.tiles[(y*gs.width)+x]||1, 10);
      drawtile(tile-1, x*TILEWIDTH, y*TILEHEIGHT);
    }
  }
}

// Draw chars
function drawchars()
{
  for (var id=0; id<gs.chars.length; id++)
    drawspritetile(gs.chars[id]);
}

// Scroll level to player
function scrolltoplayer(dampened)
{
  var xmiddle=Math.floor((XMAX-TILEWIDTH)/2);
  var ymiddle=Math.floor((YMAX-TILEHEIGHT)/2);
  var maxxoffs=((gs.width*TILEWIDTH)-XMAX);
  var maxyoffs=((gs.height*TILEHEIGHT)-YMAX);

  // Work out where x and y offsets should be
  var newxoffs=gs.x-xmiddle;
  var newyoffs=gs.y-ymiddle;

  // Restrict right side to edge of level
  if (newxoffs>maxxoffs) newxoffs=maxxoffs;
  if (newyoffs>maxyoffs) newyoffs=maxyoffs;

  // Restrict left side to edge of level
  if (newxoffs<0) newxoffs=0;
  if (newyoffs<0) newyoffs=0;

  // Determine if xoffset should be changed
  if (newxoffs!=gs.xoffset)
  {
    if (dampened)
    {
      var xdelta=1;

      if (Math.abs(gs.xoffset-newxoffs)>(XMAX/5)) xdelta=Math.abs(Math.floor(gs.hs));

      gs.xoffset+=newxoffs>gs.xoffset?xdelta:-xdelta;
    }
    else
      gs.xoffset=newxoffs;
  }

  // Determine if yoffset should be changed
  if (newyoffs!=gs.yoffset)
  {
    if (dampened)
    {
      var ydelta=1;

      if (Math.abs(gs.yoffset-newyoffs)>(YMAX/5)) ydelta=Math.abs(Math.floor(gs.vs));

      gs.yoffset+=newyoffs>gs.yoffset?ydelta:-ydelta;
    }
    else
      gs.yoffset=newyoffs;
  }
}

// Redraw game frame
function redraw()
{
  // Scroll to keep player in view
  scrolltoplayer(false);

  // Clear the canvas
  gs.ctx.fillStyle=BGCOLOUR;
  gs.ctx.fillRect(0, 0, gs.canvas.width, gs.canvas.height);

  // Draw the level
  drawlevel();

  // Draw the characters
  drawchars();

  // Draw unicorn sprite
  if (gs.jump)
    drawsprite(gs.x, gs.y+1, 7);
  else
    if (gs.fall)
    drawsprite(gs.x, gs.y+1, 8);
  else
    drawsprite(gs.x, gs.y+1, gs.hs==0?0:Math.floor(gs.frame/5)+1);
}

// Load level
function loadlevel(level)
{
  // Make sure it exists
  if ((level>=0) && (levels.length-1<level)) return;

  // Set current level to new one
  gs.level=level;

  // Deep copy level tiles list to allow changes
  gs.tiles=JSON.parse(JSON.stringify(levels[gs.level].level));

  // Remove anything over threshold
  gs.tiles.forEach((tileid, index) => {
    if (parseInt(tileid||0, 10)>CHAROFFS) gs.tiles[index]=0;
  });

  // Get width/height of new level
  gs.width=parseInt(levels[gs.level].width, 10);
  gs.height=parseInt(levels[gs.level].height, 10);

  // Start with empty set of characters
  gs.chars=[];

  // Populate chars (non solid tiles)
  for (var y=0; y<gs.height; y++)
  {
    for (var x=0; x<gs.width; x++)
    {
      var tile=parseInt(levels[gs.level].level[(y*gs.width)+x]||0, 10);

      if (tile<CHAROFFS) continue;
      tile-=CHAROFFS;

      if (tile!=0)
      {
        var obj={id:(tile-1), x:(x*TILEWIDTH), y:(y*TILEHEIGHT), flip:false, hs:0, vs:0, dwell:0, del:false, ttl:0};

        switch (tile-1)
        {
          default:
            gs.chars.push(obj); // Everything else
            break;
        }
      }
    }
  }
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
    if ((gs.acc>gs.step) && ((gs.acc/gs.step)>(TARGETFPS*15)))
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

  loadlevel(gs.level);
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

  // Once tilemap has loaded, create flipped one
  gs.tilemap=new Image;
  gs.tilemap.onload=function()
  {
    // Create a flipped version of the tilemap
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
      gs.tilesloaded=true;
    };
    gs.tilemapflip.src=c.toDataURL();
  };
  gs.tilemap.src=PNGPREFIX+tilemap;

  // Once sprite image has loaded, create individual sprites
  gs.spritesheet=new Image;
  gs.spritesheet.onload=function()
  {
    gs.spritesloaded=true;

    // Draw all sprite frames to generate individual bitmaps
    createsprites();
  };
  gs.spritesheet.src=PNGPREFIX+spritesheet;
}

// Run the init() once page has loaded
window.onload=function() { init(); };
