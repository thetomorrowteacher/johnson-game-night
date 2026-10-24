/* Stack (id "uno"): Uno-style card game. The projector shows the draw pile, the play pile, whose turn it is
   and the direction; each phone holds only that player's hand.
   House rules: stack +2s and +4s on each other (the next player has to stack or take them all), and play
   doubles, triples and more: any cards with the same number or symbol go down together.
   Hands change every turn and draws are secret, so the TV pushes each changed hand to the server (setCards)
   and phones refetch when their hand version goes up. */
(function(){
"use strict";
const ID="uno";
const COLORS={R:{name:"Red",hex:"#c8211a"},Y:{name:"Gold",hex:"#e0a800"},G:{name:"Green",hex:"#2f9a2b"},B:{name:"Blue",hex:"#2f6fd0"}};
const SYMS={S:"⊘",V:"⇄",D2:"+2",W:"★",W4:"+4"};
let K=null;
const X=()=>K.H&&K.H.ext;
const col=c=>c[0];
const val=c=>c.slice(1,c.indexOf("#"));
const isWild=c=>col(c)==="W";
const isDraw=c=>val(c)==="D2"||val(c)==="W4";
const nice=c=>(isWild(c)?(val(c)==="W4"?"Wild +4":"Wild"):COLORS[col(c)].name+" "+(val(c)==="S"?"Skip":val(c)==="V"?"Reverse":val(c)==="D2"?"+2":val(c)));
function deck(){
  const d=[];let k=0;
  Object.keys(COLORS).forEach(c=>{
    d.push(c+"0#"+(k++));
    ["1","2","3","4","5","6","7","8","9","S","V","D2"].forEach(v=>{d.push(c+v+"#"+(k++));d.push(c+v+"#"+(k++))});
  });
  for(let i=0;i<4;i++){d.push("WW#"+(k++));d.push("WW4#"+(k++))}
  return d;
}
function canPlay(c,top,color,pending){
  if(pending>0){
    if(val(c)==="W4")return true;
    if(val(c)==="D2")return val(top)==="D2"||col(c)===color;
    return false;
  }
  return isWild(c)||col(c)===color||val(c)===val(top);
}
function sortHand(h){const o={R:0,Y:1,G:2,B:3,W:4};const vo=v=>v==="S"?10:v==="V"?11:v==="D2"?12:v==="W"?13:v==="W4"?14:Number(v);return h.slice().sort((a,b)=>o[col(a)]-o[col(b)]||vo(val(a))-vo(val(b)))}

function cfgRows(box,c,set,segRow){
  box.append(segRow("Cards to start",[[5,"5"],[7,"7"],[10,"10"]],c.start,set("start")));
  box.append(segRow("Stacking",[[true,"On"],[false,"Off"]],c.stack,set("stack"),"Stack +2s and +4s on each other. The next player stacks or takes them all."));
  box.append(segRow("Doubles, triples…",[[true,"On"],[false,"Off"]],c.multi,set("multi"),"Play every card with the same number or symbol at once."));
  box.append(segRow("Drawing",[["one","Draw 1"],["till","Draw till you can play"]],c.drawMode,set("drawMode")));
}

/* ---------- TV ---------- */
let queue=Promise.resolve();
/* Saves changed hands on the server, then tells the phones (hv) so they never fetch a stale hand. */
let ver=0;
function push(pids){
  const x=X();const cards={};const v=++ver;pids.forEach(pid=>{cards[pid]={hand:x.hands[pid].slice(),v}});
  queue=queue.then(()=>K.setCards(cards)).then(()=>{const y=X();if(y!==x)return;pids.forEach(pid=>{x.hv[pid]=Math.max(x.hv[pid]||0,v)});K.H.err="";K.broadcast()})
    .catch(e=>{K.H.err=e.message;K.renderHost()});
  return queue;
}
async function deal(ids){
  const c=K.cfg(ID);const order=K.shuffle(ids).slice(0,10);
  const d=K.shuffle(deck());const hands={};const n=c.start||7;
  order.forEach((pid,i)=>hands[pid]=d.splice(0,n));
  let first;do{first=d.shift();if(isWild(first)||isNaN(Number(val(first)))){d.push(first);first=null}}while(!first);
  const cards={};K.H.roster.forEach(r=>{cards[r.pid]=hands[r.pid]?{hand:hands[r.pid],v:0}:{watch:true}});
  const r=await K.api({action:"dealCards",code:K.H.code,hostToken:K.H.hostToken,game:ID,cards});
  K.H.round=r.round;queue=Promise.resolve();
  K.H.ext={order,dir:1,turn:0,hands,draw:d,discard:[first],color:col(first),pending:0,hv:{},drew:null,called:{},catchable:null,last:"",lastAt:0,winner:null,
    rules:{stack:c.stack!==false,multi:c.multi!==false,drawMode:c.drawMode||"one"}};
}
const cur=x=>x.order[x.turn];
function step(x,n){const L=x.order.length;x.turn=((x.turn+x.dir*n)%L+L)%L}
function drawOne(x){
  if(!x.draw.length){const top=x.discard.pop();x.draw=K.shuffle(x.discard);x.discard=[top];K.FX.play("whoosh")}
  return x.draw.shift();
}
function say(x,t){x.last=t;x.lastAt=Date.now()}
function onAct(p){
  const x=X();if(!x||K.H.phase!=="play"||x.busy)return;const pid=p.pid;
  if(p.type==="catch"&&x.catchable&&x.catchable.pid!==pid&&Date.now()<x.catchable.until){
    const t=x.catchable.pid;x.catchable=null;for(let i=0;i<2;i++)x.hands[t].push(drawOne(x));
    say(x,K.nameOf(pid)+" caught "+K.nameOf(t)+"! +2 cards");K.FX.play("buzzer");push([t]);K.broadcast();K.renderHost();return;
  }
  if(p.type==="call"&&x.hands[pid]&&x.hands[pid].length<=2){x.called[pid]=true;if(x.catchable&&x.catchable.pid===pid)x.catchable=null;say(x,K.nameOf(pid)+" called LAST CARD!");K.FX.play("accept");K.broadcast();K.renderHost();return}
  if(pid!==cur(x))return;
  const hand=x.hands[pid];const top=x.discard[x.discard.length-1];
  if(p.type==="draw"){
    if(x.pending>0){
      const n=x.pending;for(let i=0;i<n;i++)hand.push(drawOne(x));x.pending=0;
      say(x,K.nameOf(pid)+" takes +"+n+"! 😩");K.FX.play("lose");push([pid]);x.drew=null;step(x,1);K.broadcast();K.renderHost();return;
    }
    if(x.drew)return;
    let got=[];
    if(x.rules.drawMode==="till"){let c;let guard=0;do{c=drawOne(x);got.push(c);guard++}while(!canPlay(c,top,x.color,0)&&guard<30)}
    else got.push(drawOne(x));
    hand.push(...got);x.drew=got[got.length-1];
    say(x,K.nameOf(pid)+" drew "+(got.length===1?"a card":got.length+" cards"));K.FX.play("deal");push([pid]);K.broadcast();K.renderHost();return;
  }
  if(p.type==="pass"){if(!x.drew)return;x.drew=null;say(x,K.nameOf(pid)+" passed");step(x,1);K.broadcast();K.renderHost();return}
  if(p.type==="play"){
    const cards=Array.isArray(p.cards)?p.cards.map(String):[];if(!cards.length)return;
    if(cards.some(c=>!hand.includes(c))||new Set(cards).size!==cards.length)return;
    if(cards.length>1&&(!x.rules.multi||cards.some(c=>val(c)!==val(cards[0]))))return;
    if(!x.rules.stack&&x.pending>0)return;
    if(!canPlay(cards[0],top,x.color,x.pending))return;
    if(x.drew&&!cards.includes(x.drew)&&x.rules.drawMode==="one")return;
    const v=val(cards[0]);const wild=isWild(cards[0]);
    let color=wild?String(p.color||""):col(cards[cards.length-1]);if(wild&&!COLORS[color])return;
    cards.forEach(c=>{hand.splice(hand.indexOf(c),1);x.discard.push(c)});
    x.color=color;x.drew=null;const n=cards.length;let skip=1;
    let msg=K.nameOf(pid)+" played "+(n>1?n+"× ":"")+nice(cards[0])+(wild?" → "+COLORS[color].name:"");
    if(v==="S"){skip=1+n;msg+=" (skip!)";K.FX.play("reject")}
    else if(v==="V"){if(n%2){x.dir*=-1}if(x.order.length===2&&n%2)skip=2;msg+=" (reverse!)";K.FX.play("swoosh")}
    else if(v==="D2"||v==="W4"){x.pending+=(v==="D2"?2:4)*n;msg+=x.pending>(v==="D2"?2:4)*n?" · STACK +"+x.pending+"!":"";K.FX.play("vote");K.ANN.say(x.pending>=8?"power_up":"wrong")}
    else K.FX.play(n>1?"solve":"flip");
    if(!x.rules.stack&&x.pending>0){ /* classic: the next player just takes them and loses the turn */
      step(x,1);const vic=cur(x);const k=x.pending;for(let i=0;i<k;i++)x.hands[vic].push(drawOne(x));x.pending=0;msg+=". "+K.nameOf(vic)+" takes +"+k;push([vic]);
    }
    say(x,msg);
    if(!hand.length){return finish(pid)}
    if(hand.length===1&&!x.called[pid])x.catchable={pid,until:Date.now()+5000};
    if(hand.length>2)x.called[pid]=false;
    push([pid]);step(x,skip);K.broadcast();K.renderHost();
  }
}
function finish(pid){
  const x=X();x.winner=pid;const rp={[pid]:3};
  const left=x.order.filter(id=>id!==pid).map(id=>[id,x.hands[id].length]).sort((a,b)=>a[1]-b[1]);
  if(left[0])rp[left[0][0]]=1;
  K.addScores(rp);K.H.reveal={rp};K.setPhase("result");
}
function pub(){
  const x=X();if(!x)return null;
  return {order:x.order,dir:x.dir,turn:x.turn,top:x.discard.slice(-4),color:x.color,pending:x.pending,counts:x.order.map(id=>x.hands[id].length),
    drawLeft:x.draw.length,hv:x.hv,drew:!!x.drew,drewId:x.drew,last:x.last,lastAt:x.lastAt,catchable:x.catchable&&Date.now()<x.catchable.until?x.catchable:null,
    called:x.called,winner:x.winner,rules:x.rules};
}

/* ---------- drawing ---------- */
function cardEl(c,o){
  o=o||{};const el=K.el;
  if(!c)return el("div",{class:"uc back"},el("span",{text:"STACK"}));
  const v=val(c),w=isWild(c);
  const e=el(o.button?"button":"div",{type:o.button?"button":null,class:"uc"+(w?" wild":"")+(o.dim?" dim":"")+(o.sel?" sel":"")+(o.cls?" "+o.cls:""),
    style:w?(o.tint?"--cc:"+COLORS[o.tint].hex:""):"--cc:"+COLORS[col(c)].hex,"aria-label":nice(c),onclick:o.onclick||null});
  const sym=SYMS[v]||v;
  e.append(el("span",{class:"uc-corner",text:sym}),el("span",{class:"uc-oval"},el("b",{text:sym})),el("span",{class:"uc-corner br",text:sym}));
  return e;
}
function players(x,nameFn,me){
  const el=K.el;const ul=el("div",{class:"uno-players"});
  x.order.forEach((pid,i)=>{
    const n=x.counts[i];
    ul.append(el("div",{class:"uno-p"+(i===x.turn?" turn":"")+(pid===me?" me":"")+(n===1?" one":"")},
      el("b",{text:nameFn(pid)}),el("span",{class:"uno-count"},el("i",{text:"🂠"}),document.createTextNode(" "+n)),
      n===1?el("small",{text:x.called[pid]?"LAST CARD!":"1 card"}):null));
  });
  return ul;
}
function table(x,nameFn,big){
  const el=K.el;const top=x.top[x.top.length-1];
  const draw=el("div",{class:"uno-draw"});for(let i=0;i<Math.min(5,Math.ceil(x.drawLeft/20)+1);i++)draw.append(el("div",{class:"uc back",style:`transform:translate(${-i*2}px,${-i*2}px)`},el("span",{text:"STACK"})));
  draw.append(el("small",{text:x.drawLeft+" left"}));
  const pile=el("div",{class:"uno-pile"});
  x.top.forEach((c,i)=>{const last=i===x.top.length-1;pile.append(cardEl(c,{tint:last&&isWild(c)?x.color:null,cls:"p"+(x.top.length-1-i)+(last?" lastc":"")}))});
  const ring=el("div",{class:"uno-color",style:"--cc:"+COLORS[x.color].hex},el("span",{text:COLORS[x.color].name}));
  const dir=el("div",{class:"uno-dir"+(x.dir<0?" ccw":"")},el("span",{text:x.dir>0?"↻":"↺"}));
  const t=el("div",{class:"uno-table"+(big?" big":"")},draw,pile,el("div",{class:"uno-side"},ring,dir));
  if(x.pending)t.append(el("div",{class:"uno-pending"},el("b",{text:"+"+x.pending}),el("small",{text:"stacked!"})));
  return t;
}

/* ---------- TV screens ---------- */
function renderHost(main,side){
  const h=K.H,x=X(),el=K.el,n=K.nameOf;if(!x)return;const p=pub();
  if(h.phase==="play"){
    main.append(el("p",{class:"eyebrow",text:"Stack · "+(x.dir>0?"clockwise":"counterclockwise")}),
      el("p",{class:"big-msg",text:x.pending?n(cur(x))+": stack it or take +"+x.pending+"!":n(cur(x))+"'s turn"}),table(p,n,true));
    if(x.last&&Date.now()-x.lastAt<15000)main.append(el("p",{class:"uno-last",text:x.last}));
    if(p.catchable)main.append(el("p",{class:"uno-catch",text:n(p.catchable.pid)+" has 1 card and didn't call it! Catch them on your phone!"}));
    side.append(el("div",{class:"panel"},el("h3",{text:"Players"}),players(p,n,null)),K.errLine());
    return;
  }
  if(h.phase==="result"){
    main.append(el("p",{class:"verdict win",text:n(x.winner)+" went out! 🏆"}),table(p,n,false));
    const ul=el("ul",{class:"turn-log"});x.order.map((id,i)=>[id,x.hands[id].length]).sort((a,b)=>a[1]-b[1]).forEach(([id,c])=>ul.append(el("li",{class:c?"k-skip":"k-got"},el("span",{text:n(id)}),el("b",{text:c?c+(c===1?" card left":" cards left"):"Winner!"}))));
    main.append(el("div",{class:"panel"},el("h3",{text:"Cards left"}),ul));
    const sb=K.scoreboard();sb.append(el("p",{class:"sub",style:"font-size:.82rem",text:"Going out first: +3. Fewest cards left after that: +1."}));main.append(sb);K.resultFooter(main);
  }
}
function tick(){
  const h=K&&K.H;if(!h||h.game!==ID||h.phase!=="play"||K.mode!=="host")return;const x=h.ext;
  if(x&&x.catchable&&Date.now()>=x.catchable.until){x.catchable=null;K.broadcast();K.renderHost()}
}

/* ---------- phones ---------- */
let sel=[],pendingOut=[],wildPick=null,lastRound=null,dealtRound=null,lastFetch=0,sentAt=0,sentAtV=0;
function renderPlayer(v,s){
  const x=s.ext,el=K.el,P=K.P;if(!x)return;const rn=pid=>K.rosterName(s,pid);
  const card=K.card();
  if(!card){if(K.cardErr())v.append(el("div",{class:"panel"},el("p",{class:"status err",text:K.cardErr()}),el("button",{class:"btn-felt",text:"Try again",onclick:K.retryCard})));else v.append(el("p",{class:"status on-felt",text:"Dealing…"}));return}
  if(lastRound!==s.round){lastRound=s.round;sel=[];pendingOut=[];wildPick=null}
  const me=P.pid;const mine=x.order.indexOf(me);
  if(card.watch||mine<0){v.append(table(x,rn,false),players(x,rn,null),el("p",{class:"sub",text:"You're watching this game."}));return}
  const want=(x.hv||{})[me]||0;
  if((card.v||0)<want&&!P.fetching&&Date.now()-lastFetch>600){lastFetch=Date.now();K.retryCard()}
  if(pendingOut.length&&((card.v||0)>sentAtV||Date.now()-sentAt>5000))pendingOut=[];
  const hand=sortHand(card.hand.filter(c=>!pendingOut.includes(c)));
  if(s.phase==="result"){
    v.append(el("p",{class:"verdict "+(x.winner===me?"win":"lose"),text:x.winner===me?"You went out! 🏆":rn(x.winner)+" went out!"}),K.myScore(s));return;
  }
  const top=x.top[x.top.length-1];const myTurn=x.turn===mine;
  v.append(table(x,rn,false));
  if(x.catchable&&x.catchable.pid!==me)v.append(el("button",{class:"btn-big buzz-btn",text:"Catch "+rn(x.catchable.pid)+"!",onclick:()=>{K.act("catch",{});K.FX.vibrate([50,30,50])}}));
  v.append(el("p",{class:"status on-felt"+(myTurn?" your-turn":""),text:myTurn?(x.pending?"Stack a draw card or take +"+x.pending+".":x.drew?"Play a card or pass.":"Your turn! Tap cards to pick, then Play."):rn(x.order[x.turn])+"'s turn."}));
  /* selection rules: same number or symbol only */
  sel=sel.filter(c=>hand.includes(c));
  const playable=c=>{if(!myTurn)return false;if(x.drew&&x.rules.drawMode==="one"&&c!==x.drewId&&!(sel.length&&val(c)===val(sel[0])))return false;if(!sel.length)return canPlay(c,top,x.color,x.pending);return x.rules.multi&&val(c)===val(sel[0])};
  const row=el("div",{class:"hand uno-hand"+(dealtRound!==s.round?" deal-in":"")});if(dealtRound!==s.round)dealtRound=s.round;
  hand.forEach(c=>{const on=sel.includes(c);const ok=on||playable(c);
    row.append(cardEl(c,{button:true,dim:myTurn&&!ok,sel:on,onclick:()=>{
      if(on){sel=sel.filter(z=>z!==c)}else if(ok){if(sel.length&&val(c)!==val(sel[0]))sel=[];sel.push(c);K.FX.play("tap")}else{K.FX.play("reject");return}
      K.renderPlayer();
    }}))});
  v.append(row);
  const acts=el("div",{class:"uno-acts"});
  if(myTurn&&sel.length){
    const wild=isWild(sel[0]);
    if(wild&&!wildPick){
      const pick=el("div",{class:"uno-wild"});Object.keys(COLORS).forEach(k=>pick.append(el("button",{type:"button",style:"--cc:"+COLORS[k].hex,text:COLORS[k].name,onclick:()=>{wildPick=k;send()}})));
      acts.append(el("p",{class:"sub",text:"Pick the new color:"}),pick);
    }else acts.append(el("button",{class:"btn-big got-btn",text:"Play "+(sel.length>1?sel.length+" cards":nice(sel[0])),onclick:send}));
  }
  function send(){K.act("play",{cards:sel.slice(),color:wildPick});pendingOut=pendingOut.concat(sel);sentAt=Date.now();sentAtV=card.v||0;sel=[];wildPick=null;K.FX.vibrate(15);K.renderPlayer()}
  if(myTurn&&!sel.length){
    if(x.pending)acts.append(el("button",{class:"btn-big buzz-btn",text:"Take +"+x.pending,onclick:()=>{K.act("draw",{});K.FX.play("lose")}}));
    else if(!x.drew)acts.append(el("button",{class:"btn-felt",text:"Draw",onclick:()=>{K.act("draw",{});K.FX.play("deal")}}));
    else acts.append(el("button",{class:"btn-chalk",text:"Pass",onclick:()=>{K.act("pass",{})}}));
  }
  if(hand.length<=2&&!(x.called||{})[me])acts.append(el("button",{class:"btn-felt last-call",text:"Call LAST CARD!",onclick:()=>{K.act("call",{});K.FX.play("accept")}}));
  v.append(acts,players(x,rn,me));
}

window.GN_PLUGINS=window.GN_PLUGINS||{};
window.GN_PLUGINS[ID]={
  config:{name:"Stack",min:2,local:false,seg:null,timer:0,timerLabel:"",
    sub:{host:"Open a room. The TV shows the piles; your hand stays on your phone. 2 to 10 players."},
    rules:["Match the top card by color or by number/symbol. Wilds go on anything and you pick the color.","Stack it: play a +2 or +4 on a +2 or +4, and the next player has to stack again or take them all.","Doubles, triples and more: play every card with the same number or symbol at once.","Skip skips the next player, Reverse flips the direction.","Down to one card? Hit Call LAST CARD! on your phone, or anyone can catch you for +2. First to empty their hand wins."]},
  defaults:{start:7,stack:true,multi:true,drawMode:"one"},
  startPhase:"play",cardPhases:["play","result"],
  init(core){K=core;setInterval(tick,500)},
  cfgRows,deal,pub,onAct,renderHost,renderPlayer,
  scene(phase){if(phase==="play")return ["Stack","Cards are dealt"];if(phase==="result")return ["Out!","Stack"];return null},
  music(ph){return ph==="result"?["party",0.33]:["lobby",0.18]}
};
})();
