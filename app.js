/* Johnson Family Game Night.
   The TV hosts a live room (Supabase Realtime); phones join with a PIN or QR.
   Private cards come from the `flaudjer` edge function, so each phone only ever sees its own card.
   Games: Flaugin, Copycat, The Glitch, Secret Agenda, Rulebreakers. */
(function(){
"use strict";
const SB_URL="https://hyxiagexyptzvetqjmnj.supabase.co";   // PFLX Applications project (gamenight_* tables)
const SB_KEY="sb_publishable_BtN0DbvxdMjshCpuc7mS_g_izfzJJ5j";
const SRV="pflx";   // rooms and seats saved before the server move are ignored
const sb=window.supabase?window.supabase.createClient(SB_URL,SB_KEY,{auth:{persistSession:false,autoRefreshToken:false}}):null;
const SITE=location.origin+location.pathname.replace(/index\.html$/,"");
const C=window.GN_CONTENT||{};
const FX=window.GN_FX||{play(){},vibrate(){},confetti(){},countUp(e,a,b){e.textContent=String(b)},unlock(){},isOn(){return false},setOn(){},setQuiet(){}};
const ANN=window.GN_ANN||{say(){},line(){},round(){},readySetGo(){},count(){},preload(){},voice(){return "off"},setVoice(){},setDuck(){},clear(){}};
/* Transition scenes: red, gold and green bars sweep across with a title card between screens. */
const Trans=(function(){
  let busyUntil=0,t1=0;
  function play(big,small,o){
    o=o||{};const box=$("trans");if(!box)return;
    if(FX.reduce&&!big)return;
    box.querySelector(".trans-card b").textContent=big||"";
    box.querySelector(".trans-card small").textContent=small||"";
    box.classList.toggle("bare",!big);box.classList.remove("go");void box.offsetWidth;box.classList.add("go");
    const len=big?(o.long?1900:1500):750;busyUntil=Date.now()+len;
    clearTimeout(t1);t1=setTimeout(()=>box.classList.remove("go"),len+60);
    if(big&&!o.quiet)FX.play("swoosh");
  }
  return {play,busy:()=>Date.now()<busyUntil};
})();
function sceneFor(game,phase,round){
  const G=GAMES[game]||{name:"Game Night"};
  if(phase==="cards")return ["Round "+round,G.name];
  if(phase==="play")return ["Open the gate!","Rulebreakers · Round "+round];
  if(phase==="clues")return ["Clue time!","One word each"];
  if(phase==="talk")return game==="copycat"?["Debate!","Sneak in your mission"]:game==="glitch"?["Investigate!","Ask questions"]:["Make your case!","Debate and make deals"];
  if(phase==="vote")return ["Vote!",G.name];
  if(phase==="final")return ["Final vote!",G.name];
  if(phase==="result")return ["Drumroll…","The reveal"];
  if(phase==="lobby")return [G.name,"Up next"];
  return null;
}
let booted=false;
function animIn(node){if(!node||FX.reduce)return;node.classList.remove("view-in");void node.offsetWidth;node.classList.add("view-in");clearTimeout(node._animT);node._animT=setTimeout(()=>node.classList.remove("view-in"),1200)}
/* TV-side sounds: the TV and one-phone games get effects and the announcer; players' phones get quieter effects and vibration. */
function tvSound(){return mode==="host"||mode==="local"||mode==="home"}

const PACKS={
  animals:{name:"Animals",blurb:"Furry, scaly, feathery",words:["Giraffe","Penguin","Elephant","Octopus","Kangaroo","Hamster","Crocodile","Owl","Dolphin","Zebra","Turtle","Panda","Bee","Flamingo","Horse","Shark"]},
  food:{name:"Food",blurb:"Snacks and dinners",words:["Pizza","Pancakes","Spaghetti","Watermelon","Popcorn","Ice cream","Sandwich","Mango","Sushi","Tacos","Cereal","Carrot","Cupcake","Fried rice","Banana","Cheese"]},
  house:{name:"Around the House",blurb:"Things you'd find at home",words:["Toothbrush","Sofa","Fridge","Pillow","Washing machine","Lamp","Bathtub","Remote control","Mirror","Backpack","Umbrella","Blanket","Doorbell","Microwave","Broom","Stairs"]},
  places:{name:"Places",blurb:"Where would you be?",words:["Beach","Zoo","Library","Airport","Supermarket","Hospital","Playground","Movie theater","Farm","Swimming pool","Museum","Train station","Camping tent","Bakery","Space station","Castle"]},
  sports:{name:"Sports & Games",blurb:"Play ball!",words:["Basketball","Soccer","Swimming","Tennis","Hide and seek","Skateboard","Chess","Bowling","Karate","Badminton","Tag","Jump rope","Baseball","Volleyball","Surfing","Hopscotch"]},
  jobs:{name:"Jobs",blurb:"Who does what",words:["Teacher","Firefighter","Chef","Doctor","Pilot","Farmer","Astronaut","Dentist","Police officer","Artist","Mail carrier","Vet","Builder","Scientist","Librarian","Lifeguard"]},
  school:{name:"School Day",blurb:"Classroom things",words:["Pencil","Whiteboard","Lunchbox","Recess","Homework","Calculator","Globe","Scissors","School bus","Glue stick","Field trip","Spelling test","Backpack","Gym class","Ruler","Library card"]},
  weather:{name:"Nature & Weather",blurb:"Outside the window",words:["Rainbow","Thunder","Volcano","Snowman","Waterfall","Tornado","Sunset","Mountain","Puddle","Desert","Rainforest","Moon","Ocean","Lightning","Cave","Island"]}
};
const PACK_ORDER=Object.keys(PACKS);

/* What each game needs from the shared screens. */
const GAMES={
  flaugin:{name:"Flaugin",min:3,local:true,seg:"Flaugers",timer:120,timerLabel:"Two-minute talk timer",
    sub:{local:"Everyone shares one phone and takes turns peeking.",host:"Pick a pack, then open a room. Everyone joins on their own phone."},
    rules:["Flaugin’ is said FLAW-jin, and the player doing it is the Flauger (FLAW-jer). It’s Memphis slang for lying or fronting.","Everyone looks at their secret card. The Flauger’s card has no word.","Go around the table. Everyone says one word that fits the secret.","Talk it over, then vote out the player you think is flaugin’.","A caught Flauger gets one guess at the word to steal the round."]},
  copycat:{name:"Copycat",min:3,local:true,seg:"Copycats",timer:90,timerLabel:"90-second debate timer",
    sub:{local:"Everyone shares one phone and peeks at their mission.",host:"Open a room. Everyone gets their mission on their own phone."},
    rules:["Everyone gets a secret mission. The Copycat’s mission is a little different, and they know it.","The TV shows a debate topic. Talk it out while you secretly complete your mission.","Vote for the player you think had the odd mission.","Catch the Copycat: +2 for every correct vote. Copycat escapes: +4."]},
  glitch:{name:"The Glitch",min:3,local:true,seg:"Glitched files",timer:180,timerLabel:"3-minute investigation timer",
    sub:{local:"Everyone shares one phone and reads their case file.",host:"Open a room. Everyone reads their case file on their own phone."},
    rules:["Everyone gets the same case file, except one file has two details changed.","Nobody knows if their file is the glitched one, not even the glitched player.","Ask questions and compare details. Don’t just read your file out loud!","Find the glitch: +3 for every correct vote. Glitch slips through: +4."]},
  agenda:{name:"Secret Agenda",min:3,local:false,seg:null,timer:180,timerLabel:"3-minute debate timer",
    sub:{host:"Open a room. Everyone gets a secret agenda on their phone."},
    rules:["The TV shows a family decision with four choices.","Everyone gets a secret agenda and makes a secret first pick.","Debate and negotiate, then everyone casts a final vote.","Every agenda that comes true scores 3 points. Allies and rivals are revealed at the end."]},
  rules:{name:"Rulebreakers",min:2,local:false,seg:null,timer:0,timerLabel:"",
    sub:{host:"Open a room. Everyone tests words on their own phone."},
    rules:["The gate on the TV has a secret rule.","Type a word or number on your phone. The TV shows ACCEPTED or REJECTED for everyone.","When you think you know the rule, pick it from the list. Guesses are limited (2 by default).","First to crack it: +5. Everyone else who cracks it: +2."]}
};

/* ---------- small helpers ---------- */
const store={
  get(k,d){try{const v=localStorage.getItem("flaudjer:"+k);return v?JSON.parse(v):d}catch(e){return d}},
  set(k,v){try{localStorage.setItem("flaudjer:"+k,JSON.stringify(v))}catch(e){}},
  del(k){try{localStorage.removeItem("flaudjer:"+k)}catch(e){}}
};
const $=id=>document.getElementById(id);
const VIEWS=["vHome","vSetup","vPass","vClues","vVote","vGuess","vResult","vHost","vJoin","vPlayer"];
function show(id){const was=VIEWS.find(v=>!$(v).hidden);if(booted&&was&&was!==id&&!Trans.busy()&&["vHome","vSetup","vJoin","vHost","vPlayer"].includes(id))Trans.play();VIEWS.forEach(v=>{$(v).hidden=v!==id});document.body.classList.toggle("at-home",id==="vHome");window.scrollTo(0,0);if(was!==id&&id!=="vHost"&&id!=="vPlayer")animIn($(id));if(typeof Music!=="undefined")Music.sync()}
function el(tag,attrs,...kids){const e=document.createElement(tag);if(attrs)for(const k in attrs){const v=attrs[k];if(v==null)continue;if(k==="class")e.className=v;else if(k==="text")e.textContent=v;else if(k.startsWith("on"))e[k]=v;else e.setAttribute(k,v)}kids.forEach(c=>c!=null&&e.append(c));return e}
function rnd(n){try{const u=new Uint32Array(1);crypto.getRandomValues(u);return u[0]%n}catch(e){return Math.floor(Math.random()*n)}}
function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=rnd(i+1);[a[i],a[j]]=[a[j],a[i]]}return a}
/* Pick the odd player(s) fairly: whoever had it in the last couple of rounds gets a lower chance, so streaks don't feel rigged. */
function pickFakers(names,count){
  const night=store.get("oddNight",{at:Date.now(),counts:{},recent:[]});
  if(Date.now()-night.at>12*3600e3){night.counts={};night.recent=[]}
  const recent=night.recent,counts=night.counts;
  const minC=Math.min(...names.map(n=>counts[n]||0));
  const weightOf=n=>(recent[0]&&recent[0].includes(n)?0.12:recent[1]&&recent[1].includes(n)?0.45:1)/(1+1.6*((counts[n]||0)-minC));
  const pool=names.map((n,i)=>({i,w:weightOf(n)}));const out=[];
  while(out.length<count&&pool.length){
    const total=pool.reduce((t,x)=>t+x.w,0);let r=(rnd(1e6)/1e6)*total,k=0;
    for(;k<pool.length-1;k++){r-=pool[k].w;if(r<0)break}
    out.push(pool[k].i);pool.splice(k,1);
  }
  out.forEach(i=>counts[names[i]]=(counts[names[i]]||0)+1);
  night.at=Date.now();night.recent=[out.map(i=>names[i])].concat(recent).slice(0,3);store.set("oddNight",night);
  return out;
}
/* Pick a content round we haven't seen lately. */
function pickRound(game,list){
  const key="seen:"+game;let seen=store.get(key,[]);
  let pool=list.map((_,i)=>i).filter(i=>!seen.includes(i));
  if(!pool.length){seen=[];pool=list.map((_,i)=>i)}
  const i=pool[rnd(pool.length)];store.set(key,seen.concat(i).slice(-Math.max(1,list.length-2)));
  return list[i];
}
function fmt(s){s=Math.max(0,Math.round(s));return Math.floor(s/60)+":"+String(s%60).padStart(2,"0")}
function setTag(t){$("roundTag").textContent=t}
let wakeLock=null;
async function keepAwake(){try{if(navigator.wakeLock&&!wakeLock){wakeLock=await navigator.wakeLock.request("screen");wakeLock.addEventListener("release",()=>{wakeLock=null})}}catch(e){}}
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&(mode==="host"||mode==="player"))keepAwake()});
async function api(body){
  let r,j;
  try{r=await fetch(SB_URL+"/functions/v1/gamenight",{method:"POST",headers:{"content-type":"application/json",apikey:SB_KEY},body:JSON.stringify(body)})}
  catch(e){throw new Error("Can't reach the game server. Check your Wi-Fi.")}
  try{j=await r.json()}catch(e){j={}}
  if(!r.ok||j.error)throw new Error(j.error||"Something went wrong. Try again.");
  return j;
}

/* ---------- settings ---------- */
(function forgetOldServer(){try{
  const h=store.get("host",null);if(h&&h.srv!==SRV)store.del("host");
  Object.keys(localStorage).forEach(k=>{if(k.indexOf("flaudjer:me:")===0){const v=JSON.parse(localStorage.getItem(k)||"null");if(!v||v.srv!==SRV)localStorage.removeItem(k)}});
}catch(e){}})();
const FAMILY=["Ennis","Coral","Essence","Eden"];
let players=store.get("players",FAMILY);
/* Anyone still on the old example names gets the family's names instead. */
if(JSON.stringify(players)===JSON.stringify(["Mom","Dad","Maya","Leo"])){players=FAMILY.slice();store.set("players",players)}
let scores=store.get("scores",{});
let packId=store.get("pack","animals");
let fibs=store.get("fibs",1);
let ruleKind=store.get("ruleKind","word");
let used=store.get("used",{});
let roundNo=store.get("round",0);
let curGame=store.get("game","flaugin");if(!GAMES[curGame])curGame="flaugin";
let mode="home";
function resolvePack(){return packId==="__mix"?shuffle(PACK_ORDER)[0]:packId}
function poolFor(pid){const p=PACKS[pid];const seen=used[pid]||[];let pool=p.words.filter(w=>!seen.includes(w));if(pool.length<2){used[pid]=[];store.set("used",used);pool=p.words.slice()}return pool}
function markUsed(pid,w){used[pid]=(used[pid]||[]).concat(w);store.set("used",used)}
function setGame(g){curGame=g;store.set("game",g)}
/* ---------- round clock ----------
   Cards: study time (TV rooms). Talking: a 10-second countdown, then one turn per player (optional),
   then open talk (optional). Every stretch advances by itself and every stretch can be skipped. */
function buildSeq(g,phase,order){
  const c=cfg(g),q=[];
  if(phase==="cards"){if(c.study>0)q.push({k:"study",secs:c.study});return q}
  if(phase==="clues"||phase==="talk"||phase==="play"){
    q.push({k:"count",secs:10});
    if(phase!=="play"&&c.turn>0)(order||[]).forEach(w=>q.push({k:"turn",who:w,secs:c.turn}));
    if(c.timer>0)q.push({k:"open",secs:c.timer});
  }
  return q;
}
function newClock(seq){const C={seq,i:-1,endsAt:0,lastSec:null,done:!seq.length};if(seq.length)clockGo(C,0);return C}
function clockGo(C,i){C.i=i;C.lastSec=null;const g=C.seq[i];if(!g){C.done=true;C.endsAt=0;return false}C.endsAt=Date.now()+g.secs*1000;return true}
function clockSeg(C){return C&&!C.done?C.seq[C.i]:null}
function turnInfo(C){if(!C)return [0,0];const turns=C.seq.filter(x=>x.k==="turn");const no=C.seq.slice(0,C.i+1).filter(x=>x.k==="turn").length;return [no,turns.length]}
function nextSpeaker(C){if(!C)return null;for(let j=C.i+1;j<C.seq.length;j++)if(C.seq[j].k==="turn")return C.seq[j].who;return null}
/* Sounds for each second. loud=false on a host that's on another screen. Returns true when the stretch has run out. */
function clockTick(C,loud){
  const g=clockSeg(C);if(!g)return false;
  const left=(C.endsAt-Date.now())/1000,sec=Math.ceil(left);
  if(sec!==C.lastSec){C.lastSec=sec;
    if(loud){
      const last=C.i===C.seq.length-1;
      if(g.k==="count"){if(sec>0&&sec<=3)ANN.count(sec);else if(sec>3)FX.play("tick");else if(sec<=0){ANN.say("go");if(!Music.sting("go"))FX.play("whoosh")}}
      else if(g.k==="study"||g.k==="turn"){if(sec>0&&sec<=5)FX.play("tick");else if(sec<=0){if(last){FX.play("buzzer");ANN.line("timeout")}else FX.play("vote")}}
      else if(g.k==="open"){if(sec===10&&g.secs>=30)ANN.line("hurry");else if(sec>0&&sec<=3)ANN.count(sec);else if(sec>0&&sec<10)FX.play("tick");else if(sec<=0){FX.play("buzzer");ANN.line("timeout")}}
    }
  }
  return left<=0;
}
function clockTitle(g,game,nameFn,me){
  if(!g)return "Time's up!";
  if(g.k==="study")return game==="agenda"?"Study your agenda":game==="glitch"?"Study your case file":"Study your card";
  if(g.k==="count")return "Get ready…";
  if(g.k==="turn")return g.who===me?"Your turn!":nameFn(g.who)+"'s turn";
  return game==="flaugin"?"Talk it over":game==="glitch"?"Open investigation":game==="rules"?"Time left":"Open debate";
}
/* Per-game settings, saved on this device. timer: seconds (0 = off). count: odd players when 6+ play. */
const CFG_DEFAULTS={flaugin:{study:30,turn:0,timer:120,count:1},copycat:{study:30,turn:60,timer:60,count:1},glitch:{study:30,turn:0,timer:180,count:1,details:2},agenda:{study:30,turn:60,timer:120},rules:{timer:0,kind:"word",guesses:2}};
function cfg(g){const d=CFG_DEFAULTS[g]||{};return Object.assign({},d,store.get("cfg:"+g,{}))}
function setCfg(g,k,v){const c=store.get("cfg:"+g,{});c[k]=v;store.set("cfg:"+g,c)}
(function migrate(){const old=store.get("fibs",null);if(old===2&&!store.get("cfg:flaugin",null))setCfg("flaugin","count",2);
  if(store.get("timerOn",true)===false&&!store.get("cfg:flaugin",null))setCfg("flaugin","timer",0);
  const rk=store.get("ruleKind",null);if(rk&&!store.get("cfg:rules",null))setCfg("rules","kind",rk)})();

