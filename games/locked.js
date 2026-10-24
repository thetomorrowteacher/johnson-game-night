/* Locked In (id "escape"): a team escape room against the clock.
   The TV shows the room, the timer and the current lock. Every phone gets DIFFERENT secret clues for each lock,
   so the family has to talk and put the pieces together. Anyone can try a code on their phone. Hints cost time. */
(function(){
"use strict";
const ID="escape";
/* type: digits | word | colors (R Y G B). clues are split across the phones. */
const ROOMS={
kitchen:{name:"Big Mama's Kitchen",emoji:"🍗",story:"Big Mama locked the cookout food in her kitchen and went to church. The guests get here soon. Get the plates out before time runs out!",puzzles:[
 {title:"The Pantry Padlock",type:"digits",len:3,scene:"A padlock with 3 numbers hangs on the pantry door. A sticky note says: “Count it up, baby.”",
  clues:["First number: how many legs does a chicken have?","Second number: how many sides does a stop sign have? Then take away 3.","Third number: days in a week, minus the weekend days."],answer:"255",hints:["Each phone has a different number. Say yours out loud.","Put them in order: first, second, third."]},
 {title:"The Spice Rack",type:"word",scene:"Five spice jars sit in a row, left to right: Garlic · Rosemary · Allspice · Vanilla · Yeast. The cabinet lock wants a word.",
  clues:["Big Mama always says: “Start with the first letter of everything.”","The jars are in order, left to right.","It's what Big Mama pours over everything at the cookout."],answer:"GRAVY",hints:["Look at the first letter of each jar.","G-R-A-V-…"]},
 {title:"The Oven Timer",type:"digits",len:4,scene:"The oven won't open until you type the time the mac and cheese is ready. Four digits, like 0415.",
  clues:["The mac and cheese went in at 3:20.","It bakes for 35 minutes.","Then it rests 10 more minutes before anybody can touch it.","Type the time with 4 digits and no colon."],answer:"0405",hints:["Add up 35 + 10 minutes.","3:20 plus 45 minutes is…"]},
 {title:"The Recipe Card",type:"word",scene:"Big Mama's secret ingredient is written in code on the recipe card: M P W F",
  clues:["Big Mama writes her secrets one letter ahead, so A is written as B.","To read it, go one letter BACK in the alphabet for each letter.","It's the ingredient she puts in every single dish."],answer:"LOVE",hints:["M becomes L.","L-O-…"]},
 {title:"The Back Door",type:"colors",len:4,scene:"The back door has 4 buttons: Red, Gold, Green and Blue. Press them in the right order to get out with the plates!",
  clues:["Green is pressed first.","Red is pressed right after Green.","Blue is NOT pressed last.","Gold comes somewhere after Blue."],answer:"GRBY",hints:["Green, then Red…","Only two spots are left. Blue can't be last."]}
]},
studio:{name:"The Memphis Studio",emoji:"🎙️",story:"The master tape for the family album is locked in a Memphis recording studio. The label shows up in a few minutes. Get the tape out!",puzzles:[
 {title:"Studio Door Keypad",type:"digits",len:4,scene:"The studio door has a 4-digit keypad. Somebody taped clues around the building.",
  clues:["1st digit: the number of strings on a regular guitar.","2nd digit: half of the 1st digit.","3rd digit: the 1st digit minus the 2nd digit, minus 3.","4th digit: how many letters are in MEMPHIS."],answer:"6307",hints:["A regular guitar has 6 strings.","6, 3, 0, …"]},
 {title:"The Mixing Board",type:"word",scene:"Four faders on the mixing board have letters on them. Levels: U = 3, L = 4, S = 1, O = 2.",
  clues:["Read the faders from the lowest level to the highest.","It's a kind of music Memphis is famous for.","It's four letters long."],answer:"SOUL",hints:["Level 1 is S.","S-O-…"]},
 {title:"The Record Shelf",type:"digits",len:3,scene:"A little safe under the record shelf needs a 3-digit code.",
  clues:["Records on the top shelf: 12. Middle shelf: 9. Bottom shelf: 4.","The code is: top minus middle, then middle minus bottom, then the bottom number.","Each part of the code is one digit."],answer:"354",hints:["12 − 9 = 3.","3, 5, …"]},
 {title:"The Lyric Sheet",type:"word",scene:"A riddle on the lyric sheet: “I have keys but open no doors. I have space but no room. You can enter, but you can't go inside.”",
  clues:["It's sitting on the desk in the studio.","You type on it.","It has a space bar."],answer:"KEYBOARD",hints:["It has keys and an Enter key.","KEY-…"]},
 {title:"The Tape Vault",type:"colors",len:4,scene:"The vault with the master tape has 4 colored lights: Red, Gold, Green and Blue.",
  clues:["Green is first.","Blue is either first or last.","Gold comes right before Red.","Every color is used once."],answer:"GYRB",hints:["Green is first, so where does Blue go?","Green … … Blue."]}
]},
nassau:{name:"Nassau Treasure",emoji:"🏝️",story:"A pirate buried treasure on a beach in Nassau, and the tide is coming in. Crack the locks and dig it up before the water does!",puzzles:[
 {title:"Map Coordinates",type:"digits",len:4,scene:"The treasure map has a 4-digit spot number. The clues are split up between your phones.",
  clues:["1st digit: 🐚🐚🐚🐚🐚🐚🐚 How many shells?","2nd digit: 🌴🌴🌴 How many palm trees?","3rd digit: how many letters are in BAHAMAS?","4th digit: 🦩🦩 How many flamingos, times 4?"],answer:"7378",hints:["Count the emojis carefully.","7, 3, 7, …"]},
 {title:"The Parrot Gate",type:"word",scene:"A parrot guards the gate. It only opens for the Bahamian word for gossip.",
  clues:["In the Bahamas, gossip is called “___ ___”.","It's the same little word said twice.","Type it as one word with no space."],answer:"SIPSIP",hints:["It starts with SIP.","SIP + SIP."]},
 {title:"The Tide Chart",type:"digits",len:4,scene:"The tide chart lock wants the time of high tide, in 4 digits.",
  clues:["Low tide was at 9:15 in the morning.","High tide comes 6 hours and 30 minutes later.","Use 24-hour time with 4 digits, like 1300 for 1 PM."],answer:"1545",hints:["9:15 + 6:30 = …","3:45 PM in 24-hour time."]},
 {title:"The Junkanoo Parade",type:"colors",len:4,scene:"Four Junkanoo costumes have to march in the right order: Red, Gold, Green and Blue.",
  clues:["Gold leads the parade.","Blue is right behind Gold.","Green is NOT next to Blue.","Red is in the parade too."],answer:"YBRG",hints:["Gold, then Blue…","Green can't be third."]},
 {title:"The Treasure Chest",type:"word",scene:"The captain's log says: “The chest opens for my favorite drink.”",
  clues:["It's Bahamian lemonade.","It's made with limes, not lemons.","It starts with SW."],answer:"SWITCHA",hints:["SWIT-…","SWITCH + A."]}
]}
};
const ROOM_ORDER=Object.keys(ROOMS);
const COLORS={R:{name:"Red",hex:"#c8211a"},Y:{name:"Gold",hex:"#e0a800"},G:{name:"Green",hex:"#2f9a2b"},B:{name:"Blue",hex:"#2f6fd0"}};
let K=null;
const X=()=>K.H&&K.H.ext;
const norm=s=>String(s||"").toUpperCase().replace(/[^A-Z0-9]/g,"");

function cfgRows(box,c,set,segRow){
  box.append(segRow("Room",[["kitchen","🍗 Big Mama's Kitchen"],["studio","🎙️ Memphis Studio"],["nassau","🏝️ Nassau Treasure"],["next","Next one"]],c.room,set("room")));
  box.append(segRow("Time",[[600,"10 min"],[900,"15 min"],[1200,"20 min"],[1800,"30 min"]],c.time,set("time")));
  box.append(segRow("Each hint costs",[[0,"Free"],[30,"30 sec"],[60,"1 min"]],c.hint,set("hint")));
}

/* ---------- TV ---------- */
async function deal(ids){
  const c=K.cfg(ID);let room=c.room||"next";
  if(room==="next"){const last=K.H.lastEscape||-1;const i=(last+1)%ROOM_ORDER.length;K.H.lastEscape=i;room=ROOM_ORDER[i]}
  const R=ROOMS[room];const order=K.shuffle(ids);
  const cards={};order.forEach((pid,k)=>{cards[pid]={room,clues:R.puzzles.map((pz,pi)=>{
    const N=order.length,C=pz.clues.length;const mine=[];
    if(N>=C){const j=(k+pi)%N;mine.push(pz.clues[j%C])}
    else{for(let j=0;j<C;j++)if((j+pi)%N===k)mine.push(pz.clues[j])}
    return mine;})}});
  const r=await K.api({action:"dealCards",code:K.H.code,hostToken:K.H.hostToken,game:ID,cards});
  K.H.round=r.round;
  K.H.ext={room,idx:0,endsAt:0,total:c.time||1200,hintCost:c.hint==null?60:c.hint,hints:0,tries:[],solved:[],started:0,lastSec:null,won:null,flash:null};
}
function start(){const x=X();x.started=Date.now();x.endsAt=Date.now()+x.total*1000;K.Music.sting("go")||K.FX.play("whoosh");K.ANN.say("go");K.setPhase("solve")}
function hint(){const x=X();if(!x||K.H.phase!=="solve")return;const pz=ROOMS[x.room].puzzles[x.idx];if(x.hints>=pz.hints.length)return;x.hints++;x.endsAt-=x.hintCost*1000;K.FX.play("pop");K.broadcast();K.renderHost()}
function skip(){const x=X();x.endsAt-=120000;solve(null,true)}
function solve(pid,skipped){
  const x=X();x.solved.push({idx:x.idx,by:pid,skipped:!!skipped,at:Date.now()});x.tries=[];x.hints=0;x.flash={k:"open",at:Date.now()};
  if(x.idx>=ROOMS[x.room].puzzles.length-1)return escape(true);
  x.idx++;K.FX.play("solve");K.FX.confetti(60);K.ANN.line("correct");K.broadcast();K.renderHost();
}
function escape(won){
  const x=X();x.won=won;const rp={};
  if(won){const left=Math.max(0,(x.endsAt-Date.now())/1000);K.H.roster.forEach(r=>rp[r.pid]=3+(left>=x.total/2?1:0));x.left=left}
  K.addScores(rp);K.H.reveal={rp,won};K.setPhase("result");
}
function onAct(p){
  const x=X();if(!x)return;
  if(p.type==="start"&&K.H.phase==="intro")return start();
  if(K.H.phase!=="solve")return;
  if(p.type==="hint")return hint();
  if(p.type==="try"){
    const pz=ROOMS[x.room].puzzles[x.idx];const a=norm(p.answer);if(!a||p.idx!==x.idx)return;
    if(a===norm(pz.answer))return solve(p.pid,false);
    x.tries.push({a:String(p.answer).slice(0,20).toUpperCase(),by:p.pid,at:Date.now()});x.tries=x.tries.slice(-6);x.flash={k:"wrong",at:Date.now()};
    K.FX.play("reject");K.broadcast();K.renderHost();
  }
}
function tick(){
  const h=K&&K.H;if(!h||h.game!==ID||h.phase!=="solve")return;const x=h.ext;if(!x||!x.endsAt)return;
  const left=(x.endsAt-Date.now())/1000;const el=document.getElementById("escTimer");
  if(el){el.textContent=K.fmt(Math.max(0,left));el.classList.toggle("hurry",left>0&&left<=30)}
  const sec=Math.ceil(left);
  if(sec!==x.lastSec){x.lastSec=sec;if(K.mode==="host"){if(sec===60)K.ANN.line("hurry");else if(sec>0&&sec<=3)K.ANN.count(sec);else if(sec>0&&sec<=10)K.FX.play("tick")}}
  if(left<=0){if(K.mode==="host"){K.FX.play("buzzer");K.ANN.line("timeout")}escape(false)}
}
function pub(){
  const x=X();if(!x)return null;const R=ROOMS[x.room];const pz=R.puzzles[x.idx];
  return {room:x.room,idx:x.idx,n:R.puzzles.length,endsAt:x.endsAt,total:x.total,hints:pz.hints.slice(0,x.hints),hintsLeft:pz.hints.length-x.hints,hintCost:x.hintCost,
    tries:x.tries,solved:x.solved.length,flash:x.flash,won:x.won,left:x.left||0};
}

/* ---------- shared drawing ---------- */
function progress(x){
  const el=K.el;const box=el("div",{class:"esc-locks"});
  for(let i=0;i<x.n;i++)box.append(el("span",{class:"lk"+(i<x.idx||x.won?" open":i===x.idx?" now":""),text:i<x.idx||x.won?"🔓":"🔒"}));
  return box;
}
function lockFace(pz){
  const el=K.el;
  if(pz.type==="digits"){const b=el("div",{class:"esc-dial"});for(let i=0;i<pz.len;i++)b.append(el("span",{text:"?"}));return b}
  if(pz.type==="colors"){const b=el("div",{class:"esc-dial colors"});Object.keys(COLORS).forEach(k=>b.append(el("span",{style:"--cc:"+COLORS[k].hex})));return b}
  return el("div",{class:"esc-dial word"},el("span",{text:"_ ".repeat(Math.max(3,pz.answer.length)).trim()}));
}
const typeLabel=t=>t==="digits"?"Number lock":t==="colors"?"Color lock":"Word lock";

function renderHost(main,side){
  const h=K.H,x=X(),el=K.el,n=K.nameOf;if(!x)return;const R=ROOMS[x.room];const p=pub();
  if(h.phase==="intro"){
    main.append(el("p",{class:"eyebrow",text:"Locked In · "+R.puzzles.length+" locks · "+K.fmt(x.total)}),el("p",{class:"big-msg",text:R.emoji+" "+R.name}),
      el("p",{class:"esc-story",text:R.story}),
      el("p",{class:"sub",text:"Everybody's phone has DIFFERENT secret clues. Read yours out loud, put the pieces together, and type the code on any phone."}),
      el("button",{class:"btn-big",text:"Start the clock ⏱",onclick:start}));
    side.append(K.joinCard());return;
  }
  if(h.phase==="solve"){
    const pz=R.puzzles[x.idx];const fl=x.flash&&Date.now()-x.flash.at<1600?x.flash.k:null;
    main.append(el("div",{class:"esc-head"},el("p",{class:"eyebrow",text:R.emoji+" "+R.name+" · lock "+(x.idx+1)+" of "+R.puzzles.length}),progress(p)),
      el("div",{class:"esc-card"+(fl==="wrong"?" shake-it":fl==="open"?" card-in":"")},el("small",{text:typeLabel(pz.type)}),el("b",{text:pz.title}),el("p",{text:pz.scene}),lockFace(pz)));
    if(p.hints.length)main.append(el("div",{class:"panel esc-hints"},el("h3",{text:"Hints"}),...p.hints.map(t=>el("p",{text:"💡 "+t}))));
    main.append(el("div",{class:"row"},
      el("button",{class:"btn-felt",text:p.hintsLeft?"Get a hint"+(x.hintCost?" (−"+K.fmt(x.hintCost)+")":""):"No more hints",disabled:p.hintsLeft?null:"",onclick:hint}),
      el("button",{class:"btn-chalk btn-small",text:"Skip this lock (−2:00)",onclick:skip})));
    side.append(el("div",{class:"panel esc-time"},el("h3",{text:"Time left"}),el("div",{class:"timer",id:"escTimer",text:K.fmt(Math.max(0,(x.endsAt-Date.now())/1000))})));
    const ul=el("ul",{class:"turn-log"});x.tries.slice().reverse().forEach(t=>ul.append(el("li",{class:"k-buzz"},el("span",{text:t.a}),el("b",{text:"✗ "+n(t.by)}))));
    if(x.tries.length)side.append(el("div",{class:"panel"},el("h3",{text:"Wrong tries"}),ul));
    return;
  }
  if(h.phase==="result"){
    main.append(el("p",{class:"verdict "+(x.won?"win":"lose"),text:x.won?"You're out! 🔓 Escaped with "+K.fmt(x.left)+" left!":"⏰ Time's up! You're still locked in."}),
      el("p",{class:"reveal-line",text:x.won?R.name+": "+R.puzzles.length+" locks cracked, "+x.solved.filter(s=>s.skipped).length+" skipped.":"You opened "+x.idx+" of "+R.puzzles.length+" locks. Try again!"}),progress(p));
    const ul=el("ul",{class:"turn-log"});x.solved.forEach(s=>{const pz=R.puzzles[s.idx];ul.append(el("li",{class:s.skipped?"k-skip":"k-got"},el("span",{text:pz.title+": "+pz.answer}),el("b",{text:s.skipped?"skipped":"cracked by "+n(s.by)})))});
    if(x.solved.length)main.append(el("div",{class:"panel"},el("h3",{text:"The locks"}),ul));
    const sb=K.scoreboard();sb.append(el("p",{class:"sub",style:"font-size:.82rem",text:"Escape: +3 each. Escape with half the time left: +1 more."}));main.append(sb);K.resultFooter(main);
  }
}

/* ---------- phones ---------- */
let entry="",entryKey=null,typing=false;
function renderPlayer(v,s){
  const x=s.ext,el=K.el;if(!x)return;const rn=pid=>K.rosterName(s,pid);
  const card=K.card();
  if(!card){if(K.cardErr())v.append(el("div",{class:"panel"},el("p",{class:"status err",text:K.cardErr()}),el("button",{class:"btn-felt",text:"Try again",onclick:K.retryCard})));else v.append(el("p",{class:"status on-felt",text:"Getting your clues…"}));return}
  const R=ROOMS[card.room];
  if(s.phase==="intro"){
    v.append(el("p",{class:"big-msg",text:R.emoji+" "+R.name}),el("p",{class:"sub",text:R.story}),
      el("p",{class:"status on-felt",text:"Your phone will get secret clues nobody else has. Read them out loud to your team!"}),
      el("button",{class:"btn-big",text:"We're ready. Start the clock",onclick:()=>{K.act("start",{});K.FX.play("whoosh")}}));return;
  }
  if(s.phase==="result"){v.append(el("p",{class:"verdict "+(x.won?"win":"lose"),text:x.won?"You escaped! 🔓":"Time's up! ⏰"}),K.myScore(s));return}
  const pz=R.puzzles[x.idx];const key=s.round+":"+x.idx;if(entryKey!==key){entryKey=key;entry=""}
  const t=el("div",{class:"timer"});const upd=()=>{const left=(x.endsAt-Date.now())/1000;t.textContent=left>0?K.fmt(left):"0:00";t.classList.toggle("hurry",left>0&&left<=30)};upd();
  const iv=setInterval(()=>{if(!t.isConnected)return clearInterval(iv);upd()},500);
  v.append(el("div",{class:"panel taboo-top"},t,progress(x)),
    el("div",{class:"esc-card sm"},el("small",{text:"Lock "+(x.idx+1)+" · "+typeLabel(pz.type)}),el("b",{text:pz.title}),el("p",{text:pz.scene})));
  const mine=card.clues[x.idx]||[];
  v.append(el("div",{class:"esc-clue"},el("small",{text:"🤫 Your secret clue"+(mine.length>1?"s":"")}),...mine.map(c=>el("p",{text:c}))));
  if(x.hints.length)v.append(el("div",{class:"panel esc-hints"},...x.hints.map(h=>el("p",{text:"💡 "+h}))));
  const send=()=>{if(!entry)return;K.act("try",{answer:entry,idx:x.idx});K.FX.vibrate(15);entry="";K.renderPlayer()};
  const disp=el("div",{class:"esc-entry"+(pz.type==="colors"?" colors":"")});
  if(pz.type==="colors"){[...entry].forEach(ch=>disp.append(el("span",{style:"--cc:"+COLORS[ch].hex})));for(let i=entry.length;i<pz.len;i++)disp.append(el("span",{class:"empty"}))}
  else disp.textContent=entry||(pz.type==="digits"?"·".repeat(pz.len):"Type the word");
  v.append(disp);
  const add=ch=>{if(pz.len&&entry.length>=pz.len)return;entry+=ch;K.FX.play("tap");if(pz.len&&entry.length===pz.len&&pz.type!=="word"){send();return}K.renderPlayer()};
  if(pz.type==="digits"){
    const pad=el("div",{class:"keypad"});["1","2","3","4","5","6","7","8","9","⌫","0","✓"].forEach(k=>pad.append(el("button",{type:"button",text:k,onclick:()=>{if(k==="⌫"){entry=entry.slice(0,-1);K.renderPlayer()}else if(k==="✓")send();else add(k)}})));
    v.append(pad);
  }else if(pz.type==="colors"){
    const pad=el("div",{class:"keypad colors"});Object.keys(COLORS).forEach(k=>pad.append(el("button",{type:"button",style:"--cc:"+COLORS[k].hex,text:COLORS[k].name,onclick:()=>add(k)})));
    pad.append(el("button",{type:"button",class:"wide",text:"⌫ Undo",onclick:()=>{entry=entry.slice(0,-1);K.renderPlayer()}}));v.append(pad);
  }else{
    const inp=el("input",{type:"text",maxlength:"20",autocomplete:"off",autocapitalize:"characters",placeholder:"Type the word","aria-label":"Answer",value:entry});
    inp.oninput=()=>{entry=inp.value};inp.onfocus=()=>{typing=true};inp.onblur=()=>{setTimeout(()=>{if(document.activeElement!==inp)typing=false},50)};
    if(typing)setTimeout(()=>{inp.focus();inp.setSelectionRange(inp.value.length,inp.value.length)},0);
    v.append(el("form",{class:"try-form",onsubmit:e=>{e.preventDefault();entry=inp.value;send()}},inp,el("button",{type:"submit",text:"Try it"})));
  }
  if(x.tries.length){const last=x.tries[x.tries.length-1];v.append(el("p",{class:"status on-felt err",text:"✗ "+last.a+" didn't work ("+rn(last.by)+")"}))}
  if(x.hintsLeft)v.append(el("button",{class:"btn-chalk btn-small",text:"Ask for a hint"+(x.hintCost?" (−"+K.fmt(x.hintCost)+")":""),onclick:()=>K.act("hint",{})}));
}

window.GN_PLUGINS=window.GN_PLUGINS||{};
window.GN_PLUGINS[ID]={
  config:{name:"Locked In",min:2,local:false,seg:null,timer:0,timerLabel:"",
    sub:{host:"Open a room. Everyone's phone gets different secret clues."},
    rules:["Locked In: brain rot for focused. You'll need to be.","The whole family is on one team, racing the clock to crack 5 locks.","Every phone gets DIFFERENT secret clues for each lock. Read yours out loud and put the pieces together.","Type the code on any phone. Wrong tries are free; hints and skips cost time.","Escape: +3 each. Escape with half the time left: +1 more."]},
  defaults:{room:"next",time:1200,hint:60},
  startPhase:"intro",cardPhases:["intro","solve","result"],
  init(core){K=core;setInterval(tick,250)},
  cfgRows,deal,pub,onAct,renderHost,renderPlayer,
  scene(phase){
    const x=K&&K.H?pub():(K&&K.P&&K.P.state&&K.P.state.ext);if(!x)return null;const R=ROOMS[x.room];
    if(phase==="intro")return [R.emoji+" "+R.name,"Locked In"];
    if(phase==="solve")return ["Clock's running!","Locked In"];
    if(phase==="result")return [x.won?"You're out!":"Time's up!","Locked In"];
    return null;
  },
  music(ph){return ph==="solve"?["tense",0.14]:ph==="result"?["party",0.33]:["deal",0.25]}
};
})();
