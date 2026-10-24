/* Game Night sound effects, haptics, confetti and number count-ups.
   Every sound is synthesized with Web Audio, so there are no files to download. */
window.GN_FX=(function(){
  "use strict";
  const KEY="flaudjer:sfx";
  let on=true;try{const v=localStorage.getItem(KEY);if(v!==null)on=JSON.parse(v)}catch(e){}
  const reduce=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;
  let ctx=null,master=null,quiet=1;
  function ac(){
    if(!ctx){const A=window.AudioContext||window.webkitAudioContext;if(!A)return null;ctx=new A();master=ctx.createGain();master.gain.value=0.55;master.connect(ctx.destination)}
    if(ctx.state==="suspended")ctx.resume().catch(()=>{});
    return ctx;
  }
  function tone(freq,dur,o){
    o=o||{};const c=ac();if(!c)return;
    const t=c.currentTime+(o.delay||0);
    const osc=c.createOscillator(),g=c.createGain();
    osc.type=o.type||"sine";osc.frequency.setValueAtTime(freq,t);
    if(o.slide)osc.frequency.exponentialRampToValueAtTime(o.slide,t+dur);
    if(o.vib){const l=c.createOscillator(),lg=c.createGain();l.frequency.value=o.vib;lg.gain.value=freq*0.03;l.connect(lg);lg.connect(osc.frequency);l.start(t);l.stop(t+dur)}
    const v=(o.vol||0.3)*quiet;
    g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(v,t+(o.attack||0.008));
    g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    osc.connect(g);g.connect(master);osc.start(t);osc.stop(t+dur+0.05);
  }
  let noiseBuf=null;
  function noise(dur,o){
    o=o||{};const c=ac();if(!c)return;
    if(!noiseBuf){noiseBuf=c.createBuffer(1,c.sampleRate,c.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1}
    const t=c.currentTime+(o.delay||0);
    const src=c.createBufferSource();src.buffer=noiseBuf;
    const f=c.createBiquadFilter();f.type=o.ftype||"bandpass";f.frequency.setValueAtTime(o.filter||1500,t);f.Q.value=o.q||1;
    if(o.sweep)f.frequency.exponentialRampToValueAtTime(o.sweep,t+dur);
    const g=c.createGain();const v=(o.vol||0.2)*quiet;
    g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(v,t+(o.attack||0.01));g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    src.connect(f);f.connect(g);g.connect(master);src.start(t);src.stop(t+dur+0.05);
  }
  const notes=(arr,o)=>arr.forEach(([f,d,at])=>tone(f,d,Object.assign({},o,{delay:(o&&o.delay||0)+at})));
  const S={
    tap:()=>tone(720,0.05,{type:"triangle",vol:0.1}),
    pop:()=>tone(420,0.08,{slide:980,vol:0.18,type:"sine"}),
    join:()=>notes([[523,0.1,0],[784,0.16,0.08],[1047,0.2,0.16]],{type:"triangle",vol:0.22}),
    flip:()=>{noise(0.16,{vol:0.22,filter:1800,sweep:6500,q:0.7});tone(300,0.08,{slide:600,vol:0.06})},
    deal:()=>{for(let i=0;i<6;i++)noise(0.06,{vol:0.16,filter:3200,q:1.5,delay:i*0.075})},
    whoosh:()=>noise(0.45,{vol:0.2,filter:350,sweep:3200,q:0.8}),
    tick:()=>tone(1250,0.035,{type:"square",vol:0.07}),
    buzzer:()=>{tone(130,0.7,{type:"sawtooth",vol:0.2});tone(138,0.7,{type:"sawtooth",vol:0.16})},
    vote:()=>tone(880,0.09,{type:"sine",vol:0.16,slide:1400}),
    drum:(len)=>{len=len||0.9;let t=0,gap=0.09;while(t<len){noise(0.05,{vol:0.13+0.12*(t/len),filter:1800,q:0.9,delay:t});t+=gap;gap=Math.max(0.03,gap*0.9)}noise(0.25,{vol:0.3,filter:900,q:0.6,delay:len})},
    win:()=>{notes([[523,0.14,0],[659,0.14,0.12],[784,0.14,0.24],[1047,0.5,0.36]],{type:"square",vol:0.12});notes([[262,0.5,0.36],[392,0.5,0.36]],{type:"triangle",vol:0.14})},
    lose:()=>notes([[392,0.32,0],[370,0.32,0.32],[349,0.32,0.64],[330,0.9,0.96]],{type:"sawtooth",vol:0.12,vib:6}),
    accept:()=>notes([[784,0.12,0],[1175,0.24,0.09]],{type:"triangle",vol:0.24}),
    reject:()=>tone(190,0.3,{type:"square",vol:0.14,slide:110}),
    solve:()=>notes([[1047,0.1,0],[1319,0.1,0.07],[1568,0.1,0.14],[2093,0.3,0.21]],{type:"sine",vol:0.18}),
    tie:()=>{tone(260,0.18,{slide:560,vol:0.2});tone(560,0.22,{slide:240,vol:0.2,delay:0.18})},
    swoosh:()=>noise(0.25,{vol:0.12,filter:2400,sweep:600,q:0.6})
  };
  function play(name,arg){if(!on||!S[name])return;try{S[name](arg)}catch(e){}}
  function vibrate(p){try{if(on&&navigator.vibrate)navigator.vibrate(p)}catch(e){}}

  /* confetti in the family colors */
  let cv=null,parts=[],raf=0;
  function confetti(amount){
    if(reduce)return;
    if(!cv){cv=document.createElement("canvas");cv.className="confetti";document.body.appendChild(cv)}
    const dpr=Math.min(2,window.devicePixelRatio||1);cv.width=innerWidth*dpr;cv.height=innerHeight*dpr;
    const cols=["#c8211a","#f6c21c","#2f9a2b","#fffaee","#3fb02f"];
    const n=amount||160;
    for(let i=0;i<n;i++)parts.push({x:innerWidth*(0.15+Math.random()*0.7),y:innerHeight*0.35,vx:(Math.random()-0.5)*14,vy:-Math.random()*16-6,s:5+Math.random()*7,r:Math.random()*6,vr:(Math.random()-0.5)*0.4,c:cols[i%cols.length],life:0});
    cancelAnimationFrame(raf);
    const g=cv.getContext("2d");
    (function step(){
      g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,innerWidth,innerHeight);
      parts.forEach(p=>{p.life++;p.vy+=0.45;p.vx*=0.99;p.x+=p.vx;p.y+=p.vy;p.r+=p.vr;
        g.save();g.translate(p.x,p.y);g.rotate(p.r);g.fillStyle=p.c;g.globalAlpha=Math.max(0,1-p.life/160);g.fillRect(-p.s/2,-p.s/4,p.s,p.s/2);g.restore()});
      parts=parts.filter(p=>p.y<innerHeight+40&&p.life<170);
      if(parts.length)raf=requestAnimationFrame(step);else g.clearRect(0,0,innerWidth,innerHeight);
    })();
  }
  function countUp(el,from,to,ms){
    if(reduce||from===to){el.textContent=String(to);return}
    const t0=performance.now();ms=ms||900;
    (function f(t){const k=Math.min(1,(t-t0)/ms);const e=1-Math.pow(1-k,3);el.textContent=String(Math.round(from+(to-from)*e));if(k<1)requestAnimationFrame(f)})(t0);
  }
  return {
    play,vibrate,confetti,countUp,reduce,
    unlock(){ac()},
    isOn(){return on},
    setOn(v){on=!!v;try{localStorage.setItem(KEY,JSON.stringify(on))}catch(e){}},
    setQuiet(q){quiet=q}
  };
})();