/* =====================================================================
   ROUND BUILDERS (shared by the TV and one-phone mode)
   Each returns {meta: public info for the TV, cards: {id: private card}, secret: host-only answers}.
   ===================================================================== */
function oddCount(n,g){return n>=6&&cfg(g||curGame).count===2?2:1}
function buildCopycat(ids,oddIdx){
  const r=pickRound("copycat",C.copycat);
  const odd=oddIdx.map(i=>ids[i]);const cards={};
  ids.forEach(id=>{
    cards[id]=odd.includes(id)
      ?{kind:"copycat",odd:true,label:"You’re the Copycat",text:r.copy,hint:"Everyone else has a different mission. Blend in!"+(odd.length>1?" There’s another Copycat too.":"")}
      :{kind:"copycat",odd:false,label:"Your mission",text:r.crowd,hint:"Someone has a different mission. Find them."};
  });
  return {meta:{prompt:r.prompt},cards,secret:{odd,crowd:r.crowd,copy:r.copy}};
}
function buildGlitch(ids,oddIdx){
  const c=pickRound("glitch",C.glitch);
  const odd=oddIdx.map(i=>ids[i]);
  const changed=shuffle(c.facts.map((_,i)=>i)).slice(0,Math.max(1,Math.min(3,cfg("glitch").details||2))).sort((a,b)=>a-b);
  const truth=c.facts.map(f=>[f[0],f[1]]);
  const glitched=c.facts.map((f,i)=>[f[0],changed.includes(i)?f[2]:f[1]]);
  const cards={};
  ids.forEach(id=>{cards[id]={kind:"glitch",title:c.title,facts:odd.includes(id)?glitched:truth}});
  return {meta:{title:c.title,scene:c.scene},cards,secret:{odd,changed,truth,glitched}};
}
function agendaText(a,options,nameOf){
  const o=options[a.opt];
  switch(a.type){
    case "win":return "Get the family to choose "+o+".";
    case "not":return "Make sure "+o+" does NOT get chosen.";
    case "zero":return "Make sure nobody votes for "+o+" in the final vote.";
    case "switch":return "Get at least "+a.k+" other "+(a.k===1?"player":"players")+" to change their vote from their first pick.";
    case "match":return "End up voting for the same thing as "+nameOf(a.target)+".";
    case "pop":return "Make sure the most popular first pick does NOT win.";
  }
  return "";
}
function buildAgenda(ids,nameOf){
  const s=pickRound("agenda",C.agenda);
  const [A,B,Cc,D]=shuffle([0,1,2,3]);const n=ids.length;
  const k=Math.max(1,Math.round((n-1)/3));
  const fixed=[{type:"win",opt:A},{type:"win",opt:B},{type:"not",opt:A}];
  const extra=shuffle([{type:"switch",k},{type:"match"},{type:"pop"},{type:"zero",opt:Cc},{type:"win",opt:Cc},{type:"not",opt:B},{type:"match"},{type:"win",opt:D},{type:"zero",opt:D},{type:"switch",k}]);
  let list=fixed.concat(extra);
  while(list.length<n)list.push(rnd(2)?{type:"win",opt:rnd(4)}:{type:"not",opt:rnd(4)});
  list=shuffle(list.slice(0,n));
  const agendas={},cards={};
  ids.forEach((id,i)=>{
    const a=Object.assign({},list[i]);
    if(a.type==="match"){const others=ids.filter(x=>x!==id);a.target=others[rnd(others.length)]}
    a.text=agendaText(a,s.options,nameOf);agendas[id]=a;
    cards[id]={kind:"agenda",label:"Your secret agenda",text:a.text,hint:"Keep it secret. It scores 3 points if it comes true."};
  });
  return {meta:{title:s.title,question:s.question,options:s.options},cards,secret:{agendas}};
}
function scoreAgendas(agendas,first,final,ids,options){
  const counts=options.map(()=>0);ids.forEach(id=>{if(final[id]!=null)counts[final[id]]++});
  const fc=options.map(()=>0);ids.forEach(id=>{if(first[id]!=null)fc[first[id]]++});
  const max=Math.max(...counts);const top=counts.map((c,i)=>c===max?i:-1).filter(i=>i>=0);
  const chosen=max>0&&top.length===1?top[0]:null;
  const fmax=Math.max(...fc);const ftop=fmax>0?fc.map((c,i)=>c===fmax?i:-1).filter(i=>i>=0):[];
  const results={};
  ids.forEach(id=>{
    const a=agendas[id];let done=false;
    if(a.type==="win")done=chosen===a.opt;
    else if(a.type==="not")done=chosen!==a.opt;
    else if(a.type==="zero")done=counts[a.opt]===0;
    else if(a.type==="switch")done=ids.filter(x=>x!==id&&first[x]!=null&&final[x]!=null&&first[x]!==final[x]).length>=a.k;
    else if(a.type==="match")done=final[id]!=null&&final[id]===final[a.target];
    else if(a.type==="pop")done=chosen==null||!ftop.includes(chosen);
    results[id]=done;
  });
  return {counts,firstCounts:fc,chosen,top,results};
}
function buildRules(){
  const rk=cfg("rules").kind;const kind=rk==="mix"?(rnd(2)?"word":"number"):rk;
  const pool=C.rules[kind];const rule=pickRound("rules-"+kind,pool);
  const decoys=shuffle(pool.filter(r=>r.id!==rule.id)).slice(0,5);
  const opts=shuffle([rule].concat(decoys));
  return {meta:{kind,yes:rule.yes,no:rule.no,options:opts.map(r=>r.text)},secret:{answer:opts.indexOf(rule),rule}};
}
function normalizeEntry(kind,raw){
  const t=String(raw||"").trim();
  if(kind==="number"){if(!/^\d{1,4}$/.test(t))return null;return String(parseInt(t,10))}
  const w=t.toLowerCase();if(!/^[a-z]{1,15}$/.test(w))return null;return w;
}
function testEntry(rule,kind,entry){return kind==="number"?!!rule.test(parseInt(entry,10)):!!rule.test(entry)}

/* ---------- secret card ---------- */
function cardFront(c){
  // Flaugin card (from the server) or a generic card from the builders above.
  if(!c)return {front:el("span",{text:""}),odd:false,tall:false};
  if(c.kind==="glitch"){
    const ul=el("ul",{class:"facts"});c.facts.forEach(f=>ul.append(el("li",null,el("b",{text:f[0]}),el("span",{text:f[1]}))));
    return {front:el("div",{style:"display:flex;flex-direction:column;gap:10px;width:100%;align-items:flex-start;text-align:left"},
      el("span",{class:"label",text:"Case file"}),el("span",{class:"case-title",text:c.title}),ul,
      el("span",{class:"hint",style:"font-size:.8rem",text:"One file has some wrong details. It might be yours."})),odd:false,tall:true};
  }
  if(c.kind==="copycat"||c.kind==="agenda"){
    return {front:el("div",{style:"display:flex;flex-direction:column;gap:12px;align-items:center"},
      el("span",{class:"label",text:c.label}),el("span",{class:"mission",text:c.text}),el("span",{class:"hint",text:c.hint})),odd:!!c.odd,tall:c.text.length>60};
  }
  // Flaugin
  const f=el("div",{style:"display:flex;flex-direction:column;gap:10px;align-items:center"});
  if(c.isFib){
    let h=c.pack?"Pack: "+c.pack+". Blend in!":"No word for you. Blend in!";
    if(c.twoFibs)h+=" There’s another Flauger too.";
    f.append(el("span",{class:"label",text:"You’re the"}),el("span",{class:"word",text:"Flauger"}),el("span",{class:"hint",text:h}));
  }else f.append(el("span",{class:"label",text:"Secret word"}),el("span",{class:"word",text:c.word}),el("span",{class:"hint",text:c.pack?"Pack: "+c.pack:""}));
  return {front:f,odd:!!c.isFib,tall:false};
}
function makeCard(cardData,onPeek){
  const {front:inner,odd,tall}=cardFront(cardData);
  const card=el("div",{class:"secret"+(odd?" fib":"")+(tall?" tall":""),tabindex:"0",role:"button","aria-label":"Press and hold to see your card"});
  const back=el("div",{class:"back"},el("div",{class:"print",text:"?"}),el("span",{text:"Press and hold"}));
  const front=el("div",{class:"front"},inner);
  card.append(back,front);
  const bar=el("i");const meter=el("div",{class:"hold-meter","aria-hidden":"true"},bar);
  let raf=0,start=0,peeked=false;
  const down=e=>{if(e)e.preventDefault();start=performance.now();
    const step=()=>{const p=Math.min(1,(performance.now()-start)/450);bar.style.width=(p*100)+"%";
      if(p>=1){if(!card.classList.contains("peek")){FX.play("flip");FX.vibrate(15)}card.classList.add("peek");if(!peeked){peeked=true;onPeek&&onPeek()}return}
      raf=requestAnimationFrame(step)};raf=requestAnimationFrame(step)};
  const up=()=>{cancelAnimationFrame(raf);card.classList.remove("peek");if(!peeked)bar.style.width="0"};
  card.addEventListener("pointerdown",down);
  ["pointerup","pointerleave","pointercancel"].forEach(t=>card.addEventListener(t,up));
  card.addEventListener("contextmenu",e=>e.preventDefault());
  card.addEventListener("keydown",e=>{if((e.key===" "||e.key==="Enter")&&!e.repeat)down(e)});
  card.addEventListener("keyup",e=>{if(e.key===" "||e.key==="Enter")up()});
  return el("div",{style:"display:flex;flex-direction:column;align-items:center;gap:14px;width:100%"},card,meter);
}
function award(sc,outcome,ids,fibIds,votedId){
  if(outcome==="escaped")fibIds.forEach(k=>sc[k]=(sc[k]||0)+2);
  else if(outcome==="stole")sc[votedId]=(sc[votedId]||0)+1;
  else ids.forEach(k=>{if(!fibIds.includes(k))sc[k]=(sc[k]||0)+1});
}
function verdictText(outcome,fibText,votedName){
  return outcome==="escaped"?[fibText+" got away!","lose","You voted out "+votedName+", who knew the word."]:
    outcome==="stole"?[votedName+" guessed it!","lose","Caught, but the Flauger still figured out the word."]:
    ["The family wins!","win","Flauger caught and the word stayed safe."];
}
const scorePrev={};
function renderScoreTable(body,rows,animate){
  body.textContent="";rows=rows.slice().sort((a,b)=>b[1]-a[1]);const top=rows.length?rows[0][1]:0;
  rows.forEach(([n,s],i)=>{
    const num=el("td",{text:String(s)});const name=el("td",{text:n});
    const tr=el("tr",s>0&&s===top?{class:"lead"}:null,name,num);
    if(animate)tr.style.animationDelay=(0.9+i*0.08)+"s";
    body.append(tr);
    const was=scorePrev[n];
    if(animate&&s!==(was==null?0:was)){const from=was==null?0:was;setTimeout(()=>FX.countUp(num,from,s,900),1100+i*80);num.textContent=String(from);if(s>from)name.append(el("span",{class:"plus",text:" +"+(s-from)}))}
    scorePrev[n]=s;
  });
  if(animate)body.closest("table")&&body.closest("table").classList.add("rise-rows");
}
/* Reveal panels shared by TV, phones and one-phone mode */
function oddLabel(game,n){return game==="copycat"?(n>1?"Copycats":"Copycat"):(n>1?"Glitched files":"Glitched file")}
function revealDetails(game,rv,nameOf){
  if(game==="copycat"){
    return el("div",{class:"panel"},el("h3",{text:"The missions"}),
      el("p",{style:"margin:0"},el("b",{text:"Everyone: "}),document.createTextNode(rv.crowd)),
      el("p",{style:"margin:0"},el("b",{text:oddLabel(game,rv.odd.length)+" ("+rv.odd.map(nameOf).join(" and ")+"): "}),document.createTextNode(rv.copy)));
  }
  if(game==="glitch"){
    const tb=el("tbody");
    rv.truth.forEach((f,i)=>{
      const bad=rv.changed.includes(i);
      tb.append(el("tr",null,el("td",{text:f[0]}),el("td",null,el("span",{text:f[1]}),bad?el("div",{class:"bad",text:"Glitch said: "+rv.glitched[i][1]}):null)));
    });
    return el("div",{class:"panel"},el("h3",{text:"The real case file · glitched: "+rv.odd.map(nameOf).join(" and ")}),el("table",{class:"truth"},tb));
  }
  return el("span");
}

