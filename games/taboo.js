/* Talmbout (working name; id "taboo"): Taboo-style party game.
   Two teams. One player describes the word to their team without saying it or any banned word.
   The describer and the other team see the card on their phones; the other team buzzes banned words.
   Plugs into app.js through window.GN_PLUGINS (see the PLUGINS section there). */
(function(){
"use strict";
const ID="taboo";
/* [word, banned words]. Family friendly, kids 8+. */
const CARDS=[
["Pizza",["Cheese","Slice","Pepperoni","Italy"]],["Basketball",["Hoop","Dribble","NBA","Court"]],["Birthday",["Cake","Candles","Party","Age"]],
["Beach",["Sand","Ocean","Waves","Swim"]],["Homework",["School","Teacher","Study","Assignment"]],["Pancakes",["Syrup","Breakfast","Flip","Flat"]],
["Dinosaur",["Extinct","T-Rex","Fossil","Jurassic"]],["Airplane",["Fly","Pilot","Wings","Airport"]],["Toothbrush",["Teeth","Paste","Bristles","Dentist"]],
["Snowman",["Cold","Carrot","Winter","Frosty"]],["Rainbow",["Colors","Storm","Sky","Arch"]],["Pillow",["Bed","Sleep","Head","Soft"]],
["Volcano",["Lava","Erupt","Mountain","Hot"]],["Superhero",["Cape","Powers","Save","Villain"]],["Library",["Books","Quiet","Borrow","Read"]],
["Popcorn",["Movie","Butter","Snack","Kernel"]],["Grandma",["Grandpa","Old","Mom","Family"]],["Selfie",["Phone","Picture","Camera","Yourself"]],
["Elephant",["Trunk","Big","Gray","Ears"]],["Spaghetti",["Pasta","Noodles","Meatballs","Sauce"]],["Thunder",["Lightning","Storm","Loud","Rain"]],
["Penguin",["Bird","Ice","Cold","Waddle"]],["Video game",["Controller","Play","Console","Screen"]],["Cookout",["Grill","Burgers","Family","Backyard"]],
["Sneakers",["Shoes","Feet","Jordan","Laces"]],["Teacher",["School","Class","Students","Homework"]],["Moon",["Night","Sky","Stars","Full"]],
["Hair braids",["Box","Cornrows","Twist","Salon"]],["Ice cream",["Cone","Cold","Scoop","Dessert"]],["Robot",["Machine","Metal","Beep","Computer"]],
["Fireworks",["Fourth","Boom","Sky","Explode"]],["Haircut",["Barber","Scissors","Trim","Fade"]],["Treasure",["Pirate","Gold","Chest","Map"]],
["Bubble",["Soap","Pop","Blow","Gum"]],["Butterfly",["Wings","Caterpillar","Colorful","Insect"]],["Cheerleader",["Pom-poms","Chant","Team","Game"]],
["Hiccups",["Breath","Scare","Throat","Stop"]],["Alarm clock",["Wake","Morning","Ring","Time"]],["Thanksgiving",["Turkey","November","Thankful","Feast"]],
["Mac and cheese",["Pasta","Cheddar","Noodles","Side"]],["Skateboard",["Wheels","Ride","Tricks","Ramp"]],["Tooth fairy",["Teeth","Money","Pillow","Lose"]],
["Waterpark",["Slides","Pool","Wet","Splash"]],["Hamster",["Pet","Wheel","Small","Cage"]],["Microphone",["Sing","Talk","Loud","Karaoke"]],
["Passport",["Travel","Country","Airport","Stamp"]],["Bakery",["Bread","Cake","Cookies","Oven"]],["Rollercoaster",["Ride","Park","Scream","Loop"]],
["Octopus",["Eight","Arms","Ocean","Ink"]],["Pajamas",["Sleep","Night","Clothes","Bed"]],["Sunglasses",["Bright","Eyes","Shades","Dark"]],
["Ghost",["Boo","Halloween","Spooky","Haunted"]],["Banana",["Yellow","Fruit","Peel","Monkey"]],["Calculator",["Math","Numbers","Add","Buttons"]],
["Lemonade",["Lemons","Sour","Drink","Sugar"]],["Bunk bed",["Top","Bottom","Sleep","Ladder"]],["Pirate",["Ship","Treasure","Parrot","Arr"]],
["Doctor",["Hospital","Sick","Nurse","Medicine"]],["Shark",["Teeth","Ocean","Fish","Bite"]],["Umbrella",["Rain","Wet","Open","Cover"]],
["Cupcake",["Frosting","Muffin","Sprinkles","Small"]],["Guitar",["Strings","Music","Play","Strum"]],["Tornado",["Wind","Spin","Storm","Funnel"]],
["Unicorn",["Horn","Horse","Magic","Rainbow"]],["Backpack",["School","Bag","Carry","Zipper"]],["Netflix",["Movies","Shows","Watch","Stream"]],
["Tacos",["Tuesday","Shell","Mexican","Salsa"]],["Bowling",["Pins","Ball","Strike","Lane"]],["Kangaroo",["Australia","Jump","Pouch","Baby"]],
["Sleepover",["Friends","Night","Pajamas","Party"]],["Spider",["Web","Eight","Legs","Bug"]],["Crown",["King","Queen","Head","Gold"]],
["Pumpkin",["Orange","Halloween","Pie","Carve"]],["Dentist",["Teeth","Cavity","Check","Brush"]],["Recess",["School","Play","Outside","Break"]],
["Popsicle",["Cold","Stick","Melt","Summer"]],["Igloo",["Ice","Snow","House","Cold"]],["Magician",["Wand","Rabbit","Hat","Trick"]],
["Taxi",["Car","Yellow","Driver","Ride"]],["Fishing",["Bait","Pole","Hook","Lake"]],["Zebra",["Stripes","Horse","Black","White"]],
["Chess",["King","Board","Checkmate","Queen"]],["Lunch box",["Food","School","Sandwich","Carry"]],["Mirror",["Reflection","Look","Glass","Face"]],
["Soccer",["Goal","Kick","Ball","Messi"]],["Jellyfish",["Sting","Ocean","Clear","Tentacles"]],["Bicycle",["Pedal","Wheels","Ride","Bike"]],
["Bee",["Honey","Sting","Buzz","Hive"]],["Parade",["March","Floats","Street","Band"]],["Sandcastle",["Beach","Shovel","Build","Bucket"]],
["Tiktok",["Video","Dance","App","Scroll"]],["Wedding",["Bride","Groom","Ring","Marry"]],["Firefighter",["Flames","Truck","Hose","Rescue"]],
["Car wash",["Soap","Clean","Water","Drive"]],["Ladder",["Climb","Steps","Up","Tall"]],["Waffle",["Syrup","Breakfast","Squares","Pancake"]],
["Owl",["Hoot","Night","Bird","Wise"]],["Popstar",["Sing","Famous","Music","Concert"]],["Trampoline",["Jump","Bounce","Backyard","High"]],
["Watermelon",["Seeds","Red","Green","Summer"]],["Hide and seek",["Game","Count","Find","Ready"]],["Telescope",["Stars","Space","Look","Far"]],
["Lion",["King","Roar","Mane","Jungle"]],["Microwave",["Heat","Kitchen","Popcorn","Beep"]],["Church",["Sunday","Pray","Pastor","Choir"]],
["Barbecue",["Grill","Ribs","Sauce","Smoke"]],["Memphis",["Tennessee","Grizzlies","Elvis","Barbecue"]],["Bahamas",["Island","Nassau","Beach","Caribbean"]],
["Thailand",["Bangkok","Asia","Elephants","Pad Thai"]],["Flamingo",["Pink","Bird","Leg","Florida"]],["Volleyball",["Net","Spike","Beach","Serve"]],
["Ketchup",["Red","Tomato","Fries","Sauce"]],["Mailbox",["Letters","Stamp","Post","Send"]],["Astronaut",["Space","Rocket","Moon","NASA"]],
["Dragon",["Fire","Wings","Breathe","Fly"]],["Chopsticks",["Eat","Rice","Noodles","Two"]],["Snail",["Slow","Shell","Slime","Garden"]],
["Hot sauce",["Spicy","Pepper","Wings","Bottle"]],["Map",["Directions","Lost","Country","Paper"]],["Clown",["Circus","Funny","Nose","Red"]],
["Rain boots",["Storm","Feet","Puddle","Wet"]],["Sunscreen",["SPF","Burn","Lotion","Beach"]],["Pickle",["Green","Sour","Cucumber","Jar"]],
["Fridge",["Cold","Food","Kitchen","Door"]],["Jump rope",["Hop","Skip","Double dutch","Recess"]],["Spelling bee",["Dictionary","Letters","Contest","Words"]],
["Remote control",["TV","Buttons","Channel","Couch"]],["Puzzle",["Pieces","Fit","Jigsaw","Solve"]],["Frog",["Green","Jump","Pond","Ribbit"]],
["Scarecrow",["Crows","Farm","Straw","Field"]],["Lighthouse",["Beam","Ships","Ocean","Tower"]],["Coconut",["Tree","Island","Hairy","Milk"]],
["Sloth",["Slow","Tree","Lazy","Hang"]],["Fortnite",["Game","Battle","Dance","Build"]],["Graduation",["Cap","Gown","Diploma","School"]],
["Smoothie",["Blend","Fruit","Drink","Straw"]],["Zoo",["Animals","Cages","Visit","Lions"]],["Glasses",["Eyes","See","Frames","Wear"]],
["Earthquake",["Shake","Ground","Crack","Rumble"]],["Gum",["Chew","Bubble","Mint","Stick"]],["Wi-Fi",["Internet","Password","Signal","Router"]],
["Hammock",["Swing","Relax","Trees","Lie"]],["Paint",["Brush","Color","Wall","Art"]],["Bus",["School","Yellow","Driver","Stop"]],
["Cat",["Meow","Pet","Kitten","Purr"]],["Treehouse",["Branches","Climb","Wood","Backyard"]],["Group chat",["Text","Phone","Friends","Messages"]]
];
const TEAMS={A:{name:"Team Red",cls:"t-red"},B:{name:"Team Green",cls:"t-green"}};
let K=null;
const X=()=>K.H&&K.H.ext;
const teamOf=(x,pid)=>x.teams.A.includes(pid)?"A":"B";
const other=t=>t==="A"?"B":"A";
const H=()=>K.H;

function cfgRows(box,c,set,segRow){
  box.append(segRow("Turn length",[[30,"30 sec"],[45,"45 sec"],[60,"1 min"],[90,"1½ min"]],c.turn,set("turn"),"How long each describer has."));
  box.append(segRow("Turns each",[[1,"1"],[2,"2"],[3,"3"]],c.laps,set("laps"),"How many times everyone gets to describe."));
  box.append(segRow("Banned word said",[[0,"No penalty"],[1,"−1 point"]],c.buzz,set("buzz"),"The other team buzzes on their phones."));
  box.append(segRow("Skipping a card",[[0,"Free"],[1,"−1 point"]],c.skip,set("skip")));
}

/* ---------- TV ---------- */
async function deal(ids){
  const c=K.cfg(ID);const sh=K.shuffle(ids);
  const teams={A:[],B:[]};sh.forEach((id,i)=>teams[i%2?"B":"A"].push(id));
  const per=Math.max(teams.A.length,teams.B.length);const order=[];
  for(let lap=0;lap<(c.laps||1);lap++)for(let i=0;i<per;i++){order.push(teams.A[i%teams.A.length]);order.push(teams.B[i%teams.B.length])}
  K.H.ext={teams,order,turnNo:0,score:{A:0,B:0},deck:K.shuffle(CARDS.map((_,i)=>i)),deckPos:0,turn:null,endsAt:0,last:null,lastSec:null};
  await dealTurn();
}
function nextCards(x,n){
  const out=[];for(let i=0;i<n;i++){if(x.deckPos>=x.deck.length){x.deck=K.shuffle(x.deck);x.deckPos=0}out.push(x.deck[x.deckPos++])}
  return out;
}
async function dealTurn(){
  const x=X();const giver=x.order[x.turnNo];const team=teamOf(x,giver);
  const deck=nextCards(x,24).map(i=>CARDS[i]);
  const cards={};
  K.H.roster.forEach(r=>{cards[r.pid]=r.pid===giver?{role:"giver",deck}:teamOf(x,r.pid)===team?{role:"guess"}:{role:"watch",deck}});
  const r=await K.api({action:"dealCards",code:K.H.code,hostToken:K.H.hostToken,game:ID,cards});
  K.H.round=r.round;
  x.turn={giver,team,deck,idx:0,log:[]};x.endsAt=0;x.last=null;x.lastSec=null;
}
function startTurn(){
  const x=X();if(!x||K.H.phase!=="ready")return;
  x.endsAt=Date.now()+K.cfg(ID).turn*1000+600;
  K.Music.sting("go")||K.FX.play("whoosh");K.ANN.say("go");
  K.setPhase("turn");
}
function endTurn(){const x=X();if(!x||K.H.phase!=="turn")return;x.endsAt=0;K.setPhase("turnEnd")}
async function nextTurn(){
  const x=X();if(!x||x.busy)return;
  if(x.turnNo>=x.order.length-1)return finish();
  x.busy=true;K.renderHost();
  try{x.turnNo++;await dealTurn();K.H.err="";K.setPhase("ready")}
  catch(e){x.turnNo--;K.H.err=e.message}
  finally{x.busy=false;K.renderHost()}
}
function finish(){
  const x=X();const a=x.score.A,b=x.score.B;const win=a===b?null:a>b?"A":"B";
  const rp={};if(win)x.teams[win].forEach(id=>rp[id]=3);
  K.addScores(rp);K.H.reveal={rp,win};K.setPhase("result");
}
function onAct(p){
  const x=X();if(!x)return;const h=K.H;
  if(p.type==="start"&&h.phase==="ready"&&p.pid===x.turn.giver)return startTurn();
  if(h.phase!=="turn"||p.i!==x.turn.idx)return;
  const t=x.turn,card=t.deck[t.idx];if(!card)return;
  const c=K.cfg(ID);let kind=null;
  if((p.type==="got"||p.type==="skip")&&p.pid===t.giver)kind=p.type;
  else if(p.type==="buzz"&&teamOf(x,p.pid)!==t.team)kind="buzz";
  if(!kind)return;
  if(kind==="got"){x.score[t.team]++;K.addScores({[t.giver]:1});K.FX.play("accept")}
  else if(kind==="skip"){x.score[t.team]-=c.skip?1:0;K.FX.play("swoosh")}
  else{x.score[t.team]-=c.buzz?1:0;K.FX.play("buzzer");K.FX.vibrate(80)}
  t.log.push({w:card[0],k:kind,by:p.pid});t.idx++;x.last={k:kind,at:Date.now()};
  if(t.idx>=t.deck.length)return endTurn();
  K.broadcast();K.renderHost();
}
function tick(){
  const h=K&&K.H;if(!h||h.game!==ID||h.phase!=="turn")return;const x=h.ext;if(!x||!x.endsAt)return;
  const left=(x.endsAt-Date.now())/1000;const el=document.getElementById("tabooTimer");
  if(el){el.textContent=K.fmt(Math.max(0,left));el.classList.toggle("hurry",left>0&&left<=10)}
  const sec=Math.ceil(left);
  if(sec!==x.lastSec){x.lastSec=sec;if(K.mode==="host"){if(sec>0&&sec<=3)K.ANN.count(sec);else if(sec>0&&sec<=10)K.FX.play("tick")}}
  if(left<=0){if(K.mode==="host"){K.FX.play("buzzer");K.ANN.line("timeout")}endTurn()}
}
function pub(){
  const x=X();if(!x)return null;const t=x.turn||{};const h=K.H;
  const showLog=h.phase==="turnEnd"||h.phase==="result";
  return {teams:x.teams,score:x.score,turnNo:x.turnNo,turns:x.order.length,giver:t.giver,team:t.team,idx:t.idx,endsAt:x.endsAt,
    got:(t.log||[]).filter(l=>l.k==="got").length,last:x.last,log:showLog?t.log:null,next:x.order[x.turnNo+1]||null,win:h.reveal&&h.reveal.win};
}

const n=pid=>K.nameOf(pid);
const names=list=>list.map(n).join(", ");
function teamBoard(x,vertical){
  const box=K.el("div",{class:"team-board"+(vertical?" vert":"")});
  ["A","B"].forEach(t=>box.append(K.el("div",{class:"team-box "+TEAMS[t].cls},K.el("b",{text:TEAMS[t].name}),K.el("span",{class:"team-score",text:String(x.score[t])}),K.el("small",{text:names(x.teams[t])}))));
  return box;
}
function logList(log,nameFn){
  const ul=K.el("ul",{class:"turn-log"});
  (log||[]).forEach(l=>ul.append(K.el("li",{class:"k-"+l.k},K.el("span",{text:l.w}),K.el("b",{text:l.k==="got"?"✓ Got it":l.k==="skip"?"Skipped":"BUZZ by "+nameFn(l.by)}))));
  if(!(log||[]).length)ul.append(K.el("li",null,K.el("span",{text:"No cards this turn."})));
  return ul;
}
function renderHost(main,side){
  const h=K.H,x=X(),el=K.el;if(!x)return;const t=x.turn;
  if(h.phase==="ready"){
    const mates=x.teams[t.team].filter(id=>id!==t.giver);
    main.append(el("p",{class:"eyebrow",text:"Turn "+(x.turnNo+1)+" of "+x.order.length}),
      el("p",{class:"big-msg"},el("span",{class:TEAMS[t.team].cls+"-txt",text:n(t.giver)}),document.createTextNode(" is up for "+TEAMS[t.team].name+"!")),
      el("p",{class:"sub",text:names(mates)+" guess out loud. "+TEAMS[other(t.team)].name+" watches the card and buzzes banned words."}));
    const b=el("button",{class:"btn-big",text:"Start the turn",onclick:startTurn});
    main.append(b,el("p",{class:"sub",text:n(t.giver)+" can also start it from their phone."}),K.errLine());
    side.append(teamBoard(x,true));return;
  }
  if(h.phase==="turn"){
    const got=t.log.filter(l=>l.k==="got").length;
    const flash=x.last&&Date.now()-x.last.at<1500?x.last.k:null;
    main.append(el("p",{class:"eyebrow",text:TEAMS[t.team].name+" · turn "+(x.turnNo+1)+" of "+x.order.length}),
      el("p",{class:"big-msg",text:n(t.giver)+" is talmbout it…"}),
      el("div",{class:"taboo-live"},el("div",{class:"timer",id:"tabooTimer",text:K.fmt(Math.max(0,(x.endsAt-Date.now())/1000))}),
        el("div",{class:"got-count"},el("b",{text:String(got)}),el("span",{text:got===1?"word":"words"})),
        flash?el("div",{class:"flash f-"+flash,text:flash==="got"?"✓ Got it!":flash==="skip"?"Skip":"BUZZ!"}):null),
      el("button",{class:"btn-chalk btn-small",text:"End turn early",onclick:endTurn}));
    side.append(teamBoard(x,true));return;
  }
  if(h.phase==="turnEnd"){
    const got=t.log.filter(l=>l.k==="got").length;const nx=x.order[x.turnNo+1];
    main.append(el("p",{class:"eyebrow",text:"Time!"}),el("p",{class:"big-msg",text:n(t.giver)+" got "+got+(got===1?" word.":" words.")}),
      el("div",{class:"panel"},el("h3",{text:"This turn"}),logList(t.log,n)));
    main.append(el("button",{class:"btn-big",text:x.busy?"Dealing…":nx?"Next: "+n(nx)+" for "+TEAMS[teamOf(x,nx)].name:"See who won",onclick:nextTurn}),K.errLine());
    side.append(teamBoard(x,true));return;
  }
  if(h.phase==="result"){
    const w=h.reveal&&h.reveal.win;
    main.append(el("p",{class:"verdict win",text:w?TEAMS[w].name+" wins!":"It's a tie!"}),
      el("p",{class:"reveal-line",text:"Final score: Team Red "+x.score.A+", Team Green "+x.score.B+"."+(w?" Everyone on "+TEAMS[w].name+" gets +3 tonight.":"")}));
    main.append(teamBoard(x,false));
    const sb=K.scoreboard();sb.append(el("p",{class:"sub",style:"font-size:.82rem",text:"Each word your team gets: +1 to the describer. Winning team: +3 each."}));main.append(sb);
    K.resultFooter(main);side.append(K.joinCard());
  }
}

/* ---------- phones ---------- */
function cardBox(card){
  return K.el("div",{class:"taboo-card"},K.el("p",{class:"tw",text:card[0]}),K.el("p",{class:"tb-label",text:"Don't say"}),
    K.el("ul",{class:"tb"},...card[1].map(w=>K.el("li",{text:w}))));
}
let sentIdx=null,sentRound=null;
function send(type,i){
  const s=K.P.state;if(sentRound===s.round&&sentIdx===i&&type!=="start")return;sentRound=s.round;sentIdx=i;
  K.act(type,{i});K.FX.vibrate(type==="buzz"?[60,40,60]:20);K.FX.play(type==="got"?"accept":type==="buzz"?"buzzer":"swoosh");
}
function phoneTimer(x){
  const t=K.el("div",{class:"timer"});const upd=()=>{const left=(x.endsAt-Date.now())/1000;t.textContent=left>0?K.fmt(left):"Time!";t.classList.toggle("hurry",left>0&&left<=10)};
  upd();const iv=setInterval(()=>{if(!t.isConnected)return clearInterval(iv);upd()},400);return t;
}
function renderPlayer(v,s){
  const x=s.ext,el=K.el,P=K.P;if(!x)return;
  const rn=pid=>K.rosterName(s,pid);const me=P.pid;const myTeam=x.teams.A.includes(me)?"A":"B";
  const card=K.card();const role=card&&card.role;
  const head=el("div",{class:"team-pill "+TEAMS[myTeam].cls},el("span",{text:"You're on "+TEAMS[myTeam].name}),el("b",{text:x.score.A+" – "+x.score.B}));
  v.append(head);
  if(s.phase==="result"){
    const w=x.win;const mine=w===myTeam;
    v.append(el("p",{class:"verdict "+(mine?"win":"lose"),text:w?(mine?"Your team wins!":TEAMS[w].name+" wins!"):"It's a tie!"}),
      el("p",{class:"reveal-line",text:"Team Red "+x.score.A+", Team Green "+x.score.B+"."}),K.myScore(s));return;
  }
  if(!card){
    if(K.cardErr())v.append(el("div",{class:"panel"},el("p",{class:"status err",text:K.cardErr()}),el("button",{class:"btn-felt",text:"Try again",onclick:K.retryCard})));
    else v.append(el("p",{class:"status on-felt",text:"Getting your card…"}));return;
  }
  const giver=x.giver,gName=rn(giver);
  if(s.phase==="ready"){
    if(role==="giver"){
      v.append(el("p",{class:"big-msg",text:"You're up!"}),el("p",{class:"sub",text:"Describe each word to your team. Don't say the word or any banned word. Tap Got it when they say it."}),
        el("button",{class:"btn-big",text:"Start my turn",onclick:()=>{K.act("start",{});K.FX.play("whoosh")}}));
      K.FX.vibrate([80,60,80]);
    }else if(role==="guess")v.append(el("p",{class:"big-msg",text:gName+" is describing to you!"}),el("p",{class:"sub",text:"Shout out your guesses. Fast!"}));
    else v.append(el("p",{class:"big-msg",text:"Watch "+gName+"."}),el("p",{class:"sub",text:"You'll see their card. Buzz if they say the word or a banned word!"}));
    return;
  }
  if(s.phase==="turn"){
    v.append(el("div",{class:"panel taboo-top"},phoneTimer(x),el("span",{class:"got-mini",text:"✓ "+x.got})));
    const c=card.deck&&card.deck[x.idx];
    if(role==="giver"&&c){
      v.append(cardBox(c),el("div",{class:"taboo-btns"},
        el("button",{class:"btn-big got-btn",text:"Got it ✓",onclick:()=>send("got",x.idx)}),
        el("button",{class:"btn-chalk",text:"Skip",onclick:()=>send("skip",x.idx)})));
    }else if(role==="watch"&&c){
      v.append(el("p",{class:"sub",text:gName+" is describing:"}),cardBox(c),
        el("button",{class:"btn-big buzz-btn",text:"BUZZ!",onclick:()=>send("buzz",x.idx)}),
        el("p",{class:"sub",text:"Buzz if "+gName+" says the word, a banned word, or acts it out."}));
    }else v.append(el("p",{class:"big-msg",text:"Guess out loud!"}),el("p",{class:"sub",text:gName+" is describing. Your team has "+x.got+(x.got===1?" word":" words")+" so far."}));
    return;
  }
  if(s.phase==="turnEnd"){
    v.append(el("p",{class:"big-msg",text:"Time!"}),el("div",{class:"panel"},el("h3",{text:gName+"'s turn"}),logList(x.log,rn)));
    if(x.next===me)v.append(el("p",{class:"status on-felt",text:"You're describing next. Get ready!"}));
    else if(x.next)v.append(el("p",{class:"sub",text:"Next up: "+rn(x.next)+"."}));
  }
}

window.GN_PLUGINS=window.GN_PLUGINS||{};
window.GN_PLUGINS[ID]={
  config:{name:"Talmbout",min:4,local:false,seg:null,timer:0,timerLabel:"",
    sub:{host:"Open a room. Everyone joins on their phone, and teams are picked for you."},
    rules:["Talmbout (TALM-bout), as in “what you talmbout?”","Everyone is split into Team Red and Team Green. Teams take turns.","The describer sees a word on their phone and describes it to their team, without saying the word or any of the banned words.","The other team sees the same card and buzzes if a banned word slips out.","Each word your team gets is a point. Most points after everyone's turn wins."]},
  defaults:{turn:60,laps:1,buzz:1,skip:0},
  startPhase:"ready",cardPhases:["ready","turn","turnEnd"],
  init(core){K=core;setInterval(tick,250)},
  cfgRows,deal,pub,onAct,renderHost,renderPlayer,
  scene(phase){
    const x=K&&K.H?pub():(K&&K.P&&K.P.state&&K.P.state.ext);if(!x)return null;
    const rn=pid=>K.H?K.nameOf(pid):K.rosterName(K.P.state,pid);
    if(phase==="ready")return [rn(x.giver)+"'s up!",TEAMS[x.team].name];
    if(phase==="turn")return ["Talk!","Don't say it"];
    if(phase==="turnEnd")return ["Time!",TEAMS[x.team].name];
    if(phase==="result")return ["Final score","Talmbout"];
    return null;
  },
  music(ph){return ph==="turn"?["lobby",0.12]:ph==="result"?["party",0.33]:["deal",0.25]}
};
})();
