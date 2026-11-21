/* Switch Up (working name; id "ladder"): word ladder race.
   Go from the START word to the GOAL word by changing one letter at a time. Every step has to be a real word.
   SHOE → SHOP → SHIP → CHIP → CHIN → COIN → CORN → WORN → WORK → FORK.
   Everyone races on their phone (or Team Red vs. Team Green share one ladder). The TV shows the start, the goal,
   the clock and how close everyone is, without giving away their words. Fewest steps gets a bonus. */
(function(){
"use strict";
const ID="ladder";
const D=window.GN_LADDER||{words:{},puzzles:{}};
const DICT={};Object.keys(D.words).forEach(n=>{DICT[n]=new Set(D.words[n].split(" "))});
const PUZ={};Object.keys(D.puzzles).forEach(n=>{PUZ[n]=D.puzzles[n].map(s=>s.split(" "))});
let K=null;
const X=()=>K.H&&K.H.ext;
const UP=s=>String(s||"").toUpperCase();
const diff=(a,b)=>{let d=0;for(let i=0;i<a.length;i++)if(a[i]!==b[i])d++;return d};
const isWord=w=>!!(DICT[w.length]&&DICT[w.length].has(w));
const match=(w,goal)=>{let m=0;for(let i=0;i<w.length;i++)if(w[i]===goal[i])m++;return m};
/* Why a word can't go next (null = it can). */
function why(word,ladder){
  const last=ladder[ladder.length-1];word=String(word||"").toLowerCase();
  if(word.length!==last.length)return "Use "+last.length+" letters.";
  const d=diff(word,last);if(d===0)return "That's the same word.";if(d>1)return "Change just ONE letter.";
  if(ladder.includes(word))return "You already used "+UP(word)+".";
  if(!isWord(word))return UP(word)+" isn't in our dictionary.";
  return null;
}
const TEAMS={A:{name:"Team Red",cls:"t-red"},B:{name:"Team Green",cls:"t-green"}};

function cfgRows(box,c,set,segRow){
  box.append(segRow("Word length",[[3,"3 letters"],[4,"4 letters"],[5,"5 letters"],[0,"Mix"]],c.len,set("len"),"3 is easiest for little ones. 5 is tough!"));
  box.append(segRow("Ladders per game",[[1,"1"],[3,"3"],[5,"5"]],c.count,set("count")));
  box.append(segRow("Time per ladder",[[120,"2 min"],[180,"3 min"],[300,"5 min"]],c.time,set("time")));
  box.append(segRow("Play as",[["solo","Everyone for themselves"],["teams","Two teams"]],c.mode,set("mode"),"Teams share one ladder, and anyone on the team can add the next word (needs 4+ players)."));
}

/* ---------- TV ---------- */
function pickPuzzles(c){
  /* SHOE → FORK (from the video) comes first the first time 4-letter words come up; after that, puzzles don't repeat until all are used. */
  const used=K.H.ladderUsed=K.H.ladderUsed||[];const out=[];
  for(let i=0;i<(c.count||3);i++){
    const n=String(c.len||[3,4,5][i%3]);let pool=PUZ[n].filter(p=>!used.includes(p.join(" ")));
    if(!pool.length){K.H.ladderUsed=used.filter(k=>k.split(" ")[0].length!==Number(n));pool=PUZ[n].slice()}
    const shoe=pool.find(p=>p[0]==="shoe");const p=shoe||pool[K.rnd(pool.length)];
    used.push(p.join(" "));out.push(p);
  }
  return out;
}
async function deal(ids){
  const c=K.cfg(ID);const teams=c.mode==="teams"&&ids.length>=4;
  const units={};
  if(teams){const sh=K.shuffle(ids);["A","B"].forEach(t=>units[t]={name:TEAMS[t].name,cls:TEAMS[t].cls,members:sh.filter((_,i)=>(i%2?"B":"A")===t)})}
  else ids.forEach(id=>units[id]={name:K.nameOf(id),members:[id]});
  const cards={};ids.forEach(id=>cards[id]={on:true});
  const r=await K.api({action:"dealCards",code:K.H.code,hostToken:K.H.hostToken,game:ID,cards});
  K.H.round=r.round;
  K.H.ext={teams,units,puzzles:pickPuzzles(c),idx:-1,time:c.time||180,history:[],score:{}};
  Object.keys(units).forEach(u=>K.H.ext.score[u]=0);
  startLadder();
}
function startLadder(){
  const x=X();x.idx++;const p=x.puzzles[x.idx];
  x.start=p[0];x.goal=p[p.length-1];x.best=p;x.hints=0;x.finish=[];
  Object.values(x.units).forEach(u=>{u.ladder=[x.start];u.doneAt=0});
  x.startsAt=Date.now()+3500;x.endsAt=x.startsAt+x.time*1000;x.lastSec=null;x.cd=null;
  K.setPhase("climb");
}
const unitOf=(x,pid)=>Object.keys(x.units).find(k=>x.units[k].members.includes(pid));
function onAct(p){
  const x=X();if(!x||K.H.phase!=="climb"||p.idx!==x.idx||Date.now()<x.startsAt)return;
  const uid=unitOf(x,p.pid);if(!uid)return;const u=x.units[uid];if(u.doneAt)return;
  if(p.type==="undo"){if(u.ladder.length>1){u.ladder.pop();K.FX.play("swoosh");K.broadcast();K.renderHost()}return}
  if(p.type==="add"){
    const w=String(p.word||"").toLowerCase();if(why(w,u.ladder))return;
    if(p.after!=null&&p.after!==u.ladder.length)return;   // stale tap from a teammate
    u.ladder.push(w);
    if(w===x.goal){
      u.doneAt=Date.now();x.finish.push(uid);
      K.FX.play("solve");K.FX.confetti(70);K.ANN.line(x.finish.length===1?"first":"correct");
      if(Object.values(x.units).every(v=>v.doneAt))setTimeout(()=>{if(K.H&&K.H.phase==="climb"&&X()===x)endLadder()},1500);
    }else K.FX.play(match(w,x.goal)>match(u.ladder[u.ladder.length-2],x.goal)?"accept":"pop");
    K.broadcast();K.renderHost();
  }
}
function endLadder(){
  const x=X();if(K.H.phase!=="climb")return;
  const pts={};x.finish.forEach((uid,i)=>pts[uid]=i===0?3:i===1?2:1);
  const steps=x.finish.map(uid=>x.units[uid].ladder.length-1);const fewest=steps.length?Math.min(...steps):0;
  const fewestUnits=x.finish.filter(uid=>x.units[uid].ladder.length-1===fewest);
  fewestUnits.forEach(uid=>pts[uid]=(pts[uid]||0)+1);
  const rp={};Object.entries(pts).forEach(([uid,n])=>{x.score[uid]+=n;x.units[uid].members.forEach(m=>rp[m]=(rp[m]||0)+n)});
  K.addScores(rp);
  x.history.push({start:x.start,goal:x.goal,best:x.best,pts,fewest,fewestUnits,ladders:Object.fromEntries(Object.entries(x.units).map(([k,u])=>[k,u.ladder.slice()])),finish:x.finish.slice()});
  x.endsAt=0;K.setPhase("reveal");
  if(x.finish.length){if(!K.Music.sting("win"))K.FX.play("win")}else K.FX.play("lose");
}
function next(){
  const x=X();if(K.H.phase!=="reveal")return;
  if(x.idx>=x.puzzles.length-1){
    const best=Math.max(...Object.values(x.score));const champs=Object.keys(x.score).filter(u=>x.score[u]===best&&best>0);
    x.champs=champs;const rp={};champs.forEach(u=>x.units[u].members.forEach(m=>rp[m]=2));K.addScores(rp);
    K.H.reveal={rp};K.setPhase("result");return;
  }
  startLadder();
}
function tick(){
  const h=K&&K.H;if(!h||h.game!==ID||h.phase!=="climb")return;const x=h.ext;if(!x)return;const now=Date.now();
  if(now<x.startsAt){const s=Math.ceil((x.startsAt-now)/1000);if(s!==x.cd){x.cd=s;if(K.mode==="host"&&s<=3)K.ANN.count(s)}return}
  if(x.cd!==0){x.cd=0;if(K.mode==="host"){K.ANN.say("go");K.FX.play("whoosh")}K.renderHost();K.broadcast()}
  const left=(x.endsAt-now)/1000;const el=document.getElementById("ladTimer");
  if(el){el.textContent=K.fmt(Math.max(0,left));el.classList.toggle("hurry",left>0&&left<=15)}
  const sec=Math.ceil(left);
  if(sec!==x.lastSec){x.lastSec=sec;if(K.mode==="host"){if(sec===30)K.ANN.line("hurry");else if(sec>0&&sec<=3)K.ANN.count(sec);else if(sec>0&&sec<=10)K.FX.play("tick")}}
  if(left<=0){if(K.mode==="host"){K.FX.play("buzzer");K.ANN.line("timeout")}endLadder()}
}
function pub(){
  const x=X();if(!x)return null;
  return {teams:x.teams,units:Object.fromEntries(Object.entries(x.units).map(([k,u])=>[k,{name:u.name,cls:u.cls||null,members:u.members,ladder:u.ladder,doneAt:u.doneAt}])),
    idx:x.idx,count:x.puzzles.length,start:x.start,goal:x.goal,startsAt:x.startsAt,endsAt:x.endsAt,snap:Date.now(),
    hints:x.best?x.best.slice(1,1+x.hints):[],canHint:x.best?x.hints<x.best.length-2:false,bestLen:x.best?x.best.length-1:0,
    finish:x.finish,score:x.score,last:x.history[x.history.length-1]||null,champs:x.champs||null};
}

/* ---------- drawing ---------- */
function tiles(word,goal,opts){
  opts=opts||{};const el=K.el;const box=el("div",{class:"lad-tiles"+(opts.big?" big":"")+(opts.cls?" "+opts.cls:"")});
  UP(word).split("").forEach((ch,i)=>{
    const hit=goal&&word[i]===goal[i];
    box.append(el(opts.pick?"button":"span",{type:opts.pick?"button":null,class:"lt"+(hit?" hit":"")+(opts.sel===i?" sel":""),text:ch,onclick:opts.pick?()=>opts.pick(i):null}));
  });
  return box;
}
function ladderView(ladder,goal,opts){
  opts=opts||{};const el=K.el;const box=el("ol",{class:"lad-rungs"+(opts.small?" small":"")});
  ladder.forEach((w,i)=>box.append(el("li",{class:(i===0?"first":"")+(w===goal?" goal":"")},el("small",{text:i===0?(opts.small?"GO":"START"):String(i)}),tiles(w,goal))));
  return box;
}
function meter(u,goal){
  const el=K.el;const cur=u.ladder[u.ladder.length-1];const m=match(cur,goal);
  const bar=el("div",{class:"lad-meter"});for(let i=0;i<goal.length;i++)bar.append(el("i",{class:i<m?"on":""}));
  return bar;
}

/* ---------- TV screens ---------- */
function renderHost(main,side){
  const h=K.H,x=X(),el=K.el;if(!x)return;const p=pub();
  if(h.phase==="climb"){
    const now=Date.now();const counting=now<x.startsAt;
    main.append(el("p",{class:"eyebrow",text:"Switch Up · ladder "+(x.idx+1)+" of "+x.puzzles.length+" · change one letter at a time"}),
      el("div",{class:"lad-goal"},el("div",null,el("small",{text:"Start"}),tiles(x.start,x.goal,{big:true})),el("span",{class:"lad-arrow",text:"→"}),el("div",null,el("small",{text:"Goal"}),tiles(x.goal,null,{big:true,cls:"goal"}))));
    if(counting){main.append(el("div",{class:"duel-count",text:String(Math.ceil((x.startsAt-now)/1000))}));setTimeout(()=>{if(K.H&&K.H.phase==="climb")K.renderHost()},Math.min(1000,x.startsAt-now+20));}
    else main.append(el("div",{class:"timer",id:"ladTimer",text:K.fmt(Math.max(0,(x.endsAt-now)/1000))}));
    if(p.hints.length)main.append(el("div",{class:"lad-hints"},el("small",{text:"Hint"+(p.hints.length>1?"s":"")}),...p.hints.map(w=>tiles(w,x.goal))));
    main.append(el("div",{class:"row"},el("button",{class:"btn-felt",text:p.canHint?"Show a hint":"No more hints",disabled:p.canHint?null:"",onclick:()=>{x.hints++;K.FX.play("pop");K.broadcast();K.renderHost()}}),
      el("button",{class:"btn-chalk btn-small",text:"End this ladder",onclick:endLadder})));
    const list=el("div",{class:"lad-race"});
    Object.entries(x.units).sort((a,b)=>(a[1].doneAt||9e15)-(b[1].doneAt||9e15)||match(b[1].ladder[b[1].ladder.length-1],x.goal)-match(a[1].ladder[a[1].ladder.length-1],x.goal)).forEach(([uid,u])=>{
      const place=x.finish.indexOf(uid);
      list.append(el("div",{class:"lad-lane"+(u.doneAt?" done":"")+(u.cls?" "+u.cls:"")},el("b",{text:u.name}),
        u.doneAt?el("span",{class:"lad-done",text:(place===0?"🥇 ":place===1?"🥈 ":place===2?"🥉 ":"✓ ")+(u.ladder.length-1)+" steps"}):el("span",{class:"lad-steps",text:(u.ladder.length-1)+(u.ladder.length===2?" step":" steps")}),
        meter(u,x.goal)));
    });
    side.append(el("div",{class:"panel"},el("h3",{text:"The race · gold = letters that match the goal"}),list));
    return;
  }
  if(h.phase==="reveal"){
    const L=x.history[x.history.length-1];
    main.append(el("p",{class:"eyebrow",text:"Ladder "+(x.idx+1)+" of "+x.puzzles.length}),
      el("p",{class:"verdict "+(L.finish.length?"win":"lose"),text:L.finish.length?x.units[L.finish[0]].name+" got there first!":"Nobody made it this time!"}),
      el("p",{class:"reveal-line",text:"Shortest we know: "+(L.best.length-1)+" steps"+(L.fewest?". Best tonight: "+L.fewest+" steps.":".")}));
    const best=el("div",{class:"panel"},el("h3",{text:"The shortest ladder"}),el("div",{class:"lad-chain"},...L.best.map((w,i)=>el("span",{class:i===L.best.length-1?"goal":"",text:UP(w)}))));
    main.append(best);
    const cols=el("div",{class:"lad-cols"});
    Object.entries(x.units).forEach(([uid,u])=>{const lad=L.ladders[uid];cols.append(el("div",{class:"lad-col"+(u.cls?" "+u.cls:"")},el("b",{text:u.name+(L.pts[uid]?" +"+L.pts[uid]:"")}),ladderView(lad,L.goal,{small:true})))});
    side.append(el("div",{class:"panel"},el("h3",{text:"Everyone's ladders"}),cols));
    main.append(el("button",{class:"btn-big",text:x.idx>=x.puzzles.length-1?"See who won":"Next ladder",onclick:next}));
    return;
  }
  if(h.phase==="result"){
    const names=(x.champs||[]).map(u=>x.units[u].name);
    main.append(el("p",{class:"verdict win",text:names.length?"🏆 "+names.join(" & ")+(names.length>1?" tie!":" wins Switch Up!"):"Good climbing, everybody!"}));
    const ul=el("ul",{class:"turn-log"});Object.entries(x.score).sort((a,b)=>b[1]-a[1]).forEach(([u,s])=>ul.append(el("li",{class:"k-got"},el("span",{text:x.units[u].name}),el("b",{text:s+" pts"}))));
    main.append(el("div",{class:"panel"},el("h3",{text:"Ladder points"}),ul));
    const sb=K.scoreboard();sb.append(el("p",{class:"sub",style:"font-size:.82rem",text:"Each ladder: 1st to finish +3, 2nd +2, everyone else who finishes +1, fewest steps +1. Game winner +2."}));main.append(sb);K.resultFooter(main);
  }
}

/* ---------- phones ---------- */
let sel=null,msg="",msgBad=false,lastKey=null,snapSeen={};
function tvNow(x){if(!x||!x.snap)return Date.now();if(!(x.snap in snapSeen))snapSeen={[x.snap]:Date.now()};return x.snap+(Date.now()-snapSeen[x.snap])}
function renderPlayer(v,s){
  const x=s.ext,el=K.el,P=K.P;if(!x)return;const me=P.pid;
  const uid=Object.keys(x.units).find(k=>x.units[k].members.includes(me));const u=uid&&x.units[uid];
  if(s.phase==="result"){const won=(x.champs||[]).includes(uid);v.append(el("p",{class:"verdict "+(won?"win":"lose"),text:won?"🏆 You win Switch Up!":"Good climbing!"}),K.myScore(s));return}
  if(!u){v.append(el("p",{class:"sub",text:"You're watching this one."}));return}
  if(x.teams)v.append(el("div",{class:"team-pill "+u.cls},el("span",{text:"You're on "+u.name}),el("b",{text:"Climb together!"})));
  v.append(el("div",{class:"lad-goal sm"},tiles(x.start,x.goal),el("span",{class:"lad-arrow",text:"→"}),tiles(x.goal,null,{cls:"goal"})));
  if(s.phase==="reveal"){
    const L=x.last;const pts=L&&L.pts[uid]||0;
    v.append(el("p",{class:"verdict "+(pts?"win":"lose"),text:pts?"+"+pts+" points!":u.doneAt?"You made it!":"Time's up!"}),
      el("div",{class:"panel"},el("h3",{text:"Shortest we know · "+(L.best.length-1)+" steps"}),el("div",{class:"lad-chain"},...L.best.map((w,i)=>el("span",{class:i===L.best.length-1?"goal":"",text:UP(w)})))),
      el("div",{class:"panel"},el("h3",{text:x.teams?"Your team's ladder":"Your ladder"}),ladderView(L.ladders[uid],L.goal,{small:true})));return;
  }
  /* climbing */
  const now=tvNow(x);
  const key=s.round+":"+x.idx+":"+u.ladder.length;if(lastKey!==key){if(lastKey&&lastKey.split(":")[1]!==String(x.idx)){msg=""}lastKey=key;sel=null}
  if(now<x.startsAt){v.append(el("div",{class:"duel-count sm",text:String(Math.ceil((x.startsAt-now)/1000))}),el("p",{class:"sub",text:"Change one letter at a time. Every step has to be a real word."}));
    setTimeout(()=>{if(K.P&&K.P.state===s)K.renderPlayer()},Math.max(80,Math.min(1000,x.startsAt-now+40)));return}
  const t=el("div",{class:"timer"});const upd=()=>{const l=(x.endsAt-tvNow(x))/1000;t.textContent=l>0?K.fmt(l):"0:00";t.classList.toggle("hurry",l>0&&l<=15)};upd();
  const iv=setInterval(()=>{if(!t.isConnected)return clearInterval(iv);upd()},400);
  v.append(el("div",{class:"panel taboo-top"},t,el("span",{class:"got-mini",text:(u.ladder.length-1)+(u.ladder.length===2?" step":" steps")})));
  if(x.hints.length)v.append(el("div",{class:"lad-hints sm"},el("small",{text:"Hint"}),...x.hints.map(w=>tiles(w,x.goal))));
  if(u.doneAt){
    const place=x.finish.indexOf(uid);
    v.append(el("p",{class:"verdict win",text:(place===0?"🥇 First!":place===1?"🥈 Second!":place===2?"🥉 Third!":"✓ Made it!")+" "+(u.ladder.length-1)+" steps"}),ladderView(u.ladder,x.goal,{small:true}));return;
  }
  const cur=u.ladder[u.ladder.length-1];
  v.append(ladderView(u.ladder.slice(-4).length<u.ladder.length?u.ladder.slice(-4):u.ladder,x.goal,{small:true}));
  v.append(el("p",{class:"sub",style:"margin:0",text:sel==null?"Tap the letter you want to change.":"Now pick the new letter."}),
    tiles(cur,x.goal,{big:true,sel,pick:i=>{sel=sel===i?null:i;msg="";K.FX.play("tap");K.renderPlayer()}}));
  if(msg)v.append(el("p",{class:"status on-felt"+(msgBad?" err":""),text:msg}));
  if(sel!=null){
    const kb=el("div",{class:"lad-keys"});
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").forEach(L=>{const l=L.toLowerCase();const w=cur.slice(0,sel)+l+cur.slice(sel+1);
      kb.append(el("button",{type:"button",class:l===cur[sel]?"same":"",disabled:l===cur[sel]?"":null,text:L,onclick:()=>{
        const bad=why(w,u.ladder);
        if(bad){msg=bad;msgBad=true;K.FX.play("reject");K.FX.vibrate(40);K.renderPlayer();return}
        K.act("add",{word:w,idx:x.idx,after:u.ladder.length});msg=UP(w)+" ✓";msgBad=false;sel=null;K.FX.vibrate(15);K.FX.play("accept");K.renderPlayer();
      }}))});
    v.append(kb);
  }
  if(u.ladder.length>1)v.append(el("button",{class:"btn-chalk btn-small",text:"↶ Undo "+UP(cur),onclick:()=>{K.act("undo",{idx:x.idx});msg="";sel=null}}));
}

