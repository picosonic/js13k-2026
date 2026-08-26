let A, t, n, run=0;
const bpm=140; // Beats per minute

var chipt={
  pass:0,
  dt:60/bpm/2,

  // Note frequencies in Hz (rounded)
  F:{
    "C3":131,"Eb2":78,"Eb3":156,"G2":98,"Ab2":104,"Bb2":117,
    "C5":523,"D5":587,"Eb5":622,"F5":698,"G5":784,"Bb5":932,"C6":1047
  },

  // Melody
  mel:["C5","Eb5","G5","Bb5","G5","Eb5","D5","G5",
       "C6","Bb5","G5","Eb5","F5","G5","Bb5","G5"],

  // Bassline
  bas:["C3","C3","Ab2","Ab2","Eb3","Eb3","Bb2","Bb2",
       "C3","C3","Ab2","Eb5","Eb3","D5","Eb5","Bb2"],

  osc:function(f, s, d, v, type="square", det=1){
    let o=A.createOscillator(), g=A.createGain();

    o.type=type; o.frequency.value=f*det;

    g.gain.setValueAtTime(.0001, s);
    g.gain.exponentialRampToValueAtTime(v, s+.005);
    g.gain.exponentialRampToValueAtTime(.0001, s+d);
    o.connect(g).connect(A.destination); o.start(s); o.stop(s+d+.02);
  },

  noise:function(s, d, v, fr){
    let b=A.createBuffer(1, A.sampleRate*d, A.sampleRate),
    x=b.getChannelData(0);

    for(let i=0; i<x.length; i++) x[i]=Math.random()*2-1;

    let o=A.createBufferSource(), f=A.createBiquadFilter(), g=A.createGain();

    o.buffer=b; f.type="bandpass"; f.frequency.value=fr;
    g.gain.setValueAtTime(v, s);
    g.gain.exponentialRampToValueAtTime(.0001, s+d);
    o.connect(f).connect(g).connect(A.destination); o.start(s);
  },

  kick:function(s){
    let o=A.createOscillator(), g=A.createGain();

    o.frequency.setValueAtTime(130, s);
    o.frequency.exponentialRampToValueAtTime(45, s+.12);
    g.gain.setValueAtTime(.3, s);
    g.gain.exponentialRampToValueAtTime(.0001, s+.15);
    o.connect(g).connect(A.destination); o.start(s); o.stop(s+.16);
  },

  bar:function(s){
    chipt.mel.forEach((x, i)=>{
      let q=s+i*chipt.dt;

      if (chipt.pass%2==0) chipt.osc(chipt.F[x], q, chipt.dt*.82, .05); // melody

      if (chipt.pass%4==1) chipt.osc(chipt.F[chipt.bas[Math.floor(i/2)]], q, chipt.dt*1.8, .18, "triangle"); // base
      if (chipt.pass%4==2) chipt.osc(chipt.F[chipt.bas[i]], q, chipt.dt*.9, .18, "triangle"); // base
      if (chipt.pass%4==3) chipt.osc(chipt.F[chipt.bas[i]], q, chipt.dt*.45, .18, "triangle"); // base

      // percussion
      if (i%4==0) chipt.kick(q);
      if (i==4||i==12) chipt.noise(q, .12, .12, 2500);
      if (i%2) chipt.noise(q, .045, .045, 7000);
    });
  },

  start:function(){
    if (run) return; // prevent it starting when already running

    if (!A) A=new AudioContext;

    run=1;
    t=A.currentTime+.05; // Timestamp for next note

    (function loop(){
      // Prevent
      if (!run) return;

      // Inject notes
      for (let i=0; i<3; i++)
        chipt.bar(t+i*16*chipt.dt);

      // Advance note timestamp
      t+=48*chipt.dt;

      // Keep track of which pass of the noteset we are on
      chipt.pass++;

      // Schedule next iteration
      setTimeout(loop, 48*chipt.dt*1000*.7);
    })();
  }
};
