/* Spades (id "spades"): 4 players, partners sit across (Team Red: seats 1 and 3, Team Green: seats 2 and 4).
   House rules: Big Joker and Little Joker are the top spades, then the deuce of spades, then A K Q ... of spades.
   The 2 of clubs and 2 of hearts are taken out, so it's still 52 cards.
   Each phone gets only its own hand (dealt by the server); what's been played is public, so phones work out
   what's left in their hand themselves. Anyone past the first 4 phones watches. */
(function(){
"use strict";
const ID="spades";
const SUITS=["S","H","D","C"],SYM={S:"♠",H:"♥",D:"♦",C:"♣"},RANKS=["2","3","4","5","6","7","8","9","10","J","Q","K","A"];
const TEAM=["A","B","A","B"],TN={A:"Team Red",B:"Team Green"},TC={A:"t-red",B:"t-green"};
let K=null;
const X=()=>K.H&&K.H.ext;
function deck(){const d=["BJ","LJ"];SUITS.forEach(s=>RANKS.forEach(r=>{if(r==="2"&&(s==="C"||s==="H"))return;d.push(r+s)}));return d}
const suit=c=>c==="BJ"||c==="LJ"?"S":c.slice(-1);
const rank=c=>c==="BJ"?18:c==="LJ"?17:c==="2S"?16:RANKS.indexOf(c.slice(0,-1))+2;
const label=c=>c==="BJ"?"Big Joker":c==="LJ"?"Little Joker":c.slice(0,-1)+SYM[c.slice(-1)];
function sortHand(h){const o={C:0,D:1,H:2,S:3};return h.slice().sort((a,b)=>o[suit(a)]-o[suit(b)]||rank(a)-rank(b))}
function legal(hand,trick,broken){
  if(!trick.length){const non=hand.filter(c=>suit(c)!=="S");return broken||!non.length?hand.slice():non}
  const led=suit(trick[0].card);const follow=hand.filter(c=>suit(c)===led);return follow.length?follow:hand.slice();
}
function trickWinner(trick){
  const led=suit(trick[0].card);let best=trick[0];
  trick.forEach(t=>{const bs=suit(best.card),ts=suit(t.card);
    if(ts==="S"&&bs!=="S")best=t;else if(ts===bs&&rank(t.card)>rank(best.card))best=t;});
  return best.seat;
}

function cfgRows(box,c,set,segRow){
  box.append(segRow("Play to",[[200,"200"],[300,"300"],[500,"500"]],c.to,set("to")));
  box.append(segRow("Partners",[["random","Random"],["join","Order they joined"]],c.seats,set("seats"),"Partners sit across from each other: seats 1 and 3 vs. seats 2 and 4."));
}

/* ---------- TV ---------- */
async function deal(ids,roster){
  const c=K.cfg(ID);const seats=(c.seats==="join"?ids.slice():K.shuffle(ids)).slice(0,4);
  K.H.ext={seats,dealer:K.rnd(4),score:{A:0,B:0},bags:{A:0,B:0},handNo:0,to:c.to||300,hist:[]};
  await dealHand();
}
async function dealHand(){
  const x=X();const d=K.shuffle(deck());x.handNo++;x.dealer=(x.dealer+1)%4;
  const hands={};x.seats.forEach((pid,i)=>hands[pid]=sortHand(d.slice(i*13,i*13+13)));
  const cards={};K.H.roster.forEach(r=>{cards[r.pid]=hands[r.pid]?{seat:x.seats.indexOf(r.pid),hand:hands[r.pid]}:{watch:true}});
  const r=await K.api({action:"dealCards",code:K.H.code,hostToken:K.H.hostToken,game:ID,cards});
  K.H.round=r.round;
  Object.assign(x,{hands,bids:[null,null,null,null],turn:(x.dealer+1)%4,lead:(x.dealer+1)%4,trick:[],last:null,tricks:[0,0,0,0],played:[],broken:false,handPts:null});
}
function onAct(p){
  const x=X();if(!x)return;const seat=x.seats.indexOf(p.pid);if(seat<0)return;const ph=K.H.phase;
  if(p.type==="bid"&&ph==="bid"&&seat===x.turn&&x.bids[seat]==null){
    const b=Math.round(Number(p.bid));if(!(b>=1&&b<=13))return;
    x.bids[seat]=b;K.FX.play("pop");
    if(x.bids.every(v=>v!=null)){x.turn=x.lead;K.setPhase("play");return}
    x.turn=(x.turn+1)%4;K.broadcast();K.renderHost();return;
  }
  if(p.type==="play"&&ph==="play"&&seat===x.turn&&!x.pause){
    const hand=x.hands[p.pid];const c=String(p.card);
    if(!hand.includes(c)||!legal(hand,x.trick,x.broken).includes(c))return;
    hand.splice(hand.indexOf(c),1);x.played.push(c);x.trick.push({seat,card:c});if(suit(c)==="S")x.broken=true;
    K.FX.play(c==="BJ"||c==="LJ"?"solve":"flip");
    if(x.trick.length<4){x.turn=(x.turn+1)%4;K.broadcast();K.renderHost();return}
    const w=trickWinner(x.trick);x.tricks[w]++;x.last={trick:x.trick.slice(),winner:w};x.pause=true;x.turn=w;
    K.broadcast();K.renderHost();
    setTimeout(()=>{x.pause=false;x.trick=[];if(x.played.length>=52)return endHand();K.broadcast();K.renderHost()},1600);
  }
}
function endHand(){
  const x=X();const pts={A:0,B:0};const res={};
  ["A","B"].forEach(t=>{
    const seats=[0,1,2,3].filter(s=>TEAM[s]===t);const bid=seats.reduce((a,s)=>a+x.bids[s],0);const got=seats.reduce((a,s)=>a+x.tricks[s],0);
    if(got>=bid){pts[t]=bid*10+(got-bid);x.bags[t]+=got-bid}else pts[t]=-bid*10;
    res[t]={bid,got,pts:pts[t]};x.score[t]+=pts[t];
  });
  x.handPts=res;x.hist.push(res);
  const done=(x.score.A>=x.to||x.score.B>=x.to)&&x.score.A!==x.score.B;
  if(done){const w=x.score.A>x.score.B?"A":"B";const rp={};x.seats.forEach((pid,s)=>{if(TEAM[s]===w)rp[pid]=3});K.addScores(rp);x.winner=w;K.H.reveal={rp,win:w};K.setPhase("result");return}
  K.setPhase("handEnd");
}
async function nextHand(){
  const x=X();if(!x||x.busy)return;x.busy=true;K.renderHost();
  try{await dealHand();K.H.err="";K.setPhase("bid")}catch(e){K.H.err=e.message}finally{x.busy=false;K.renderHost()}
}
function pub(){
  const x=X();if(!x)return null;
  return {seats:x.seats,dealer:x.dealer,bids:x.bids,turn:x.turn,trick:x.trick,last:x.last,tricks:x.tricks,played:x.played,broken:x.broken,
    score:x.score,bags:x.bags,handNo:x.handNo,to:x.to,handPts:x.handPts,pause:!!x.pause,winner:x.winner||null};
}

/* ---------- drawing ---------- */
function cardEl(c,opts){
  opts=opts||{};const el=K.el;
  if(!c)return el("div",{class:"pc back"});
  const s=suit(c),joker=c==="BJ"||c==="LJ";
  const red=s==="H"||s==="D";
  const e=el(opts.button?"button":"div",{class:"pc"+(joker?" joker"+(c==="BJ"?" big":""):"")+(red?" red":"")+(opts.dim?" dim":"")+(opts.sel?" sel":""),type:opts.button?"button":null,"aria-label":label(c),onclick:opts.onclick||null});
  if(joker)e.append(el("span",{class:"pr",text:c==="BJ"?"BIG":"LIL"}),el("span",{class:"ps",text:"🃏"}),el("span",{class:"pj",text:"JOKER"}));
  else e.append(el("span",{class:"pr",text:c.slice(0,-1)}),el("span",{class:"ps",text:SYM[s]}));
  return e;
}
function teamBox(x,t){
  const el=K.el;return el("div",{class:"team-box "+TC[t]},el("b",{text:TN[t]}),el("span",{class:"team-score",text:String(x.score[t])}),el("small",{text:"Bags: "+x.bags[t]+" · playing to "+x.to}));
}
function seatTag(x,s,nameFn,me){
  const el=K.el;const bid=x.bids[s];
  return el("div",{class:"seat-tag "+TC[TEAM[s]]+(x.turn===s&&!x.pause?" turn":"")+(me?" me":"")},el("b",{text:nameFn(x.seats[s])+(x.dealer===s?" (D)":"")}),
    el("small",{text:(bid==null?"Bid: …":"Bid "+bid)+" · Books "+x.tricks[s]}));
}
function table(x,nameFn,mySeat,phase){
  const el=K.el;const base=mySeat==null?0:mySeat;const pos=["s-bottom","s-left","s-top","s-right"];
  const t=el("div",{class:"spades-table"});
  const shown=x.pause&&x.last?x.last.trick:x.trick;
  for(let k=0;k<4;k++){const s=(base+k)%4;t.append(el("div",{class:"seat "+pos[k]},seatTag(x,s,nameFn,s===mySeat)))}
  const mid=el("div",{class:"trick"});
  for(let k=0;k<4;k++){const s=(base+k)%4;const pl=shown.find(p=>p.seat===s);const slot=el("div",{class:"slot "+pos[k]+(x.pause&&x.last&&x.last.winner===s?" won":"")});if(pl)slot.append(cardEl(pl.card));mid.append(slot)}
  t.append(mid);
  /* the deck sits in the middle while bidding; cards fly out to each seat */
  if(phase==="bid"){const dk=el("div",{class:"deck-pile"});for(let i=0;i<5;i++)dk.append(el("div",{class:"pc back",style:`transform:translate(${i*-1.5}px,${i*-1.5}px)`}));
    ["s-bottom","s-left","s-top","s-right"].forEach((c,i)=>dk.append(el("div",{class:"pc back fly f-"+c,style:`animation-delay:${i*.12}s`})));t.append(dk)}
  /* books won stack up next to each seat */
  for(let k=0;k<4;k++){const s=(base+k)%4;if(x.tricks[s]){const bk=el("div",{class:"books b-"+pos[k]});for(let i=0;i<Math.min(x.tricks[s],8);i++)bk.append(el("i"));bk.append(el("b",{text:String(x.tricks[s])}));t.append(bk)}}
  return t;
}

/* ---------- TV screens ---------- */
function renderHost(main,side){
  const h=K.H,x=X(),el=K.el,n=K.nameOf;if(!x)return;
  side.append(el("div",{class:"team-board vert"},teamBox(x,"A"),teamBox(x,"B")));
  if(h.phase==="bid"||h.phase==="play"){
    const who=n(x.seats[x.turn]);
    main.append(el("p",{class:"eyebrow",text:"Hand "+x.handNo+(x.broken?" · spades broken":"")}),
      el("p",{class:"big-msg",text:h.phase==="bid"?"Bidding: "+who+"'s turn":x.pause&&x.last?n(x.seats[x.last.winner])+" takes the book!":who+"'s turn to play"}),
      table(x,n,null,h.phase));
    if(h.phase==="play"){
      const bidA=x.bids[0]+x.bids[2],bidB=x.bids[1]+x.bids[3];
      main.append(el("p",{class:"sub",text:"Team Red bid "+bidA+" (has "+(x.tricks[0]+x.tricks[2])+") · Team Green bid "+bidB+" (has "+(x.tricks[1]+x.tricks[3])+")"}));
    }
    side.append(el("div",{class:"panel"},el("h3",{text:"Card order"}),el("p",{style:"margin:0",text:"Big Joker, Little Joker, 2♠, then A♠ K♠ Q♠ … Spades beat everything. Follow the suit that was led if you can."})));
    return;
  }
  if(h.phase==="handEnd"){
    const r=x.handPts;
    main.append(el("p",{class:"eyebrow",text:"Hand "+x.handNo+" is done"}),el("p",{class:"big-msg",text:"Books are in."}));
    const ul=el("ul",{class:"turn-log"});["A","B"].forEach(t=>ul.append(el("li",{class:r[t].pts>=0?"k-got":"k-buzz"},el("span",{text:TN[t]+": bid "+r[t].bid+", got "+r[t].got}),el("b",{text:(r[t].pts>=0?"+":"")+r[t].pts}))));
    main.append(el("div",{class:"panel"},el("h3",{text:"This hand"}),ul),el("button",{class:"btn-big",text:x.busy?"Shuffling…":"Deal the next hand",onclick:nextHand}),K.errLine());
    return;
  }
  if(h.phase==="result"){
    main.append(el("p",{class:"verdict win",text:TN[x.winner]+" wins!"}),el("p",{class:"reveal-line",text:"Final: Team Red "+x.score.A+", Team Green "+x.score.B+". Partners: "+n(x.seats[0])+" & "+n(x.seats[2])+" vs. "+n(x.seats[1])+" & "+n(x.seats[3])+"."}));
    const sb=K.scoreboard();sb.append(el("p",{class:"sub",style:"font-size:.82rem",text:"Winning partners: +3 each tonight."}));main.append(sb);K.resultFooter(main);
  }
}

/* ---------- phones ---------- */
let sel=null,dealtRound=null;
function renderPlayer(v,s){
  const x=s.ext,el=K.el,P=K.P;if(!x)return;const rn=pid=>K.rosterName(s,pid);
  const card=K.card();
  if(!card){if(K.cardErr())v.append(el("div",{class:"panel"},el("p",{class:"status err",text:K.cardErr()}),el("button",{class:"btn-felt",text:"Try again",onclick:K.retryCard})));else v.append(el("p",{class:"status on-felt",text:"Dealing…"}));return}
  const me=card.watch?null:card.seat;
  v.append(el("div",{class:"team-pill "+(me==null?"t-red":TC[TEAM[me]])},el("span",{text:me==null?"Watching":"You're "+TN[TEAM[me]]+" · partner: "+rn(x.seats[(me+2)%4])}),el("b",{text:x.score.A+" – "+x.score.B})));
  if(s.phase==="result"){const won=me!=null&&TEAM[me]===x.winner;v.append(el("p",{class:"verdict "+(won?"win":"lose"),text:won?"You and your partner win!":TN[x.winner]+" wins."}),K.myScore(s));return}
  if(s.phase==="handEnd"){const r=x.handPts;v.append(el("p",{class:"big-msg",text:"Hand "+x.handNo+" done"}),el("p",{class:"sub",text:"Team Red "+(r.A.pts>=0?"+":"")+r.A.pts+" · Team Green "+(r.B.pts>=0?"+":"")+r.B.pts}));return}
  v.append(table(x,rn,me,s.phase));
  if(me==null){v.append(el("p",{class:"sub",text:"You're watching this game. Join the next one!"}));return}
  const hand=sortHand(card.hand.filter(c=>!x.played.includes(c)));
  const myTurn=x.turn===me&&!x.pause;
  if(s.phase==="bid"){
    if(myTurn&&x.bids[me]==null){
      const pb=x.bids[(me+2)%4];
      const g=el("div",{class:"bid-grid"});for(let b=1;b<=13;b++)g.append(el("button",{type:"button",text:String(b),onclick:()=>{K.act("bid",{bid:b});K.FX.play("pop")}}));
      v.append(el("p",{class:"big-msg",text:"Your bid. How many books?"}),el("p",{class:"sub",text:pb!=null?"Your partner bid "+pb+".":"Your partner hasn't bid yet."}),g);
    }else v.append(el("p",{class:"status on-felt",text:x.bids[me]!=null?"You bid "+x.bids[me]+". Waiting on the others.":"Waiting for "+rn(x.seats[x.turn])+" to bid."}));
  }else{
    v.append(el("p",{class:"status on-felt"+(myTurn?" your-turn":""),text:myTurn?"Your turn! Tap a card, then tap it again to play.":x.pause?"Book goes to "+rn(x.seats[x.last.winner])+".":"Waiting for "+rn(x.seats[x.turn])+"."}));
  }
  const ok=s.phase==="play"&&myTurn?legal(hand,x.trick,x.broken):[];
  if(!hand.includes(sel))sel=null;
  const row=el("div",{class:"hand"+(dealtRound!==s.round?" deal-in":"")});if(dealtRound!==s.round){dealtRound=s.round;K.FX.play("deal")}
  hand.forEach(c=>row.append(cardEl(c,{button:true,dim:s.phase==="play"&&myTurn&&!ok.includes(c),sel:sel===c,onclick:()=>{
    if(!(s.phase==="play"&&myTurn&&ok.includes(c))){K.FX.play("reject");return}
    if(sel===c){K.act("play",{card:c});sel=null;K.FX.vibrate(15)}else{sel=c;K.FX.play("tap")}
    K.renderPlayer();
  }})));
  v.append(row);
  if(sel)v.append(el("button",{class:"btn-big",text:"Play "+label(sel),onclick:()=>{K.act("play",{card:sel});sel=null;K.renderPlayer()}}));
}

window.GN_PLUGINS=window.GN_PLUGINS||{};
window.GN_PLUGINS[ID]={
  config:{name:"Spades",min:4,local:false,seg:null,timer:0,timerLabel:"",
    sub:{host:"Open a room. Four phones play; partners sit across. Anyone else can watch."},
    rules:["Four players, partners across: seats 1 and 3 (Team Red) vs. seats 2 and 4 (Team Green).","House rules: Big Joker, Little Joker, then the 2♠ are the top spades. The 2♣ and 2♥ are out.","Everyone bids how many books they'll win. Partners' bids add up.","Follow the suit that's led if you can. Spades can't be led until they're broken.","Make your bid: 10 points per book bid plus 1 per extra book (bag). Miss it: lose 10 per book bid. First team to the target wins."]},
  defaults:{to:300,seats:"random"},
  startPhase:"bid",cardPhases:["bid","play","handEnd","result"],
  init(core){K=core},
  cfgRows,deal,pub,onAct,renderHost,renderPlayer,
  scene(phase,round){
    const x=K&&K.H?pub():(K&&K.P&&K.P.state&&K.P.state.ext);if(!x)return null;
    if(phase==="bid")return ["Hand "+x.handNo,"Spades · bid your books"];
    if(phase==="play")return ["Let's play","Spades"];
    if(phase==="handEnd")return ["Books are in","Hand "+x.handNo];
    if(phase==="result")return ["Game!","Spades"];
    return null;
  },
  music(ph){return ph==="play"?["lobby",0.12]:ph==="result"?["party",0.33]:["deal",0.22]}
};
})();