window.GN_PLUGINS=window.GN_PLUGINS||{};
window.GN_PLUGINS[ID]={
  config:{name:"Switch Up",min:2,local:false,seg:null,timer:0,timerLabel:"",
    sub:{host:"Open a room. Everyone climbs the ladder on their own phone."},
    rules:["Get from the START word to the GOAL word by changing ONE letter at a time.","Every step has to be a real word: SHOE → SHOP → SHIP → CHIP … → FORK.","On your phone, tap a letter, then tap the new letter. Undo if you get stuck.","The TV shows how close everyone is (gold = letters that already match the goal), but never your words. Hints are on the TV.","Each ladder: 1st to finish +3, 2nd +2, everyone else who finishes +1, and the fewest steps gets +1 more."]},
  defaults:{len:4,count:3,time:180,mode:"solo"},
  startPhase:"climb",cardPhases:["climb","reveal","result"],
  init(core){K=core;setInterval(tick,200);window.__ladderHost=()=>K.H},
  cfgRows,deal,pub,onAct,renderHost,renderPlayer,
  scene(phase){
    const x=K&&K.H?pub():(K&&K.P&&K.P.state&&K.P.state.ext);if(!x)return null;
    if(phase==="climb")return [UP(x.start)+" → "+UP(x.goal),"Ladder "+(x.idx+1)+" of "+x.count];
    if(phase==="reveal")return ["Time to compare","Switch Up"];
    if(phase==="result")return ["🏆 Final","Switch Up"];
    return null;
  },
  music(ph){return ph==="climb"?["lobby",0.14]:ph==="reveal"||ph==="result"?["party",0.3]:["deal",0.25]}
};
})();
