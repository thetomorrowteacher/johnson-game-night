/* Flaudjer — hosted edition.
   Big screen hosts a live room (Supabase Realtime); phones join with a PIN or QR.
   Secret cards come from the `flaudjer` edge function, so each phone only ever sees its own card. */
(function(){
"use strict";
const SB_URL="https://tcyskkvdebqrqpbzkgzn.supabase.co";
const SB_KEY="sb_publishable_UOiNXEGd-rVTGLmiGGtDjg__Av1HLsz";
const sb=window.supabase?window.supabase.createClient(SB_URL,SB_KEY,{auth:{persistSession:false,autoRefreshToken:false}}):null;
const SITE=location.origin+location.pathname.replace(/index\.html$/,"");

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

/* ---------- small helpers ---------- */
const store={
  get(k,d){try{const v=localStorage.getItem("flaudjer:"+k);return v?JSON.parse(v):d}catch(e){return d}},
  set(k,v){try{localStorage.setItem("flaudjer:"+k,JSON.stringify(v))}catch(e){}},
  del(k){try{localStorage.removeItem("flaudjer:"+k)}catch(e){}}
};
const $=id=>document.getElementById(id);
const VIEWS=["vHome","vSetup","vPass","vClues","vVote","vGuess","vResult","vHost","vJoin","vPlayer"];
function show(id){VIEWS.forEach(v=>{$(v).hidden=v!==id});document.body.classList.toggle("at-home",id==="vHome");window.scrollTo(0,0)}
function el(tag,attrs,...kids){const e=document.createElement(tag);if(attrs)for(const k in attrs){const v=attrs[k];if(v==null)continue;if(k==="class")e.className=v;else if(k==="text")e.textContent=v;else if(k.startsWith("on"))e[k]=v;else e.setAttribute(k,v)}kids.forEach(c=>c!=null&&e.append(c));return e}
function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function fmt(s){s=Math.max(0,Math.round(s));return Math.floor(s/60)+":"+String(s%60).padStart(2,"0")}
function setTag(t){$("roundTag").textContent=t}
let wakeLock=null;
async function keepAwake(){try{if(navigator.wakeLock&&!wakeLock){wakeLock=await navigator.wakeLock.request("screen");wakeLock.addEventListener("release",()=>{wakeLock=null})}}catch(e){}}
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&(mode==="host"||mode==="player"))keepAwake()});
async function api(body){
  let r,j;
  try{r=await fetch(SB_URL+"/functions/v1/flaudjer",{method:"POST",headers:{"content-type":"application/json",apikey:SB_KEY},body:JSON.stringify(body)})}
  catch(e){throw new Error("Can't reach the game server. Check your Wi-Fi.")}
  try{j=await r.json()}catch(e){j={}}
  if(!r.ok||j.error)throw new Error(j.error||"Something went wrong. Try again.");
  return j;
}

/* ---------- settings ---------- */
let players=store.get("players",["Mom","Dad","Maya","Leo"]);
let scores=store.get("scores",{});
let packId=store.get("pack","animals");
let fibs=store.get("fibs",1);
let used=store.get("used",{});
let roundNo=store.get("round",0);
let mode="home";
function packFor(id){return PACKS[id]}
function resolvePack(){return packId==="__mix"?shuffle(PACK_ORDER)[0]:packId}
function poolFor(pid){const p=PACKS[pid];const seen=used[pid]||[];let pool=p.words.filter(w=>!seen.includes(w));if(pool.length<2){used[pid]=[];store.set("used",used);pool=p.words.slice()}return pool}
function markUsed(pid,w){used[pid]=(used[pid]||[]).concat(w);store.set("used",used)}

