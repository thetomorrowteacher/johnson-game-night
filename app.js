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
  flaugin:{name:"Flaugin",min:3,local:true,seg:"Fakers",timer:120,timerLabel:"Two-minute talk timer",
    sub:{local:"Everyone shares one phone and takes turns peeking.",host:"Pick a pack, then open a room. Everyone joins on their own phone."},
    rules:["Everyone looks at their secret card. The faker’s card has no word.","Go around the table. Everyone says one word that fits the secret.","Talk it over, then vote out the player you think is flaugin’.","A caught faker gets one guess at the word to steal the round."]},
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
    rules:["The gate on the TV has a secret rule.","Type a word or number on your phone. The TV shows ACCEPTED or REJECTED for everyone.","When you think you know the rule, pick it from the list. You get two guesses.","First to crack it: +5. Everyone else who cracks it: +2."]}
};

/* ---------- small helpers ---------- */
const store={
  get(k,d){try{const v=localStorage.getItem("flaudjer:"+k);return v?JSON.parse(v):d}catch(e){return d}},
  set(k,v){try{localStorage.setItem("flaudjer:"+k,JSON.stringify(v))}catch(e){}},
  del(k){try{localStorage.removeItem("flaudjer:"+k)}catch(e){}}
};
const $=id=>document.getElementById(id);
const VIEWS=["vHome","vSetup","vPass","vClues","vVote","vGuess","vResult","vHost","vJoin","vPlayer"];
function show(id){const was=VIEWS.find(v=>!$(v).hidden);VIEWS.forEach(v=>{$(v).hidden=v!==id});document.body.classList.toggle("at-home",id==="vHome");window.scrollTo(0,0);if(was!==id&&id!=="vHost"&&id!=="vPlayer")animIn($(id));if(typeof Music!=="undefined")Music.sync()}
function el(tag,attrs,...kids){const e=document.createElement(tag);if(attrs)for(const k in attrs){const v=attrs[k];if(v==null)continue;if(k==="class")e.className=v;else if(k==="text")e.textContent=v;else if(k.startsWith("on"))e[k]=v;else e.setAttribute(k,v)}kids.forEach(c=>c!=null&&e.append(c));return e}
function rnd(n){try{const u=new Uint32Array(1);crypto.getRandomValues(u);return u[0]%n}catch(e){return Math.floor(Math.random()*n)}}
function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=rnd(i+1);[a[i],a[j]]=[a[j],a[i]]}return a}
/* Pick the odd player(s) fairly: whoever had it in the last couple of rounds gets a lower chance, so streaks don't feel rigged. */
function pickFakers(names,count,key){
  key=key||"recentFakers";
  const recent=store.get(key,[]);   // newest first, list of name arrays
  const weightOf=n=>recent[0]&&recent[0].includes(n)?0.2:recent[1]&&recent[1].includes(n)?0.55:1;
  const pool=names.map((n,i)=>({i,w:weightOf(n)}));const out=[];
  while(out.length<count&&pool.length){
    const total=pool.reduce((t,x)=>t+x.w,0);let r=(rnd(1e6)/1e6)*total,k=0;
    for(;k<pool.length-1;k++){r-=pool[k].w;if(r<0)break}
    out.push(pool[k].i);pool.splice(k,1);
  }
  store.set(key,[out.map(i=>names[i])].concat(recent).slice(0,3));
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

/* =====================================================================
   ROUND BUILDERS (shared by the TV and one-phone mode)
   Each returns {meta: public info for the TV, cards: {id: private card}, secret: host-only answers}.
   ===================================================================== */
function oddCount(n){return n>=6&&fibs===2?2:1}
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
  const changed=shuffle(c.facts.map((_,i)=>i)).slice(0,2).sort((a,b)=>a-b);
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
  const kind=ruleKind==="mix"?(rnd(2)?"word":"number"):ruleKind;
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
      el("span",{class:"hint",style:"font-size:.8rem",text:"One file has two wrong details. It might be yours."})),odd:false,tall:true};
  }
  if(c.kind==="copycat"||c.kind==="agenda"){
    return {front:el("div",{style:"display:flex;flex-direction:column;gap:12px;align-items:center"},
      el("span",{class:"label",text:c.label}),el("span",{class:"mission",text:c.text}),el("span",{class:"hint",text:c.hint})),odd:!!c.odd,tall:c.text.length>60};
  }
  // Flaugin
  const f=el("div",{style:"display:flex;flex-direction:column;gap:10px;align-items:center"});
  if(c.isFib){
    let h=c.pack?"Pack: "+c.pack+". Blend in!":"No word for you. Blend in!";
    if(c.twoFibs)h+=" Someone else is flaugin’ too.";
    f.append(el("span",{class:"label",text:"You are"}),el("span",{class:"word",text:"Flaugin’"}),el("span",{class:"hint",text:h}));
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
    outcome==="stole"?[votedName+" guessed it!","lose","Caught, but the faker still figured out the word."]:
    ["The family wins!","win","Faker caught and the word stayed safe."];
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
function renderHome(){
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
  $("timerRow").hidden=!G.timer;$("timerLabel").textContent=G.timerLabel;
  $("segRow").hidden=!G.seg;$("segLabel").textContent=G.seg||"";
  $("fibNote").hidden=!G.seg;
  $("kindRow").hidden=curGame!=="rules";
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
  const count=players.length>=6?fibs:1;
  if(curGame==="flaugin"){
    const pid=resolvePack();const pool=poolFor(pid);const word=pool[rnd(pool.length)];markUsed(pid,word);
    const fibIdx=pickFakers(players,count);
    game={type:"flaugin",pid,word,fibIdx,turn:0,deal:shuffle(players.map((_,i)=>i)),voted:null};
  }else{
    const oddIdx=pickFakers(players,count,"recent:"+curGame);
    const b=curGame==="copycat"?buildCopycat(ids,oddIdx):buildGlitch(ids,oddIdx);
    game={type:curGame,built:b,fibIdx:oddIdx,turn:0,deal:shuffle(players.map((_,i)=>i)),voted:null};
  }
  setTag(GAMES[curGame].name+" · Round "+roundNo);FX.play("deal");ANN.round(roundNo);showPass();
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
let tLeft=120,tInt=null;
function timerLen(){return GAMES[game?game.type:curGame].timer||120}
function resetTimer(){clearInterval(tInt);tInt=null;tLeft=timerLen();$("timer").textContent=fmt(tLeft);$("timerBtn").textContent="Start timer"}
$("timerBtn").onclick=()=>{
  if(tInt){clearInterval(tInt);tInt=null;$("timerBtn").textContent="Resume";return}
  $("timerBtn").textContent="Pause";
  tInt=setInterval(()=>{tLeft--;$("timer").textContent=fmt(tLeft);$("timer").classList.toggle("hurry",tLeft>0&&tLeft<=10);if(tLeft===10)ANN.line("hurry");else if(tLeft>0&&tLeft<=3)ANN.count(tLeft);else if(tLeft>0&&tLeft<10)FX.play("tick");if(tLeft<=0){FX.play("buzzer");ANN.line("timeout");$("timer").classList.remove("hurry");clearInterval(tInt);tInt=null;$("timer").textContent="Vote!";$("timerBtn").textContent="Start timer";tLeft=timerLen()}},1000);
};
$("timerReset").onclick=resetTimer;
function showClues(){
  const start=rnd(players.length);const ol=$("orderList");ol.textContent="";
  for(let k=0;k<players.length;k++)ol.append(el("li",{text:players[(start+k)%players.length]}));
  const tp=$("talkPrompt");tp.textContent="";
  if(game.type==="flaugin"){$("talkTitle").textContent="Clue round";$("talkSub").textContent="One word each, in this order. Not too obvious, not too vague.";tp.hidden=true}
  else if(game.type==="copycat"){$("talkTitle").textContent="Debate time";$("talkSub").textContent="Everyone weighs in, in this order, then talk freely. Sneak in your mission!";tp.hidden=false;tp.append(el("h3",{text:"The topic"}),el("p",{class:"prompt",text:game.built.meta.prompt}))}
  else{$("talkTitle").textContent="Investigate";$("talkSub").textContent="Take turns asking each other questions about the case. Don’t read your file out loud!";tp.hidden=false;tp.append(el("h3",{text:"The case"}),el("p",{class:"prompt",text:game.built.meta.title}),el("p",{class:"scene",text:game.built.meta.scene}))}
  $("timerPanel").hidden=!$("optTimer").checked;resetTimer();show("vClues");FX.play("whoosh");ANN.readySetGo();
}
$("toVote").onclick=()=>{resetTimer();showVote()};
function showVote(){
  game.voted=null;const g=$("voteGrid");g.textContent="";
  players.forEach((n,i)=>{const b=el("button",{type:"button",text:n,"aria-pressed":"false"});
    b.onclick=()=>{game.voted=i;g.querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));$("lockVote").disabled=false;$("lockVote").textContent="Reveal "+n};g.append(b)});
  $("voteTitle").textContent=game.type==="flaugin"?"Who’s flaugin’?":game.type==="copycat"?"Who’s the Copycat?":"Whose file is glitched?";
  const two=game.fibIdx.length>1;
  $("voteSub").textContent=two?"There are two this round. Vote one out; catching either counts.":"Count hands, then tap the player with the most votes.";
  $("lockVote").disabled=true;$("lockVote").textContent="Reveal";show("vVote");
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
  const l=$("resLine");l.textContent=line+" The word was ";l.append(el("b",{text:game.word}),document.createTextNode(". Flaugin’: "+fibText+"."));
  $("resDetails").textContent="";
  $("resNote").textContent="Faker escapes: +2. Faker caught but guesses the word: +1. Faker caught and misses: +1 to everyone else.";
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
function drumThen(win,verdictEl,skipDrum){
  if(verdictEl){verdictEl.classList.remove("big-in");void verdictEl.offsetWidth;verdictEl.classList.add("big-in")}
  FX.play("drum",0.85);ANN.clear();
  setTimeout(()=>{FX.play(win?"win":"lose");ANN.line(win?"win":"lose");if(win)FX.confetti()},900);
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
  clearInterval(hostTick);hostTick=setInterval(()=>{if(H&&(H.phase==="clues"||H.phase==="talk")&&H.endsAt){
    const left=(H.endsAt-Date.now())/1000;const t=$("hostTimer");
    if(t){t.textContent=left>0?fmt(left):"Time!";t.classList.toggle("hurry",left>0&&left<=10)}
    const sec=Math.ceil(left);
    if(sec!==H.lastSec){H.lastSec=sec;if(mode==="host"){
      if(sec===10)ANN.line("hurry");else if(sec>0&&sec<=3)ANN.count(sec);else if(sec>0&&sec<10)FX.play("tick");
      else if(sec===0){FX.play("buzzer");ANN.line("timeout")}}}
  }},250);
  mode="host";setTag(GAMES[H.game].name+" · Room "+H.code);show("vHost");renderHost();
}
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
    ready:Object.keys(H.ready),voted:Object.keys(H.votes),votedOut:H.voted,outcome:H.outcome,endsAt:H.endsAt,showWord:H.showWord,
    word:H.game==="flaugin"&&showSecret?H.word:null,fib:H.game==="flaugin"&&H.phase==="result"?H.fib:null,
    meta:H.meta,firstIn:Object.keys(H.first),finalIn:Object.keys(H.final),
    log:H.game==="rules"?H.log.slice(-12):null,solved:H.solved,guesses:H.guesses,
    reveal:H.phase==="result"?H.reveal:null,
    scores:H.roster.map(r=>[r.pid,H.scores[r.pid]||0])};
}
function broadcast(){if(ch&&H)ch.send({type:"broadcast",event:"state",payload:publicState()}).catch(()=>{})}
function setPhase(p){const prev=H.phase;H.phase=p;H.epoch=Date.now();H.lastSec=null;broadcast();renderHost();saveHost();Music.sync();if(mode==="host")phaseFx(p,prev)}
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
  if(p==="cards"){FX.play("deal");ANN.round(H.round)}
  else if(p==="play"){FX.play("deal");ANN.round(H.round);setTimeout(()=>ANN.say("go"),900)}
  else if(p==="clues"||p==="talk"){FX.play("whoosh");ANN.readySetGo()}
  else if(p==="vote"||p==="final"){FX.play("pop")}
  else if(p==="guess"||p==="result"){
    const win=hostWon();FX.play("drum",0.85);ANN.clear();
    setTimeout(()=>{FX.play(win?"win":"lose");
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
function pickOddHost(ids,count){
  const pool=ids.map((id,i)=>({i,w:H.lastOdd.includes(id)?0.2:1}));const out=[];
  while(out.length<count&&pool.length){const total=pool.reduce((t,x)=>t+x.w,0);let r=(rnd(1e6)/1e6)*total,k=0;for(;k<pool.length-1;k++){r-=pool[k].w;if(r<0)break}out.push(pool[k].i);pool.splice(k,1)}
  return out;
}
async function hostDeal(){
  const G=GAMES[H.game];const ph=phones();if(ph.length<G.min||dealing)return;dealing=true;renderHost();
  const roster=buildRoster();const ids=roster.map(x=>x.pid);
  try{
    if(H.game==="flaugin"){
      const pid=resolvePack();
      const r=await api({action:"deal",code:H.code,hostToken:H.hostToken,playerIds:ids,words:poolFor(pid),pack:PACKS[pid].name,hint:$("optHint").checked,fibs});
      H.roster=roster;roster.forEach(x=>H.names[x.pid]=x.name);freshRound();
      H.round=r.round;H.packId=pid;H.hint=$("optHint").checked;
    }else if(H.game==="rules"){
      H.roster=roster;roster.forEach(x=>H.names[x.pid]=x.name);freshRound();
      const b=buildRules();H.meta=b.meta;H.secret=b.secret;H.round=H.round+1;
    }else{
      const lookup=id=>(roster.find(x=>x.pid===id)||{}).name||"someone";
      let b;
      if(H.game==="agenda")b=buildAgenda(ids,lookup);
      else{const oddIdx=pickOddHost(ids,oddCount(ids.length));b=H.game==="copycat"?buildCopycat(ids,oddIdx):buildGlitch(ids,oddIdx)}
      const r=await api({action:"dealCards",code:H.code,hostToken:H.hostToken,game:H.game,cards:b.cards});
      H.roster=roster;roster.forEach(x=>H.names[x.pid]=x.name);freshRound();
      H.round=r.round;H.meta=b.meta;H.secret=b.secret;if(b.secret.odd)H.lastOdd=b.secret.odd;
    }
    H.timerOn=$("optTimer").checked;
    const start=rnd(roster.length);H.order=roster.map((_,k)=>roster[(start+k)%roster.length].pid);
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
  try{const r=await api({action:"reveal",code:H.code,hostToken:H.hostToken});H.word=r.word;H.fib=r.fib;markUsed(H.packId,r.word)}
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
  if(H.solved.includes(p.pid)||(H.guesses[p.pid]||0)>=2)return;
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
  Object.keys(GAMES).forEach(g=>row.append(el("button",{type:"button","aria-pressed":String(H.game===g),text:GAMES[g].name,onclick:()=>{setGame(g);H.game=g;H.phase="lobby";H.epoch=Date.now();setTag(GAMES[g].name+" · Room "+H.code);broadcast();renderHost()}})));
  return row;
}
function timerPanel(){
  const secs=GAMES[H.game].timer;
  return el("div",{class:"panel"},el("h3",{text:"Talk it over"}),el("div",{class:"timer",id:"hostTimer",text:H.endsAt?fmt((H.endsAt-Date.now())/1000):fmt(secs)}),
    el("button",{class:"btn-felt",text:H.endsAt?"Restart the timer":"Start the "+fmt(secs)+" timer",onclick:()=>{H.endsAt=Date.now()+secs*1000;broadcast();renderHost()}}));
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
    side.append(joinCard());return;
  }
  if(H.phase==="clues"){
    main.append(el("p",{class:"big-msg",text:"One word each, in this order."}));
    const ol=el("ol",{class:"order"});H.order.forEach(p=>ol.append(el("li",{text:nameOf(p)})));
    main.append(el("div",{class:"panel"},el("h3",{text:"Speaking order"}),ol));
    main.append(el("button",{class:"btn-big",text:"Time to vote",onclick:()=>{H.voteRound++;H.votes={};H.endsAt=0;setPhase("vote")}}));
    if(H.timerOn)side.append(timerPanel());
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
    const l=el("p",{class:"reveal-line",text:line+" The word was "});l.append(el("b",{text:H.word}),document.createTextNode(". Flaugin’: "+fibNames.join(" and ")+"."));main.append(l);
    const sb2=scoreboard();sb2.append(el("p",{class:"sub",style:"font-size:.82rem",text:"Faker escapes: +2. Caught but guesses the word: +1. Caught and misses: +1 to everyone else."}));main.append(sb2);
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
    side.append(prompt(),joinCard());return;
  }
  if(H.phase==="talk"){
    main.append(prompt());
    if(copy){const ol=el("ol",{class:"order"});H.order.forEach(p=>ol.append(el("li",{text:nameOf(p)})));main.append(el("div",{class:"panel"},el("h3",{text:"Everyone weighs in, in this order"}),ol))}
    else main.append(el("div",{class:"panel"},el("h3",{text:"How to investigate"}),el("p",{style:"margin:0",text:"Ask each other questions like “What time did it happen?” Answer honestly from your own file. One file has two wrong details, and nobody knows whose."})));
    main.append(el("button",{class:"btn-big",text:"Time to vote",onclick:()=>{H.voteRound++;H.votes={};H.endsAt=0;setPhase("vote")}}));
    if(H.timerOn)side.append(timerPanel());
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
    side.append(prompt(),joinCard());return;
  }
  if(H.phase==="talk"){
    main.append(prompt(),el("div",{class:"panel"},el("h3",{text:"Debate and negotiate"}),el("p",{style:"margin:0",text:"Make your case. Make deals. Change minds. Just don't reveal your agenda!"})));
    main.append(el("button",{class:"btn-big",text:"Final vote",onclick:()=>{H.voteRound++;H.final={};H.endsAt=0;setPhase("final")}}));
    if(H.timerOn)side.append(timerPanel());
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
    const done=H.roster.every(r=>H.solved.includes(r.pid)||(H.guesses[r.pid]||0)>=2);
    main.append(el("button",{class:"btn-big",text:done?"Everyone's done. Reveal the rule":"Reveal the rule",onclick:rulesReveal}));
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
function sendReady(){if(ch&&P.state)ch.send({type:"broadcast",event:"ready",payload:{pid:P.pid,round:P.state.round}}).catch(()=>{})}
function sendVote(){if(ch&&P.vote)ch.send({type:"broadcast",event:"vote",payload:{pid:P.pid,r:P.vote.r,target:P.vote.target}}).catch(()=>{})}
function sendPick(kind,o){if(ch&&P.state)ch.send({type:"broadcast",event:"pick",payload:{pid:P.pid,round:P.state.round,kind,option:o,r:P.state.voteRound}}).catch(()=>{})}
function rosterName(s,pid){const r=(s.roster||[]).find(x=>x.pid===pid);return r?r.name:"Someone"}
let lastPlayerKey="";
function renderPlayer(){
  if(!P||mode!=="player")return;
  renderPlayerInner();
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
  const timer=()=>{if(!s.endsAt)return null;const t=el("div",{class:"timer"});const upd=()=>{const left=(s.endsAt-Date.now())/1000;t.textContent=left>0?fmt(left):"Time!";t.classList.toggle("hurry",left>0&&left<=10)};upd();pTimer=setInterval(upd,500);return el("div",{class:"panel"},el("h3",{text:"Time left"}),t)};
  const promptPanel=()=>{
    const m=s.meta||{};
    if(s.game==="copycat")return el("div",{class:"panel prompt-panel"},el("h3",{text:"Debate topic"}),el("p",{class:"prompt",text:m.prompt}));
    if(s.game==="glitch")return el("div",{class:"panel prompt-panel"},el("h3",{text:"The case"}),el("p",{class:"prompt",text:m.title}),el("p",{class:"scene",text:m.scene}));
    if(s.game==="agenda")return el("div",{class:"panel prompt-panel"},el("h3",{text:m.title}),el("p",{class:"prompt",text:m.question}),optionsGrid(m.options));
    return null;
  };
  if(s.phase==="cards"){
    const note=s.game==="agenda"?(P.peekedRound===s.round?"Now make your secret first pick below.":"Press and hold to read your agenda."):(P.peekedRound===s.round?"Got it. Watch the big screen.":"Press and hold to peek.");
    v.append(el("div",{class:"pass"},el("p",{class:"sub",text:G.name+" · round "+s.round+" · keep your screen hidden"}),cardView(),el("p",{class:"status on-felt",id:"pReadyNote",text:note})));
    if(s.game==="agenda"){v.append(el("div",{id:"agendaPick"}));renderAgendaPick()}
    return;
  }
  if(s.phase==="clues"){
    const pos=s.order.indexOf(P.pid)+1;
    v.append(el("p",{class:"big-msg",text:pos===1?"You go first!":"You're #"+pos+" to give a clue."}));
    const ol=el("ol",{class:"order"});s.order.forEach(p=>ol.append(el("li",{class:p===P.pid?"me":null,text:rosterName(s,p)})));
    v.append(el("div",{class:"panel"},el("h3",{text:"Speaking order"}),ol),timer(),peekAgain());
    return;
  }
  if(s.phase==="talk"){
    const head=s.game==="copycat"?"Debate time! Sneak in your mission.":s.game==="glitch"?"Investigate! Ask questions.":"Debate and make deals!";
    v.append(el("p",{class:"big-msg",text:head}),promptPanel(),timer(),peekAgain());
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
    if(P.card&&(P.card.isFib||P.card.odd))v.append(el("p",{class:"status on-felt",text:s.game==="flaugin"?"You’re flaugin’. Vote for someone else to keep your cover.":"You’re the Copycat. Vote for someone else to keep your cover."}));
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
      const l=el("p",{class:"reveal-line",text:"The word was "});l.append(el("b",{text:s.word||"?"}),document.createTextNode(". Flaugin’: "+fibNames.join(" and ")+"."));
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
  v.append(el("div",{class:"panel"},el("h3",{text:"Try "+(m.kind==="number"?"a number":"a word")}),form,err));
  if(hadFocus)setTimeout(()=>inp.focus(),0);
  v.append(el("div",{class:"panel"},el("h3",{text:"What the gate said"}),(s.log||[]).length?logList(s.log):el("p",{class:"sub",text:"Nothing tested yet."})));
  if(solved){v.append(el("p",{class:"solved",text:"✓ You got it"+((s.solved||[])[0]===P.pid?" first! +5":"! +2")+". Keep testing to watch the others."}));return}
  if(used>=2){v.append(el("p",{class:"status on-felt err",text:"Out of guesses this round. Keep testing for fun!"}));return}
  const box=el("div",{class:"rule-opts"});
  m.options.forEach((t,i)=>{
    const wrong=P.myGuesses.includes(i);
    box.append(el("button",{type:"button",class:wrong?"wrong":null,disabled:wrong?"":null,text:t,onclick:()=>{
      if(P.myGuesses.includes(i))return;P.myGuesses.push(i);
      ch.send({type:"broadcast",event:"guess",payload:{pid:P.pid,round:s.round,choice:i}}).catch(()=>{});renderPlayer();
    }}));
  });
  v.append(el("details",{class:"panel",open:(openDetails||P.myGuesses.length)?"":null},el("summary",{style:"font-weight:800;cursor:pointer",text:"I know the rule! ("+(2-used)+" "+(2-used===1?"guess":"guesses")+" left)"}),box));
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
  if(standalone)return;                       // already running full screen from the home screen
  btn.hidden=false;                           // always offer it; browsers without the API get instructions instead
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

/* ---------- theme music ("Game Show Grind") ----------
   Plays on the TV and in one-phone games, never on players' phones.
   Full volume on menus, lobby and reveals; drops low while everyone is talking or voting. */
var Music=(function(){
  const btn=$("musicBtn");if(!btn)return {sync(){}};
  const audio=new Audio("theme.mp3?v=1");audio.loop=true;audio.preload="auto";audio.volume=0;
  const touchy=window.matchMedia&&matchMedia("(hover: none)").matches;
  let on=store.get("music",!touchy);       // default on for laptops/TVs, off for phones
  let target=0,fade=0,unlocked=false;
  const QUIET=["clues","talk","vote","final","play","guess"];
  function wanted(){
    if(!on||mode==="player")return 0;
    const duck=window.__gnAnnTalking?0.35:1;
    if(mode==="host"&&H&&QUIET.includes(H.phase))return 0.1*duck;
    if(mode==="local"&&!$("vClues").hidden)return 0.1*duck;
    return 0.45*duck;
  }
  function ramp(){
    clearInterval(fade);
    fade=setInterval(()=>{
      const d=target-audio.volume;
      if(Math.abs(d)<0.02){audio.volume=target;clearInterval(fade);if(target===0)audio.pause();return}
      audio.volume=Math.max(0,Math.min(1,audio.volume+Math.sign(d)*0.03));
    },60);
  }
  function sync(){
    btn.hidden=mode==="player";
    btn.setAttribute("aria-pressed",String(on));btn.title=on?"Turn music off (M)":"Turn music on (M)";
    target=unlocked?wanted():0;
    if(target>0&&audio.paused)audio.play().catch(()=>{});
    ramp();
  }
  function unlock(){if(unlocked)return;unlocked=true;sync()}
  ["pointerdown","keydown"].forEach(t=>document.addEventListener(t,unlock,{capture:true}));
  btn.addEventListener("click",()=>{on=!on;store.set("music",on);unlocked=true;sync()});
  document.addEventListener("keydown",e=>{if((e.key==="m"||e.key==="M")&&!e.metaKey&&!e.ctrlKey&&!e.altKey){const t=e.target;if(t&&(t.tagName==="INPUT"||t.tagName==="TEXTAREA"))return;on=!on;store.set("music",on);unlocked=true;sync()}});
  document.addEventListener("visibilitychange",()=>{if(document.hidden){audio.pause()}else sync()});
  return {sync};
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
})();
