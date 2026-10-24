/* Man Gone (id "mafia"): Mafia-style social deduction, kid friendly.
   Secret roles on phones: the Opps (snatch one player each night), Big Mama (keeps one player safe),
   the Nosy Neighbor (peeks in one window to see if they're an Opp), and the Family.
   Everyone taps their phone at night, so nobody can tell who's who. Days are talk + vote. */
(function(){
"use strict";
const ID="mafia";
const ROLES={
  opp:{name:"Opp",title:"You're an Opp",tip:"Each night, you and the other Opps snatch one player. In the day, blend in with the Family.",cls:"r-opp"},
  mama:{name:"Big Mama",title:"You're Big Mama",tip:"Each night, pick one person to keep safe. You can't pick the same person two nights in a row.",cls:"r-mama"},
  nosy:{name:"Nosy Neighbor",title:"You're the Nosy Neighbor",tip:"Each night, peek in one window. Your phone tells you if they're an Opp.",cls:"r-nosy"},
  fam:{name:"Family",title:"You're Family",tip:"Find the Opps and vote them out before they snatch everybody.",cls:"r-fam"}
};
let K=null;
const X=()=>K.H&&K.H.ext;

function cfgRows(box,c,set,segRow){
  box.append(segRow("Opps",[[0,"Auto"],[1,"1"],[2,"2"],[3,"3"]],c.opps,set("opps"),"Auto: 1 Opp for up to 6 players, 2 for up to 10, then 3."));
  box.append(segRow("Big Mama",[[true,"On"],[false,"Off"]],c.mama,set("mama")));
  box.append(segRow("Nosy Neighbor",[[true,"On"],[false,"Off"]],c.nosy,set("nosy")));
  box.append(segRow("Daytime talk",[[60,"1 min"],[120,"2 min"],[180,"3 min"],[300,"5 min"]],c.day,set("day"),"Then everyone votes on their phone."));
}

/* ---------- TV ---------- */
async function deal(ids){
  const c=K.cfg(ID);const n=ids.length;
  const nOpp=c.opps||(n<=6?1:n<=10?2:3);
  const sh=K.shuffle(ids);const roles={};
  sh.forEach((id,i)=>{roles[id]=i<nOpp?"opp":"fam"});
  let k=nOpp;if(c.mama&&n-k>=3)roles[sh[k++]]="mama";if(c.nosy&&n-k>=3)roles[sh[k++]]="nosy";
  const opps=ids.filter(id=>roles[id]==="opp");
  const cards={};ids.forEach(id=>{cards[id]={role:roles[id],v:0,team:roles[id]==="opp"?opps.filter(o=>o!==id).map(o=>K.nameOf(o)):[],teamIds:roles[id]==="opp"?opps.filter(o=>o!==id):[],checks:[]}});
  const r=await K.api({action:"dealCards",code:K.H.code,hostToken:K.H.hostToken,game:ID,cards});
  K.H.round=r.round;
  K.H.ext={roles,alive:ids.slice(),night:0,ready:{},acts:{},lastSave:null,checks:{},cv:0,story:"",votes:{},voted:null,endsAt:0,lastSec:null,winner:null,outs:[]};
}
const aliveOpps=x=>x.alive.filter(id=>x.roles[id]==="opp");
function winner(x){const o=aliveOpps(x).length;if(!o)return "fam";if(o>=x.alive.length-o)return "opp";return null}
function startNight(){const x=X();x.night++;x.acts={};x.story="";K.setPhase("night");K.FX.play("whoosh")}
async function resolveNight(){
  const x=X();if(!x||K.H.phase!=="night"||x.resolving)return;x.resolving=true;
  try{
    const tally={};Object.entries(x.acts).forEach(([id,a])=>{if(x.roles[id]==="opp"&&x.alive.includes(id)&&a)tally[a]=(tally[a]||0)+1});
    const max=Math.max(0,...Object.values(tally));const top=Object.keys(tally).filter(k=>tally[k]===max);
    const target=top.length?top[K.rnd(top.length)]:null;
    const mamaId=x.alive.find(id=>x.roles[id]==="mama");const save=mamaId?x.acts[mamaId]:null;x.lastSave=save||null;
    const nosyId=x.alive.find(id=>x.roles[id]==="nosy");
    if(nosyId&&x.acts[nosyId]){
      const t=x.acts[nosyId];(x.checks[nosyId]=x.checks[nosyId]||[]).push({name:K.nameOf(t),opp:x.roles[t]==="opp",night:x.night});x.cv++;
      try{await K.setCards({[nosyId]:{role:"nosy",v:x.cv,team:[],teamIds:[],checks:x.checks[nosyId]}})}catch(e){}
    }
    if(target&&target!==save){x.alive=x.alive.filter(id=>id!==target);x.outs.push({pid:target,how:"night",night:x.night});x.story=K.nameOf(target)+" got snatched by the Opps last night!";x.lastOut=target}
    else if(target&&target===save){x.story="The Opps came for somebody, but Big Mama said “not in my house!” Nobody's out.";x.lastOut=null}
    else{x.story="A quiet night. Nobody got snatched.";x.lastOut=null}
    const w=winner(x);if(w)return finish(w);
    K.setPhase("dawn");K.FX.play(x.lastOut?"lose":"win");
  }finally{x.resolving=false}
}
function startDay(){const x=X();x.endsAt=Date.now()+K.cfg(ID).day*1000+600;x.lastSec=null;K.setPhase("day");K.ANN.say("go")}
function startVote(){const x=X();x.endsAt=0;x.votes={};K.setPhase("vote");K.Music.sting("vote")||K.FX.play("pop")}
function revealVote(){
  const x=X();const c={};Object.values(x.votes).forEach(t=>{c[t]=(c[t]||0)+1});
  const max=Math.max(0,...Object.values(c));const top=Object.keys(c).filter(k=>c[k]===max);
  x.voteTally=c;
  if(max>0&&top.length===1&&top[0]!=="skip"){const id=top[0];x.alive=x.alive.filter(a=>a!==id);x.outs.push({pid:id,how:"vote",night:x.night});x.voted=id}
  else x.voted=null;
  K.setPhase("verdict");K.FX.play("drum",0.8);
  setTimeout(()=>{if(x.voted)K.FX.play(x.roles[x.voted]==="opp"?"win":"lose");else K.FX.play("tie")},900);
}
function afterVerdict(){const x=X();const w=winner(x);if(w)return finish(w);startNight()}
function finish(w){
  const x=X();x.winner=w;const rp={};Object.keys(x.roles).forEach(id=>{if((x.roles[id]==="opp")===(w==="opp"))rp[id]=3});
  K.addScores(rp);K.H.reveal={rp,win:w};K.setPhase("result");
}
function onAct(p){
  const x=X();if(!x)return;const ph=K.H.phase;
  if(p.type==="ready"&&ph==="roles"){if(!x.ready[p.pid]){x.ready[p.pid]=1;K.FX.play("pop");K.broadcast();K.renderHost()}return}
  if(!x.alive.includes(p.pid))return;
  if(p.type==="night"&&ph==="night"){
    const role=x.roles[p.pid];let t=p.target==null||p.target==="nobody"?null:String(p.target);
    if(t!=null&&!x.alive.includes(t))return;
    if(role==="opp"&&(t==null||x.roles[t]==="opp"))return;
    if(role==="mama"&&t===x.lastSave)return;
    if(role==="nosy"&&t===p.pid)return;
    const had=p.pid in x.acts;x.acts[p.pid]=t;if(!had)K.FX.play("tick");
    if(x.alive.every(id=>id in x.acts)&&!x.autoT)x.autoT=setTimeout(()=>{x.autoT=0;resolveNight()},1500);
    K.broadcast();K.renderHost();return;
  }
  if(p.type==="vote"&&ph==="vote"){
    const t=String(p.target);if(t!=="skip"&&(!x.alive.includes(t)||t===p.pid))return;
    const had=p.pid in x.votes;x.votes[p.pid]=t;if(!had)K.FX.play("vote");K.broadcast();K.renderHost();
  }
}
function tick(){
  const h=K&&K.H;if(!h||h.game!==ID||h.phase!=="day")return;const x=h.ext;if(!x||!x.endsAt)return;
  const left=(x.endsAt-Date.now())/1000;const el=document.getElementById("oppTimer");
  if(el){el.textContent=K.fmt(Math.max(0,left));el.classList.toggle("hurry",left>0&&left<=10)}
  const sec=Math.ceil(left);
  if(sec!==x.lastSec){x.lastSec=sec;if(K.mode==="host"){if(sec===10)K.ANN.line("hurry");else if(sec>0&&sec<=3)K.ANN.count(sec);else if(sec>0&&sec<10)K.FX.play("tick")}}
  if(left<=0){if(K.mode==="host"){K.FX.play("buzzer");K.ANN.line("timeout")}startVote()}
}
function pub(){
  const x=X();if(!x)return null;const ph=K.H.phase;const done=ph==="result";
  return {alive:x.alive,night:x.night,story:x.story,lastOut:x.lastOut||null,lastSave:x.lastSave,endsAt:x.endsAt,
    nightDone:ph==="night"?Object.keys(x.acts).length:null,ready:Object.keys(x.ready),
    voted:x.voted||null,votedRole:ph==="verdict"&&x.voted?x.roles[x.voted]:null,votesIn:ph==="vote"?Object.keys(x.votes):null,
    tally:ph==="verdict"?x.voteTally:null,winner:x.winner,roles:done?x.roles:null,outs:x.outs.map(o=>o.pid),cv:x.cv};
}

const roleName=r=>ROLES[r].name;
function peopleList(x,el,n){
  const ul=el("ul",{class:"opp-people"});
  K.H.roster.forEach(r=>{const out=!x.alive.includes(r.pid);ul.append(el("li",{class:out?"out":""},el("span",{text:r.name}),el("small",{text:out?"out":"in"})))});
  return ul;
}
function renderHost(main,side){
  const h=K.H,x=X(),el=K.el,n=K.nameOf;if(!x)return;
  const people=()=>el("div",{class:"panel"},el("h3",{text:"Still in · "+x.alive.length}),peopleList(x,el,n));
  if(h.phase==="roles"){
    const c=Object.values(x.roles).reduce((a,r)=>(a[r]=(a[r]||0)+1,a),{});
    main.append(el("p",{class:"eyebrow",text:"Man Gone"}),el("p",{class:"big-msg",text:"Check your phone for your secret role."}),
      el("p",{class:"sub",text:"In this game: "+c.opp+(c.opp>1?" Opps":" Opp")+(c.mama?", Big Mama":"")+(c.nosy?", the Nosy Neighbor":"")+", and "+(c.fam||0)+" Family. Don't let anyone see your phone!"}),
      el("div",{class:"panel"},el("h3",{text:"Seen their role · "+Object.keys(x.ready).length+" of "+h.roster.length}),K.chipsFor(h.roster,r=>x.ready[r.pid])),
      el("button",{class:"btn-big",text:"Start the first night 🌙",onclick:startNight}));
    side.append(K.joinCard());return;
  }
  if(h.phase==="night"){
    const d=Object.keys(x.acts).length;
    main.append(el("p",{class:"eyebrow",text:"Night "+x.night}),el("p",{class:"big-msg",text:"🌙 Everybody, look at your phone."}),
      el("p",{class:"sub",text:"Everyone taps something at night, so nobody can tell who's who. No peeking at other phones!"}),
      el("div",{class:"night-meter"},el("b",{text:d+" of "+x.alive.length}),el("span",{text:"done"})),
      el("button",{class:"btn-chalk btn-small",text:"Wake everyone up now",onclick:resolveNight}));
    side.append(people());return;
  }
  if(h.phase==="dawn"){
    main.append(el("p",{class:"eyebrow",text:"Morning "+x.night}),el("p",{class:"big-msg",text:"☀️ Wake up!"}),el("p",{class:"verdict "+(x.lastOut?"lose":"win"),text:x.story}),
      el("button",{class:"btn-big",text:"Start talking ("+K.fmt(K.cfg(ID).day)+")",onclick:startDay}));
    side.append(people());return;
  }
  if(h.phase==="day"){
    main.append(el("p",{class:"eyebrow",text:"Day "+x.night}),el("p",{class:"big-msg",text:"Who's an Opp? Talk it out."}),
      el("div",{class:"timer",id:"oppTimer",text:K.fmt(Math.max(0,(x.endsAt-Date.now())/1000))}),
      el("button",{class:"btn-big",text:"Vote now",onclick:startVote}),el("button",{class:"btn-chalk btn-small",text:"+30 sec",onclick:()=>{x.endsAt+=30000;x.lastSec=null;K.broadcast()}}));
    side.append(people());return;
  }
  if(h.phase==="vote"){
    const inn=Object.keys(x.votes).length;
    main.append(el("p",{class:"big-msg",text:"Vote on your phone. Who's out?"}),
      el("div",{class:"panel"},el("h3",{text:"Votes in · "+inn+" of "+x.alive.length}),K.chipsFor(h.roster.filter(r=>x.alive.includes(r.pid)),r=>r.pid in x.votes)));
    const b=el("button",{class:"btn-big",text:inn===x.alive.length?"Everyone voted. Reveal!":"Reveal the vote",onclick:revealVote});b.disabled=!inn;main.append(b);
    side.append(people());return;
  }
  if(h.phase==="verdict"){
    const v=x.voted;const isOpp=v&&x.roles[v]==="opp";
    main.append(el("p",{class:"verdict "+(isOpp?"win":"lose"),text:v?n(v)+" is out!":"Nobody's out."}),
      el("p",{class:"reveal-line",text:v?(isOpp?n(v)+" was an Opp! 🎯":n(v)+" was "+(x.roles[v]==="fam"?"Family":roleName(x.roles[v]))+". Oops."):"The vote was split or skipped."}));
    const ul=el("ul",{class:"turn-log"});Object.entries(x.voteTally||{}).sort((a,b)=>b[1]-a[1]).forEach(([t,c])=>ul.append(el("li",null,el("span",{text:t==="skip"?"Skip":n(t)}),el("b",{text:c+(c===1?" vote":" votes")}))));
    side.append(el("div",{class:"panel"},el("h3",{text:"The votes"}),ul),people());
    const w=winner(x);main.append(el("button",{class:"btn-big",text:w?"See who won":"Next night 🌙",onclick:afterVerdict}));return;
  }
  if(h.phase==="result"){
    const w=x.winner;
    main.append(el("p",{class:"verdict "+(w==="fam"?"win":"lose"),text:w==="fam"?"The Family wins! The Opps are gone.":"The Opps win! They took over the house."}));
    const ul=el("ul",{class:"turn-log"});
    h.roster.forEach(r=>ul.append(el("li",{class:x.roles[r.pid]==="opp"?"k-buzz":"k-got"},el("span",{text:r.name+(x.alive.includes(r.pid)?"":" (out)")}),el("b",{text:roleName(x.roles[r.pid])}))));
    main.append(el("div",{class:"panel"},el("h3",{text:"Everyone's role"}),ul));
    const sb=K.scoreboard();sb.append(el("p",{class:"sub",style:"font-size:.82rem",text:"Everyone on the winning side: +3, even if they got snatched or voted out."}));main.append(sb);
    K.resultFooter(main);side.append(K.joinCard());
  }
}

/* ---------- phones ---------- */
let myPick=null,pickKey=null,show=false;
function roleCard(card){
  const R=ROLES[card.role];const el=K.el;
  const box=el("div",{class:"opp-role "+R.cls},el("small",{text:"Your secret role"}),el("b",{text:R.name}),el("p",{text:R.tip}));
  if(card.role==="opp")box.append(el("p",{class:"opp-team",text:card.team.length?"Your fellow Opps: "+card.team.join(", "):"You're the only Opp. Good luck!"}));
  if(card.role==="nosy"&&card.checks&&card.checks.length){const ul=el("ul",{class:"opp-checks"});card.checks.forEach(c=>ul.append(el("li",{text:"Night "+c.night+": "+c.name+(c.opp?" IS an Opp! 🚨":" is not an Opp.")})));box.append(ul)}
  return box;
}
function hideable(card){
  const el=K.el;const wrap=el("div",{class:"opp-hide"});
  const draw=()=>{wrap.textContent="";if(show){wrap.append(roleCard(card),el("button",{class:"btn-chalk btn-small",text:"Hide my role",onclick:()=>{show=false;draw()}}))}
    else wrap.append(el("button",{class:"btn-felt",text:"Show my role (keep it hidden!)",onclick:()=>{show=true;draw();K.FX.play("flip");setTimeout(()=>{show=false;if(wrap.isConnected)draw()},5000)}}))};
  draw();return wrap;
}
function grid(ids,nameFn,cur,onPick,extra){
  const el=K.el;const g=el("div",{class:"vote-grid"});
  ids.forEach(id=>g.append(el("button",{type:"button",text:nameFn(id),"aria-pressed":String(cur===id),onclick:()=>onPick(id)})));
  if(extra)g.append(el("button",{type:"button",text:extra[1],"aria-pressed":String(cur===extra[0]),onclick:()=>onPick(extra[0])}));
  return g;
}
function renderPlayer(v,s){
  const x=s.ext,el=K.el,P=K.P;if(!x)return;const rn=pid=>K.rosterName(s,pid);const me=P.pid;
  const card=K.card();
  if(!card){if(K.cardErr())v.append(el("div",{class:"panel"},el("p",{class:"status err",text:K.cardErr()}),el("button",{class:"btn-felt",text:"Try again",onclick:K.retryCard})));else v.append(el("p",{class:"status on-felt",text:"Getting your role…"}));return}
  if(card.role==="nosy"&&(card.v||0)<(x.cv||0)&&!P.fetching){K.retryCard()}
  const alive=x.alive.includes(me);
  if(s.phase==="result"){
    const won=(card.role==="opp")===(x.winner==="opp");
    v.append(el("p",{class:"verdict "+(won?"win":"lose"),text:won?"Your side wins! +3":x.winner==="opp"?"The Opps win.":"The Family wins."}),roleCard(card),K.myScore(s));return;
  }
  if(s.phase==="roles"){
    v.append(el("p",{class:"big-msg",text:"Your secret role"}),roleCard(card),
      el("button",{class:"btn-big",text:(x.ready||[]).includes(me)?"Got it ✓":"Got it. Hide my role",onclick:()=>{K.act("ready",{});K.FX.play("pop")}}),
      el("p",{class:"sub",text:"Then put your phone face down until night."}));
    return;
  }
  if(!alive){
    v.append(el("p",{class:"big-msg",text:"You're out. 🤐"}),el("p",{class:"sub",text:"Watch quietly. No hints! Your side can still win."}),roleCard(card));
    if(x.story&&s.phase!=="night")v.append(el("p",{class:"status on-felt",text:x.story}));return;
  }
  const key=s.phase+":"+x.night+":"+s.round;if(pickKey!==key){pickKey=key;myPick=null}
  if(s.phase==="night"){
    const others=x.alive.filter(id=>id!==me);
    const send=t=>{myPick=t;K.act("night",{target:t});K.FX.vibrate(15);K.renderPlayer()};
    let head,ids,extra=null;
    if(card.role==="opp"){head="Pick who to snatch tonight.";ids=others.filter(id=>!(card.teamIds||[]).includes(id))}
    else if(card.role==="mama"){head="Who are you keeping safe tonight?";ids=x.alive.filter(id=>id!==x.lastSave)}
    else if(card.role==="nosy"){head="Whose window are you peeking in?";ids=others}
    else{head="Who's acting sus? (Just for fun. It doesn't change anything.)";ids=others;extra=["nobody","Nobody"]}
    v.append(el("p",{class:"eyebrow",text:"Night "+x.night+" · "+ROLES[card.role].name}),el("p",{class:"big-msg",text:head}),grid(ids,rn,myPick,send,extra));
    if(myPick!=null)v.append(el("p",{class:"status on-felt",text:"Done. Put your phone face down. 🤫"}));
    if(card.role==="nosy"&&card.checks&&card.checks.length)v.append(roleCard(card));
    return;
  }
  if(s.phase==="dawn"){v.append(el("p",{class:"big-msg",text:"☀️ Wake up!"}),el("p",{class:"verdict "+(x.lastOut?"lose":"win"),text:x.story}),hideable(card));return}
  if(s.phase==="day"){
    const t=el("div",{class:"timer"});const upd=()=>{const left=(x.endsAt-Date.now())/1000;t.textContent=left>0?K.fmt(left):"Vote!"};upd();const iv=setInterval(()=>{if(!t.isConnected)return clearInterval(iv);upd()},400);
    v.append(el("p",{class:"big-msg",text:"Who's an Opp? Talk it out."}),el("div",{class:"panel"},el("h3",{text:"Time left"}),t),hideable(card));return;
  }
  if(s.phase==="vote"){
    const send=t=>{myPick=t;K.act("vote",{target:t});K.FX.play("vote");K.FX.vibrate(20);K.renderPlayer()};
    v.append(el("p",{class:"big-msg",text:"Vote someone out."}),grid(x.alive.filter(id=>id!==me),rn,myPick,send,["skip","Skip (no one)"]),
      el("p",{class:"sub",text:myPick!=null?"Vote sent. Tap another to change it.":"Votes stay secret until the reveal."}));return;
  }
  if(s.phase==="verdict"){
    const vr=x.votedRole;
    v.append(el("p",{class:"verdict "+(vr==="opp"?"win":"lose"),text:x.voted?(x.voted===me?"You got voted out!":rn(x.voted)+" is out!"):"Nobody's out."}),
      el("p",{class:"reveal-line",text:x.voted?(vr==="opp"?"They were an Opp! 🎯":"They were "+(vr==="fam"?"Family":ROLES[vr].name)+"."):""}),hideable(card));
  }
}

window.GN_PLUGINS=window.GN_PLUGINS||{};
window.GN_PLUGINS[ID]={
  config:{name:"Man Gone",min:5,local:false,seg:null,timer:0,timerLabel:"",
    sub:{host:"Open a room. Everyone gets a secret role on their phone."},
    rules:["Man Gone comes from the Bahamian saying “bush crack, man gone”: when trouble starts, you run.","Secret roles: the Opps, Big Mama, the Nosy Neighbor, and the Family.","Night: everyone taps their phone. The Opps pick someone to snatch, Big Mama keeps someone safe, and the Neighbor peeks to see if someone is an Opp.","Day: the TV says who got snatched. Talk it out, then vote someone out on your phone.","The Family wins when every Opp is out. The Opps win when they match the Family. Winners: +3 each."]},
  defaults:{opps:0,mama:true,nosy:true,day:120},
  startPhase:"roles",cardPhases:["roles","night","dawn","day","vote","verdict","result"],
  init(core){K=core;setInterval(tick,250)},
  cfgRows,deal,pub,onAct,renderHost,renderPlayer,
  scene(phase){
    const x=K&&K.H?pub():(K&&K.P&&K.P.state&&K.P.state.ext);if(!x)return null;
    if(phase==="roles")return ["Secret roles","Man Gone"];
    if(phase==="night")return ["Night "+x.night,"🌙 Look at your phone"];
    if(phase==="dawn")return ["Morning","☀️ Wake up"];
    if(phase==="day")return ["Talk it out","Who's an Opp?"];
    if(phase==="vote")return ["Vote!","Man Gone"];
    if(phase==="verdict")return ["The verdict","Man Gone"];
    if(phase==="result")return ["Game over","Man Gone"];
    return null;
  },
  music(ph){return ph==="night"?["tense",0.12]:ph==="day"?["lobby",0.1]:ph==="vote"||ph==="verdict"?["tense",0.15]:ph==="result"?["party",0.33]:["deal",0.25]}
};
})();