/* ---------- secret card ---------- */
function makeCard({isFib,word,packName,twoFibs,onPeek}){
  const card=el("div",{class:"secret"+(isFib?" fib":""),tabindex:"0",role:"button","aria-label":"Press and hold to see your card"});
  const back=el("div",{class:"back"},el("div",{class:"print",text:"?"}),el("span",{text:"Press and hold"}));
  const front=el("div",{class:"front"});
  if(isFib){
    let h=packName?"Pack: "+packName+". Blend in!":"No word for you. Blend in!";
    if(twoFibs)h+=" There's another Flaudjer too.";
    front.append(el("span",{class:"label",text:"You are"}),el("span",{class:"word",text:"The Flaudjer"}),el("span",{class:"hint",text:h}));
  }else{
    front.append(el("span",{class:"label",text:"Secret word"}),el("span",{class:"word",text:word}),el("span",{class:"hint",text:packName?"Pack: "+packName:""}));
  }
  card.append(back,front);
  const bar=el("i");const meter=el("div",{class:"hold-meter","aria-hidden":"true"},bar);
  let raf=0,start=0,peeked=false;
  const down=e=>{if(e)e.preventDefault();start=performance.now();
    const step=()=>{const p=Math.min(1,(performance.now()-start)/450);bar.style.width=(p*100)+"%";
      if(p>=1){card.classList.add("peek");if(!peeked){peeked=true;onPeek&&onPeek()}return}
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
    outcome==="stole"?[votedName+" guessed it!","lose","Caught, but the Flaudjer still figured out the word."]:
    ["The family wins!","win","Flaudjer caught and the word stayed safe."];
}
function renderScoreTable(body,rows){
  body.textContent="";rows=rows.slice().sort((a,b)=>b[1]-a[1]);const top=rows.length?rows[0][1]:0;
  rows.forEach(([n,s])=>body.append(el("tr",s>0&&s===top?{class:"lead"}:null,el("td",{text:n}),el("td",{text:String(s)}))));
}

/* ---------- home ---------- */
$("homeLink").onclick=()=>{
  if((mode==="host"||mode==="player")&&!confirmLeave())return;
  leaveLive();mode="home";setTag("");document.body.classList.remove("tv");renderHome();show("vHome");
};
let leaveArmed=0;
function confirmLeave(){const now=Date.now();if(now-leaveArmed<3000)return true;leaveArmed=now;setTag("Tap the logo again to leave");return false}
$("goLocal").onclick=()=>{mode="local";setTag("Flaudjer");openSetup()};
$("goHost").onclick=()=>{mode="host";setTag("Flaudjer");openSetup()};
$("goJoin").onclick=()=>openJoin("");
function renderHome(){
  document.querySelectorAll(".resume").forEach(n=>n.remove());
  const h=store.get("host",null);
  if(h&&Date.now()-h.at<12*3600e3&&sb){
    $("goJoin").before(el("div",{class:"resume"},el("span",{text:"Your Flaudjer room "+h.code+" is still open."}),
      el("button",{class:"btn-small",text:"Resume on this screen",onclick:()=>{mode="host";resumeRoom(h)}})));
  }
  $("homeNote").textContent=sb?"":"The live game server didn't load. Check your connection; the one-phone game still works.";
}

/* ---------- setup ---------- */
function openSetup(){
  const local=mode==="local";
  $("playersPanel").hidden=!local;
  $("setupTitle").textContent=local?"Who's at the table?":"Set up the big screen";
  $("setupSub").textContent=local?"Everyone shares one phone and takes turns peeking.":"Pick a pack, then open a room. Everyone joins on their own phone.";
  $("startBtn").textContent=local?"Deal the cards":(H?"Back to the room":"Open the room");
  renderPlayers();renderPacks();renderFibs();show("vSetup");
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
  $("fibNote").textContent=mode==="local"?(players.length>=6?"":"Two Flaudjers unlocks at 6 players."):"Two Flaudjers kicks in only when 6 or more phones join.";
}
document.querySelectorAll("[data-fibs]").forEach(b=>b.onclick=()=>{fibs=Number(b.dataset.fibs);store.set("fibs",fibs);renderFibs()});
$("optHint").checked=store.get("hint",true);
$("optTimer").checked=store.get("timerOn",true);
$("optHint").onchange=()=>store.set("hint",$("optHint").checked);
$("optTimer").onchange=()=>store.set("timerOn",$("optTimer").checked);
$("startBtn").onclick=()=>{
  if(mode==="local")return startLocalRound();
  if(H){show("vHost");renderHost();return}
  openRoom();
};

/* =====================================================================
   ONE-PHONE MODE (no network)
   ===================================================================== */
let game=null;
function startLocalRound(){
  keepAwake();
  const pid=resolvePack();const pool=poolFor(pid);const word=pool[Math.floor(Math.random()*pool.length)];markUsed(pid,word);
  const fibIdx=shuffle(players.map((_,i)=>i)).slice(0,players.length>=6?fibs:1);
  roundNo++;store.set("round",roundNo);
  game={pid,word,fibIdx,turn:0,deal:shuffle(players.map((_,i)=>i)),voted:null};
  setTag("Flaudjer · Round "+roundNo);showPass();
}
function showPass(){
  const i=game.deal[game.turn];
  $("passStep").textContent="Card "+(game.turn+1)+" of "+players.length+" · hand the phone to";
  $("passName").textContent=players[i];
  const slot=$("passCardSlot");slot.textContent="";
  const isFib=game.fibIdx.includes(i);
  slot.append(makeCard({isFib,word:game.word,packName:(!isFib||$("optHint").checked)?PACKS[game.pid].name:null,twoFibs:game.fibIdx.length>1,onPeek:()=>{$("passNext").disabled=false}}));
  $("passNext").disabled=true;
  $("passNext").textContent=game.turn===players.length-1?"Hide it and start clues":"Hide it and pass on";
  show("vPass");
}
$("passNext").onclick=()=>{game.turn++;if(game.turn<players.length)showPass();else showClues()};
let tLeft=120,tInt=null;
function resetTimer(){clearInterval(tInt);tInt=null;tLeft=120;$("timer").textContent=fmt(tLeft);$("timerBtn").textContent="Start timer"}
$("timerBtn").onclick=()=>{
  if(tInt){clearInterval(tInt);tInt=null;$("timerBtn").textContent="Resume";return}
  $("timerBtn").textContent="Pause";
  tInt=setInterval(()=>{tLeft--;$("timer").textContent=fmt(tLeft);if(tLeft<=0){clearInterval(tInt);tInt=null;$("timer").textContent="Vote!";$("timerBtn").textContent="Start timer";tLeft=120}},1000);
};
$("timerReset").onclick=resetTimer;
function showClues(){
  const start=Math.floor(Math.random()*players.length);const ol=$("orderList");ol.textContent="";
  for(let k=0;k<players.length;k++)ol.append(el("li",{text:players[(start+k)%players.length]}));
  $("timerPanel").hidden=!$("optTimer").checked;resetTimer();show("vClues");
}
$("toVote").onclick=()=>{resetTimer();showVote()};
function showVote(){
  game.voted=null;const g=$("voteGrid");g.textContent="";
  players.forEach((n,i)=>{const b=el("button",{type:"button",text:n,"aria-pressed":"false"});
    b.onclick=()=>{game.voted=i;g.querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));$("lockVote").disabled=false;$("lockVote").textContent="Reveal "+n};g.append(b)});
  $("voteSub").textContent=game.fibIdx.length>1?"Two Flaudjers this round. Vote one out; catch either to win.":"Count hands, then tap the player with the most votes.";
  $("lockVote").disabled=true;$("lockVote").textContent="Reveal";show("vVote");
}
$("lockVote").onclick=()=>{
  const v=game.voted;
  if(game.fibIdx.includes(v)){
    $("caughtTitle").textContent="Caught! "+players[v]+" was a Flaudjer.";
    $("caughtLine").textContent=players[v]+", what do you think the word was?";
    $("guessWord").hidden=true;$("guessBtns").hidden=true;$("showWord").hidden=false;show("vGuess");
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
  const l=$("resLine");l.textContent=line+" The word was ";l.append(el("b",{text:game.word}),document.createTextNode(". Flaudjer"+(fibNames.length>1?"s":"")+": "+fibText+"."));
  renderScoreTable($("scoreBody"),players.map(n=>[n,scores[n]||0]));show("vResult");
}
$("nextRound").onclick=startLocalRound;
$("toSetup").onclick=()=>{setTag("Flaudjer");openSetup()};
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
  clearInterval(hostBeat);clearInterval(hostTick);clearInterval(pTimer);
  if(ch){try{sb.removeChannel(ch)}catch(e){}ch=null}
  H=null;P=null;$("conn").hidden=true;
}
function setConn(on){$("conn").hidden=false;$("conn").classList.toggle("on",on);$("conn").lastChild.textContent=on?"Live":"Reconnecting…"}

