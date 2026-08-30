# Dev Diary / Postmortem

This is my ninth game jam entry

As in my previous years entering the competition, around the time the theme was announced I created a new project template with updated build and minify steps from my entry last year

As soon as the theme was announced I had some thoughts as to what kind of game I wanted to create to fit the theme, here as some of my initial thoughts/notes/ideas ..

Unicorns and Rainbows
---------------------
* Unicorns are a well known mythical beast which are horses with a single horn on their forehead
* Unicorns often depicted with a white body
* The horn of a unicorn - the alicorn, is said to poses magical properties able to purify water, heal sicknesses and counteract poison. This was once sold powdered in europe (actually walrus or narwhal tusks)
* Alicorn can also mean a winged unicorn
* Unicorns are the national animal of Scotland
* Scottish Unicorns were united with English lions to create the royal crest of king James VI
* In business parlance, a unicorn is a startup company valued at over a billion dollars
* Unicorns are also known as Monocerus
* Unicorns are often depicted as wild woodland animals, usually solitary
* Rainbows are intrinsicly linked to Unicorns
* True rainbows only appear opposite in the sky to the sun
* No two people can see the exact same rainbow
* All rainbows are actually complete circles, which can be seen if viewed from height, although at ground level we normally only see the top half
* The end of the rainbow cannot be reached because it moves as you do, the end was purported to contain a pot of gold
* Rainbows can appear infront or behind of scenery
* At night you can see moonbows when the light source is the sunlight reflected from the moon
* A second feinter rainbow can often be seen 10 degrees above the main rainbow with the colours reversed
* The light in the sky is often darker above the rainbow and lighter below
* The 7 colours of the rainbow are just different frequencies of light. Red 400-480THz, Orange 480-510THz, Yellow 510-530THz, Green 530-600THz, Blue 600-670THz, Indigo 670-700THz, Violet 700-750THz

Game ideas
----------
Usually the JS13k themes are related to death and destruction, so I really didn't know where to start with something like unicorns and rainbows, haha. Anyways to try to cure my "blank page syndrome", I asked AI for some ideas. Here's a few of the better ones.
* Unicorn Bakery - Where you run a bakery and have to run around making cupcake orders matching ingredients by colour
* Rainbow rescue - Unicorns are trapped in various places, you need to jump between colours to rescue them
* Cloud Unicorn Delivery - You're a delivery driver taking magical packages between floating islands. Make rainbow bridges with your finite rainbow power 
* Rainbow Hooves - A rhythm game where you tap when a moving unicorn steps on specific coloured rainbow tiles. Longer streaks of matches give the dancing unicorn a longer rainbow trail
* Rainbow Rush - Racing across clouds collecting rainbow colours. Each colour gives you a different ability. You need to complete the rainbow before the storm comes

Here is a rough diary of progress as posted on [Twitter](https://twitter.com/femtosonic), taken from notes and [commit logs](https://github.com/picosonic/js13k-2026/commits/)..

19th August
-----------
The theme was annouced whilst I was on holiday in Spain chasing the [total solar eclipse](https://en.wikipedia.org/wiki/Solar_eclipse_of_August_12,_2026), so I didn't really get much of a chance to start dev until I was back home.

20th August
-----------
As my entry last year lost quite a lot of points by not having any audio, and in any case I ran out of time/space to put any in - I decided to add music first. So with this in mind I started looking at compact ways to make reasonable sounding music, with melody, bass and percussion.

21st August
-----------
After playing around with various looping melodies, I decided on making slight adjustments to the various aspects of the track so that although it's quite repetitive, it doesn't sound too repetitive due to adjustments. Made a start on main character sprite.

24th August
-----------
Added [animation frame callback](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame) mechanism which will form the core of [game loop](https://en.wikipedia.org/wiki/Video_game_programming#Game_structure). Added beginnings of platformer physics, included a box which can be controlled to move around and jump.

25th August
-----------
Worked on unicorn character. Separated front and rear legs, developed walk animation by drawing all components of unicorn from spritesheet and rotating legs as required using anchor points on the body and leg sections.

26th August
-----------
Tested minified version and found the music wasn't working. This was due to the note frequency table keys being "optimised" which broke the lookups from melody and bassline sequences because the key names no longer existed. The fix was to change the frequency table keys to be strings.

Tried to simplfy drawing of unicorn character so that instead of drawing the whole character every frame (using each of the individual parts including rotates and translations to put the legs in the right place/pose) I could do this create step once then use capture and use the generated bitmap from then on for drawing  (likely a slight performance increase too). In theory I could also horizontally flip each pose much easier than working out how to draw the character from scratch each time but the other way around. However I ended up breaking it completely.

27th August
-----------
With a fresh head and more sleep I decided to try to get character drawing working the way I had intended to yesterday. Firstly it seemed that the rotate and translate steps hen drawing the legs were causing issues - but it was actually becuase I had a save/restore canvas before and after the translations and the restore was being done to a different canvas (due to copy/paste typo). However making a large spritesheet and drawing all the poses onto it, then extracting them using getImageData() worked better. I then tried to flip all the poses, however this failed to work because putImageData() doesn't honour translations like drawImage() does. Once I figured this out, it all started working as I originally wanted.

28th August
-----------
Added level drawing and navigating. Fixed flipped sprite creation - when drawing onto a flipped canvas, the coordinates also need to be flipped.

Added character ducking and coyote time (being allowed to jump for a short while after leaving a platform)

29th August
-----------
Added some more state ready for game statemachine. Determined that lives will show as 7 hearts (one for each colour of rainbow), but will go down in half steps. Added rainbow coloured trail which emits particles when moving that cycle through the rainbow.

Wrestled with flipped sprites being inconsistent, sometimes they are fine, other times not. What seemed to make a difference was putting the storing of sprites into the onload handler and using this to save them (incase the loop moved onwards), then doing the flip on the this object.

Added char animation for flag to wave, coins to rotate, and water to flow. Made alterations to tilemap bitmap, rearranging, reducing e.t.c.

30th August
-----------
Fix broken rainbow trail and broken sprite animations. Added tile id constants ready for logic code. Added placeholder for hurt time, so that we can't be hurt more and the player will flash for a period of time to indicate temporary invulnerability.

Set starting point for main character to they don't always start at top left. Added char collision detection so that keys, coins and gems can be collected. When player is standing on blocks with faces they now lower and grimmace.