/* ---------- home ---------- */
$("homeLink").onclick=()=>{
  if(mode==="player"&&!confirmLeave())return;
  if(mode==="player")leaveLive();       // their seat is remembered; home shows a Rejoin button
  // The TV's room stays open in the background, so everyone stays joined while you pick the next game.
  mode="home";setTag("");document.body.classList.remove("tv");renderHome();show("vHome");
};
let leaveArmed=0;
function confirmLeave(){const now=Date.now();if(now-leaveArmed<3000)return true;leaveArmed=now;setTag("Tap the logo again to leave");return false}
document.querySelectorAll("[data-host]").forEach(b=>b.onclick=()=>{setGame(b.dataset.host);mode="host";setTag(GAMES[curGame].name);if(H){H.game=curGame;H.phase="lobby";H.epoch=Date.now();broadcast()}openSetup()});
document.querySelectorAll("[data-local]").forEach(b=>b.onclick=()=>{setGame(b.dataset.local);mode="local";setTag(GAMES[curGame].name);openSetup()});
$("goJoin").onclick=()=>openJoin("");
/* ---------- star ratings (one per device; rating again changes it) ---------- */
const RATE={sum:null,loading:false,err:""};
function deviceId(){let d=store.get("device",null);if(!d||!/^[A-Za-z0-9]{12,48}$/.test(d)){d="";const a=new Uint8Array(16);crypto.getRandomValues(a);a.forEach(x=>d+="abcdefghijklmnopqrstuvwxyz0123456789"[x%36]);store.set("device",d)}return d}
function loadRatings(){if(RATE.loading||!SB_URL)return;RATE.loading=true;api({action:"ratings",device:deviceId()}).then(j=>{RATE.sum=j;RATE.err=""}).catch(()=>{RATE.err="Ratings are offline right now."}).finally(()=>{RATE.loading=false;paintRatings()})}
const STAR='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8z"/></svg>';
function gameRating(g){return RATE.sum&&RATE.sum.games&&RATE.sum.games[g]||null}
function ratingWidget(game,compact){const w=el("div",{class:"rate"+(compact?" compact":""),"data-rate":game});paintOne(w);if(!RATE.sum)loadRatings();return w}
function paintRatings(){document.querySelectorAll("[data-rate]").forEach(paintOne);paintTop()}
function paintOne(w){
  const g=w.dataset.rate,S=gameRating(g),mine=S&&S.mine;w.textContent="";
  const compact=w.classList.contains("compact"),name=(GAMES[g]||{}).name||"this game";
  const head=el("p",{class:"rate-head",text:mine?"Thanks for rating "+name+"!":compact?"How was "+name+"? Rate it":"Rate "+name});
  const stars=el("div",{class:"stars",role:"group","aria-label":"Your rating for "+name});
  for(let n=5;n>=1;n--){const b=el("button",{type:"button","aria-label":n+(n===1?" star":" stars"),"aria-pressed":String(!!mine&&n<=mine),class:mine&&n<=mine?"on":null,onclick:()=>rate(g,n)});b.innerHTML=STAR;stars.append(b)}
  const avg=S&&S.count?S.avg:0;
  const meter=el("span",{class:"avg-stars","aria-hidden":"true"});meter.innerHTML=STAR.repeat(5);const fill=el("i",{style:"width:"+(avg/5*100)+"%"});fill.innerHTML=STAR.repeat(5);meter.append(fill);
  const summary=el("p",{class:"rate-sum"},S&&S.count?meter:null,document.createTextNode(RATE.err?RATE.err:!RATE.sum?"Loading ratings…":S&&S.count?" "+S.avg.toFixed(1)+" from "+S.count+(S.count===1?" rating":" ratings")+(mine?" · you gave "+mine:""):"No ratings yet. Be the first!"));
  w.append(head,stars,summary);
}
/* "Top rated" ribbon on the best game's tile, plus a line under the title. */
function paintTop(){
  const top=RATE.sum&&RATE.sum.top;
  document.querySelectorAll(".game-tile").forEach(t=>{t.classList.toggle("top-rated",!!top&&t.dataset.game===top);const old=t.querySelector(".top-badge");if(old)old.remove();
    if(top&&t.dataset.game===top){const S=gameRating(top);t.querySelector(".game-art").append(el("div",{class:"top-badge"},el("b",{text:"★ Top rated"}),el("small",{text:S.avg.toFixed(1)+" stars · "+S.count+(S.count===1?" rating":" ratings")})))}});
  const line=$("topLine");if(line){line.textContent="";line.hidden=!top;if(top){const S=gameRating(top);line.append(document.createTextNode("★ Top rated game: "),el("b",{text:GAMES[top].name}),document.createTextNode(" · "+S.avg.toFixed(1)+" stars"))}}
}
async function rate(g,n){
  const prev=RATE.sum;const next=JSON.parse(JSON.stringify(prev||{games:{},top:null}));next.games[g]=Object.assign({count:0,avg:0},next.games[g]||{},{mine:n});RATE.sum=next;paintRatings();
  FX.play(n>=4?"solve":"pop");FX.vibrate(20);if(n===5)FX.confetti(70);
  try{RATE.sum=await api({action:"rate",device:deviceId(),game:g,stars:n});RATE.err=""}catch(e){RATE.err="Couldn't save that. Try again.";RATE.sum=prev}
  paintRatings();
}
function renderHome(){
  document.querySelectorAll(".game-tile").forEach(t=>{const g=t.dataset.game;const body=t.querySelector(".game-body");if(g&&body&&!body.querySelector("[data-rate]"))body.append(ratingWidget(g,false))});
  if(RATE.sum)paintTop();
  document.querySelectorAll(".resume").forEach(n=>n.remove());
  const h=store.get("host",null);
  const last=store.get("lastRoom",null);const me=last?store.get("me:"+last,null):null;
  if(H){
    const n=phones().length;
    $("goJoin").before(el("div",{class:"resume live"},el("span",null,el("b",{text:"Room "+H.code+" is open"}),document.createTextNode(" · "+n+(n===1?" player":" players")+" still joined. Pick any game below and they come with you.")),
      el("button",{class:"btn-small",text:"Back to the room",onclick:()=>{mode="host";document.body.classList.add("tv");setTag(GAMES[H.game].name+" · Room "+H.code);show("vHost");renderHost()}})));
  }else if(me&&sb&&Date.now()-(me.at||0)<12*3600e3){
    $("goJoin").before(el("div",{class:"resume"},el("span",{text:"You're still in room "+last+" as "+me.name+"."}),
      el("button",{class:"btn-small",text:"Rejoin",onclick:()=>{mode="player";startPlayer(last,me)}})));
  }else if(h&&Date.now()-h.at<12*3600e3&&sb){
    $("goJoin").before(el("div",{class:"resume"},el("span",{text:"Your room "+h.code+" is still open."}),
      el("button",{class:"btn-small",text:"Resume on this screen",onclick:()=>{mode="host";resumeRoom(h)}})));
  }
  $("homeNote").textContent=sb?"":"The live game server didn't load. Check your connection; one-phone games still work.";
}

/* ---------- setup ---------- */
function openSetup(){
  const local=mode==="local";const G=GAMES[curGame];
  $("setupGame").textContent=G.name;
  $("playersPanel").hidden=!local;
  $("packPanel").hidden=curGame!=="flaugin";
  $("hintRow").hidden=curGame!=="flaugin";
  $("timerRow").hidden=true;$("segRow").hidden=true;$("fibNote").hidden=true;$("kindRow").hidden=true;
  renderCfg();
  $("setupTitle").textContent=local?"Who's at the table?":"Set up the big screen";
  $("setupSub").textContent=local?G.sub.local:G.sub.host;
  const ol=$("rulesList");ol.textContent="";G.rules.forEach(r=>ol.append(el("li",{text:r})));
  $("startBtn").textContent=local?"Deal the cards":(H?"Back to the room":"Open the room");
  renderPlayers();renderPacks();renderFibs();renderKind();show("vSetup");
}
function renderPlayers(){
  const box=$("playerChips");box.textContent="";
  players.forEach((n,i)=>box.append(el("span",{class:"chip rm"},el("span",{text:n}),el("button",{type:"button",text:"✕","aria-label":"Remove "+n,onclick:()=>{players.splice(i,1);store.set("players",players);renderPlayers()}}))));
  $("pCount").textContent="· "+players.length;
  const ok=players.length>=3&&players.length<=12;
  $("startBtn").disabled=mode==="local"&&!ok;
  $("playerStatus").className="status"+(ok?"":" err");
  $("playerStatus").textContent=players.length<3?"Add at least "+(3-players.length)+" more.":players.length>12?"12 players max.":"3 to 12 players. Tap ✕ to remove a name.";
  renderFibs();
}
$("addForm").onsubmit=e=>{
  e.preventDefault();const v=$("newPlayer").value.trim();if(!v)return;
  if(players.some(p=>p.toLowerCase()===v.toLowerCase())){$("playerStatus").className="status err";$("playerStatus").textContent=v+" is already playing. Try a nickname.";return}
  if(players.length>=12){$("playerStatus").className="status err";$("playerStatus").textContent="The table is full at 12 players.";return}
  players.push(v);store.set("players",players);$("newPlayer").value="";renderPlayers();$("newPlayer").focus();
};
function renderPacks(){
  const box=$("packs");box.textContent="";
  if(packId!=="__mix"&&!PACKS[packId])packId="animals";
  PACK_ORDER.forEach(id=>{const p=PACKS[id];
    box.append(el("button",{type:"button",class:"pack","aria-pressed":String(id===packId),onclick:()=>{packId=id;store.set("pack",packId);renderPacks()}},el("span",{text:p.name}),el("small",{text:p.blurb})))});
  box.append(el("button",{type:"button",class:"pack","aria-pressed":String(packId==="__mix"),onclick:()=>{packId="__mix";store.set("pack",packId);renderPacks()}},el("span",{text:"Mix it up"}),el("small",{text:"Random pack each round"})));
}
function renderFibs(){
  if(mode==="local"&&players.length<6&&fibs===2)fibs=1;
  document.querySelectorAll("[data-fibs]").forEach(b=>{b.setAttribute("aria-pressed",String(Number(b.dataset.fibs)===fibs));if(b.dataset.fibs==="2")b.disabled=mode==="local"&&players.length<6});
  const what=(GAMES[curGame].seg||"").toLowerCase();
  $("fibNote").className="status";
  $("fibNote").textContent=mode==="local"?(players.length>=6?"":"Two "+what+" unlocks at 6 players."):"Two "+what+" kicks in only when 6 or more phones join.";
}
function segRow(label,opts,cur,onPick,note){
  const seg=el("div",{class:"seg",role:"group","aria-label":label});
  opts.forEach(([v,t,dis])=>seg.append(el("button",{type:"button","aria-pressed":String(v===cur),disabled:dis?"":null,text:t,onclick:()=>{onPick(v);renderCfg()}})));
  const row=el("div",{class:"cfg-row"},el("span",{class:"cfg-label",text:label}),seg);
  return note?el("div",{class:"cfg-block"},row,el("p",{class:"status",style:"margin:0",text:note})):row;
}
function renderCfg(){
  const box=$("cfgRows");if(!box)return;box.textContent="";
  const g=curGame,c=cfg(g),G=GAMES[g];const set=(k)=>v=>setCfg(g,k,v);
  const timerOpts=g==="rules"?[[0,"None"],[120,"2 min"],[180,"3 min"],[300,"5 min"]]:[[0,"Off"],[60,"1 min"],[90,"1½"],[120,"2 min"],[180,"3 min"],[300,"5 min"]];
  if(g!=="rules"){
    box.append(segRow("Card study time",[[0,"Off"],[15,"15 sec"],[30,"30 sec"],[45,"45 sec"],[60,"1 min"]],c.study,set("study"),mode==="local"?"Used in TV rooms. With one phone, each person reads as they pass.":"Phones get this long to study their cards, then the round starts by itself."));
    box.append(segRow("Each player's turn",[[0,"Off"],[30,"30 sec"],[60,"1 min"],[90,"1½ min"],[120,"2 min"]],c.turn,set("turn"),"Everyone gets their own turn to talk or plead their case, in a random order. The clock moves to the next player by itself."));
  }
  box.append(segRow(g==="rules"?"Round time limit":c.turn>0&&g!=="rules"?"Open talk after the turns":(g==="copycat"||g==="agenda"?"Debate timer":g==="glitch"?"Investigation timer":"Talk timer"),timerOpts,c.timer,set("timer"),g==="rules"?"A 10-second countdown opens the gate.":"A 10-second countdown starts the talking. Every timer has a Skip button."));
  if(G.seg){
    const few=mode==="local"&&players.length<6;
    box.append(segRow(G.seg,[[1,"One"],[2,"Two",few]],few?1:c.count,set("count"),mode==="local"?(few?"Two unlocks at 6 players.":""):"Two only kicks in when 6 or more phones join."));
  }
  if(g==="glitch")box.append(segRow("Details changed",[[1,"1 (hard)"],[2,"2"],[3,"3 (easy)"]],c.details,set("details")));
  if(g==="rules"){
    box.append(segRow("The gate tests",[["word","Words"],["number","Numbers"],["mix","Mix"]],c.kind,set("kind")));
    box.append(segRow("Guesses each",[[1,"1"],[2,"2"],[3,"3"]],c.guesses,set("guesses")));
  }
}
function renderKind(){document.querySelectorAll("[data-kind]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.kind===ruleKind)));document.querySelectorAll("[data-voice]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.voice===ANN.voice())))}
document.querySelectorAll("[data-voice]").forEach(b=>b.onclick=()=>{ANN.setVoice(b.dataset.voice);renderKind()});
document.querySelectorAll("[data-fibs]").forEach(b=>b.onclick=()=>{fibs=Number(b.dataset.fibs);store.set("fibs",fibs);renderFibs()});
document.querySelectorAll("[data-kind]").forEach(b=>b.onclick=()=>{ruleKind=b.dataset.kind;store.set("ruleKind",ruleKind);renderKind()});
$("optHint").checked=store.get("hint",true);
$("optTimer").checked=store.get("timerOn",true);
$("optHint").onchange=()=>store.set("hint",$("optHint").checked);
$("optTimer").onchange=()=>store.set("timerOn",$("optTimer").checked);
$("startBtn").onclick=()=>{
  if(mode==="local")return startLocalRound();
  if(H){H.game=curGame;H.phase="lobby";H.epoch=Date.now();broadcast();show("vHost");setTag(GAMES[curGame].name+" · Room "+H.code);renderHost();return}
  openRoom();
};

/* =====================================================================
   ONE-PHONE MODE (no network): Flaugin, Copycat, The Glitch
   ===================================================================== */
let game=null;
function startLocalRound(){
  keepAwake();
  roundNo++;store.set("round",roundNo);
  const ids=players.map((_,i)=>String(i));
  const count=oddCount(players.length,curGame);
  if(curGame==="flaugin"){
    const pid=resolvePack();const pool=poolFor(pid);const word=pool[rnd(pool.length)];markUsed(pid,word);
    const fibIdx=pickFakers(players,count);
    game={type:"flaugin",pid,word,fibIdx,turn:0,deal:shuffle(players.map((_,i)=>i)),voted:null};
  }else{
    const oddIdx=pickFakers(players,count);
    const b=curGame==="copycat"?buildCopycat(ids,oddIdx):buildGlitch(ids,oddIdx);
    game={type:curGame,built:b,fibIdx:oddIdx,turn:0,deal:shuffle(players.map((_,i)=>i)),voted:null};
  }
  setTag(GAMES[curGame].name+" · Round "+roundNo);if(!Music.sting("deal"))FX.play("deal");ANN.round(roundNo);showPass();Trans.play("Round "+roundNo,GAMES[curGame].name,{quiet:true});
}
function localCard(i){
  if(game.type==="flaugin"){const isFib=game.fibIdx.includes(i);return {isFib,word:game.word,pack:(!isFib||$("optHint").checked)?PACKS[game.pid].name:null,twoFibs:game.fibIdx.length>1}}
  return game.built.cards[String(i)];
}
function showPass(){
  const i=game.deal[game.turn];
  $("passStep").textContent="Card "+(game.turn+1)+" of "+players.length+" · hand the phone to";
  $("passName").textContent=players[i];
  const slot=$("passCardSlot");slot.textContent="";
  slot.append(makeCard(localCard(i),()=>{$("passNext").disabled=false}));
  $("passNext").disabled=true;
  $("passNext").textContent=game.turn===players.length-1?(game.type==="flaugin"?"Hide it and start clues":"Hide it and start talking"):"Hide it and pass on";
  show("vPass");
}
$("passNext").onclick=()=>{game.turn++;FX.play("swoosh");if(game.turn<players.length)showPass();else showClues()};
let LC=null,tInt=null;
function resetTimer(){clearInterval(tInt);tInt=null;LC=null}
function localClockRender(){
  const g=clockSeg(LC);const [no,n]=turnInfo(LC);
  $("timerHead").textContent=g&&g.k==="turn"?"Turn "+no+" of "+n:g&&g.k==="count"?"Starting in":"Timer";
  $("timerTitle").textContent=clockTitle(g,game.type,w=>w);
  const left=g?Math.max(0,(LC.endsAt-Date.now())/1000):0;
  $("timer").textContent=fmt(left);$("timer").classList.toggle("hurry",!!g&&left>0&&left<=10&&g.k!=="count");
  const nx=nextSpeaker(LC);$("timerNext").textContent=g?(nx?"Up next: "+nx:""):"Time to vote!";
  $("timerBtn").hidden=$("timerReset").hidden=!g;
  $("timerBtn").textContent=!g?"":g.k==="count"?"Skip countdown":g.k==="turn"?(nx?"Next player":"End turns"):"Skip timer";
  $("orderList").querySelectorAll("li").forEach(li=>li.classList.toggle("now",!!g&&g.k==="turn"&&li.textContent===g.who));
}
function localClockStart(order){
  resetTimer();LC=newClock(buildSeq(game.type,"clues",order));localClockRender();
  tInt=setInterval(()=>{if(!LC||$("vClues").hidden)return;
    if(clockTick(LC,true)){clockGo(LC,LC.i+1);const g=clockSeg(LC);if(g&&g.k==="turn")FX.play("pop");if(!g){clearInterval(tInt);tInt=null}}
    localClockRender()},250);
}
$("timerBtn").onclick=()=>{if(!LC)return;FX.play("swoosh");clockGo(LC,LC.i+1);if(LC.done){clearInterval(tInt);tInt=null}localClockRender()};
$("timerReset").onclick=()=>{const g=clockSeg(LC);if(!g)return;LC.endsAt=Math.max(Date.now(),LC.endsAt)+30000;LC.lastSec=null;localClockRender()};
function showClues(){
  const ol=$("orderList");ol.textContent="";
  const order=shuffle(players);order.forEach(n=>ol.append(el("li",{text:n})));
  const tp=$("talkPrompt");tp.textContent="";
  if(game.type==="flaugin"){$("talkTitle").textContent="Clue round";$("talkSub").textContent="One word each, in this order. Not too obvious, not too vague.";tp.hidden=true}
  else if(game.type==="copycat"){$("talkTitle").textContent="Debate time";$("talkSub").textContent="Everyone weighs in, in this order, then talk freely. Sneak in your mission!";tp.hidden=false;tp.append(el("h3",{text:"The topic"}),el("p",{class:"prompt",text:game.built.meta.prompt}))}
  else{$("talkTitle").textContent="Investigate";$("talkSub").textContent="Take turns asking each other questions about the case. Don’t read your file out loud!";tp.hidden=false;tp.append(el("h3",{text:"The case"}),el("p",{class:"prompt",text:game.built.meta.title}),el("p",{class:"scene",text:game.built.meta.scene}))}
  show("vClues");{const sc=sceneFor(game.type,game.type==="flaugin"?"clues":"talk");Trans.play(sc[0],sc[1],{quiet:true})}localClockStart(order);FX.play("whoosh");ANN.say("ready");
}
$("toVote").onclick=()=>{resetTimer();showVote();Music.sync();if(!Music.sting("vote"))FX.play("pop")};
function showVote(){
  game.voted=null;const g=$("voteGrid");g.textContent="";
  players.forEach((n,i)=>{const b=el("button",{type:"button",text:n,"aria-pressed":"false"});
    b.onclick=()=>{game.voted=i;g.querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));$("lockVote").disabled=false;$("lockVote").textContent="Reveal "+n};g.append(b)});
  $("voteTitle").textContent=game.type==="flaugin"?"Who’s flaugin’?":game.type==="copycat"?"Who’s the Copycat?":"Whose file is glitched?";
  const two=game.fibIdx.length>1;
  $("voteSub").textContent=two?"There are two this round. Vote one out; catching either counts.":"Count hands, then tap the player with the most votes.";
  $("lockVote").disabled=true;$("lockVote").textContent="Reveal";show("vVote");Trans.play("Vote!",GAMES[game.type].name,{quiet:true});
}
$("lockVote").onclick=()=>{
  const v=game.voted;
  if(game.type!=="flaugin")return finishLocalOdd(v);
  if(game.fibIdx.includes(v)){
    $("caughtTitle").textContent="Caught! "+players[v]+" was flaugin’.";
    $("caughtLine").textContent=players[v]+", what do you think the word was?";
    $("guessWord").hidden=true;$("guessBtns").hidden=true;$("showWord").hidden=false;show("vGuess");drumThen(true,$("caughtTitle"));
  }else finishLocal("escaped");
};
$("showWord").onclick=()=>{$("guessWord").textContent=game.word;$("guessWord").hidden=false;$("guessBtns").hidden=false;$("showWord").hidden=true};
$("guessRight").onclick=()=>finishLocal("stole");
$("guessWrong").onclick=()=>finishLocal("caught");
function finishLocal(outcome){
  const fibNames=game.fibIdx.map(i=>players[i]);const fibText=fibNames.join(" and ");
  award(scores,outcome,players,fibNames,players[game.voted]);store.set("scores",scores);
  const [t,cls,line]=verdictText(outcome,fibText,players[game.voted]);
  $("resTitle").className="verdict "+cls;$("resTitle").textContent=t;
  const l=$("resLine");l.textContent=line+" The word was ";l.append(el("b",{text:game.word}),document.createTextNode(". "+(game.fibIdx.length>1?"The Flaugers: ":"The Flauger: ")+fibText+"."));
  $("resDetails").textContent="";
  $("resNote").textContent="Flauger escapes: +2. Flauger caught but guesses the word: +1. Flauger caught and misses: +1 to everyone else.";
  renderScoreTable($("scoreBody"),players.map(n=>[n,scores[n]||0]),true);show("vResult");drumThen(outcome==="caught",$("resTitle"),outcome==="stole");
}
function finishLocalOdd(v){
  const oddNames=game.fibIdx.map(i=>players[i]);const caught=game.fibIdx.includes(v);
  const copy=game.type==="copycat";
  if(caught)players.forEach((n,i)=>{if(!game.fibIdx.includes(i))scores[n]=(scores[n]||0)+2});
  else oddNames.forEach(n=>scores[n]=(scores[n]||0)+4);
  store.set("scores",scores);
  $("resTitle").className="verdict "+(caught?"win":"lose");
  $("resTitle").textContent=caught?(copy?"Copycat caught!":"Glitch found!"):(copy?oddNames.join(" and ")+" got away!":"The glitch slipped through!");
  $("resLine").textContent=caught?"You voted for "+players[v]+". Nice detective work.":"You voted for "+players[v]+", but the "+(copy?"Copycat":"glitched file")+" was "+oddNames.join(" and ")+".";
  const rv=Object.assign({},game.built.secret,{odd:game.fibIdx.map(String)});
  $("resDetails").textContent="";$("resDetails").append(revealDetails(game.type,rv,id=>players[+id]));
  $("resNote").textContent="Caught: +2 to everyone else. Got away: +4 to the "+(copy?"Copycat":"glitched player")+".";
  renderScoreTable($("scoreBody"),players.map(n=>[n,scores[n]||0]),true);show("vResult");drumThen(caught,$("resTitle"));
}
/* drumroll, then the verdict lands with a fanfare (and confetti) or a sad trombone */
function localRate(){const box=$("localRate");if(!box||!game)return;box.textContent="";box.append(ratingWidget(game.type,true))}
function drumThen(win,verdictEl,skipDrum){
  localRate();
  Trans.play("Drumroll…","The reveal",{long:true,quiet:true});
  if(verdictEl){verdictEl.classList.remove("big-in");void verdictEl.offsetWidth;verdictEl.classList.add("big-in")}
  FX.play("drum",0.85);ANN.clear();
  setTimeout(()=>{if(!(win&&Music.sting(Math.random()<0.5?"win":"win2")))FX.play(win?"win":"lose");ANN.line(win?"win":"lose");if(win)FX.confetti()},900);
}
$("nextRound").onclick=startLocalRound;
$("toSetup").onclick=()=>{setTag(GAMES[curGame].name);openSetup()};
let resetArmed=false;
$("resetScores").onclick=()=>{
  if(!resetArmed){resetArmed=true;$("resetScores").textContent="Tap again to reset";setTimeout(()=>{resetArmed=false;$("resetScores").textContent="Reset scores"},3000);return}
  scores={};roundNo=0;store.set("scores",scores);store.set("round",0);renderScoreTable($("scoreBody"),players.map(n=>[n,0]));resetArmed=false;$("resetScores").textContent="Scores reset";
};