/* =====================================================================
   HOST / BIG SCREEN
   ===================================================================== */
let H=null,hostBeat=0,hostTick=0;
async function openRoom(){
  if(!sb){$("fibNote").className="status err";$("fibNote").textContent="The game server didn't load. Refresh and try again.";return}
  $("startBtn").disabled=true;$("startBtn").textContent="Opening a room…";
  try{
    const r=await api({action:"create"});
    const h={code:r.code,hostToken:r.hostToken,at:Date.now(),scores:{},names:{},round:0};
    store.set("host",h);resumeRoom(h);
  }catch(e){$("fibNote").className="status err";$("fibNote").textContent=e.message;$("startBtn").disabled=false;$("startBtn").textContent="Open the room"}
}
function resumeRoom(h){
  keepAwake();document.body.classList.add("tv");
  H={code:h.code,hostToken:h.hostToken,phase:"lobby",round:h.round||0,roster:[],order:[],voteRound:0,ready:{},votes:{},
     voted:null,outcome:"",scores:h.scores||{},names:h.names||{},endsAt:0,showWord:false,word:"",fib:[],packId:"",tally:null,tie:false,epoch:Date.now()};
  ch=channelFor(H.code,"host");
  ch.on("presence",{event:"sync"},()=>renderHost())
    .on("presence",{event:"join"},()=>broadcast())
    .on("broadcast",{event:"hello"},()=>broadcast())
    .on("broadcast",{event:"ready"},({payload})=>{
      const p=payload||{};if(!H||!inRoster(p.pid)||p.round!==H.round)return;
      if(!H.ready[p.pid]){H.ready[p.pid]=true;broadcast();renderHost()}
    })
    .on("broadcast",{event:"vote"},({payload})=>{
      const p=payload||{};if(!H||H.phase!=="vote"||!inRoster(p.pid)||p.r!==H.voteRound||!inRoster(p.target)||p.target===p.pid)return;
      const prev=H.votes[p.pid];H.votes[p.pid]=p.target;if(!prev)broadcast();renderHost();
    })
    .subscribe(status=>{
      if(status==="SUBSCRIBED"){setConn(true);ch.track({host:true});broadcast()}
      else if(status==="CHANNEL_ERROR"||status==="TIMED_OUT"||status==="CLOSED")setConn(false);
    });
  clearInterval(hostBeat);hostBeat=setInterval(broadcast,4000);
  clearInterval(hostTick);hostTick=setInterval(()=>{if(H&&H.phase==="clues"&&H.endsAt){const t=$("hostTimer");if(t)t.textContent=H.endsAt-Date.now()>0?fmt((H.endsAt-Date.now())/1000):"Vote!"}},500);
  mode="host";setTag("Flaudjer · Room "+H.code);show("vHost");renderHost();
}
function saveHost(){store.set("host",{code:H.code,hostToken:H.hostToken,at:Date.now(),scores:H.scores,names:H.names,round:H.round})}
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
  return {code:H.code,epoch:H.epoch,phase:H.phase,round:H.round,roster:H.roster,order:H.order,voteRound:H.voteRound,
    ready:Object.keys(H.ready),voted:Object.keys(H.votes),votedOut:H.voted,outcome:H.outcome,endsAt:H.endsAt,showWord:H.showWord,
    word:showSecret?H.word:null,fib:H.phase==="result"?H.fib:null,
    scores:H.roster.map(r=>[r.pid,H.scores[r.pid]||0])};
}
function broadcast(){if(ch&&H)ch.send({type:"broadcast",event:"state",payload:publicState()}).catch(()=>{})}
function setPhase(p){H.phase=p;H.epoch=Date.now();broadcast();renderHost();saveHost()}
let dealing=false;
async function hostDeal(){
  const ph=phones();if(ph.length<3||dealing)return;dealing=true;renderHost();
  const seen={};
  const roster=ph.slice(0,30).map(p=>{let n=p.name||"Player";const k=n.toLowerCase();seen[k]=(seen[k]||0)+1;if(seen[k]>1)n=n+" "+seen[k];return {pid:p.pid,name:n}});
  const pid=resolvePack();
  try{
    const r=await api({action:"deal",code:H.code,hostToken:H.hostToken,playerIds:roster.map(x=>x.pid),words:poolFor(pid),pack:PACKS[pid].name,hint:$("optHint").checked,fibs});
    H.roster=roster;roster.forEach(x=>H.names[x.pid]=x.name);
    H.round=r.round;H.packId=pid;H.fibCount=r.fibCount;H.ready={};H.votes={};H.voted=null;H.outcome="";H.tally=null;H.tie=false;H.showWord=false;H.endsAt=0;H.word="";H.fib=[];
    H.timerOn=$("optTimer").checked;H.hint=$("optHint").checked;
    const start=Math.floor(Math.random()*roster.length);H.order=roster.map((_,k)=>roster[(start+k)%roster.length].pid);
    setTag("Flaudjer · Room "+H.code+" · Round "+H.round);H.err="";
    setPhase("cards");
  }catch(e){H.err=e.message;renderHost()}
  finally{dealing=false;renderHost()}
}
function tally(){const c={};Object.values(H.votes).forEach(t=>{c[t]=(c[t]||0)+1});return c}
async function hostReveal(){
  const c=tally();const max=Math.max(0,...Object.values(c));const top=Object.keys(c).filter(k=>c[k]===max);
  H.tally=c;
  if(max===0||top.length>1){H.tie=true;renderHost();return}
  H.tie=false;H.voted=top[0];
  try{const r=await api({action:"reveal",code:H.code,hostToken:H.hostToken});H.word=r.word;H.fib=r.fib;markUsed(H.packId,r.word)}
  catch(e){H.err=e.message;renderHost();return}
  H.err="";
  if(H.fib.includes(H.voted))setPhase("guess");else hostFinish("escaped");
}
function hostRevote(){H.voteRound++;H.votes={};H.tally=null;H.tie=false;setPhase("vote")}
function hostFinish(outcome){
  H.outcome=outcome;award(H.scores,outcome,H.roster.map(r=>r.pid),H.fib,H.voted);setPhase("result");
}
function joinCard(){
  const url=SITE+"?pin="+H.code;
  const qr=el("div",{class:"qr",role:"img","aria-label":"QR code to join room "+H.code});
  setTimeout(()=>{try{if(window.QRCode)new QRCode(qr,{text:url,width:400,height:400,colorDark:"#15130e",colorLight:"#ffffff",correctLevel:QRCode.CorrectLevel.M})}catch(e){}},0);
  return el("div",{class:"join-card"},el("span",{class:"lbl",text:"Join on your phone"}),el("div",{class:"pin",text:H.code}),qr,
    el("p",{class:"sub",style:"margin:0"},document.createTextNode("Scan the code, or go to "),el("span",{class:"join-url",text:SITE.replace(/^https?:\/\//,"").replace(/\/$/,"")}),document.createTextNode(" and enter the PIN.")));
}
function chipsFor(list,isOk){const c=el("div",{class:"chips"});list.forEach(r=>{const ok=isOk(r);c.append(el("span",{class:"chip"+(ok?" ok":"")},el("span",{class:"tick",text:ok?"✓":"…"}),el("span",{text:r.name})))});return c}
function errLine(){return H.err?el("p",{class:"status on-felt err",text:H.err}):el("span")}
function renderHost(){
  if(!H||mode!=="host")return;
  const main=$("hostMain"),side=$("hostSide");main.textContent="";side.textContent="";
  const ph=phones();
  if(H.phase==="lobby"){
    main.append(el("p",{class:"eyebrow",text:"Flaudjer"}),el("p",{class:"big-msg",text:"Grab your phones!"}),el("p",{class:"sub",text:"3 to 30 players. Late arrivals join the next round."}));
    main.append(el("div",{class:"panel"},el("h3",{text:"Players in · "+ph.length}),ph.length?chipsFor(ph,()=>true):el("p",{class:"sub",text:"Waiting for the first player…"})));
    const go=el("button",{class:"btn-big",text:dealing?"Dealing…":ph.length<3?"Need "+(3-ph.length)+" more to start":"Deal the cards",onclick:hostDeal});go.disabled=ph.length<3||dealing;
    main.append(go,errLine(),el("div",{class:"row"},
      el("button",{class:"btn-chalk btn-small",text:"Change pack or rules",onclick:()=>{openSetup()}}),
      el("button",{class:"btn-chalk btn-small",text:"Close room",onclick:closeRoom})));
    side.append(joinCard());return;
  }
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
    if(H.timerOn){
      side.append(el("div",{class:"panel"},el("h3",{text:"Talk it over"}),el("div",{class:"timer",id:"hostTimer",text:H.endsAt?fmt((H.endsAt-Date.now())/1000):"2:00"}),
        el("button",{class:"btn-felt",text:H.endsAt?"Restart 2 minutes":"Start 2-minute timer",onclick:()=>{H.endsAt=Date.now()+120000;broadcast();renderHost()}})));
    }
    if(H.hint)side.append(el("div",{class:"panel"},el("h3",{text:"Pack"}),el("p",{style:"margin:0;font-size:1.2rem;font-weight:800",text:PACKS[H.packId].name})));
    return;
  }
  if(H.phase==="vote"){
    const n=H.roster.filter(r=>H.votes[r.pid]).length;
    main.append(el("p",{class:"big-msg",text:"Who's the Flaudjer? Vote on your phone."}));
    main.append(el("div",{class:"panel"},el("h3",{text:"Votes in · "+n+" of "+H.roster.length}),chipsFor(H.roster,r=>H.votes[r.pid])));
    if(H.tie){
      side.append(el("div",{class:"panel"},el("h3",{text:n?"It's a tie!":"No votes yet"}),tallyBars(false),el("p",{class:"sub",text:"Talk it out, then vote again."}),el("button",{class:"btn-felt",text:"Vote again",onclick:hostRevote})));
    }
    const rv=el("button",{class:"btn-big",text:n===H.roster.length?"Everyone voted. Reveal!":"Reveal votes",onclick:hostReveal});rv.disabled=n===0;
    main.append(rv,errLine());return;
  }
  if(H.phase==="guess"){
    main.append(el("p",{class:"verdict win",text:"Caught! "+nameOf(H.voted)+" was a Flaudjer."}),el("p",{class:"reveal-line",text:nameOf(H.voted)+", say your guess for the secret word out loud."}));
    const p=el("div",{class:"panel"},el("h3",{text:"Last chance"}));
    if(!H.showWord)p.append(el("button",{class:"btn-felt",text:"Show the word",onclick:()=>{H.showWord=true;broadcast();renderHost()}}));
    else p.append(el("p",{class:"verdict",style:"color:var(--felt)",text:H.word}),el("div",{class:"row"},el("button",{text:"They got it",style:"flex:1",onclick:()=>hostFinish("stole")}),el("button",{class:"btn-ghost",text:"They missed",style:"flex:1",onclick:()=>hostFinish("caught")})));
    main.append(p);side.append(el("div",{class:"panel"},el("h3",{text:"The votes"}),tallyBars(false)));return;
  }
  if(H.phase==="result"){
    const fibNames=H.fib.map(nameOf);const [t,cls,line]=verdictText(H.outcome,fibNames.join(" and "),nameOf(H.voted));
    main.append(el("p",{class:"verdict "+cls,text:t}));
    const l=el("p",{class:"reveal-line",text:line+" The word was "});l.append(el("b",{text:H.word}),document.createTextNode(". Flaudjer"+(fibNames.length>1?"s":"")+": "+fibNames.join(" and ")+"."));main.append(l);
    const body=el("tbody");renderScoreTable(body,H.roster.map(r=>[r.name,H.scores[r.pid]||0]));
    main.append(el("div",{class:"panel"},el("h3",{text:"Scoreboard"}),el("table",{class:"scores"},body),el("p",{class:"sub",style:"font-size:.82rem",text:"Flaudjer escapes: +2. Caught but guesses the word: +1. Caught and misses: +1 to everyone else."})));
    const nx=el("button",{class:"btn-big",text:dealing?"Dealing…":ph.length>=3?"Next round":"Need 3 phones for the next round",onclick:hostDeal});nx.disabled=ph.length<3||dealing;
    main.append(nx,errLine(),el("div",{class:"row"},el("button",{class:"btn-chalk btn-small",text:"Change pack or rules",onclick:()=>openSetup()}),el("button",{class:"btn-chalk btn-small",text:"Close room",onclick:closeRoom})));
    side.append(el("div",{class:"panel"},el("h3",{text:"The votes"}),tallyBars(true)),joinCard());return;
  }
}
function tallyBars(markFib){
  const t=el("div",{class:"tally"});const c=H.tally||tally();const max=Math.max(1,...Object.values(c));
  Object.keys(c).sort((a,b)=>c[b]-c[a]).forEach(k=>t.append(el("div",{class:"bar"},el("span",{text:nameOf(k)+(markFib&&H.fib.includes(k)?" (Flaudjer)":"")}),el("i",{style:"width:"+(c[k]/max*100)+"%"}),el("b",{text:String(c[k])}))));
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
    if(!me||me.name!==name){const r=await api({action:"join",code:pin,name});me={pid:r.playerId,token:r.token,name:r.name,at:Date.now()};store.set("me:"+pin,me)}
  }catch(err){$("joinBtn").disabled=false;st.className="status err";st.textContent=err.message;return}
  store.set("myName",name);
  startPlayer(pin,me);
};
function startPlayer(pin,me){
  keepAwake();
  P={pin,pid:me.pid,token:me.token,name:me.name,state:null,card:null,cardErr:"",fetching:false,peekedRound:0,vote:null,closed:false};
  ch=channelFor(pin,me.pid);
  ch.on("broadcast",{event:"state"},({payload})=>onState(payload))
    .on("broadcast",{event:"closed"},()=>{if(P){P.closed=true;renderPlayer()}})
    .on("presence",{event:"sync"},()=>{if(P&&!P.state)renderPlayer()})
    .subscribe(status=>{
      if(status==="SUBSCRIBED"){setConn(true);ch.track({pid:me.pid,name:me.name});ch.send({type:"broadcast",event:"hello",payload:{pid:me.pid}}).catch(()=>{})}
      else if(status==="CHANNEL_ERROR"||status==="TIMED_OUT"||status==="CLOSED")setConn(false);
    });
  setTag("Flaudjer · Room "+pin);show("vPlayer");renderPlayer();
  setTimeout(()=>{if(P&&!P.state){P.slow=true;renderPlayer()}},7000);
}
function onState(s){
  if(!P||!s||s.code!==P.pin)return;
  const prev=P.state;
  if(prev&&s.epoch<prev.epoch)return;
  P.state=s;P.slow=false;
  const inRound=Array.isArray(s.roster)&&s.roster.some(r=>r.pid===P.pid);
  // card for this round
  if(inRound&&["cards","clues","vote","guess"].includes(s.phase)&&(!P.card||P.card.round!==s.round)&&!P.fetching)fetchCard();
  // re-send acknowledgements the host may have missed
  if(inRound&&P.peekedRound===s.round&&!(s.ready||[]).includes(P.pid))sendReady();
  if(inRound&&s.phase==="vote"&&P.vote&&P.vote.r===s.voteRound&&!(s.voted||[]).includes(P.pid))sendVote();
  const changed=!prev||prev.epoch!==s.epoch||prev.phase!==s.phase||prev.showWord!==s.showWord||prev.endsAt!==s.endsAt||prev.round!==s.round;
  if(changed)renderPlayer();
}
async function fetchCard(){
  P.fetching=true;P.cardErr="";
  try{const c=await api({action:"card",code:P.pin,playerId:P.pid,token:P.token});P.card=c}
  catch(e){P.cardErr=e.message}
  finally{P.fetching=false;renderPlayer()}
}
function sendReady(){if(ch&&P.state)ch.send({type:"broadcast",event:"ready",payload:{pid:P.pid,round:P.state.round}}).catch(()=>{})}
function sendVote(){if(ch&&P.vote)ch.send({type:"broadcast",event:"vote",payload:{pid:P.pid,r:P.vote.r,target:P.vote.target}}).catch(()=>{})}
function rosterName(s,pid){const r=(s.roster||[]).find(x=>x.pid===pid);return r?r.name:"Someone"}
function renderPlayer(){
  if(!P||mode!=="player")return;
  const v=$("vPlayer");v.textContent="";clearInterval(pTimer);
  const s=P.state;
  const hello=el("p",{class:"sub",text:"You're "+P.name+" in room "+P.pin+"."});
  const change=el("button",{class:"btn-chalk btn-small",style:"align-self:flex-start",text:"Leave this game",onclick:()=>{store.del("me:"+P.pin);leaveLive();openJoin("")}});
  if(P.closed){v.append(el("p",{class:"big-msg",text:"The host closed this room."}),el("p",{class:"sub",text:"Thanks for playing! Join a new room with a fresh PIN."}),change);return}
  if(!s){
    v.append(el("p",{class:"big-msg",text:P.slow?"Can't find the big screen.":"You're in!"}),hello,
      el("p",{class:"status on-felt"+(P.slow?" err":""),text:P.slow?"Make sure the host's screen is still open on room "+P.pin+".":"Connecting to the big screen…"}),change);
    return;
  }
  const inRound=s.roster.some(r=>r.pid===P.pid);
  if(s.phase==="lobby"){
    v.append(el("p",{class:"big-msg",text:"You're in!"}),hello,el("p",{class:"sub",text:"The game starts when the big screen deals the cards."}));
    if(inRound&&s.round>0)v.append(myScore(s));
    v.append(change);return;
  }
  if(!inRound){
    v.append(el("p",{class:"big-msg",text:"Round "+s.round+" is underway."}),hello,el("p",{class:"sub",text:"You'll get a card when the next round is dealt."}),change);return;
  }
  const cardView=()=>{
    if(P.card&&P.card.round===s.round)return makeCard({isFib:P.card.isFib,word:P.card.word,packName:P.card.pack,twoFibs:P.card.twoFibs,onPeek:()=>{if(P.peekedRound!==s.round){P.peekedRound=s.round;sendReady();const n=$("pReadyNote");if(n)n.textContent="Got it. Watch the big screen."}}});
    if(P.cardErr)return el("div",{class:"panel"},el("p",{class:"status err",text:P.cardErr}),el("button",{class:"btn-felt",text:"Try again",onclick:fetchCard}));
    return el("p",{class:"status on-felt",text:"Dealing your card…"});
  };
  if(s.phase==="cards"){
    v.append(el("div",{class:"pass"},el("p",{class:"sub",text:"Round "+s.round+" · keep your screen hidden"}),cardView(),
      el("p",{class:"status on-felt",id:"pReadyNote",text:P.peekedRound===s.round?"Got it. Watch the big screen.":"Press and hold to peek."})));
    return;
  }
  if(s.phase==="clues"){
    const pos=s.order.indexOf(P.pid)+1;
    v.append(el("p",{class:"big-msg",text:pos===1?"You go first!":"You're #"+pos+" to give a clue."}));
    const ol=el("ol",{class:"order"});s.order.forEach(p=>ol.append(el("li",{class:p===P.pid?"me":null,text:rosterName(s,p)})));
    v.append(el("div",{class:"panel"},el("h3",{text:"Speaking order"}),ol));
    if(s.endsAt){const t=el("div",{class:"timer"});const upd=()=>{const left=(s.endsAt-Date.now())/1000;t.textContent=left>0?fmt(left):"Vote!"};upd();pTimer=setInterval(upd,500);v.append(el("div",{class:"panel"},el("h3",{text:"Time left"}),t))}
    v.append(el("details",{class:"panel"},el("summary",{style:"font-weight:800;cursor:pointer",text:"Peek at my card again"}),el("div",{style:"display:flex;justify-content:center;padding-top:10px"},cardView())));
    return;
  }
  if(s.phase==="vote"){
    const mine=P.vote&&P.vote.r===s.voteRound?P.vote.target:null;
    v.append(el("p",{class:"big-msg",text:"Who's the Flaudjer?"}),el("p",{class:"sub",text:mine?"Vote sent. Tap another name to change it.":"Tap one name. Votes stay secret until the reveal."}));
    const g=el("div",{class:"vote-grid"});
    s.roster.filter(r=>r.pid!==P.pid).forEach(r=>g.append(el("button",{type:"button",text:r.name,"aria-pressed":String(mine===r.pid),onclick:()=>{P.vote={r:s.voteRound,target:r.pid};sendVote();renderPlayer()}})));
    v.append(el("div",{class:"panel"},g));
    if(P.card&&P.card.isFib)v.append(el("p",{class:"status on-felt",text:"You're a Flaudjer. Vote for someone else to keep your cover."}));
    return;
  }
  if(s.phase==="guess"){
    const caught=s.votedOut===P.pid;
    v.append(el("p",{class:"big-msg",text:caught?"You've been caught!":"Flaudjer caught!"}),
      el("p",{class:"sub",text:caught?"Say your best guess for the word out loud. Get it right to steal the round.":rosterName(s,s.votedOut)+" gets one guess at the word."}));
    if(s.showWord&&s.word)v.append(el("div",{class:"panel"},el("h3",{text:"The word was"}),el("p",{class:"verdict",style:"color:var(--felt)",text:s.word})));
    return;
  }
  if(s.phase==="result"){
    const fibIds=s.fib||[];const fibNames=fibIds.map(p=>rosterName(s,p));
    const [t]=verdictText(s.outcome,fibNames.join(" and "),rosterName(s,s.votedOut));
    const amFib=fibIds.includes(P.pid);
    const scored=s.outcome==="escaped"?amFib:s.outcome==="stole"?s.votedOut===P.pid:!amFib;
    v.append(el("p",{class:"verdict "+(scored?"win":"lose"),text:scored?"You scored!":t}));
    const l=el("p",{class:"reveal-line",text:"The word was "});l.append(el("b",{text:s.word||"?"}),document.createTextNode(". Flaudjer"+(fibNames.length>1?"s":"")+": "+fibNames.join(" and ")+"."));
    v.append(l,myScore(s),el("p",{class:"sub",text:"The next round starts from the big screen."}));
    return;
  }
}
function myScore(s){
  const rows=(s.scores||[]).slice().sort((a,b)=>b[1]-a[1]);const mine=(s.scores||[]).find(r=>r[0]===P.pid);
  const rank=rows.findIndex(r=>r[0]===P.pid)+1;
  return el("div",{class:"panel"},el("h3",{text:"Your score"}),el("p",{class:"timer",style:"text-align:left",text:String(mine?mine[1]:0)}),
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
/* ---------- boot ---------- */
const qs=new URLSearchParams(location.search);
const pinIn=(qs.get("pin")||location.hash.replace("#","")||"").toUpperCase().replace(/[^A-Z]/g,"");
renderHome();
if(pinIn.length===4){
  history.replaceState(null,"",location.pathname);
  const me=store.get("me:"+pinIn,null);
  if(me&&sb&&Date.now()-(me.at||0)<12*3600e3){mode="player";startPlayer(pinIn,me)}else openJoin(pinIn);
}else show("vHome");
})();
