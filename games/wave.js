/* Das a Wibe (working name; id "wave"): Wavelength-style party game.
   Each round one player is the Psychic. Their phone shows a secret spot on a scale between two extremes
   (Cold ... Hot). They give a one-line clue, everyone else slides their guess on their phone, and the TV reveals
   the dial. Closer guesses score more. */
(function(){
"use strict";
const ID="wave";
const SPECTRA=[
["Cold","Hot"],["Boring","Exciting"],["Easy to spell","Hard to spell"],["Smells bad","Smells good"],["Kid thing","Grown-up thing"],
["Overrated food","Underrated food"],["Useless","Useful"],["Quiet","Loud"],["Cheap","Expensive"],["Scary","Not scary"],
["Healthy snack","Junk food"],["Bad movie","Great movie"],["Slow","Fast"],["Tiny","Huge"],["Weird pet","Normal pet"],
["Easy chore","Hardest chore"],["Ugly","Beautiful"],["Not a sport","Definitely a sport"],["Mild","Spicy"],["Bad superpower","Best superpower"],
["Old school","Brand new"],["Calm","Chaotic"],["Soft","Hard"],["Rare","Everywhere"],["Bad gift","Best gift"],
["Morning thing","Night thing"],["Indoor","Outdoor"],["Underrated holiday","Best holiday"],["Easy to draw","Hard to draw"],["Normal","Extra"],
["Sad song","Hype song"],["Forgettable","Unforgettable"],["Simple","Complicated"],["Light","Heavy"],["Worst pizza topping","Best pizza topping"],
["Basic","Bougie"],["Cringe","Cool"],["Safe","Dangerous"],["Short","Long"],["Hated vegetable","Loved vegetable"],
["Lowkey","Highkey"],["Unlucky","Lucky"],["Bad vacation","Dream vacation"],["Wet","Dry"],["Bad at a cookout","Good at a cookout"],
["Easy test","Hard test"],["Clean","Messy"],["Polite","Rude"],["Silly","Serious"],["Not worth the wait","Worth the wait"],
["Bad smell in a car","Good smell in a car"],["Gross","Delicious"],["Unnecessary","Essential"],["Peaceful","Stressful"],["Fake","Real"],
["Walking distance","Road trip"],["Mid","Fire"],["Sweet","Salty"],["Kid-friendly","Grown folks only"],["Hard to find","Easy to find"]
];
let K=null;
const X=()=>K.H&&K.H.ext;
const pts=d=>d<=4?4:d<=10?3:d<=17?2:0;

function cfgRows(box,c,set,segRow){
  box.append(segRow("Psychic turns each",[[1,"1"],[2,"2"],[3,"3"]],c.laps,set("laps"),"Everyone takes a turn as the Psychic."));
  box.append(segRow("The clue",[["type","Typed on the phone"],["say","Said out loud"]],c.clue,set("clue"),"Typed clues show up on the TV and everyone's phone."));
}

/* ---------- dial (SVG) ---------- */
const NS="http://www.w3.org/2000/svg";
function svgEl(tag,attrs){const e=document.createElementNS(NS,tag);for(const k in attrs)e.setAttribute(k,attrs[k]);return e}
function pt(v,r,cx,cy){const a=Math.PI*(1-v/100);return [cx+r*Math.cos(a),cy-r*Math.sin(a)]}
function wedge(v1,v2,r,cx,cy){v1=Math.max(0,v1);v2=Math.min(100,v2);const [x1,y1]=pt(v1,r,cx,cy),[x2,y2]=pt(v2,r,cx,cy);return `M${cx},${cy} L${x1},${y1} A${r},${r} 0 0 1 ${x2},${y2} Z`}
function dial(spec,opts){
  opts=opts||{};const W=600,H=340,cx=300,cy=310,r=270;
  const s=svgEl("svg",{viewBox:`-50 0 ${W+100} ${H}`,class:"wave-dial",role:"img","aria-label":spec[0]+" to "+spec[1]});
  s.append(svgEl("path",{d:wedge(0,100,r,cx,cy),fill:"#fffaee"}));
  if(opts.target!=null){
    const t=opts.target;
    [[17,"#f6c21c"],[10,"#f08a24"],[4,"#c8211a"]].forEach(([w,c])=>s.append(svgEl("path",{d:wedge(t-w,t+w,r,cx,cy),fill:c,class:opts.animate?"wedge-in":""})));
    [[13.5,"2"],[7,"3"],[0,"4"]].forEach(([o,l])=>{[-1,1].forEach(sg=>{if(!o&&sg>0)return;const [x,y]=pt(t+sg*o,r-38,cx,cy);const tx=svgEl("text",{x,y,"text-anchor":"middle","font-size":"22","font-weight":"800",fill:"#15130e"});tx.textContent=l;s.append(tx)})});
  }
  s.append(svgEl("path",{d:`M${cx-r},${cy} A${r},${r} 0 0 1 ${cx+r},${cy}`,fill:"none",stroke:"#15130e","stroke-width":"8"}));
  (opts.guesses||[]).forEach((g,i)=>{
    const [x,y]=pt(g.v,r-6,cx,cy);
    s.append(svgEl("line",{x1:cx,y1:cy,x2:x,y2:y,stroke:g.color||"#2f9a2b","stroke-width":"6","stroke-linecap":"round",class:opts.animate?"needle-in":"",style:opts.animate?`animation-delay:${0.3+i*0.12}s`:""}));
    const [lx,ly]=pt(g.v,r+18,cx,cy);
    const tx=svgEl("text",{x:lx,y:Math.min(ly,cy-4),"text-anchor":"middle","font-size":"20","font-weight":"800",fill:"#fffaee",stroke:"#15130e","stroke-width":"4","paint-order":"stroke"});tx.textContent=g.label;s.append(tx);
  });
  s.append(svgEl("circle",{cx,cy,r:"22",fill:"#15130e"}));
  return s;
}
function ends(spec){return K.el("div",{class:"wave-ends"},K.el("span",{class:"we-l",text:"← "+spec[0]}),K.el("span",{class:"we-r",text:spec[1]+" →"}))}

/* ---------- TV ---------- */
async function deal(ids){
  const c=K.cfg(ID);const order=[];
  for(let l=0;l<(c.laps||1);l++)K.shuffle(ids).forEach(id=>order.push(id));
  K.H.ext={order,turnNo:0,deck:K.shuffle(SPECTRA.map((_,i)=>i)),deckPos:0,turn:null,clueMode:c.clue||"type"};
  await dealTurn();
}
async function dealTurn(){
  const x=X();const psychic=x.order[x.turnNo];
  if(x.deckPos>=x.deck.length){x.deck=K.shuffle(x.deck);x.deckPos=0}
  const spec=SPECTRA[x.deck[x.deckPos++]];
  const target=6+K.rnd(89);
  const cards={};K.H.roster.forEach(r=>{cards[r.pid]=r.pid===psychic?{role:"psychic",spec,target}:{role:"guess",spec}});
  const r=await K.api({action:"dealCards",code:K.H.code,hostToken:K.H.hostToken,game:ID,cards});
  K.H.round=r.round;
  x.turn={psychic,spec,target,clue:"",guesses:{},rp:null};
}
function onAct(p){
  const x=X();if(!x)return;const t=x.turn,ph=K.H.phase;
  if(p.type==="clue"&&ph==="clue"&&p.pid===t.psychic){
    t.clue=String(p.text||"").replace(/\s+/g," ").trim().slice(0,60)||"(said out loud)";
    K.FX.play("pop");K.setPhase("guess");return;
  }
  if(p.type==="guess"&&ph==="guess"&&p.pid!==t.psychic){
    const v=Math.max(0,Math.min(100,Math.round(Number(p.v))));if(!Number.isFinite(v))return;
    const had=t.guesses[p.pid]!=null;t.guesses[p.pid]=v;if(!had)K.FX.play("vote");
    const all=K.H.roster.every(r=>r.pid===t.psychic||t.guesses[r.pid]!=null);
    if(all&&!x.autoT){x.autoT=setTimeout(()=>{x.autoT=0;if(K.H&&K.H.phase==="guess")reveal()},1400)}
    K.broadcast();K.renderHost();
  }
}
function reveal(){
  const x=X();const t=x.turn;const rp={};let sum=0,n=0;
  Object.entries(t.guesses).forEach(([id,v])=>{const s=pts(Math.abs(v-t.target));rp[id]=s;sum+=s;n++});
  const ps=n?Math.round(sum/n):0;rp[t.psychic]=ps;t.rp=rp;
  K.addScores(rp);K.FX.play("drum",0.7);
  setTimeout(()=>{const best=Math.max(0,...Object.values(rp));if(best>=4){K.FX.play("win");K.FX.confetti(80)}else if(best>=2)K.FX.play("accept");else K.FX.play("lose")},800);
  K.setPhase("reveal");
}
async function next(){
  const x=X();if(!x||x.busy)return;
  if(x.turnNo>=x.order.length-1){K.H.reveal={rp:{}};K.setPhase("result");return}
  x.busy=true;K.renderHost();
  try{x.turnNo++;await dealTurn();K.H.err="";K.setPhase("clue")}
  catch(e){x.turnNo--;K.H.err=e.message}
  finally{x.busy=false;K.renderHost()}
}
function pub(){
  const x=X();if(!x)return null;const t=x.turn||{};const ph=K.H.phase;
  return {psychic:t.psychic,spec:t.spec,clue:ph==="clue"?"":t.clue,turnNo:x.turnNo,turns:x.order.length,clueMode:x.clueMode,
    target:ph==="reveal"?t.target:null,guesses:ph==="reveal"?t.guesses:null,rp:ph==="reveal"?t.rp:null,next:x.order[x.turnNo+1]||null};
}
const COLORS=["#2f9a2b","#3b7dd8","#9b4dca","#e07a1f","#1f9e9e","#d64593","#6b8e23","#8b5a2b"];
function renderHost(main,side){
  const h=K.H,x=X(),el=K.el,n=K.nameOf;if(!x)return;const t=x.turn;
  const head=el("p",{class:"eyebrow",text:"Psychic "+(x.turnNo+1)+" of "+x.order.length});
  if(h.phase==="clue"){
    main.append(head,el("p",{class:"big-msg",text:n(t.psychic)+" is the Psychic."}),
      el("p",{class:"sub",text:x.clueMode==="type"?n(t.psychic)+" sees a secret spot on the dial and types a clue that points to it.":n(t.psychic)+" sees a secret spot on the dial. Listen for the clue!"}),
      el("div",{class:"wave-wrap"},dial(t.spec),ends(t.spec)));
    if(x.clueMode!=="type")main.append(el("button",{class:"btn-big",text:"Clue's been said. Start guessing",onclick:()=>{t.clue="(said out loud)";K.setPhase("guess")}}));
    side.append(K.joinCard());return;
  }
  if(h.phase==="guess"){
    const locked=h.roster.filter(r=>t.guesses[r.pid]!=null);const total=h.roster.length-1;
    main.append(head,el("div",{class:"wave-clue"},el("small",{text:n(t.psychic)+"'s clue"}),el("b",{text:t.clue})),
      el("div",{class:"wave-wrap"},dial(t.spec),ends(t.spec)),
      el("p",{class:"sub",text:"Slide your guess on your phone, then lock it in."}));
    side.append(el("div",{class:"panel"},el("h3",{text:"Locked in · "+locked.length+" of "+total}),K.chipsFor(h.roster.filter(r=>r.pid!==t.psychic),r=>t.guesses[r.pid]!=null)));
    const b=el("button",{class:"btn-big",text:locked.length===total?"Everyone's in. Reveal!":"Reveal the dial",onclick:reveal});b.disabled=!locked.length;main.append(b);
    return;
  }
  if(h.phase==="reveal"){
    const gs=h.roster.filter(r=>t.guesses[r.pid]!=null).map((r,i)=>({v:t.guesses[r.pid],label:r.name,color:COLORS[i%COLORS.length]}));
    const fresh=Date.now()-h.epoch<1500;
    main.append(head,el("div",{class:"wave-clue"},el("small",{text:n(t.psychic)+"'s clue"}),el("b",{text:t.clue})),
      el("div",{class:"wave-wrap"},dial(t.spec,{target:t.target,guesses:gs,animate:fresh}),ends(t.spec)));
    const ul=el("ul",{class:"turn-log"});
    h.roster.filter(r=>r.pid!==t.psychic).sort((a,b)=>(t.rp[b.pid]||0)-(t.rp[a.pid]||0)).forEach(r=>ul.append(el("li",{class:t.rp[r.pid]?"k-got":"k-skip"},el("span",{text:r.name+(t.guesses[r.pid]==null?" (no guess)":"")}),el("b",{text:"+"+(t.rp[r.pid]||0)}))));
    ul.append(el("li",{class:"k-got"},el("span",{text:n(t.psychic)+" (Psychic, average)"}),el("b",{text:"+"+(t.rp[t.psychic]||0)})));
    side.append(el("div",{class:"panel"},el("h3",{text:"This round"}),ul));
    const nx=x.order[x.turnNo+1];
    main.append(el("button",{class:"btn-big",text:x.busy?"Dealing…":nx?"Next Psychic: "+n(nx):"See the final scores",onclick:next}),K.errLine());
    return;
  }
  if(h.phase==="result"){
    const rows=h.roster.map(r=>[r.pid,h.scores[r.pid]||0]).sort((a,b)=>b[1]-a[1]);
    main.append(el("p",{class:"verdict win",text:"That's a wibe!"}),el("p",{class:"reveal-line",text:"Everyone's been the Psychic. "+n(rows[0][0])+" leads the night."}));
    const sb=K.scoreboard();sb.append(el("p",{class:"sub",style:"font-size:.82rem",text:"Bullseye: +4. Close: +3. In the zone: +2. The Psychic gets the average of everyone's points."}));main.append(sb);
    K.resultFooter(main);side.append(K.joinCard());
  }
}

/* ---------- phones ---------- */
let myVal=null,myRound=null;
function renderPlayer(v,s){
  const x=s.ext,el=K.el,P=K.P;if(!x)return;const rn=pid=>K.rosterName(s,pid);
  if(s.phase==="result"){v.append(el("p",{class:"verdict win",text:"That's a wibe!"}),K.myScore(s));return}
  const card=K.card();
  if(!card){if(K.cardErr())v.append(el("div",{class:"panel"},el("p",{class:"status err",text:K.cardErr()}),el("button",{class:"btn-felt",text:"Try again",onclick:K.retryCard})));else v.append(el("p",{class:"status on-felt",text:"Getting your card…"}));return}
  const spec=card.spec;const me=card.role==="psychic";
  v.append(el("p",{class:"eyebrow",text:"Psychic "+(x.turnNo+1)+" of "+x.turns}));
  if(s.phase==="clue"){
    if(me){
      v.append(el("p",{class:"big-msg",text:"You're the Psychic!"}),el("p",{class:"sub",text:"The red spot is secret. Give a clue that points to it."}),
        el("div",{class:"wave-wrap"},dial(spec,{target:card.target}),ends(spec)));
      if(x.clueMode==="type"){
        const inp=el("input",{type:"text",maxlength:"60",placeholder:"Your clue, e.g. “a cup of tea”",autocomplete:"off","aria-label":"Your clue"});
        const f=el("form",{class:"try-form",onsubmit:e=>{e.preventDefault();const t=inp.value.trim();if(!t)return;K.act("clue",{text:t});K.FX.play("pop")}},inp,el("button",{type:"submit",text:"Send"}));
        v.append(el("div",{class:"panel"},el("h3",{text:"Your clue"}),f));
      }else v.append(el("p",{class:"status on-felt",text:"Say your clue out loud. The TV starts the guessing."}));
    }else v.append(el("p",{class:"big-msg",text:rn(x.psychic)+" is thinking of a clue…"}),el("div",{class:"wave-wrap"},dial(spec),ends(spec)));
    return;
  }
  if(s.phase==="guess"){
    v.append(el("div",{class:"wave-clue sm"},el("small",{text:rn(x.psychic)+"'s clue"}),el("b",{text:x.clue})));
    if(me){v.append(el("p",{class:"sub",text:"Everyone is guessing. Keep a straight face!"}),el("div",{class:"wave-wrap"},dial(spec,{target:card.target}),ends(spec)));return}
    if(myRound!==s.round){myRound=s.round;myVal=50;P.locked=null}
    const holder=el("div",{class:"wave-wrap"});const draw=()=>{holder.textContent="";holder.append(dial(spec,{guesses:[{v:myVal,label:"You",color:"#c8211a"}]}),ends(spec))};draw();
    const range=el("input",{type:"range",min:"0",max:"100",step:"1",value:String(myVal),class:"wave-range","aria-label":"Your guess"});
    const lock=el("button",{class:"btn-big",text:P.locked===s.round?"Locked in ✓ (tap to change)":"Lock it in"});
    range.oninput=()=>{myVal=Number(range.value);draw();if(P.locked===s.round){P.locked=null;lock.textContent="Lock it in"}};
    lock.onclick=()=>{K.act("guess",{v:myVal});P.locked=s.round;lock.textContent="Locked in ✓ (tap to change)";K.FX.play("vote");K.FX.vibrate(20)};
    v.append(holder,range,lock);return;
  }
  if(s.phase==="reveal"){
    const got=(x.rp||{})[P.pid]||0;const mine=x.guesses&&x.guesses[P.pid];
    v.append(el("p",{class:"verdict "+(got?"win":"lose"),text:got>=4?"Bullseye! +4":got?"+"+got+" points":me?"No points this time":"Missed it!"}),
      el("div",{class:"wave-wrap"},dial(spec,{target:x.target,guesses:mine!=null?[{v:mine,label:"You",color:"#2f9a2b"}]:[]}),ends(spec)),K.myScore(s));
    if(x.next===P.pid)v.append(el("p",{class:"status on-felt",text:"You're the Psychic next!"}));
  }
}

window.GN_PLUGINS=window.GN_PLUGINS||{};
window.GN_PLUGINS[ID]={
  config:{name:"Das a Wibe",min:3,local:false,seg:null,timer:0,timerLabel:"",
    sub:{host:"Open a room. Everyone guesses on their own phone."},
    rules:["Das a Wibe is Bahamian for “that's a vibe.”","Each round one player is the Psychic. Their phone shows a secret spot on a scale, like Cold to Hot.","The Psychic gives one clue that points to the spot (“a cup of cocoa”).","Everyone else slides their guess on their phone and locks it in. The TV reveals the dial.","Bullseye: +4. Close: +3. In the zone: +2. The Psychic gets the average of everyone's points."]},
  defaults:{laps:1,clue:"type"},
  startPhase:"clue",cardPhases:["clue","guess","reveal"],
  init(core){K=core},
  cfgRows,deal,pub,onAct,renderHost,renderPlayer,
  scene(phase){
    const x=K&&K.H?pub():(K&&K.P&&K.P.state&&K.P.state.ext);if(!x)return null;
    const rn=pid=>K.H?K.nameOf(pid):K.rosterName(K.P.state,pid);
    if(phase==="clue")return [rn(x.psychic)+" is the Psychic","Das a Wibe"];
    if(phase==="guess")return ["Guess!","Slide and lock it in"];
    if(phase==="reveal")return ["The reveal","Das a Wibe"];
    if(phase==="result")return ["Final scores","Das a Wibe"];
    return null;
  },
  music(ph){return ph==="guess"?["tense",0.13]:ph==="reveal"||ph==="result"?["party",0.3]:["lobby",0.25]}
};
})();