/* Announcer: the PFLX voice (Kenney Voiceover Pack #1, CC0), same clips as X-Live and Battle Arena.
   Female is the default, like the Arena; the host can switch to male or off. Plays on the TV only. */
window.GN_ANN=(function(){
  "use strict";
  const KEY="flaudjer:voice";
  let voice="female";try{const v=JSON.parse(localStorage.getItem(KEY));if(v==="male"||v==="off"||v==="female")voice=v}catch(e){}
  const cache={};let queue=[],busy=false,onDuck=null;const lastAt={};
  const LINES={
    win:["mission_completed","objective_achieved","you_win","congratulations"],
    lose:["mission_failed","game_over","you_lose"],
    tie:["its_a_tie"],hurry:["hurry_up"],timeout:["time_over"],
    correct:["correct"],wrong:["wrong"],solved:["objective_achieved"],first:["new_highscore"],
    agenda:["congratulations"],power:["power_up"],level:["level_up"]
  };
  function src(name){return "announcer/"+voice+"/"+name+".mp3"}
  function clip(name){const k=voice+"/"+name;if(!cache[k]){const a=new Audio(src(name));a.preload="auto";cache[k]=a}return cache[k]}
  function next(){
    if(busy||!queue.length)return;
    const n=queue.shift();const a=clip(n).cloneNode();a.volume=1;busy=true;
    if(onDuck)onDuck(true);
    const done=()=>{busy=false;if(!queue.length&&onDuck)onDuck(false);setTimeout(next,40)};
    a.onended=done;a.onerror=done;a.play().catch(done);
  }
  function enabled(){return voice!=="off"&&(!window.GN_FX||window.GN_FX.isOn())}
  function say(){if(!enabled())return;for(const n of arguments)queue.push(n);next()}
  function line(key,o){
    o=o||{};if(!enabled())return;
    const now=Date.now();if(o.throttle&&now-(lastAt[key]||0)<o.throttle)return;lastAt[key]=now;
    const list=LINES[key];if(!list)return;say(list[Math.floor(Math.random()*list.length)]);
  }
  function round(n){if(n>=1&&n<=10)say("round",String(n));else say("round")}
  function readySetGo(){say("ready","set","go")}
  function count(n){if(n>=1&&n<=10)say(String(n))}
  function preload(){["round","ready","set","go","1","2","3","hurry_up","time_over","its_a_tie","mission_completed","mission_failed","correct","wrong"].forEach(clip)}
  return {say,line,round,readySetGo,count,preload,
    voice(){return voice},
    setVoice(v){voice=v;try{localStorage.setItem(KEY,JSON.stringify(v))}catch(e){}if(v!=="off")setTimeout(()=>say("ready"),50)},
    setDuck(fn){onDuck=fn},
    clear(){queue=[]}};
})();
