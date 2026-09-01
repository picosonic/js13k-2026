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
const STATEMENU=1;
const STATEPLAYING=2;
const STATENEWLEVEL=3;
const STATECOMPLETE=4;
const STATEFAIL=5;

const KEYNONE=0;
const KEYLEFT=1;
const KEYUP=2;
const KEYRIGHT=4;
const KEYDOWN=8;
const KEYACTION=16;

const MOVESPEED=3;
const JUMPSPEED=6; // jump height
const MAXLIVES=7; // One life for each colour of the rainbow

// Tile ids
const TILENONE=0;
const TILEUNICORN=4; // Starting position
const TILEGEM=5; // Score 5 points
const TILELOCK=8; // Unlocked by key
const TILERAINBOW=24; // End of level
const TILERAINBOW2=25;
const TILEKEY=28; // Unlock all locks
const TILECOIN=29; // Collect for points
const TILECOIN2=30; // Coin spinning variant
const TILEHEART=65; // Adds a heart when collected
const TILEHEARTHALF=66;
const TILEHEARTEMPTY=67;
const TILESPIKES=68; // Painful to land on
const TILEBOB=124;
const TILEBOB2=125;
const TILEBOBSLEEP=126;
const TILEPUMPKIN=127;
const TILEBLOCKSQUASH=130; // Shown when standing on block
const TILEBLOCK=131;
const TILESNOWMAN=132;
const TILEBUTTON=133; // Up (flowing water on)
const TILEBUTTON2=134; // Down (flowing water off) - on a timer

const BGCOLOUR="rgb(128,168,209)";

const PNGPREFIX="data:image/png;base64,";
const CHAROFFS=256;

const RAINBOWCOLS=[
  {r:255,g:0,b:0},   // Red
  {r:255,g:127,b:0}, // Orange
  {r:255,g:255,b:0}, // Yellow
  {r:0,g:255,b:0},   // Green
  {r:0,g:0,b:255},   // Blue
  {r:75,g:0,b:130},  // Indigo
  {r:148,g:0,b:211}  // Violet
];

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
  tilemap:null, // main tileset
  tilesloaded:false,
  spritesheet:null,
  sprites:[],
  spritesflip:[],
  spritesloaded:false,

  // Main character
  x:0, // x position
  y:0, // y position
  px:0, // prev x position
  py:0, // prev y position
  sx:0, // start x position (for current level)
  sy:0, // start y position (for current level)
  vs:0, // vertical speed
  hs:0, // horizontal speed
  jump:false, // jumping
  fall:false, // falling
  htime:0, // hurt timer
  duck:false, // ducking
  dir:0, // direction when moving (-1=left, 0=none, 1=right)
  speed:MOVESPEED, // walking speed
  jumpspeed:JUMPSPEED, // jumping speed
  coyote:0, // coyote timer (time after leaving ground where you can still jump)
  flip:false, // if player is horizontally flipped
  frame:0, // animation frame
  trail:0, // trail colour
  lives:MAXLIVES,
  key:0, // number of keys collected

  // Level attributes
  level:0, // Level number (0 based)
  width:0, // Width of level in tiles
  height:0, // Height of level in tiles
  xoffset:0, // current view offset from left (horizontal scroll)
  yoffset:0, // current view offset from top (vertical scroll)
  score:0, // score for the level
  water:0, // How long flowing water should be off for

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
  anim:8, // time until next character animation frame

  // Particles
  particles:[], // an array of particles

  // Game state
  state:STATEINTRO, // state machine

  // Timeline for animation
  timeline:new timelineobj(), // timeline for general animation

  // Debug flag
  debug:false,

  // True when music has been started (by user interaction)
  music:false
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

  drawtile(sprite.id, Math.floor(sprite.x), Math.floor(sprite.y));
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
    // Standing 0
    {nf:frontleg, nfa:0, ff:frontleg, ffa:0, nha:0, fha:0},

    // Running 1..6
    {nf:frontleg, nfa:310, ff:frontleg, ffa:350, nha:30, fha:10},
    {nf:frontleg, nfa:330, ff:frontlegbent, ffa:80, nha:20, fha:5},
    {nf:frontlegbent, nfa:60, ff:frontlegbent, ffa:40, nha:330, fha:350},
    {nf:frontlegbent, nfa:30, ff:frontlegbent, ffa:0, nha:340, fha:30},
    {nf:frontlegbent, nfa:0, ff:frontleg, ffa:320, nha:0, fha:50},
    {nf:frontleg, nfa:290, ff:frontleg, ffa:330, nha:60, fha:40},

    // Jumping 7
    {nf:frontleg, nfa:270, ff:frontleg, ffa:270, nha:60, fha:50},

    // Falling 8
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
    sprite.onload=function()
    {
      // Save sprite
      gs.sprites.push(this);

      // Capture flipped sprite
      var spriteflip=new Image;
      spriteflip.src=getImageURL(this, SPRITEWIDTH, SPRITEHEIGHT, true);

      // Save flipped sprite
      gs.spritesflip.push(spriteflip);
    };
    sprite.src=getImageURL(SpriteData, SPRITEWIDTH, SPRITEHEIGHT, false);
  }

  start();
}