/* =====================================================================
   LIVE ROOM — shared
   ===================================================================== */
let ch=null;
function channelFor(code,key){
  return sb.channel("flaudjer-"+code.toLowerCase(),{config:{broadcast:{self:false},presence:{key}}});
}
function leaveLive(){
  clearInterval(hostBeat);clearInterval(hostTick);clearInterval(hostKeep);clearInterval(pTimer);
  if(ch){try{sb.removeChannel(ch)}catch(e){}ch=null}
  H=null;P=null;$("conn").hidden=true;
}
function setConn(on){$("conn").hidden=false;$("conn").classList.toggle("on",on);$("conn").lastChild.textContent=on?"Live":"Reconnecting…"}

/* =====================================================================
   HOST / BIG SCREEN
   ===================================================================== */
let H=null,hostBeat=0,hostTick=0,hostKeep=0;
async function openRoom(){
  if(!sb){$("fibNote").className="status err";$("fibNote").textContent="The game server didn't load. Refresh and try again.";return}
  $("startBtn").disabled=true;$("startBtn").textContent="Opening a room…";
  try{
    const r=await api({action:"create"});
    const h={code:r.code,hostToken:r.hostToken,at:Date.now(),scores:{},names:{},round:0,srv:SRV};
    store.set("host",h);resumeRoom(h);
  }catch(e){$("fibNote").className="status err";$("fibNote").textContent=e.message;$("startBtn").disabled=false;$("startBtn").textContent="Open the room"}
}
function freshRound(){
  Object.assign(H,{ready:{},votes:{},voted:null,outcome:"",tally:null,tie:false,showWord:false,endsAt:0,word:"",fib:[],
    meta:null,secret:null,first:{},final:{},log:[],solved:[],guesses:{},tryAt:{},rp:{},reveal:null,err:""});
}
function resumeRoom(h){
  keepAwake();document.body.classList.add("tv");
  H={code:h.code,hostToken:h.hostToken,game:curGame,phase:"lobby",round:h.round||0,roster:[],order:[],voteRound:0,
     scores:h.scores||{},names:h.names||{},packId:"",epoch:Date.now(),lastOdd:[],known:new Set(),fresh:{},knownInit:false,lastSec:null};
  ANN.preload();
  freshRound();
  ch=channelFor(H.code,"host");
  ch.on("presence",{event:"sync"},()=>{noteJoins();renderHost()})
    .on("presence",{event:"join"},()=>broadcast())
    .on("broadcast",{event:"hello"},()=>broadcast())
    .on("broadcast",{event:"skip"},({payload})=>{   // the player whose turn it is tapped "I'm done"
      const p=payload||{};const g=H&&clockSeg(H.clock);
      if(g&&g.k==="turn"&&g.who===p.pid&&p.i===H.clock.i)hostClockNext(true);
    })
    .on("broadcast",{event:"ready"},({payload})=>{
      const p=payload||{};if(!H||!inRoster(p.pid)||p.round!==H.round)return;
      if(!H.ready[p.pid]){H.ready[p.pid]=true;FX.play("pop");broadcast();renderHost()}
    })
    .on("broadcast",{event:"vote"},({payload})=>{
      const p=payload||{};if(!H||H.phase!=="vote"||!inRoster(p.pid)||p.r!==H.voteRound||!inRoster(p.target)||p.target===p.pid)return;
      const prev=H.votes[p.pid];H.votes[p.pid]=p.target;if(!prev){FX.play("vote");broadcast()}renderHost();
    })
    .on("broadcast",{event:"pick"},({payload})=>{
      const p=payload||{};if(!H||H.game!=="agenda"||!inRoster(p.pid)||p.round!==H.round)return;
      const o=Number(p.option);if(!(o>=0&&o<4))return;
      if(p.kind==="first"&&H.phase==="cards"){const had=H.first[p.pid]!=null;H.first[p.pid]=o;if(!had){FX.play("vote");broadcast()}renderHost()}
      else if(p.kind==="final"&&H.phase==="final"&&p.r===H.voteRound){const had=H.final[p.pid]!=null;H.final[p.pid]=o;if(!had){FX.play("vote");broadcast()}renderHost()}
    })
    .on("broadcast",{event:"try"},({payload})=>onTry(payload||{}))
    .on("broadcast",{event:"guess"},({payload})=>onGuess(payload||{}))
    .subscribe(status=>{
      if(status==="SUBSCRIBED"){setConn(true);ch.track({host:true});broadcast()}
      else if(status==="CHANNEL_ERROR"||status==="TIMED_OUT"||status==="CLOSED")setConn(false);
    });
  clearInterval(hostBeat);hostBeat=setInterval(broadcast,4000);
  clearInterval(hostKeep);hostKeep=setInterval(()=>{if(H)api({action:"touch",code:H.code,hostToken:H.hostToken}).catch(()=>{})},10*60*1000);
  clearInterval(hostTick);hostTick=setInterval(hostClockTick,250);
  mode="host";setTag(GAMES[H.game].name+" · Room "+H.code);show("vHost");renderHost();
}
function hostClockTick(){
  if(!H||!H.clock)return;
  const g=clockSeg(H.clock);if(!g)return;
  const left=(H.clock.endsAt-Date.now())/1000;const t=$("hostTimer");
  if(t){t.textContent=left>0?fmt(left):"0:00";t.classList.toggle("hurry",left>0&&left<=10&&g.k!=="count")}
  if(clockTick(H.clock,mode==="host"))hostClockNext(false);
}
/* Move to the next stretch: by itself when time runs out, or when someone presses Skip. */
function hostClockNext(skipped){
  if(!H||!H.clock)return;
  if(skipped)FX.play("swoosh");
  if(H.phase==="cards"){const nx=H.game==="flaugin"?"clues":"talk";if(H.clock.i>=H.clock.seq.length-1)return setPhase(nx)}
  const ok=clockGo(H.clock,H.clock.i+1);H.endsAt=H.clock.endsAt;
  if(ok){const g=clockSeg(H.clock);if(g.k==="turn"&&mode==="host"){FX.play("pop")}}
  if(H.phase==="cards"&&H.clock.done)return setPhase(H.game==="flaugin"?"clues":"talk");
  broadcast();renderHost();
}
function clockPublic(){
  const C=H.clock;if(!C||!C.seq.length)return null;const g=clockSeg(C);const [no,n]=turnInfo(C);
  return {i:C.i,k:g?g.k:"done",who:g&&g.who||null,turnNo:no,turnN:n,next:nextSpeaker(C)};
}
function clockPanel(){
  const C=H.clock;if(!C||!C.seq.length)return null;
  const g=clockSeg(C);const [no,n]=turnInfo(C);
  const p=el("div",{class:"panel clock-panel"+(g&&g.k==="turn"?" turn":"")},el("h3",{text:g&&g.k==="turn"?"Turn "+no+" of "+n:g&&g.k==="count"?"Starting in":"Timer"}));
  p.append(el("p",{class:"clock-title",text:clockTitle(g,H.game,nameOf)}));
  p.append(el("div",{class:"timer",id:"hostTimer",text:g?fmt(Math.max(0,(C.endsAt-Date.now())/1000)):"0:00"}));
  const nx=nextSpeaker(C);
  if(g&&nx&&g.k!=="study")p.append(el("p",{class:"sub",style:"margin:0",text:"Up next: "+nameOf(nx)}));
  if(!g)p.append(el("p",{class:"sub",style:"margin:0",text:H.game==="rules"?"Reveal the rule when you're ready.":"Vote when you're ready."}));
  if(g){
    const skipText=g.k==="study"?"Skip, start now":g.k==="count"?"Skip countdown":g.k==="turn"?(nx?"Next player":"End turns"):"Skip timer";
    p.append(el("div",{class:"row"},el("button",{class:"btn-felt",text:skipText,onclick:()=>hostClockNext(true)}),
      el("button",{class:"btn-ghost",text:"+30 sec",onclick:()=>{C.endsAt=Math.max(Date.now(),C.endsAt)+30000;H.endsAt=C.endsAt;C.lastSec=null;broadcast();renderHost()}})));
  }
  return p;
}
function orderList(){
  const g=clockSeg(H.clock);const ol=el("ol",{class:"order"});
  H.order.forEach(pid=>ol.append(el("li",{class:g&&g.k==="turn"&&g.who===pid?"now":null,text:nameOf(pid)})));
  return ol;
}
const add=(box,...kids)=>kids.forEach(k=>{if(k)box.append(k)});
function saveHost(){store.set("host",{code:H.code,hostToken:H.hostToken,at:Date.now(),scores:H.scores,names:H.names,round:H.round,srv:SRV})}
function phones(){
  if(!ch)return [];
  const seen={};const out=[];
  Object.values(ch.presenceState()).flat().forEach(m=>{
    if(!m||m.host||typeof m.pid!=="string"||typeof m.name!=="string"||seen[m.pid])return;
    seen[m.pid]=1;out.push({pid:m.pid,name:m.name.slice(0,14)});
  });
  return out;
}
function inRoster(pid){return !!H&&H.roster.some(r=>r.pid===pid)}
function nameOf(pid){const r=H&&H.roster.find(x=>x.pid===pid);return r?r.name:(H&&H.names[pid])||"Someone"}
function publicState(){
  const showSecret=H.phase==="result"||(H.phase==="guess"&&H.showWord);
  return {code:H.code,game:H.game,epoch:H.epoch,phase:H.phase,round:H.round,roster:H.roster,order:H.order,voteRound:H.voteRound,
    ready:Object.keys(H.ready),voted:Object.keys(H.votes),votedOut:H.voted,outcome:H.outcome,endsAt:H.endsAt,clock:clockPublic(),showWord:H.showWord,
    word:H.game==="flaugin"&&showSecret?H.word:null,fib:H.game==="flaugin"&&H.phase==="result"?H.fib:null,
    meta:H.meta,firstIn:Object.keys(H.first),finalIn:Object.keys(H.final),
    log:H.game==="rules"?H.log.slice(-12):null,solved:H.solved,guesses:H.guesses,maxGuesses:H.maxGuesses||2,
    reveal:H.phase==="result"?H.reveal:null,
    scores:H.roster.map(r=>[r.pid,H.scores[r.pid]||0])};
}
function broadcast(){if(ch&&H)ch.send({type:"broadcast",event:"state",payload:publicState()}).catch(()=>{})}
function setPhase(p){const prev=H.phase;H.phase=p;H.epoch=Date.now();H.lastSec=null;H.clock=newClock(buildSeq(H.game,p,H.order));H.endsAt=H.clock.endsAt;broadcast();renderHost();saveHost();Music.sync();if(mode==="host")phaseFx(p,prev)}
function noteJoins(){
  if(!H)return;let any=false;
  phones().forEach(p=>{if(!H.known.has(p.pid)){H.known.add(p.pid);if(H.knownInit){H.fresh[p.pid]=Date.now();any=true}}});
  H.knownInit=true;if(any&&mode==="host")FX.play("join");
}
function hostWon(){
  if(H.game==="flaugin")return H.outcome==="caught"||H.phase==="guess";
  if(H.game==="copycat"||H.game==="glitch")return !!(H.reveal&&H.reveal.caught);
  if(H.game==="rules")return !!(H.reveal&&H.reveal.solved.length);
  return true;
}
function phaseFx(p,prev){
  if(p!==prev||p==="cards"||p==="play"){const sc=sceneFor(H.game,p,H.round);if(sc&&!(p==="lobby"&&!prev))Trans.play(sc[0],sc[1],{long:p==="result",quiet:p==="result"})}
  if(p==="cards"){if(!Music.sting("deal"))FX.play("deal");ANN.round(H.round)}
  else if(p==="play"){if(!Music.sting("deal"))FX.play("deal");ANN.round(H.round)}
  else if(p==="clues"||p==="talk"){FX.play("whoosh");ANN.say("ready")}
  else if(p==="vote"||p==="final"){if(!Music.sting("vote"))FX.play("pop")}
  else if(p==="guess"||p==="result"){
    const win=hostWon();FX.play("drum",0.85);ANN.clear();
    setTimeout(()=>{if(!(win&&Music.sting(Math.random()<0.5?"win":"win2")))FX.play(win?"win":"lose");
      if(H.game==="agenda")ANN.line("agenda");else ANN.line(win?"win":"lose");
      if(win)FX.confetti()},900);
  }
  else if(p==="lobby"&&prev&&prev!=="lobby")FX.play("swoosh");
}
let dealing=false;
function buildRoster(){
  const seen={};
  return phones().slice(0,30).map(p=>{let n=p.name||"Player";const k=n.toLowerCase();seen[k]=(seen[k]||0)+1;if(seen[k]>1)n=n+" "+seen[k];return {pid:p.pid,name:n}});
}
/* Same fairness on the TV, across every game tonight. */
function oddWeights(ids){
  H.oddCounts=H.oddCounts||{};H.oddRecent=H.oddRecent||[];
  const minC=Math.min(...ids.map(id=>H.oddCounts[id]||0));const w={};
  ids.forEach(id=>{w[id]=(H.oddRecent[0]&&H.oddRecent[0].includes(id)?0.12:H.oddRecent[1]&&H.oddRecent[1].includes(id)?0.45:1)/(1+1.6*((H.oddCounts[id]||0)-minC))});
  return w;
}
function noteOdd(ids){H.oddCounts=H.oddCounts||{};ids.forEach(id=>H.oddCounts[id]=(H.oddCounts[id]||0)+1);H.oddRecent=[ids.slice()].concat(H.oddRecent||[]).slice(0,3)}
function pickOddHost(ids,count){
  const W=oddWeights(ids);
  const pool=ids.map((id,i)=>({i,w:W[id]}));const out=[];
  while(out.length<count&&pool.length){const total=pool.reduce((t,x)=>t+x.w,0);let r=(rnd(1e6)/1e6)*total,k=0;for(;k<pool.length-1;k++){r-=pool[k].w;if(r<0)break}out.push(pool[k].i);pool.splice(k,1)}
  return out;
}
async function hostDeal(){
  const G=GAMES[H.game];const ph=phones();if(ph.length<G.min||dealing)return;dealing=true;renderHost();
  const roster=buildRoster();const ids=roster.map(x=>x.pid);
  try{
    if(H.game==="flaugin"){
      const pid=resolvePack();
      const r=await api({action:"deal",code:H.code,hostToken:H.hostToken,playerIds:ids,words:poolFor(pid),pack:PACKS[pid].name,hint:$("optHint").checked,fibs:oddCount(ids.length,"flaugin"),weights:oddWeights(ids)});
      H.roster=roster;roster.forEach(x=>H.names[x.pid]=x.name);freshRound();
      H.round=r.round;H.packId=pid;H.hint=$("optHint").checked;
    }else if(H.game==="rules"){
      H.roster=roster;roster.forEach(x=>H.names[x.pid]=x.name);freshRound();
      const b=buildRules();H.meta=b.meta;H.secret=b.secret;H.round=H.round+1;
    }else{
      const lookup=id=>(roster.find(x=>x.pid===id)||{}).name||"someone";
      let b;
      if(H.game==="agenda")b=buildAgenda(ids,lookup);
      else{const oddIdx=pickOddHost(ids,oddCount(ids.length,H.game));b=H.game==="copycat"?buildCopycat(ids,oddIdx):buildGlitch(ids,oddIdx)}
      const r=await api({action:"dealCards",code:H.code,hostToken:H.hostToken,game:H.game,cards:b.cards});
      H.roster=roster;roster.forEach(x=>H.names[x.pid]=x.name);freshRound();
      H.round=r.round;H.meta=b.meta;H.secret=b.secret;if(b.secret.odd){H.lastOdd=b.secret.odd;noteOdd(b.secret.odd)}
    }
    H.timerSecs=cfg(H.game).timer;H.timerOn=H.timerSecs>0;H.maxGuesses=cfg("rules").guesses;
    H.order=shuffle(roster.map(r=>r.pid));
    setTag(G.name+" · Room "+H.code+" · Round "+H.round);H.err="";
    setPhase(H.game==="rules"?"play":"cards");
  }catch(e){H.err=e.message;renderHost()}
  finally{dealing=false;renderHost()}
}
function tally(){const c={};Object.values(H.votes).forEach(t=>{c[t]=(c[t]||0)+1});return c}
async function hostReveal(force){
  const c=tally();const max=Math.max(0,...Object.values(c));const top=Object.keys(c).filter(k=>c[k]===max);
  H.tally=c;
  if(!force&&(max===0||top.length>1)){H.tie=true;if(max>0){FX.play("tie");ANN.line("tie")}renderHost();return}
  H.tie=false;
  if(H.game==="copycat"||H.game==="glitch"){
    const odd=H.secret.odd;const caughtId=max>0&&top.length===1?top[0]:null;
    const per=H.game==="copycat"?2:3;const rp={};
    Object.entries(H.votes).forEach(([voter,t])=>{if(odd.includes(t)&&!odd.includes(voter))rp[voter]=(rp[voter]||0)+per});
    odd.forEach(id=>{if(id!==caughtId)rp[id]=(rp[id]||0)+4});
    Object.entries(rp).forEach(([id,n])=>H.scores[id]=(H.scores[id]||0)+n);
    H.voted=caughtId;
    H.reveal=Object.assign({caughtId,caught:!!caughtId&&odd.includes(caughtId),rp,tally:c},H.secret,H.meta);
    return setPhase("result");
  }
  H.voted=top[0];
  try{const r=await api({action:"reveal",code:H.code,hostToken:H.hostToken});H.word=r.word;H.fib=r.fib;markUsed(H.packId,r.word);noteOdd(r.fib)}
  catch(e){H.err=e.message;renderHost();return}
  H.err="";
  if(H.fib.includes(H.voted))setPhase("guess");else hostFinish("escaped");
}
function hostRevote(){H.voteRound++;H.votes={};H.tally=null;H.tie=false;setPhase("vote")}
function hostFinish(outcome){
  H.outcome=outcome;award(H.scores,outcome,H.roster.map(r=>r.pid),H.fib,H.voted);setPhase("result");
}
/* Secret Agenda */
function agendaReveal(force){
  const ids=H.roster.map(r=>r.pid);
  const s=scoreAgendas(H.secret.agendas,H.first,H.final,ids,H.meta.options);
  if(!force&&s.chosen==null){H.tie=true;H.tally=s.counts;if(Math.max(...s.counts)>0){FX.play("tie");ANN.line("tie")}renderHost();return}
  H.tie=false;const rp={};
  ids.forEach(id=>{if(s.results[id]){rp[id]=3;H.scores[id]=(H.scores[id]||0)+3}});
  H.reveal={chosen:s.chosen,counts:s.counts,firstCounts:s.firstCounts,rp,
    rows:ids.map(id=>({pid:id,text:H.secret.agendas[id].text,done:s.results[id],first:H.first[id],final:H.final[id]})),options:H.meta.options,title:H.meta.title};
  setPhase("result");
}
/* Rulebreakers */
function onTry(p){
  if(!H||H.game!=="rules"||H.phase!=="play"||!inRoster(p.pid)||p.round!==H.round)return;
  const now=Date.now();if(now-(H.tryAt[p.pid]||0)<1200)return;H.tryAt[p.pid]=now;
  const entry=normalizeEntry(H.meta.kind,p.entry);if(entry==null)return;
  const ok=testEntry(H.secret.rule,H.meta.kind,entry);
  H.log.push({pid:p.pid,name:nameOf(p.pid),entry,ok});if(H.log.length>60)H.log.shift();FX.play(ok?"accept":"reject");ANN.line(ok?"correct":"wrong",{throttle:2500});
  broadcast();renderHost();
}
function onGuess(p){
  if(!H||H.game!=="rules"||H.phase!=="play"||!inRoster(p.pid)||p.round!==H.round)return;
  if(H.solved.includes(p.pid)||(H.guesses[p.pid]||0)>=(H.maxGuesses||2))return;
  const choice=Number(p.choice);if(!(choice>=0&&choice<H.meta.options.length))return;
  H.guesses[p.pid]=(H.guesses[p.pid]||0)+1;
  if(choice===H.secret.answer){const first=H.solved.length===0;H.rp[p.pid]=first?5:2;H.solved.push(p.pid);FX.play("solve");ANN.line(first?"first":"solved")}else FX.play("reject")
  broadcast();renderHost();
}
function rulesReveal(){
  Object.entries(H.rp).forEach(([id,n])=>H.scores[id]=(H.scores[id]||0)+n);
  H.reveal={rule:H.secret.rule.text,answer:H.secret.answer,rp:H.rp,solved:H.solved,kind:H.meta.kind};
  setPhase("result");
}
function joinCard(){
  const url=SITE+"?pin="+H.code;
  const qr=el("div",{class:"qr",role:"img","aria-label":"QR code to join room "+H.code});
  setTimeout(()=>{try{if(window.QRCode)new QRCode(qr,{text:url,width:400,height:400,colorDark:"#15130e",colorLight:"#ffffff",correctLevel:QRCode.CorrectLevel.M})}catch(e){}},0);
  return el("div",{class:"join-card"},el("span",{class:"lbl",text:"Join on your phone"}),el("div",{class:"pin","aria-label":H.code},...H.code.split("").map((c,i)=>el("span",{style:"animation-delay:"+(i*0.08)+"s",text:c}))),qr,
    el("p",{class:"sub",style:"margin:0"},document.createTextNode("Scan the code, or go to "),el("span",{class:"join-url",text:SITE.replace(/^https?:\/\//,"").replace(/\/$/,"")}),document.createTextNode(" and enter the PIN.")));
}
function chipsFor(list,isOk){const c=el("div",{class:"chips"});list.forEach(r=>{const ok=isOk(r);const fresh=H&&H.fresh&&H.fresh[r.pid]&&Date.now()-H.fresh[r.pid]<1600;c.append(el("span",{class:"chip"+(ok?" ok":"")+(fresh?" pop":"")},el("span",{class:"tick",text:ok?"✓":"…"}),el("span",{text:r.name})))});return c}
function errLine(){return H.err?el("p",{class:"status on-felt err",text:H.err}):el("span")}
function gameSwitcher(){
  const row=el("div",{class:"switcher",role:"group","aria-label":"Choose a game"});
  Object.keys(GAMES).forEach(g=>row.append(el("button",{type:"button","aria-pressed":String(H.game===g),text:GAMES[g].name,onclick:()=>{if(H.game!==g)Trans.play(GAMES[g].name,"Up next");setGame(g);H.game=g;H.phase="lobby";H.epoch=Date.now();setTag(GAMES[g].name+" · Room "+H.code);broadcast();renderHost()}})));
  return row;
}
function scoreboard(){
  const body=el("tbody");renderScoreTable(body,H.roster.map(r=>[r.name,H.scores[r.pid]||0]),true);
  return el("div",{class:"panel"},el("h3",{text:"Tonight's scoreboard"}),el("table",{class:"scores"},body));
}
function resultFooter(main){
  const G=GAMES[H.game];const ph=phones();
  const nx=el("button",{class:"btn-big",text:dealing?"Dealing…":ph.length>=G.min?"Next round":"Need "+G.min+" phones for the next round",onclick:hostDeal});nx.disabled=ph.length<G.min||dealing;
  main.append(nx,errLine(),el("div",{class:"row"},el("button",{class:"btn-chalk btn-small",text:"Pick another game",onclick:()=>{setPhase("lobby")}}),el("button",{class:"btn-chalk btn-small",text:"Close room",onclick:closeRoom})));
}
function promptCard(eyebrow,title,scene){
  return el("div",{class:"tv-prompt"},el("p",{class:"eyebrow",text:eyebrow}),el("p",{class:"prompt",text:title}),scene?el("p",{class:"scene",text:scene}):null);
}
function optionsGrid(options,counts,winner){
  const g=el("div",{class:"opt-grid"});
  options.forEach((o,i)=>g.append(el("div",{class:"opt"+(winner===i?" win":"")},document.createTextNode(o),counts?el("small",{text:counts[i]+(counts[i]===1?" vote":" votes")}):null)));
  return g;
}
let lastHostEpoch=0;
function renderHost(){
  if(!H||mode!=="host")return;
  const fresh=H.epoch!==lastHostEpoch;lastHostEpoch=H.epoch;
  renderHostInner();
  if(fresh){animIn($("hostMain"));animIn($("hostSide"))}
  const since=Date.now()-H.epoch;
  if((H.phase==="result"||H.phase==="guess")&&since<1500)
    document.querySelectorAll("#hostMain > .verdict, #hostMain > .big-msg").forEach(v=>{v.classList.add("big-in");v.style.animationDelay=Math.max(0,850-since)+"ms"});
}
function renderHostInner(){
  const main=$("hostMain"),side=$("hostSide");main.textContent="";side.textContent="";
  const ph=phones();const G=GAMES[H.game];
  if(H.phase==="lobby"){
    main.append(el("p",{class:"eyebrow",text:G.name}),el("p",{class:"big-msg",text:"Grab your phones!"}),el("p",{class:"sub",text:G.min+" to 30 players. Late arrivals join the next round."}));
    main.append(el("div",{class:"panel"},el("h3",{text:"Players in · "+ph.length}),ph.length?chipsFor(ph,()=>true):el("p",{class:"sub",text:"Waiting for the first player…"})));
    const go=el("button",{class:"btn-big",text:dealing?"Dealing…":ph.length<G.min?"Need "+(G.min-ph.length)+" more to start":(H.game==="rules"?"Open the gate":"Deal the cards"),onclick:hostDeal});go.disabled=ph.length<G.min||dealing;
    main.append(go,errLine(),el("p",{class:"sub",text:"Game"}),gameSwitcher(),el("div",{class:"row"},
      el("button",{class:"btn-chalk btn-small",text:"Game settings",onclick:()=>{openSetup()}}),
      el("button",{class:"btn-chalk btn-small",text:"Close room",onclick:closeRoom})));
    side.append(joinCard());return;
  }
  if(H.game==="flaugin")return renderHostFlaugin(main,side);
  if(H.game==="copycat"||H.game==="glitch")return renderHostOdd(main,side);
  if(H.game==="agenda")return renderHostAgenda(main,side);
  if(H.game==="rules")return renderHostRules(main,side);
}
function renderHostFlaugin(main,side){
  if(H.phase==="cards"){
    const n=H.roster.filter(r=>H.ready[r.pid]).length;
    main.append(el("p",{class:"big-msg",text:"Check your phones."}),el("p",{class:"sub",text:"Press and hold your card to peek. Don't let anyone see!"}));
    main.append(el("div",{class:"panel"},el("h3",{text:"Seen their card · "+n+" of "+H.roster.length}),chipsFor(H.roster,r=>H.ready[r.pid])));
    main.append(el("button",{class:"btn-big",text:n===H.roster.length?"Everyone's ready. Start clues":"Start clues",onclick:()=>{H.endsAt=0;setPhase("clues")}}));
    add(side,clockPanel(),joinCard());return;
  }
  if(H.phase==="clues"){
    main.append(el("p",{class:"big-msg",text:"One word each, in this order."}));
    main.append(el("div",{class:"panel"},el("h3",{text:"Speaking order"}),orderList()));
    main.append(el("button",{class:"btn-big",text:"Time to vote",onclick:()=>{H.voteRound++;H.votes={};H.endsAt=0;setPhase("vote")}}));
    add(side,clockPanel());
    if(H.hint)side.append(el("div",{class:"panel"},el("h3",{text:"Pack"}),el("p",{style:"margin:0;font-size:1.2rem;font-weight:800",text:PACKS[H.packId].name})));
    return;
  }
  if(H.phase==="vote")return renderVote(main,side,"Who’s flaugin’? Vote on your phone.");
  if(H.phase==="guess"){
    main.append(el("p",{class:"verdict win",text:"Caught! "+nameOf(H.voted)+" was flaugin’."}),el("p",{class:"reveal-line",text:nameOf(H.voted)+", say your guess for the secret word out loud."}));
    const p=el("div",{class:"panel"},el("h3",{text:"Last chance"}));
    if(!H.showWord)p.append(el("button",{class:"btn-felt",text:"Show the word",onclick:()=>{H.showWord=true;broadcast();renderHost()}}));
    else p.append(el("p",{class:"verdict",style:"color:var(--felt)",text:H.word}),el("div",{class:"row"},el("button",{text:"They got it",style:"flex:1",onclick:()=>hostFinish("stole")}),el("button",{class:"btn-ghost",text:"They missed",style:"flex:1",onclick:()=>hostFinish("caught")})));
    main.append(p);side.append(el("div",{class:"panel"},el("h3",{text:"The votes"}),tallyBars(false)));return;
  }
  if(H.phase==="result"){
    const fibNames=H.fib.map(nameOf);const [t,cls,line]=verdictText(H.outcome,fibNames.join(" and "),nameOf(H.voted));
    main.append(el("p",{class:"verdict "+cls,text:t}));
    const l=el("p",{class:"reveal-line",text:line+" The word was "});l.append(el("b",{text:H.word}),document.createTextNode(". "+(fibNames.length>1?"The Flaugers: ":"The Flauger: ")+fibNames.join(" and ")+"."));main.append(l);
    const sb2=scoreboard();sb2.append(el("p",{class:"sub",style:"font-size:.82rem",text:"Flauger escapes: +2. Caught but guesses the word: +1. Caught and misses: +1 to everyone else."}));main.append(sb2);
    resultFooter(main);
    side.append(el("div",{class:"panel"},el("h3",{text:"The votes"}),tallyBars(true)),joinCard());return;
  }
}
function renderVote(main,side,title){
  const n=H.roster.filter(r=>H.votes[r.pid]).length;
  main.append(el("p",{class:"big-msg",text:title}));
  main.append(el("div",{class:"panel"},el("h3",{text:"Votes in · "+n+" of "+H.roster.length}),chipsFor(H.roster,r=>H.votes[r.pid])));
  if(H.tie){
    const anyway=H.game!=="flaugin"?el("button",{class:"btn-ghost",text:"Reveal anyway",onclick:()=>hostReveal(true)}):null;
    side.append(el("div",{class:"panel"},el("h3",{text:n?"It's a tie!":"No votes yet"}),tallyBars(false),el("p",{class:"sub",text:"Talk it out, then vote again."}),el("div",{class:"row"},el("button",{class:"btn-felt",text:"Vote again",onclick:hostRevote}),anyway)));
  }
  const rv=el("button",{class:"btn-big",text:n===H.roster.length?"Everyone voted. Reveal!":"Reveal votes",onclick:()=>hostReveal(false)});rv.disabled=n===0;
  main.append(rv,errLine());
}
function renderHostOdd(main,side){
  const copy=H.game==="copycat";
  const prompt=()=>copy?promptCard("Debate topic",H.meta.prompt):promptCard("The case",H.meta.title,H.meta.scene);
  if(H.phase==="cards"){
    const n=H.roster.filter(r=>H.ready[r.pid]).length;
    main.append(el("p",{class:"big-msg",text:copy?"Check your secret mission.":"Read your case file."}),el("p",{class:"sub",text:"Press and hold your card on your phone. Don't let anyone see!"}));
    main.append(el("div",{class:"panel"},el("h3",{text:"Ready · "+n+" of "+H.roster.length}),chipsFor(H.roster,r=>H.ready[r.pid])));
    main.append(el("button",{class:"btn-big",text:n===H.roster.length?(copy?"Everyone's ready. Start the debate":"Everyone's ready. Start investigating"):(copy?"Start the debate":"Start investigating"),onclick:()=>{H.endsAt=0;setPhase("talk")}}));
    add(side,clockPanel(),prompt(),joinCard());return;
  }
  if(H.phase==="talk"){
    main.append(prompt());
    if(copy||cfg(H.game).turn>0)main.append(el("div",{class:"panel"},el("h3",{text:copy?"Everyone weighs in, in this order":"Turn order"}),orderList()));
    if(!copy)main.append(el("div",{class:"panel"},el("h3",{text:"How to investigate"}),el("p",{style:"margin:0",text:"Ask each other questions like “What time did it happen?” Answer honestly from your own file. One file has some wrong details, and nobody knows whose."})));
    main.append(el("button",{class:"btn-big",text:"Time to vote",onclick:()=>{H.voteRound++;H.votes={};H.endsAt=0;setPhase("vote")}}));
    add(side,clockPanel());
    return;
  }
  if(H.phase==="vote"){renderVote(main,side,copy?"Who’s the Copycat? Vote on your phone.":"Whose file is glitched? Vote on your phone.");side.prepend(prompt());return}
  if(H.phase==="result"){
    const rv=H.reveal;const oddNames=rv.odd.map(nameOf);
    main.append(el("p",{class:"verdict "+(rv.caught?"win":"lose"),text:rv.caught?(copy?"Copycat caught!":"Glitch found!"):(copy?oddNames.join(" and ")+" got away!":"The glitch slipped through!")}));
    main.append(el("p",{class:"reveal-line",text:rv.caughtId?"Most votes: "+nameOf(rv.caughtId)+". The "+(copy?"Copycat":"glitched file")+" was "+oddNames.join(" and ")+".":"No clear vote. "+oddNames.join(" and ")+" "+(oddNames.length>1?"were":"was")+" the "+(copy?"Copycat":"glitch")+"."}));
    main.append(revealDetails(H.game,rv,nameOf));
    const sb2=scoreboard();sb2.append(el("p",{class:"sub",style:"font-size:.82rem",text:"Correct vote: +"+(copy?2:3)+". Not caught: +4 to the "+(copy?"Copycat":"glitched player")+"."}));main.append(sb2);
    resultFooter(main);
    side.append(el("div",{class:"panel"},el("h3",{text:"The votes"}),tallyBars(true,rv.odd)),joinCard());return;
  }
}
function renderHostAgenda(main,side){
  const m=H.meta;
  const prompt=()=>el("div",{class:"tv-prompt"},el("p",{class:"eyebrow",text:m.title}),el("p",{class:"prompt",text:m.question}),optionsGrid(m.options));
  if(H.phase==="cards"){
    const n=H.roster.filter(r=>H.first[r.pid]!=null).length;
    main.append(el("p",{class:"big-msg",text:"Check your secret agenda."}),el("p",{class:"sub",text:"Then make your secret first pick on your phone: what you'd really choose right now."}));
    main.append(el("div",{class:"panel"},el("h3",{text:"First picks in · "+n+" of "+H.roster.length}),chipsFor(H.roster,r=>H.first[r.pid]!=null)));
    main.append(el("button",{class:"btn-big",text:n===H.roster.length?"Everyone's in. Start the debate":"Start the debate",onclick:()=>{H.endsAt=0;setPhase("talk")}}));
    add(side,clockPanel(),prompt(),joinCard());return;
  }
  if(H.phase==="talk"){
    main.append(prompt(),el("div",{class:"panel"},el("h3",{text:"Debate and negotiate"}),el("p",{style:"margin:0",text:"Make your case. Make deals. Change minds. Just don't reveal your agenda!"})));
    if(cfg("agenda").turn>0)main.append(el("div",{class:"panel"},el("h3",{text:"Everyone pleads their case, in this order"}),orderList()));
    main.append(el("button",{class:"btn-big",text:"Final vote",onclick:()=>{H.voteRound++;H.final={};H.endsAt=0;setPhase("final")}}));
    add(side,clockPanel());
    return;
  }
  if(H.phase==="final"){
    const n=H.roster.filter(r=>H.final[r.pid]!=null).length;
    main.append(el("p",{class:"big-msg",text:"Final vote! Pick on your phone."}));
    main.append(el("div",{class:"panel"},el("h3",{text:"Votes in · "+n+" of "+H.roster.length}),chipsFor(H.roster,r=>H.final[r.pid]!=null)));
    if(H.tie){
      const mx=Math.max(...H.tally);const ties=mx>0?H.tally.map((c,i)=>c===mx?m.options[i]:null).filter(Boolean):[];
      side.append(el("div",{class:"panel"},el("h3",{text:ties.length?"Tie: "+ties.join(" vs "):"No votes yet"}),el("p",{class:"sub",text:"Vote again to break the tie, or reveal with no decision."}),
        el("div",{class:"row"},el("button",{class:"btn-felt",text:"Vote again",onclick:()=>{H.voteRound++;H.final={};H.tie=false;setPhase("final")}}),el("button",{class:"btn-ghost",text:"No decision",onclick:()=>agendaReveal(true)}))));
    }
    side.prepend(prompt());
    const rv=el("button",{class:"btn-big",text:n===H.roster.length?"Everyone voted. Reveal!":"Reveal the decision",onclick:()=>agendaReveal(false)});rv.disabled=n===0;
    main.append(rv);return;
  }
  if(H.phase==="result"){
    const rv=H.reveal;
    main.append(el("p",{class:"verdict win",text:rv.chosen!=null?"The family chose "+rv.options[rv.chosen]+"!":"No decision. It's a tie!"}));
    const ul=el("ul",{class:"agenda-list"});
    rv.rows.forEach(r=>{
      const sw=r.first!=null&&r.final!=null&&r.first!==r.final;
      ul.append(el("li",null,el("span",{class:r.done?"ok":"no",text:r.done?"✓":"✗"}),
        el("div",null,el("span",{class:"who",text:nameOf(r.pid)+": "}),document.createTextNode(r.text),
          el("div",{style:"font-size:.82rem;color:var(--muted)",text:"First pick: "+(r.first!=null?rv.options[r.first]:"none")+" · Final: "+(r.final!=null?rv.options[r.final]:"none")+(sw?" (switched)":"")})),
        el("span",{class:"pts",text:r.done?"+3":""})));
    });
    main.append(el("div",{class:"panel"},el("h3",{text:"Everyone's secret agenda"}),ul));
    const sb2=scoreboard();sb2.append(el("p",{class:"sub",style:"font-size:.82rem",text:"Every agenda that came true: +3."}));main.append(sb2);
    resultFooter(main);
    side.append(el("div",{class:"tv-prompt"},el("p",{class:"eyebrow",text:rv.title}),el("p",{class:"prompt",text:"Final votes"}),optionsGrid(rv.options,rv.counts,rv.chosen)));
    return;
  }
}
function logList(entries){
  const log=el("ul",{class:"log"});
  entries.slice().reverse().forEach(x=>log.append(el("li",null,el("span",null,document.createTextNode(x.entry.toUpperCase()+" "),el("small",{text:x.name})),el("span",{class:x.ok?"yes-t":"no-t",text:x.ok?"ACCEPTED":"REJECTED"}))));
  return log;
}
let lastGateLen=0;
function renderHostRules(main,side){
  const m=H.meta;
  if(H.phase==="play"){
    const last=H.log[H.log.length-1];
    const freshGate=H.log.length!==lastGateLen;lastGateLen=H.log.length;
    const gate=el("div",{class:"gate"+(freshGate&&last?" fresh":"")},el("span",{class:"entry",text:last?last.entry.toUpperCase():"?"}),
      last?el("span",{class:"verdict-tag "+(last.ok?"yes":"nope"),text:last.ok?"ACCEPTED":"REJECTED"}):el("span",{style:"color:var(--on-bg-dim)",text:"Waiting for the first "+(m.kind==="number"?"number":"word")+"…"}),
      last?el("span",{style:"color:var(--on-bg-dim)",text:"from "+last.name}):null);
    main.append(el("p",{class:"eyebrow",text:"The gate has a secret rule"}),el("p",{class:"big-msg",text:"Type "+(m.kind==="number"?"numbers":"words")+" on your phone to test it."}),gate);
    main.append(el("div",{class:"panel"},el("h3",{text:"How to crack it"}),el("p",{style:"margin:0",text:m.kind==="number"?"Try all kinds of numbers: small, big, even, odd, ones with repeating digits. Watch what gets through.":"Try all kinds of words: short, long, silly, ones with double letters. Watch what gets through."})));
    const done=H.roster.every(r=>H.solved.includes(r.pid)||(H.guesses[r.pid]||0)>=(H.maxGuesses||2));
    main.append(el("button",{class:"btn-big",text:done?"Everyone's done. Reveal the rule":"Reveal the rule",onclick:rulesReveal}));
    add(side,clockPanel());
    side.append(el("div",{class:"panel"},el("h3",{text:"Everything tried · "+H.log.length}),H.log.length?logList(H.log.slice(-16)):el("p",{class:"sub",text:"Nothing yet."})));
    side.append(el("div",{class:"panel"},el("h3",{text:"Rule crackers"}),H.solved.length?el("ol",{class:"order"},...H.solved.map((p,i)=>el("li",{text:nameOf(p)+(i===0?" (+5)":" (+2)")}))):el("p",{class:"sub",text:"Nobody yet. Pick the rule on your phone when you know it."})));
    return;
  }
  if(H.phase==="result"){
    const rv=H.reveal;
    main.append(el("p",{class:"eyebrow",text:"The secret rule was"}),el("p",{class:"big-msg",text:rv.rule}));
    main.append(el("p",{class:"reveal-line",text:rv.solved.length?"Cracked by "+rv.solved.map(nameOf).join(", ")+".":"Nobody cracked it this time!"}));
    const sb2=scoreboard();sb2.append(el("p",{class:"sub",style:"font-size:.82rem",text:"First to crack it: +5. Others who crack it: +2."}));main.append(sb2);
    resultFooter(main);
    side.append(el("div",{class:"panel"},el("h3",{text:"What got tested"}),H.log.length?logList(H.log.slice(-16)):el("p",{class:"sub",text:"Nothing was tested."})),joinCard());
    return;
  }
}
function tallyBars(markOdd,oddList){
  const odd=oddList||(H.game==="flaugin"?H.fib:[]);
  const t=el("div",{class:"tally"});const c=H.tally||tally();const max=Math.max(1,...Object.values(c));
  const tag=H.game==="flaugin"?" (flaugin’)":H.game==="copycat"?" (Copycat)":" (glitched)";
  Object.keys(c).sort((a,b)=>c[b]-c[a]).forEach(k=>t.append(el("div",{class:"bar"},el("span",{text:nameOf(k)+(markOdd&&odd.includes(k)?tag:"")}),el("i",{style:"width:"+(c[k]/max*100)+"%"}),el("b",{text:String(c[k])}))));
  return t;
}
let closeArmed=0;
function closeRoom(){
  if(Date.now()-closeArmed>3000){closeArmed=Date.now();setTag("Tap Close room again to end the game");return}
  if(ch)ch.send({type:"broadcast",event:"closed",payload:{code:H.code}}).catch(()=>{});
  store.del("host");setTimeout(()=>{leaveLive();mode="home";document.body.classList.remove("tv");setTag("");renderHome();show("vHome")},300);
}

/* =====================================================================
   PLAYER PHONE
   ===================================================================== */
let P=null,pTimer=0;
function openJoin(pin){
  mode="player";show("vJoin");
  $("joinPin").value=pin||"";$("joinName").value=store.get("myName","");
  $("joinStatus").className="status";$("joinStatus").textContent="";$("joinBtn").disabled=false;
  setTimeout(()=>{(pin?$("joinName"):$("joinPin")).focus()},50);
}
$("joinPin").addEventListener("input",()=>{$("joinPin").value=$("joinPin").value.toUpperCase().replace(/[^A-Z]/g,"").slice(0,4)});
$("joinForm").onsubmit=async e=>{
  e.preventDefault();
  const pin=$("joinPin").value.trim().toUpperCase(),name=$("joinName").value.trim().slice(0,14);
  const st=$("joinStatus");st.className="status err";
  if(!/^[A-Z]{4}$/.test(pin)){st.textContent="The PIN is the 4 letters on the big screen.";return}
  if(!name){st.textContent="Type your name so everyone knows who you are.";return}
  if(!sb){st.textContent="The game server didn't load. Refresh the page and try again.";return}
  $("joinBtn").disabled=true;st.className="status";st.textContent="Joining room "+pin+"…";
  let me=store.get("me:"+pin,null);
  try{
    if(!me||me.name!==name){const r=await api({action:"join",code:pin,name});me={pid:r.playerId,token:r.token,name:r.name,at:Date.now(),srv:SRV};store.set("me:"+pin,me)}
  }catch(err){$("joinBtn").disabled=false;st.className="status err";st.textContent=err.message;return}
  store.set("myName",name);
  startPlayer(pin,me);
};
function startPlayer(pin,me){
  keepAwake();store.set("lastRoom",pin);FX.setQuiet(0.55);
  P={pin,pid:me.pid,token:me.token,name:me.name,state:null,card:null,cardErr:"",fetching:false,peekedRound:0,vote:null,closed:false,
     first:null,final:null,myGuesses:[],tryErr:"",lastTry:0};
  ch=channelFor(pin,me.pid);
  ch.on("broadcast",{event:"state"},({payload})=>onState(payload))
    .on("broadcast",{event:"closed"},()=>{if(P){P.closed=true;renderPlayer()}})
    .on("presence",{event:"sync"},()=>{if(P&&!P.state)renderPlayer()})
    .subscribe(status=>{
      if(status==="SUBSCRIBED"){setConn(true);ch.track({pid:me.pid,name:me.name});ch.send({type:"broadcast",event:"hello",payload:{pid:me.pid}}).catch(()=>{})}
      else if(status==="CHANNEL_ERROR"||status==="TIMED_OUT"||status==="CLOSED")setConn(false);
    });
  setTag("Room "+pin);show("vPlayer");renderPlayer();
  setTimeout(()=>{if(P&&!P.state){P.slow=true;renderPlayer()}},7000);
}
const CARD_PHASES=["cards","clues","talk","vote","final","guess"];
function onState(s){
  if(!P||!s||s.code!==P.pin)return;
  const prev=P.state;
  if(prev&&s.epoch<prev.epoch)return;
  if(prev&&(prev.round!==s.round||prev.game!==s.game)){P.first=null;P.final=null;P.myGuesses=[];P.vote=null}
  P.state=s;P.slow=false;
  if(GAMES[s.game])setTag(GAMES[s.game].name+" · Room "+P.pin);
  const inRound=Array.isArray(s.roster)&&s.roster.some(r=>r.pid===P.pid);
  if(inRound&&s.game!=="rules"&&CARD_PHASES.includes(s.phase)&&(!P.card||P.card.round!==s.round||P.card.game!==s.game)&&!P.fetching)fetchCard();
  // re-send anything the TV may have missed
  if(inRound&&P.peekedRound===s.round&&!(s.ready||[]).includes(P.pid))sendReady();
  if(inRound&&s.phase==="vote"&&P.vote&&P.vote.r===s.voteRound&&!(s.voted||[]).includes(P.pid))sendVote();
  if(inRound&&s.game==="agenda"&&s.phase==="cards"&&P.first!=null&&!(s.firstIn||[]).includes(P.pid))sendPick("first",P.first);
  if(inRound&&s.game==="agenda"&&s.phase==="final"&&P.final&&P.final.r===s.voteRound&&!(s.finalIn||[]).includes(P.pid))sendPick("final",P.final.o);
  phoneFx(prev,s,inRound);
  const changed=!prev||prev.epoch!==s.epoch||prev.phase!==s.phase||prev.showWord!==s.showWord||prev.endsAt!==s.endsAt||prev.round!==s.round||prev.game!==s.game
    ||(s.game==="rules"&&JSON.stringify([s.log,s.solved,s.guesses])!==JSON.stringify([prev.log,prev.solved,prev.guesses]));
  if(changed)renderPlayer();
}
function phoneScored(s){
  if(s.game==="flaugin"){const fib=s.fib||[];const am=fib.includes(P.pid);return s.outcome==="escaped"?am:s.outcome==="stole"?s.votedOut===P.pid:!am}
  return !!((s.reveal||{}).rp||{})[P.pid];
}
function phoneFx(prev,s,inRound){
  if(prev&&(prev.phase!==s.phase||prev.round!==s.round||prev.game!==s.game)){
    const sc=(s.phase!=="lobby"&&!inRound)?null:sceneFor(s.game,s.phase,s.round);
    if(sc)Trans.play(sc[0],sc[1],{long:s.phase==="result",quiet:true});
  }
  if(!inRound)return;
  if(s.phase==="result"&&(!prev||prev.phase!=="result"||prev.epoch!==s.epoch)){
    const won=phoneScored(s);
    setTimeout(()=>{FX.play(won?"win":"lose");FX.vibrate(won?[40,60,40,60,140]:[220]);if(won)FX.confetti(90)},950);
  }
  if(s.game==="rules"&&prev&&prev.game==="rules"&&prev.round===s.round){
    const a=prev.log||[],b=s.log||[];const lastNew=b[b.length-1];
    if(lastNew&&lastNew.pid===P.pid&&JSON.stringify(a[a.length-1])!==JSON.stringify(lastNew)){FX.play(lastNew.ok?"accept":"reject");FX.vibrate(lastNew.ok?25:[60,40,60])}
    if((s.solved||[]).includes(P.pid)&&!(prev.solved||[]).includes(P.pid)){FX.play("solve");FX.vibrate([30,30,30,30,90]);FX.confetti(70)}
  }
}
async function fetchCard(){
  P.fetching=true;P.cardErr="";
  try{
    const c=await api({action:"card",code:P.pin,playerId:P.pid,token:P.token});
    P.card=c.game==="flaugin"?Object.assign({},c):Object.assign({},c.card,{round:c.round,game:c.game});FX.vibrate([30,40,30]);FX.play("deal");
  }
  catch(e){P.cardErr=e.message}
  finally{P.fetching=false;renderPlayer()}
}
function playerClock(s){
  const c=s.clock;if(!c)return null;
  const g=c.k==="done"?null:{k:c.k,who:c.who};
  const box=el("div",{class:"panel clock-panel"+(c.k==="turn"&&c.who===P.pid?" mine":"")});
  box.append(el("h3",{text:c.k==="turn"?"Turn "+c.turnNo+" of "+c.turnN:c.k==="count"?"Starting in":"Timer"}),el("p",{class:"clock-title",text:clockTitle(g,s.game,pid=>rosterName(s,pid),P.pid)}));
  if(g){const t=el("div",{class:"timer"});const upd=()=>{const left=(s.endsAt-Date.now())/1000;t.textContent=left>0?fmt(left):"0:00";t.classList.toggle("hurry",left>0&&left<=10&&c.k!=="count")};upd();clearInterval(pTimer);pTimer=setInterval(upd,500);box.append(t)}
  if(c.k==="turn"&&c.who===P.pid){
    if(!P.myTurnBuzz||P.myTurnBuzz!==s.epoch+":"+c.i){P.myTurnBuzz=s.epoch+":"+c.i;FX.vibrate([60,40,60])}
    box.append(el("button",{class:"btn-felt",text:"I'm done",onclick:()=>{if(ch)ch.send({type:"broadcast",event:"skip",payload:{pid:P.pid,i:c.i}}).catch(()=>{});FX.play("swoosh")}}));
  }else if(c.next===P.pid&&c.k!=="study")box.append(el("p",{class:"sub",style:"margin:0",text:"You're up next!"}));
  return box;
}
function sendReady(){if(ch&&P.state)ch.send({type:"broadcast",event:"ready",payload:{pid:P.pid,round:P.state.round}}).catch(()=>{})}
function sendVote(){if(ch&&P.vote)ch.send({type:"broadcast",event:"vote",payload:{pid:P.pid,r:P.vote.r,target:P.vote.target}}).catch(()=>{})}
function sendPick(kind,o){if(ch&&P.state)ch.send({type:"broadcast",event:"pick",payload:{pid:P.pid,round:P.state.round,kind,option:o,r:P.state.voteRound}}).catch(()=>{})}
function rosterName(s,pid){const r=(s.roster||[]).find(x=>x.pid===pid);return r?r.name:"Someone"}
let lastPlayerKey="";
function renderPlayer(){
  if(!P||mode!=="player")return;
  renderPlayerInner();
  if(P.state&&P.state.phase==="result"&&GAMES[P.state.game])$("vPlayer").append(ratingWidget(P.state.game,true));
  const s=P.state;const key=s?[s.phase,s.round,s.game,s.epoch].join("|"):(P.closed?"closed":"wait");
  if(key!==lastPlayerKey){lastPlayerKey=key;animIn($("vPlayer"))}
}
function renderPlayerInner(){
  const v=$("vPlayer");
  // keep a half-typed Rulebreakers entry across re-renders
  const draft=$("tryInput")?$("tryInput").value:"";const hadFocus=document.activeElement&&document.activeElement.id==="tryInput";
  const openDetails=!!(v.querySelector("details[open]"));
  v.textContent="";clearInterval(pTimer);
  const s=P.state;
  const hello=el("p",{class:"sub",text:"You're "+P.name+" in room "+P.pin+"."});
  const change=el("button",{class:"btn-chalk btn-small",style:"align-self:flex-start",text:"Leave this game",onclick:()=>{store.del("me:"+P.pin);store.del("lastRoom");leaveLive();openJoin("")}});
  if(P.closed){v.append(el("p",{class:"big-msg",text:"The host closed this room."}),el("p",{class:"sub",text:"Thanks for playing! Join a new room with a fresh PIN."}),change);return}
  if(!s){
    v.append(el("p",{class:"big-msg",text:P.slow?"Can't find the big screen.":"You're in!"}),hello,
      el("p",{class:"status on-felt"+(P.slow?" err":""),text:P.slow?"Make sure the host's screen is still open on room "+P.pin+".":"Connecting to the big screen…"}),change);
    return;
  }
  const G=GAMES[s.game]||GAMES.flaugin;
  const inRound=s.roster.some(r=>r.pid===P.pid);
  if(s.phase==="lobby"){
    v.append(el("p",{class:"eyebrow",text:"Up next: "+G.name}),el("p",{class:"big-msg",text:"You're in!"}),hello,el("p",{class:"sub",text:"The game starts when the TV deals."}));
    if(inRound&&s.round>0)v.append(myScore(s));
    v.append(change);return;
  }
  if(!inRound){
    v.append(el("p",{class:"big-msg",text:G.name+" round "+s.round+" is underway."}),hello,el("p",{class:"sub",text:"You'll be in the next round."}),change);return;
  }
  if(s.game==="rules")return renderPlayerRules(v,s,draft,hadFocus,openDetails);
  const cardView=()=>{
    if(P.card&&P.card.round===s.round&&P.card.game===s.game)return makeCard(P.card,()=>{if(P.peekedRound!==s.round){P.peekedRound=s.round;sendReady();const n=$("pReadyNote");if(n)n.textContent=s.game==="agenda"?"Now make your secret first pick below.":"Got it. Watch the big screen.";renderAgendaPick()}});
    if(P.cardErr)return el("div",{class:"panel"},el("p",{class:"status err",text:P.cardErr}),el("button",{class:"btn-felt",text:"Try again",onclick:fetchCard}));
    return el("p",{class:"status on-felt",text:"Dealing your card…"});
  };
  const peekAgain=()=>el("details",{class:"panel"},el("summary",{style:"font-weight:800;cursor:pointer",text:s.game==="glitch"?"Look at my case file again":s.game==="flaugin"?"Peek at my card again":s.game==="agenda"?"Peek at my agenda again":"Peek at my mission again"}),el("div",{style:"display:flex;justify-content:center;padding-top:10px"},cardView()));
  const timer=()=>playerClock(s)||el("span");
  const promptPanel=()=>{
    const m=s.meta||{};
    if(s.game==="copycat")return el("div",{class:"panel prompt-panel"},el("h3",{text:"Debate topic"}),el("p",{class:"prompt",text:m.prompt}));
    if(s.game==="glitch")return el("div",{class:"panel prompt-panel"},el("h3",{text:"The case"}),el("p",{class:"prompt",text:m.title}),el("p",{class:"scene",text:m.scene}));
    if(s.game==="agenda")return el("div",{class:"panel prompt-panel"},el("h3",{text:m.title}),el("p",{class:"prompt",text:m.question}),optionsGrid(m.options));
    return null;
  };
  if(s.phase==="cards"){
    const note=s.game==="agenda"?(P.peekedRound===s.round?"Now make your secret first pick below.":"Press and hold to read your agenda."):(P.peekedRound===s.round?"Got it. Watch the big screen.":"Press and hold to peek.");
    v.append(el("div",{class:"pass"},el("p",{class:"sub",text:G.name+" · round "+s.round+" · keep your screen hidden"}),cardView(),el("p",{class:"status on-felt",id:"pReadyNote",text:note})),timer());
    if(s.game==="agenda"){v.append(el("div",{id:"agendaPick"}));renderAgendaPick()}
    return;
  }
  if(s.phase==="clues"){
    const pos=s.order.indexOf(P.pid)+1;
    v.append(el("p",{class:"big-msg",text:pos===1?"You go first!":"You're #"+pos+" to give a clue."}));
    const ol=el("ol",{class:"order"});s.order.forEach(p=>ol.append(el("li",{class:(p===P.pid?"me":"")+(s.clock&&s.clock.k==="turn"&&s.clock.who===p?" now":"")||null,text:rosterName(s,p)})));
    v.append(timer(),el("div",{class:"panel"},el("h3",{text:"Speaking order"}),ol),peekAgain());
    return;
  }
  if(s.phase==="talk"){
    const head=s.game==="copycat"?"Debate time! Sneak in your mission.":s.game==="glitch"?"Investigate! Ask questions.":"Debate and make deals!";
    v.append(el("p",{class:"big-msg",text:head}),timer(),promptPanel(),peekAgain());
    if(s.game==="agenda"&&P.first!=null)v.append(el("p",{class:"status on-felt",text:"Your secret first pick: "+s.meta.options[P.first]+"."}));
    return;
  }
  if(s.phase==="vote"){
    const mine=P.vote&&P.vote.r===s.voteRound?P.vote.target:null;
    const q=s.game==="flaugin"?"Who’s flaugin’?":s.game==="copycat"?"Who’s the Copycat?":"Whose file is glitched?";
    v.append(el("p",{class:"big-msg",text:q}),el("p",{class:"sub",text:mine?"Vote sent. Tap another name to change it.":"Tap one name. Votes stay secret until the reveal."}));
    const g=el("div",{class:"vote-grid"});
    s.roster.filter(r=>r.pid!==P.pid).forEach(r=>g.append(el("button",{type:"button",text:r.name,"aria-pressed":String(mine===r.pid),onclick:()=>{P.vote={r:s.voteRound,target:r.pid};sendVote();FX.play("vote");FX.vibrate(20);renderPlayer()}})));
    v.append(el("div",{class:"panel"},g));
    if(P.card&&(P.card.isFib||P.card.odd))v.append(el("p",{class:"status on-felt",text:s.game==="flaugin"?"You’re the Flauger. Vote for someone else to keep your cover.":"You’re the Copycat. Vote for someone else to keep your cover."}));
    return;
  }
  if(s.phase==="final"){
    const mine=P.final&&P.final.r===s.voteRound?P.final.o:null;
    v.append(el("p",{class:"big-msg",text:"Final vote!"}),el("p",{class:"sub",text:mine!=null?"Vote sent. Tap another to change it.":s.meta.question}));
    const g=el("div",{class:"opt-btns"});
    s.meta.options.forEach((o,i)=>g.append(el("button",{type:"button",text:o,"aria-pressed":String(mine===i),onclick:()=>{P.final={r:s.voteRound,o:i};sendPick("final",i);FX.play("vote");FX.vibrate(20);renderPlayer()}})));
    v.append(el("div",{class:"panel"},g),peekAgain());
    return;
  }
  if(s.phase==="guess"){
    const caught=s.votedOut===P.pid;
    v.append(el("p",{class:"big-msg",text:caught?"You've been caught!":"Caught flaugin’!"}),
      el("p",{class:"sub",text:caught?"Say your best guess for the word out loud. Get it right to steal the round.":rosterName(s,s.votedOut)+" gets one guess at the word."}));
    if(s.showWord&&s.word)v.append(el("div",{class:"panel"},el("h3",{text:"The word was"}),el("p",{class:"verdict",style:"color:var(--felt)",text:s.word})));
    return;
  }
  if(s.phase==="result"){
    if(s.game==="flaugin"){
      const fibIds=s.fib||[];const fibNames=fibIds.map(p=>rosterName(s,p));
      const [t]=verdictText(s.outcome,fibNames.join(" and "),rosterName(s,s.votedOut));
      const amFib=fibIds.includes(P.pid);
      const scored=s.outcome==="escaped"?amFib:s.outcome==="stole"?s.votedOut===P.pid:!amFib;
      v.append(el("p",{class:"verdict "+(scored?"win":"lose"),text:scored?"You scored!":t}));
      const l=el("p",{class:"reveal-line",text:"The word was "});l.append(el("b",{text:s.word||"?"}),document.createTextNode(". "+(fibNames.length>1?"The Flaugers: ":"The Flauger: ")+fibNames.join(" and ")+"."));
      v.append(l,myScore(s),el("p",{class:"sub",text:"The next round starts from the big screen."}));
      return;
    }
    const rv=s.reveal||{};const got=(rv.rp||{})[P.pid]||0;
    v.append(el("p",{class:"verdict "+(got?"win":"lose"),text:got?"You scored +"+got+"!":"No points this round."}));
    if(s.game==="copycat"||s.game==="glitch"){
      v.append(el("p",{class:"reveal-line",text:rv.caught?(s.game==="copycat"?"The Copycat was caught.":"The glitch was found."):(s.game==="copycat"?"The Copycat got away.":"The glitch slipped through.")}));
      v.append(revealDetails(s.game,rv,id=>rosterName(s,id)));
    }else if(s.game==="agenda"){
      const row=(rv.rows||[]).find(r=>r.pid===P.pid);
      v.append(el("p",{class:"reveal-line",text:rv.chosen!=null?"The family chose "+rv.options[rv.chosen]+".":"No decision. It was a tie."}));
      if(row)v.append(el("div",{class:"panel"},el("h3",{text:"Your agenda"}),el("p",{style:"margin:0",text:row.text}),el("p",{style:"margin:0;font-weight:800;color:"+(row.done?"var(--win)":"var(--berry)"),text:row.done?"✓ It came true!":"✗ It didn't happen."})));
    }
    v.append(myScore(s),el("p",{class:"sub",text:"The next round starts from the big screen."}));
    return;
  }
}
function renderAgendaPick(){
  const box=$("agendaPick");if(!box||!P||!P.state)return;const s=P.state;
  box.textContent="";
  if(P.peekedRound!==s.round)return;
  const g=el("div",{class:"opt-btns"});
  s.meta.options.forEach((o,i)=>g.append(el("button",{type:"button",text:o,"aria-pressed":String(P.first===i),onclick:()=>{P.first=i;sendPick("first",i);FX.play("vote");FX.vibrate(20);renderAgendaPick()}})));
  box.append(el("div",{class:"panel"},el("h3",{text:"Secret first pick: "+s.meta.question}),el("p",{class:"sub",style:"margin:0",text:"What would you really choose right now? Nobody sees this until the end."}),g,
    P.first!=null?el("p",{class:"status",style:"margin:0",text:"Picked "+s.meta.options[P.first]+". Watch the big screen."}):null));
}
function renderPlayerRules(v,s,draft,hadFocus,openDetails){
  const m=s.meta||{};
  if(s.phase==="result"){
    const rv=s.reveal||{};const got=(rv.rp||{})[P.pid]||0;
    v.append(el("p",{class:"verdict "+(got?"win":"lose"),text:got?"You cracked it! +"+got:"The rule was…"}),el("p",{class:"big-msg",style:"font-size:1.5rem",text:rv.rule}),myScore(s),el("p",{class:"sub",text:"The next round starts from the big screen."}));
    return;
  }
  const solved=(s.solved||[]).includes(P.pid);const used=(s.guesses||{})[P.pid]||0;
  v.append(el("p",{class:"eyebrow",text:"Rulebreakers · round "+s.round}),el("p",{class:"big-msg",text:solved?"You cracked it!":"Test the gate."}));
  const inp=el("input",{type:"text",id:"tryInput",maxlength:m.kind==="number"?"4":"15",inputmode:m.kind==="number"?"numeric":"text",autocomplete:"off",autocapitalize:"off",spellcheck:"false",placeholder:m.kind==="number"?"Type a number":"Type a word","aria-label":m.kind==="number"?"Number to test":"Word to test"});
  inp.value=draft||"";
  const err=el("p",{class:"status err",style:"margin:0",text:P.tryErr||""});
  const form=el("form",{class:"try-form"},inp,el("button",{type:"submit",class:"btn-felt",text:"Test it"}));
  form.onsubmit=e=>{
    e.preventDefault();const entry=normalizeEntry(m.kind,inp.value);
    if(entry==null){P.tryErr=m.kind==="number"?"Numbers only, up to 4 digits.":"Letters only, one word.";err.textContent=P.tryErr;return}
    const now=Date.now();if(now-P.lastTry<1300){P.tryErr="One at a time! Wait a second.";err.textContent=P.tryErr;return}
    P.lastTry=now;P.tryErr="";err.textContent="";inp.value="";
    ch.send({type:"broadcast",event:"try",payload:{pid:P.pid,round:s.round,entry}}).catch(()=>{});
  };
  const pc=playerClock(s);if(pc)v.append(pc);
  v.append(el("div",{class:"panel"},el("h3",{text:"Try "+(m.kind==="number"?"a number":"a word")}),form,err));
  if(hadFocus)setTimeout(()=>inp.focus(),0);
  v.append(el("div",{class:"panel"},el("h3",{text:"What the gate said"}),(s.log||[]).length?logList(s.log):el("p",{class:"sub",text:"Nothing tested yet."})));
  if(solved){v.append(el("p",{class:"solved",text:"✓ You got it"+((s.solved||[])[0]===P.pid?" first! +5":"! +2")+". Keep testing to watch the others."}));return}
  const maxG=s.maxGuesses||2;
  if(used>=maxG){v.append(el("p",{class:"status on-felt err",text:"Out of guesses this round. Keep testing for fun!"}));return}
  const box=el("div",{class:"rule-opts"});
  m.options.forEach((t,i)=>{
    const wrong=P.myGuesses.includes(i);
    box.append(el("button",{type:"button",class:wrong?"wrong":null,disabled:wrong?"":null,text:t,onclick:()=>{
      if(P.myGuesses.includes(i))return;P.myGuesses.push(i);
      ch.send({type:"broadcast",event:"guess",payload:{pid:P.pid,round:s.round,choice:i}}).catch(()=>{});renderPlayer();
    }}));
  });
  v.append(el("details",{class:"panel",open:(openDetails||P.myGuesses.length)?"":null},el("summary",{style:"font-weight:800;cursor:pointer",text:"I know the rule! ("+(maxG-used)+" "+(maxG-used===1?"guess":"guesses")+" left)"}),box));
}
function myScore(s){
  const rows=(s.scores||[]).slice().sort((a,b)=>b[1]-a[1]);const mine=(s.scores||[]).find(r=>r[0]===P.pid);
  const rank=rows.findIndex(r=>r[0]===P.pid)+1;
  return el("div",{class:"panel"},el("h3",{text:"Your score tonight"}),el("p",{class:"timer",style:"text-align:left",text:String(mine?mine[1]:0)}),
    el("p",{class:"sub",text:rank?"Place "+rank+" of "+rows.length+".":"No points yet."}));
}


/* ---------- parallax for game art ---------- */
(function(){
  const reduce=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;
  if(reduce)return;
  const items=[...document.querySelectorAll("[data-parallax]")];
  if(!items.length)return;
  const ptr=new WeakMap();
  let queued=false;
  function frame(){
    queued=false;const vh=window.innerHeight||800;
    items.forEach(box=>{
      if(box.offsetParent===null)return;
      const r=box.getBoundingClientRect();
      if(r.bottom<-100||r.top>vh+100)return;
      const p=(r.top+r.height/2-vh/2)/vh;           // -0.5 .. 0.5 across the screen
      const m=ptr.get(box)||{x:0,y:0};
      const img=box.querySelector(".parallax-img"),tag=box.querySelector(".art-tag");
      img.style.setProperty("--py",(p*-70+m.y*-14).toFixed(1)+"px");
      img.style.setProperty("--px",(m.x*-18).toFixed(1)+"px");
      img.style.setProperty("--ps",m.on?"1.04":"1");
      if(tag){tag.style.setProperty("--tx",(m.x*10).toFixed(1)+"px");tag.style.setProperty("--ty",(p*18+m.y*6).toFixed(1)+"px")}
    });
  }
  function q(){if(!queued){queued=true;requestAnimationFrame(frame)}}
  items.forEach(box=>{
    const tile=box.closest(".game-tile")||box;
    tile.addEventListener("pointermove",e=>{if(e.pointerType!=="mouse")return;const r=tile.getBoundingClientRect();ptr.set(box,{x:(e.clientX-r.left)/r.width-.5,y:(e.clientY-r.top)/r.height-.5,on:true});q()});
    tile.addEventListener("pointerleave",()=>{ptr.set(box,{x:0,y:0,on:false});q()});
  });
  window.addEventListener("scroll",q,{passive:true});
  window.addEventListener("resize",q);
  new MutationObserver(q).observe(document.body,{attributes:true,attributeFilter:["class"]});
  q();
})();

/* ---------- full-screen toggle ---------- */
(function(){
  const btn=$("fsBtn");if(!btn)return;
  const root=document.documentElement;
  const canFs=!!(root.requestFullscreen||root.webkitRequestFullscreen);
  const standalone=(window.matchMedia&&matchMedia("(display-mode: standalone), (display-mode: fullscreen)").matches)||navigator.standalone;
  const isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
  if(standalone&&!canFs)return;               // iPhone home-screen app: already full screen, no API to toggle
  btn.hidden=false;                           // always offer it, including installed-app windows on a computer
  const isMac=/Mac/.test(navigator.platform||navigator.userAgent);
  const current=()=>document.fullscreenElement||document.webkitFullscreenElement;
  function sync(){const on=!!current();document.body.classList.toggle("is-fs",on);btn.setAttribute("aria-label",on?"Exit full screen":"Full screen");btn.title=on?"Exit full screen (F)":"Full screen (F)";btn.querySelector(".fs-label").textContent=on?"Exit full screen":"Full screen"}
  function tip(msg){document.querySelectorAll(".fs-tip").forEach(n=>n.remove());const t=el("div",{class:"fs-tip",role:"status",text:msg});document.body.append(t);setTimeout(()=>t.remove(),6000)}
  async function toggle(){
    if(!canFs){tip(isIOS?"On iPhone, tap Share, then Add to Home Screen. Opening Game Night from the home screen runs it full screen."
      :"This browser doesn't let pages go full screen. Use the browser's own full screen: "+(isMac?"press Control + Command + F.":"press F11.")+" Or open Game Night in Chrome, Safari or Edge.");return}
    try{
      if(current()){(document.exitFullscreen||document.webkitExitFullscreen).call(document)}
      else{const req=root.requestFullscreen||root.webkitRequestFullscreen;await req.call(root,{navigationUI:"hide"});keepAwake()}
    }catch(e){tip("This browser blocked full screen. Use the browser's own full screen: "+(isMac?"press Control + Command + F.":"press F11."))}
  }
  btn.addEventListener("click",toggle);
  const hero=$("fsHero");if(hero){hero.hidden=false;hero.addEventListener("click",toggle)}
  document.addEventListener("fullscreenchange",sync);document.addEventListener("webkitfullscreenchange",sync);
  document.addEventListener("keydown",e=>{if((e.key==="f"||e.key==="F")&&!e.metaKey&&!e.ctrlKey&&!e.altKey){const t=e.target;if(t&&(t.tagName==="INPUT"||t.tagName==="TEXTAREA"||t.isContentEditable))return;e.preventDefault();toggle()}});
  sync();
})();

/* ---------- music director ----------
   Beds (loop, crossfaded by screen): Game Show Grind on home/setup, Lofi Gameshow in the lobby and under talking,
   Spin the Wreck while cards are dealt, Gravity Glitch for voting and the puzzle games, Spin the Wreck 2 on results.
   Stingers (beat-cut sound bites with fades) mark deals, "go", votes and wins. Never plays on players' phones. */
var Music=(function(){
  const btn=$("musicBtn");if(!btn)return {sync(){},sting(){return false}};
  const TRACKS={theme:"theme.mp3?v=1",lobby:"music/bed-lobby.mp3",deal:"music/bed-deal.mp3",tense:"music/bed-tense.mp3",party:"music/bed-party.mp3"};
  const STINGS={deal:["music/sting-deal.mp3",3800],win:["music/sting-win.mp3",7700],win2:["music/sting-win2.mp3",5800],go:["music/sting-go.mp3",1900],vote:["music/sting-vote.mp3",2600],join:["music/sting-join.mp3",1350]};
  const decks={},fades={};
  function deck(n){if(!decks[n]){const a=new Audio(TRACKS[n]);a.loop=true;a.preload="auto";a.volume=0;decks[n]=a}return decks[n]}
  const touchy=window.matchMedia&&matchMedia("(hover: none)").matches;
  let on=store.get("music",!touchy);       // default on for laptops/TVs, off for phones
  let unlocked=false,current=null,stingUntil=0;
  const vis=id=>!$(id).hidden;
  function scene(){
    if(!on||mode==="player")return [null,0];
    if(mode==="host"&&H&&!vis("vSetup")&&!vis("vHome")){
      const g=H.game,ph=H.phase;
      if(ph==="lobby")return ["lobby",0.4];
      if(ph==="cards")return ["deal",0.3];
      if(ph==="clues"||ph==="talk")return [g==="glitch"?"tense":"lobby",0.1];
      if(ph==="play")return ["tense",0.22];
      if(ph==="vote"||ph==="final")return ["tense",0.13];
      if(ph==="guess")return [null,0];
      if(ph==="result")return ["party",0.33];
    }
    if(mode==="local"&&game){
      if(vis("vPass"))return ["deal",0.22];
      if(vis("vClues"))return [game.type==="glitch"?"tense":"lobby",0.1];
      if(vis("vVote"))return ["tense",0.13];
      if(vis("vGuess"))return [null,0];
      if(vis("vResult"))return ["party",0.33];
    }
    return ["theme",0.45];
  }
  function ramp(name,target){
    const a=deck(name);clearInterval(fades[name]);
    if(target>0&&a.paused&&unlocked)a.play().catch(()=>{});
    fades[name]=setInterval(()=>{
      const d=target-a.volume;
      if(Math.abs(d)<0.02){a.volume=target;clearInterval(fades[name]);if(target===0)a.pause();return}
      a.volume=Math.max(0,Math.min(1,a.volume+Math.sign(d)*0.025));
    },50);
  }
  function sync(){
    btn.hidden=mode==="player";
    btn.setAttribute("aria-pressed",String(on));btn.title=on?"Turn music off (M)":"Turn music on (M)";
    let [track,vol]=unlocked?scene():[null,0];
    const duck=(window.__gnAnnTalking?0.35:1)*(Date.now()<stingUntil?0.18:1);
    if(track!==current){
      if(track&&(track==="party"||track==="deal")&&decks[track])decks[track].currentTime=0;  // these start from the top each time
      current=track;
    }
    Object.keys(TRACKS).forEach(n=>{if(n===track||decks[n])ramp(n,n===track?vol*duck:0)});
  }
  /* One-shot sound bite. Follows the Sounds toggle (not Music), so it still plays with music off. */
  function sting(name){
    const st=STINGS[name];if(!st||mode==="player"||!FX.isOn()||!unlocked)return false;
    const a=new Audio(st[0]);a.volume=0.85;a.play().catch(()=>{});
    stingUntil=Date.now()+st[1]-600;sync();setTimeout(sync,st[1]-500);
    return true;
  }
  function unlock(){if(unlocked)return;unlocked=true;sync()}
  ["pointerdown","keydown"].forEach(t=>document.addEventListener(t,unlock,{capture:true}));
  btn.addEventListener("click",()=>{on=!on;store.set("music",on);unlocked=true;sync()});
  document.addEventListener("keydown",e=>{if((e.key==="m"||e.key==="M")&&!e.metaKey&&!e.ctrlKey&&!e.altKey){const t=e.target;if(t&&(t.tagName==="INPUT"||t.tagName==="TEXTAREA"))return;on=!on;store.set("music",on);unlocked=true;sync()}});
  document.addEventListener("visibilitychange",()=>{if(document.hidden){Object.values(decks).forEach(a=>a.pause())}else sync()});
  return {sync,sting};
})();
/* ---------- sound effects toggle, taps and unlock ---------- */
(function(){
  const b=$("sfxBtn");
  function sync(){if(b){b.setAttribute("aria-pressed",String(FX.isOn()));b.title=FX.isOn()?"Turn sound effects off (S)":"Turn sound effects on (S)"}}
  if(b)b.addEventListener("click",()=>{FX.setOn(!FX.isOn());sync();if(FX.isOn())FX.play("pop")});
  document.addEventListener("keydown",e=>{if((e.key==="s"||e.key==="S")&&!e.metaKey&&!e.ctrlKey&&!e.altKey){const t=e.target;if(t&&(t.tagName==="INPUT"||t.tagName==="TEXTAREA"))return;FX.setOn(!FX.isOn());sync()}});
  document.addEventListener("pointerdown",()=>FX.unlock(),{capture:true});
  document.addEventListener("click",e=>{const t=e.target.closest&&e.target.closest("button");if(!t||t.disabled)return;
    if(t.matches(".btn-big,.mode,.join-hero,.switcher button,[data-host],[data-local],.pack,.seg button"))FX.play("tap")},true);
  ANN.setDuck(t=>{window.__gnAnnTalking=t;if(typeof Music!=="undefined")Music.sync()});
  sync();
})();
/* ---------- intro: Adventures with the Johnsons logo scene, then the home screen ---------- */
(function intro(){
  const box=$("intro");if(!box||!document.documentElement.classList.contains("intro-on"))return;
  try{sessionStorage.setItem("gn:intro","1")}catch(e){}
  let done=false;
  const end=fast=>{if(done)return;done=true;box.classList.add("intro-out");setTimeout(()=>{document.documentElement.classList.remove("intro-on");box.remove()},fast?450:700)};
  const len=FX.reduce?1800:4300;
  const t=setTimeout(()=>end(false),len);
  const skip=()=>{clearTimeout(t);FX.play("whoosh");end(true)};
  box.addEventListener("click",skip);
  document.addEventListener("keydown",function k(e){if(!done){skip()}document.removeEventListener("keydown",k)},{once:true});
})();
/* ---------- boot ---------- */
const qs=new URLSearchParams(location.search);
const pinIn=(qs.get("pin")||location.hash.replace("#","")||"").toUpperCase().replace(/[^A-Z]/g,"");
renderHome();
const touchDevice=window.matchMedia&&matchMedia("(hover: none)").matches;
const savedHost=store.get("host",null);
const lastRoom=store.get("lastRoom",null);const lastMe=lastRoom?store.get("me:"+lastRoom,null):null;
if(pinIn.length===4){
  history.replaceState(null,"",location.pathname);
  const me=store.get("me:"+pinIn,null);
  if(me&&sb&&Date.now()-(me.at||0)<12*3600e3){mode="player";startPlayer(pinIn,me)}else openJoin(pinIn);
}else if(!touchDevice&&savedHost&&sb&&Date.now()-savedHost.at<12*3600e3){mode="host";resumeRoom(savedHost)}
else if(touchDevice&&lastMe&&sb&&Date.now()-(lastMe.at||0)<6*3600e3){mode="player";startPlayer(lastRoom,lastMe)}
else show("vHome");
booted=true;
})();