function drawlives()
{
  const whole=Math.floor(gs.lives);
  const empty=Math.floor(MAXLIVES-whole);

  for (var i=0; i<Math.ceil(MAXLIVES); i++)
  {
    var px=(i*TILEWIDTH)+gs.xoffset;
    var py=gs.yoffset;

    if (i<whole)
      drawspritetile({id:TILEHEART, x:px, y:py, flip:false});

    if (i>=whole)
    {
      if ((i==whole) && (whole!=gs.lives))
        drawspritetile({id:TILEHEARTHALF, x:px, y:py, flip:false});
      else
        drawspritetile({id:TILEHEARTEMPTY, x:px, y:py, flip:false});
    }
  }
}

// Check if player has left the map
function offmapcheck()
{
  if ((gs.x<(0-SPRITEWIDTH)) || ((gs.x+1)>gs.width*SPRITEWIDTH) || (gs.y>gs.height*SPRITEHEIGHT))
  {
    gs.x=gs.sx;
    gs.y=gs.sy;
    gs.px=gs.x;
    gs.py=gs.y;
    gs.speed=MOVESPEED;
    gs.coyote=0;
    gs.htime=0;
    gs.water=0;

    if (gs.lives>0)
      gs.lives-=0.5;

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
  // Check for coyote time
  if (gs.coyote>0)
    gs.coyote--;

  // Check if we are on the ground
  if (playercollide(gs.x, gs.y+1))
  {
    // If we just hit the ground after falling, create a few particles under foot
    if (gs.fall==true)
      generateparticles(gs.x+(SPRITEWIDTH/2), gs.y+SPRITEHEIGHT, 4, 4, {r:170, g:170, b:170});

    gs.vs=0;
    gs.jump=false;
    gs.fall=false;
    gs.coyote=15;
    var tilebelow=playerlook(gs.x, gs.y+1)-1;

    // Check for jump pressed, when not ducking
    if (((ispressed(KEYUP)) || (ispressed(KEYACTION))) && (!gs.duck))
    {
      gs.jump=true;
      gs.vs=-gs.jumpspeed;
    }
  }
  else
  {
    // Check for jump pressed, when not ducking, and coyote time not expired
    if (((ispressed(KEYUP)) || (ispressed(KEYACTION))) && (!gs.duck) && (gs.jump==false) && (gs.coyote>0))
    {
      gs.jump=true;
      gs.vs=-gs.jumpspeed;
    }

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

  // Save previous position
  gs.px=gs.x;
  gs.py=gs.y;

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
  // Check for ducking, or injured
  if (ispressed(KEYDOWN))
  {
    gs.duck=true;
    gs.speed=0;
  }
  else
  {
    gs.duck=false;
    gs.speed=MOVESPEED;
  }

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

// Move animation frame onwards
function updateanimation()
{
  if (gs.anim==0)
  {
    // Char animation
    for (var id=0; id<gs.chars.length; id++)
    {
      switch (gs.chars[id].id)
      {
        // Flag
        case 51: gs.chars[id].id=31; break;
        case 31: gs.chars[id].id=51; break;

        // Coins
        case 29: gs.chars[id].id=30; break;
        case 30: gs.chars[id].id=29; break;

        // Standing water
        case 33: gs.chars[id].id=53; break;
        case 53: gs.chars[id].id=33; break;

        // Flowing water
        case 34: gs.chars[id].id=35; break;
        case 35: gs.chars[id].id=34; break;
        case 54: gs.chars[id].id=55; break;
        case 55: gs.chars[id].id=54; break;
        case 74: gs.chars[id].id=75; break;
        case 75: gs.chars[id].id=74; break;

        // Bob animation
        case TILEBOB: gs.chars[id].id=TILEBOB2; break;
        case TILEBOB2: gs.chars[id].id=TILEBOB; break;

        default:
          break;
      }
    }

    gs.anim=8;
  }
  else
    gs.anim--;
}

// Generate some particles around an origin
function generateparticles(cx, cy, mt, count, rgb)
{
  for (var i=0; i<count; i++)
  {
    var ang=(Math.floor(rng()*360)); // angle to eminate from
    var t=Math.floor(rng()*mt); // travel from centre
    var r=rgb.r*(rng()*255);
    var g=rgb.g*(rng()*255);
    var b=rgb.b*(rng()*255);

    gs.particles.push({x:cx, y:cy, ang:ang, t:t, r:r, g:g, b:b, a:1.0, s:(rng()<0.05)?2:1});
  }
}

// Do processing for particles
function particlecheck()
{
  var i=0;

  // Process particles
  for (i=0; i<gs.particles.length; i++)
  {
    // Move particle
    gs.particles[i].t+=0.5;
    gs.particles[i].y+=(gs.gravity*2);

    // Decay particle
    gs.particles[i].a-=0.007;
  }

  // Remove particles which have decayed
  i=gs.particles.length;
  while (i--)
  {
    if (gs.particles[i].a<=0)
      gs.particles.splice(i, 1);
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

  // Check for particle usage
  particlecheck();

  // When a movement key is pressed, adjust players speed and direction
  if ((gs.keystate!=KEYNONE) || (gs.padstate!=KEYNONE))
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

  // Decrease hurt timer
  if (gs.htime>0) gs.htime--;

  // Decrease water timer
  if (gs.water>0)
  {
    gs.water--;

    // If the water is restarting make sure player isn't in the flow
    if (gs.water==0)
    {
      for (var id=0; id<gs.chars.length; id++)
      {
        if (overlap(gs.x-(SPRITEWIDTH/2), gs.y-(SPRITEHEIGHT/2), SPRITEWIDTH*2, SPRITEHEIGHT*2, gs.chars[id].x, gs.chars[id].y, TILEWIDTH, TILEHEIGHT))
        {
          switch (gs.chars[id].id)
          {
            case 34:
            case 35:
            case 54:
            case 55:
            case 74:
            case 75:
              gs.water=TARGETFPS;
              break;

            default:
              break;
          }
        }
      }
    }
  }

  // Update any animation frames
  updateanimation();
}

// Check for collision between player and character/collectable
function updateplayerchar()
{
  // Generate player hitbox
  var px=gs.x+(SPRITEWIDTH/3);
  var py=gs.y+((SPRITEHEIGHT/5)*2);
  var pw=(SPRITEWIDTH/3);
  var ph=(SPRITEHEIGHT/5)*3;

  for (var id=0; id<gs.chars.length; id++)
  {
    // Check for collision with this char
    if (overlap(px, py, pw, ph, gs.chars[id].x, gs.chars[id].y, TILEWIDTH, TILEHEIGHT))
    {
      switch (gs.chars[id].id)
      {
        case TILEKEY:
          gs.key++;

          // Shiny
          generateparticles(gs.chars[id].x+(TILEWIDTH/2), gs.chars[id].y+(TILEHEIGHT/2), 16, 16, {r:0xff, g:0xff, b:1});

          // Remove from map
          gs.chars[id].del=true;

          // Remove all locks from map
          for (var id2=0; id2<gs.tiles.length; id2++)
            if (gs.tiles[id2]-1==TILELOCK)
              gs.tiles[id2]=TILENONE;
          break;

        case TILEHEART:
          // Remove from map
          gs.chars[id].del=true;

          gs.lives++;
          if (gs.lives>MAXLIVES) gs.lives=MAXLIVES;
          break;

        case TILECOIN:
        case TILECOIN2:
        case TILEGEM:
          // Remove from map
          gs.chars[id].del=true;
          break;

        case TILESPIKES:
          if (gs.fall)
          {
            if (gs.htime==0)
            {
              // Lose health (when not already hurt)
              if (gs.lives>0)
                gs.lives-=0.5;

              gs.htime=(TARGETFPS*2);

              gs.jump=true;
              gs.fall=false;

              gs.vs=-(gs.jumpspeed*0.80); // Fly up in the air
            }
          }
          break;

        // Bob
        case TILEBOB:
          if (gs.htime==0)
          {
            // Lose health (when not already hurt)
            if (gs.lives>0)
              gs.lives-=0.5;

            gs.htime=(TARGETFPS*2);
          }
          break;

        // Running water
        case 34:
        case 35:
        case 54:
        case 55:
        case 74:
        case 75:
          if ((gs.water==0) && (gs.hs!=0))
          {
            // Move back to previous position
            gs.x=gs.px;
            gs.y=gs.py;

            gs.hs=0;
          }
          break;

        case TILEBUTTON:
          gs.water=5*TARGETFPS;
          break;

        default:
          break;
      }
    }
  }
}

// Sort the chars so sprites are last (so they appear in front of non-solid tiles)
function sortChars(a, b)
{
  const sprites=[TILEBOB, TILEBOB2, TILEBOBSLEEP];

  if (a.id!=b.id) // extra processing if they are different ids
  {
    var aspr=(sprites.includes(a.id)); // see if a is a sprite
    var bspr=(sprites.includes(b.id)); // see if b is a sprite

    if (aspr==bspr) return 0; // both sprites, so don't swap

    if (aspr)
      return 1; // sort a after b
    else
      return -1; // sort a before b
  }

  return 0; // same id
}

function countchars(tileids)
{
  var found=0;

  for (var id=0; id<gs.chars.length; id++)
    if (tileids.includes(gs.chars[id].id))
      found++;

  return found;
}

function updatecharAI()
{
  var id=0;
  var id2=0;
  var nx=0; // new x position
  var ny=0; // new y position
  var ox=0; // old x position
  var oy=0; // old y position

  for (id=0; id<gs.chars.length; id++)
  {
    ox=gs.chars[id].x;
    oy=gs.chars[id].y;

    switch (gs.chars[id].id)
    {
      case TILEBOBSLEEP: // Wake up if player is close by
        if (calcHypotenuse(Math.abs(gs.x-gs.chars[id].x), Math.abs(gs.y-gs.chars[id].y))<(TILEWIDTH*3))
        {
          gs.chars[id].id=TILEBOB;
          continue;
        }
        break;

      case TILEBOB:
      case TILEBOB2:
        // Sleep if player far away
        if (calcHypotenuse(Math.abs(gs.x-gs.chars[id].x), Math.abs(gs.y-gs.chars[id].y))>(TILEWIDTH*10))
        {
          gs.chars[id].id=TILEBOBSLEEP;
          continue;
        }

        nx=(gs.chars[id].x+=gs.chars[id].hs); // calculate new x position
        if ((collide(nx, gs.chars[id].y, TILEWIDTH, TILEHEIGHT)) || // blocked by something
            (
              (!collide(nx+(gs.chars[id].flip?(TILEWIDTH/2)*-1:(TILEWIDTH)/2), gs.chars[id].y, TILEWIDTH, TILEHEIGHT)) && // not blocked forwards
              (!collide(nx+(gs.chars[id].flip?(TILEWIDTH/2)*-1:(TILEWIDTH)/2), gs.chars[id].y+(TILEWIDTH/2), TILEWIDTH, TILEHEIGHT)) // not blocked forwards+down (i.e. edge)
            ))
          gs.chars[id].hs*=-1; // Turn around
        else
          gs.chars[id].x=nx;
        break;

      default:
        break;
    }
  }

  // Remove anything marked for deletion
  id=gs.chars.length;
  while (id--)
  {
    if (gs.chars[id].del)
    {
      if (gs.chars[id].ttl>0)
        gs.chars[id].ttl--;

      if (gs.chars[id].ttl==0)
      {
        switch (gs.chars[id].id)
        {
          case TILECOIN:
          case TILECOIN2:
            gs.score++;
            break;

          case TILEGEM:
            gs.score+=5;
            break;

          default:
            break;
        }

        gs.chars.splice(id, 1);
      }
    }
  }
}

// Update game state
function update()
{
  // Apply keystate/physics to player
  updatemovements();

  // Update other character movements / AI
  updatecharAI();

  // Check for player/character/collectable collisions
  updateplayerchar();

  gs.frame++;

  if (gs.frame>=(5*6))
  {
    gs.frame=1;

    gs.trail++;
    if (gs.trail>=RAINBOWCOLS.length) gs.trail=0;
  }
}

function drawlevel()
{
  for (var y=0; y<gs.height; y++)
  {
    for (var x=0; x<gs.width; x++)
    {
      var tile=parseInt(gs.tiles[(y*gs.width)+x]||1, 10);

      switch (tile-1)
      {
        case TILEBLOCK:
          if ((overlap(gs.x, gs.y+(SPRITEHEIGHT), SPRITEWIDTH, SPRITEHEIGHT, x*TILEWIDTH, y*TILEHEIGHT, TILEWIDTH, TILEHEIGHT)) && (playerlook(gs.x, gs.y+1)-1==TILEBLOCK))
            drawtile(TILEBLOCKSQUASH, x*TILEWIDTH, (y*TILEHEIGHT)+3);
          else
            drawtile(tile-1, x*TILEWIDTH, y*TILEHEIGHT);
          break;

        default:
          drawtile(tile-1, x*TILEWIDTH, y*TILEHEIGHT);
          break;
      }
    }
  }
}

// Draw chars
function drawchars()
{
  for (var id=0; id<gs.chars.length; id++)
  {
    switch (gs.chars[id].id)
    {
      // Hide water when turned off
      case 34:
      case 35:
      case 54:
      case 55:
      case 74:
      case 75:
        if (gs.water==0)
          drawspritetile(gs.chars[id]);
        break;

      case TILEBUTTON:
        if (gs.water>0)
          drawspritetile({id:TILEBUTTON2, x:gs.chars[id].x, y:gs.chars[id].y});
        else
          drawspritetile(gs.chars[id]);
        break;


      default:
        drawspritetile(gs.chars[id]);
        break;
    }
  }
}

// Draw single particle
function drawparticle(particle)
{
  var x=particle.x+(particle.t*Math.cos(particle.ang));
  var y=particle.y+(particle.t*Math.sin(particle.ang));

  // Clip to what's visible
    if (((Math.floor(x)-gs.xoffset)<0) && // clip left
    ((Math.floor(x)-gs.xoffset)>XMAX) && // clip right
    ((Math.floor(y)-gs.yoffset)<0) && // clip top
    ((Math.floor(y)-gs.yoffset)>YMAX))   // clip bottom
  return;

  gs.ctx.fillStyle="rgba("+particle.r+","+particle.g+","+particle.b+","+particle.a+")";
  gs.ctx.fillRect(Math.floor(x)-gs.xoffset, Math.floor(y)-gs.yoffset, particle.s, particle.s);
}

// Draw particles
function drawparticles()
{
  for (var i=0; i<gs.particles.length; i++)
    drawparticle(gs.particles[i]);
}

// Determine distance (Hypotenuse) between two lengths in 2D space (using Pythagoras)
function calcHypotenuse(a, b)
{
  return(Math.sqrt((a * a) + (b * b)));
}

// Check for level being completed
function islevelcompleted()
{
  // This is defined as ..
  //   no coins
  //   no gems
  //   standing on rainbow

  return ((countchars([TILECOIN, TILECOIN2, TILEGEM])==0) &&
          ((playerlook(gs.x, gs.y)==TILERAINBOW) ||
          (playerlook(gs.x, gs.y)==TILERAINBOW2)));
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

  // Draw the particles
  drawparticles();

  // Draw the rainbow trail
  if ((gs.hs!=0) || (gs.vs!=0))
    generateparticles(gs.x+(SPRITEWIDTH/2), gs.y+(SPRITEHEIGHT/2), 4, 2, RAINBOWCOLS[gs.trail]);

  // Draw unicorn sprite
  if ((gs.htime==0) || ((gs.htime%7)<=4)) // Flash when hurt
  {
    if (gs.jump)
      drawsprite(gs.x, gs.y+1, 7);
    else
      if (gs.fall)
      drawsprite(gs.x, gs.y+1, 8);
    else
      if (gs.duck)
      drawsprite(gs.x, gs.y+10, 7);
    else
      drawsprite(gs.x, playerlook(gs.x, gs.y+1)-1==TILEBLOCK?gs.y+4:gs.y+1, gs.hs==0?0:Math.floor(gs.frame/5)+1);
  }

  // Draw hearts left
  drawlives();
}

// Load level
function loadlevel(level)
{
  // Make sure it exists
  if ((level>=0) && (levels.length-1<level)) return;

  // Set current level to new one
  gs.level=level;

  // Start level with water on
  gs.water=0;

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
          case TILEUNICORN:
            gs.x=obj.x; // Set current position
            gs.y=obj.y-(TILEHEIGHT);
            gs.px=gs.x;
            gs.py=gs.y;

            gs.sx=gs.x; // Set start position
            gs.sy=gs.y;

            gs.vs=0; // Start not moving
            gs.hs=0;
            gs.jump=false;
            gs.fall=false;
            gs.duck=false;
            gs.dir=0;
            gs.flip=false;
            gs.particles=[];
            break;

          case TILEBOB:
          case TILEBOB2:
          case TILEBOBSLEEP:
            // Assign a random direction
            obj.hs=(rng()<0.5)?0.5:-0.5;
            gs.chars.push(obj);
            break;

          default:
            gs.chars.push(obj); // Everything else
            break;
        }
      }
    }
  }

  // Sort chars such sprites are at the end (so are drawn last, i.e on top)
  gs.chars.sort(sortChars);

  // Move scroll offset to player with damping disabled
  scrolltoplayer(false);
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

    // Gamepad support
    try
    {
      if (!!(navigator.getGamepads))
        gamepadscan();
    }
    catch(e){}

    // Process "steps" since last call
    while (gs.acc>gs.step)
    {
      update();

      gs.acc-=gs.step;
    }

    redraw();

    // Check for level failed
    if ((gs.state==STATEPLAYING) && (gs.lives==0))
    {
      gs.xoffset=0;
      gs.yoffset=0;
    
//      gs.state=STATEFAIL;
      
      // Reduce issues when inputs held
      clearinputstate();
      
//      gs.timeline.reset().add(10*1000, undefined).addcallback(failgame).begin(0);
    }

    // Check for level completed
    if ((gs.state==STATEPLAYING) && (islevelcompleted()))
    {
      // Add to score based on how much health is left
      gs.score+=(10*gs.lives);
      
      // Reset scroll offsets
      gs.xoffset=0;
      gs.yoffset=0;

      if ((gs.level+1)==levels.length)
      {
        // End of game
//        gs.state=STATECOMPLETE;
    
        // Reduce issues when inputs held
        clearinputstate();

//        gs.timeline.reset().add(10*1000, undefined).addcallback(endgame).begin(0);
      }
      else
        newlevel(gs.level+1);
    }

    // If the update took us out of play state then stop now
    if (gs.state!=STATEPLAYING)
      return;
  }

  // Remember when we were last called
  gs.lasttime=timestamp;

  // Request we are called on the next frame, but only if still playing
  if (gs.state==STATEPLAYING)
    window.requestAnimationFrame(rafcallback);
}

// New level screen
function newlevel(level)
{
  gs.level=level;

  gs.state=STATEPLAYING;
  loadlevel(gs.level);
  window.requestAnimationFrame(rafcallback);
}

// Called once init is complete
function start()
{
  gs.timeline.reset();

  newlevel(0);
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
