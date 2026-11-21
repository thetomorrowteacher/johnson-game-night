/* Run the Block (working name; id "floor"): a game like the TV show The Floor.
   Every player owns a square on the TV grid, and every square has a category. The randomizer picks a challenger,
   who battles a neighbor in the NEIGHBOR's category. Duels use chess clocks: answer right and your clock stops
   and theirs starts. Pass and you lose 3 seconds. Whoever runs out of time first loses, and the winner takes
   all of the loser's squares. Last one standing runs the block.
   Answers are multiple choice on the dueling players' phones, so nobody has to judge. */
(function(){
"use strict";
const ID="floor";
/* ---------- categories ---------- */
const E=(name,list)=>({name,kind:"emoji",items:list.split("|").map(s=>{const i=s.indexOf(":");return [s.slice(0,i),s.slice(i+1)]})});
const CATS={
 animals:E("Animals","🐶:Dog|🐱:Cat|🐭:Mouse|🐰:Rabbit|🦊:Fox|🐻:Bear|🐼:Panda|🐨:Koala|🐯:Tiger|🦁:Lion|🐮:Cow|🐷:Pig|🐸:Frog|🐵:Monkey|🐔:Chicken|🐧:Penguin|🦉:Owl|🦄:Unicorn|🐝:Bee|🦋:Butterfly|🐢:Turtle|🐍:Snake|🐙:Octopus|🦀:Crab|🐬:Dolphin|🐳:Whale|🦈:Shark|🐊:Crocodile|🦓:Zebra|🦒:Giraffe|🐘:Elephant|🦛:Hippo|🦏:Rhino|🐪:Camel|🦘:Kangaroo|🦩:Flamingo|🦜:Parrot|🦔:Hedgehog|🦥:Sloth|🦦:Otter|🐌:Snail|🐞:Ladybug|🕷️:Spider|🦇:Bat|🐺:Wolf|🦌:Deer|🐴:Horse|🐑:Sheep"),
 food:E("Food","🍕:Pizza|🍔:Burger|🌭:Hot dog|🍟:Fries|🌮:Taco|🍣:Sushi|🍜:Ramen|🍝:Spaghetti|🥞:Pancakes|🧇:Waffle|🥐:Croissant|🥨:Pretzel|🧀:Cheese|🥚:Egg|🥓:Bacon|🍗:Chicken leg|🍤:Fried shrimp|🥗:Salad|🍿:Popcorn|🍩:Donut|🍪:Cookie|🧁:Cupcake|🍦:Ice cream|🍫:Chocolate|🍭:Lollipop|🍎:Apple|🍌:Banana|🍇:Grapes|🍓:Strawberry|🍉:Watermelon|🍍:Pineapple|🥥:Coconut|🥭:Mango|🍋:Lemon|🍑:Peach|🍒:Cherries|🥑:Avocado|🥕:Carrot|🌽:Corn|🥦:Broccoli|🌶️:Hot pepper|🥔:Potato|🧄:Garlic|🍞:Bread|🥪:Sandwich|🌯:Burrito|🥟:Dumpling|🥜:Peanuts"),
 vehicles:E("Things That Go","🚗:Car|🚕:Taxi|🚌:Bus|🚑:Ambulance|🚒:Fire truck|🚓:Police car|🚜:Tractor|🏎️:Race car|🏍️:Motorcycle|🛵:Scooter|🚲:Bicycle|🛴:Kick scooter|🚂:Train|🚇:Subway|🚁:Helicopter|✈️:Airplane|🚀:Rocket|🛸:UFO|🚢:Ship|⛵:Sailboat|🚤:Speedboat|🛶:Canoe|🚠:Cable car|🛹:Skateboard|🚚:Delivery truck|🛺:Tuk-tuk|🚐:Minivan|🛻:Pickup truck|🚛:Big rig|🚃:Tram|🛷:Sled|🦽:Wheelchair"),
 sports:E("Sports","⚽:Soccer|🏀:Basketball|🏈:Football|⚾:Baseball|🎾:Tennis|🏐:Volleyball|🏉:Rugby|🎱:Pool|🏓:Ping pong|🏸:Badminton|🏒:Ice hockey|🥍:Lacrosse|🏏:Cricket|⛳:Golf|🥊:Boxing|🥋:Karate|🏹:Archery|🎣:Fishing|🏊:Swimming|🏄:Surfing|🚴:Cycling|🏇:Horse racing|⛷️:Skiing|🏂:Snowboarding|⛸️:Ice skating|🤺:Fencing|🏋️:Weightlifting|🧗:Rock climbing|🤸:Gymnastics|🎳:Bowling|🥏:Frisbee|🤿:Scuba diving|🛼:Roller skating"),
 fun:E("Fun & Games","🎸:Guitar|🎹:Piano|🎺:Trumpet|🎷:Saxophone|🥁:Drums|🎻:Violin|🪕:Banjo|🎤:Microphone|🎧:Headphones|📻:Radio|🎉:Party popper|🎈:Balloon|🎁:Gift|🪅:Piñata|🎮:Video game|🎲:Dice|🧩:Puzzle piece|🪀:Yo-yo|🪁:Kite|🎨:Paint palette|🎭:Theater masks|🎬:Movie clapper|📸:Camera|🎟️:Ticket|🎡:Ferris wheel|🎢:Roller coaster|🎠:Carousel|🎪:Circus tent|♟️:Chess piece|🧸:Teddy bear|🪄:Magic wand"),
 nature:E("Weather & Nature","☀️:Sun|🌙:Moon|⭐:Star|🌈:Rainbow|☁️:Cloud|🌧️:Rain|⛈️:Thunderstorm|❄️:Snowflake|🌪️:Tornado|🌊:Wave|🔥:Fire|🌋:Volcano|🏔️:Snowy mountain|🏝️:Island|🏜️:Desert|🌵:Cactus|🌴:Palm tree|🌲:Pine tree|🍁:Maple leaf|🍄:Mushroom|🌻:Sunflower|🌹:Rose|🌷:Tulip|🌸:Cherry blossom|🌍:Earth|🪐:Ringed planet|☄️:Comet|⚡:Lightning|💧:Water drop|🌫️:Fog|🐚:Seashell|🌾:Wheat|🍀:Four-leaf clover"),
 jobs:E("Jobs","👩‍🍳:Chef|👨‍🚒:Firefighter|👮:Police officer|👩‍⚕️:Doctor|👨‍🏫:Teacher|👩‍🚀:Astronaut|👨‍🌾:Farmer|👩‍🔧:Mechanic|👷:Construction worker|💂:Royal guard|🕵️:Detective|👨‍✈️:Pilot|👩‍🎤:Singer|👨‍🎨:Artist|👩‍💻:Coder|👨‍🔬:Scientist|🧑‍⚖️:Judge|💇:Hairdresser|🧑‍🏭:Factory worker|👰:Bride|🤵:Groom|🧙:Wizard|🦸:Superhero|🧛:Vampire|🧜:Mermaid|🤡:Clown|🎅:Santa|👸:Princess|🤴:Prince|🥷:Ninja"),
 opposites:{name:"Opposites",kind:"text",ask:w=>"Opposite of "+w,pairs:"Hot:Cold|Up:Down|Big:Small|Fast:Slow|Happy:Sad|Day:Night|Open:Closed|Wet:Dry|Loud:Quiet|Early:Late|Full:Empty|Heavy:Light|Hard:Soft|In:Out|Win:Lose|Young:Old|Buy:Sell|Push:Pull|Rich:Poor|Clean:Dirty|First:Last|Laugh:Cry|Strong:Weak|Inside:Outside|Front:Back|Above:Below|Sweet:Sour|Thick:Thin|Wide:Narrow|Begin:End|Asleep:Awake|Brave:Scared|Lost:Found|Always:Never|Tall:Short|Love:Hate|Sharp:Dull|Remember:Forget|Arrive:Leave|Smooth:Rough"},
 capitals:{name:"World Capitals",kind:"text",ask:w=>"Capital of "+w,pairs:"Bahamas:Nassau|Thailand:Bangkok|Jamaica:Kingston|France:Paris|Japan:Tokyo|Italy:Rome|Spain:Madrid|Germany:Berlin|England:London|Egypt:Cairo|Kenya:Nairobi|Nigeria:Abuja|Ghana:Accra|China:Beijing|South Korea:Seoul|India:New Delhi|Russia:Moscow|Canada:Ottawa|Mexico:Mexico City|Brazil:Brasília|Argentina:Buenos Aires|Australia:Canberra|Greece:Athens|Ireland:Dublin|Cuba:Havana|Haiti:Port-au-Prince|Ethiopia:Addis Ababa|Vietnam:Hanoi|Philippines:Manila|Turkey:Ankara|UAE:Abu Dhabi|Senegal:Dakar|Peru:Lima|Portugal:Lisbon|Norway:Oslo|Sweden:Stockholm|Poland:Warsaw|Indonesia:Jakarta|Barbados:Bridgetown|Trinidad and Tobago:Port of Spain"},
 states:{name:"Which State?",kind:"text",ask:w=>w+" is in…",pairs:"Memphis:Tennessee|Nashville:Tennessee|Atlanta:Georgia|Chicago:Illinois|Houston:Texas|Dallas:Texas|Miami:Florida|Orlando:Florida|New Orleans:Louisiana|Los Angeles:California|San Francisco:California|Seattle:Washington|Phoenix:Arizona|Las Vegas:Nevada|Denver:Colorado|Detroit:Michigan|Boston:Massachusetts|Philadelphia:Pennsylvania|Baltimore:Maryland|Charlotte:North Carolina|Birmingham:Alabama|Jackson:Mississippi|Little Rock:Arkansas|St. Louis:Missouri|Louisville:Kentucky|Cleveland:Ohio|Minneapolis:Minnesota|Milwaukee:Wisconsin|Salt Lake City:Utah|Honolulu:Hawaii|Anchorage:Alaska|Portland:Oregon|Oklahoma City:Oklahoma|Indianapolis:Indiana"},
 movies:{name:"Emoji Movies",kind:"emojiText",pairs:"🦁👑:The Lion King|❄️👸:Frozen|🐠🔍:Finding Nemo|🕷️🧑:Spider-Man|🐼🥋:Kung Fu Panda|👻🚫:Ghostbusters|🦖🏝️:Jurassic Park|🚗⚡:Cars|🐀👨‍🍳:Ratatouille|🎈🏠:Up|🤖🌱:WALL-E|🧸🤠:Toy Story|🐉🏹:How to Train Your Dragon|🐆👑:Black Panther|🌊🛶:Moana|💀🎸:Coco|🍫🏭:Willy Wonka|🧙⚡:Harry Potter|⭐⚔️:Star Wars|👸🐸:The Princess and the Frog|🐒👦🌴:The Jungle Book|🏀👽:Space Jam|🧜‍♀️🌊:The Little Mermaid|🦍🏙️:King Kong|🐻🍯:Winnie the Pooh|👨‍👩‍👧‍👦🦸:The Incredibles|🍝🐶:Lady and the Tramp|🐭🏰:Mickey Mouse|🦈🌊:Jaws|🧞🪔:Aladdin|🐘👂:Dumbo|🦇🧑:Batman|🕸️🧑‍🤝‍🧑:Spider-Verse"},
 home:{name:"Memphis & the Bahamas",kind:"quiz",qs:[
  ["Memphis sits on which river?","Mississippi",["Missouri","Ohio","Tennessee"]],["Capital of the Bahamas?","Nassau",["Freeport","Kingston","Bimini"]],
  ["Memphis's NBA team?","Grizzlies",["Pelicans","Hawks","Thunder"]],["Memphis street famous for the blues?","Beale Street",["Bourbon Street","Broadway","Main Street"]],
  ["Bahamian festival with costumes and drums?","Junkanoo",["Carnival","Crop Over","Mardi Gras"]],["Memphis is in which state?","Tennessee",["Mississippi","Arkansas","Alabama"]],
  ["Elvis's home in Memphis?","Graceland",["Neverland","Dollywood","Sun Studio"]],["The Bahamas are in which ocean?","Atlantic",["Pacific","Indian","Arctic"]],
  ["Bahamian seafood in fritters and salad?","Conch",["Lobster","Crab","Shrimp"]],["Memphis is famous for this food?","Barbecue",["Gumbo","Pizza","Tacos"]],
  ["Memphis soul music label of the 1960s?","Stax",["Motown","Def Jam","Atlantic"]],["The National Civil Rights Museum is in…","Memphis",["Atlanta","Nashville","Birmingham"]],
  ["Year the Bahamas became independent?","1973",["1962","1981","1958"]],["National flower of the Bahamas?","Yellow elder",["Hibiscus","Rose","Orchid"]],
  ["Bahamian money is the…","Bahamian dollar",["Peso","Pound","Euro"]],["Colors of the Bahamian flag?","Aquamarine, gold, black",["Red, white, blue","Green, gold, red","Black, white, gold"]],
  ["Bahamian lime drink?","Switcha",["Sorrel","Mauby","Sea moss"]],["Memphis's big pyramid is a…","Bass Pro Shop",["Museum","Hotel only","Stadium"]],
  ["Memphis college team?","Tigers",["Bulldogs","Wildcats","Gators"]],["Bahamian word for gossip?","Sip sip",["Tea","Chat chat","Talk talk"]]]},
 math:{name:"Quick Math",kind:"math"},
 letter:{name:"Missing Letter",kind:"letter",words:"BANANA|PIZZA|SCHOOL|MONKEY|PENCIL|ROCKET|TURTLE|WINDOW|GARDEN|PLANET|DOCTOR|BASKET|COOKIE|DRAGON|TIGER|ZEBRA|PIRATE|CASTLE|SPIDER|JUNGLE|BUTTER|SUMMER|WINTER|ORANGE|PURPLE|YELLOW|SILVER|FAMILY|FRIEND|BREAKFAST|HOLIDAY|BIRTHDAY|MEMPHIS|BAHAMAS|THAILAND|SNACK|CHURCH|COUSIN|GRANDMA|TEACHER"}
};
const CAT_IDS=Object.keys(CATS);
let K=null;
const X=()=>K.H&&K.H.ext;
const shuf=a=>K.shuffle(a);

/* Build one clue: {p: prompt, emoji: bool, opts: [4], ans: index} */
function makeClue(catId,used){
  const C=CATS[catId];
  const pick4=(answer,pool)=>{const d=shuf(pool.filter(x=>x!==answer)).slice(0,3);const opts=shuf([answer,...d]);return {opts,ans:opts.indexOf(answer)}};
  if(C.kind==="emoji"||C.kind==="emojiText"){
    const items=C.kind==="emoji"?C.items:C.pairs.split("|").map(s=>{const i=s.indexOf(":");return [s.slice(0,i),s.slice(i+1)]});
    let pool=items.map((_,i)=>i).filter(i=>!used.has(catId+":"+i));if(!pool.length){[...used].forEach(k=>{if(k.startsWith(catId+":"))used.delete(k)});pool=items.map((_,i)=>i)}
    const i=pool[K.rnd(pool.length)];used.add(catId+":"+i);
    const [e,name]=items[i];return Object.assign({p:e,emoji:true},pick4(name,items.map(x=>x[1])));
  }
  if(C.kind==="text"){
    const pairs=C.pairs.split("|").map(s=>s.split(":"));
    let pool=pairs.map((_,i)=>i).filter(i=>!used.has(catId+":"+i));if(!pool.length){[...used].forEach(k=>{if(k.startsWith(catId+":"))used.delete(k)});pool=pairs.map((_,i)=>i)}
    const i=pool[K.rnd(pool.length)];used.add(catId+":"+i);
    const [q,a]=pairs[i];return Object.assign({p:C.ask(q),emoji:false},pick4(a,[...new Set(pairs.map(x=>x[1]))]));
  }
  if(C.kind==="quiz"){
    let pool=C.qs.map((_,i)=>i).filter(i=>!used.has(catId+":"+i));if(!pool.length){[...used].forEach(k=>{if(k.startsWith(catId+":"))used.delete(k)});pool=C.qs.map((_,i)=>i)}
    const i=pool[K.rnd(pool.length)];used.add(catId+":"+i);
    const [q,a,wrong]=C.qs[i];const opts=shuf([a,...wrong]);return {p:q,emoji:false,opts,ans:opts.indexOf(a)};
  }
  if(C.kind==="math"){
    const op=["+","−","×","÷"][K.rnd(4)];let a,b,r;
    if(op==="+"){a=5+K.rnd(45);b=5+K.rnd(45);r=a+b}else if(op==="−"){a=20+K.rnd(60);b=1+K.rnd(a-1);r=a-b}
    else if(op==="×"){a=2+K.rnd(11);b=2+K.rnd(11);r=a*b}else{b=2+K.rnd(10);r=2+K.rnd(11);a=b*r}
    const near=new Set([r]);while(near.size<4){const d=r+(K.rnd(2)?1:-1)*(1+K.rnd(op==="×"?12:6));if(d>=0)near.add(d)}
    const opts=shuf([...near].map(String));return {p:a+" "+op+" "+b,emoji:false,opts,ans:opts.indexOf(String(r))};
  }
  if(C.kind==="letter"){
    const words=C.words.split("|");const w=words[K.rnd(words.length)];const i=K.rnd(w.length);const L=w[i];
    const others=shuf("ABCDEFGHIJKLMNOPRSTUWY".split("").filter(c=>c!==L)).slice(0,3);const opts=shuf([L,...others]);
    return {p:w.slice(0,i)+"_"+w.slice(i+1),emoji:false,opts,ans:opts.indexOf(L)};
  }
}

function cfgRows(box,c,set,segRow){
  box.append(segRow("Clock for each player",[[20,"20 sec"],[30,"30 sec"],[45,"45 sec"],[60,"1 min"]],c.clock,set("clock"),"Like a chess clock: it only runs on your turn. Pass costs 3 seconds."));
  box.append(segRow("Game length",[[0,"Last one standing"],[6,"6 duels"],[10,"10 duels"]],c.duels,set("duels"),"With a duel limit, whoever owns the most squares wins."));
  box.append(segRow("Wrong answer",[[1500,"1½ sec freeze"],[3000,"3 sec freeze"],[0,"No freeze"]],c.freeze,set("freeze")));
}

/* ---------- grid ---------- */
function layout(n){const cols=Math.ceil(Math.sqrt(n));return {cols,rows:Math.ceil(n/cols)}}
function neighbors(x,pid){
  const {cols}=x.grid;const out=new Set();
  x.cells.forEach((o,i)=>{if(o!==pid)return;const r=Math.floor(i/cols),c=i%cols;
    [[r-1,c],[r+1,c],[r,c-1],[r,c+1]].forEach(([rr,cc])=>{if(cc<0||cc>=cols||rr<0)return;const j=rr*cols+cc;if(j<x.cells.length&&x.cells[j]&&x.cells[j]!==pid)out.add(x.cells[j])})});
  return [...out];
}
const alive=x=>[...new Set(x.cells)];
const squares=(x,pid)=>x.cells.filter(o=>o===pid).length;

/* ---------- TV ---------- */
async function deal(ids){
  const c=K.cfg(ID);const order=shuf(ids);const cats=[];
  while(cats.length<order.length)cats.push(...shuf(CAT_IDS));
  const cat={};order.forEach((pid,i)=>cat[pid]=cats[i]);
  const cards={};ids.forEach(id=>cards[id]={on:true});
  const r=await K.api({action:"dealCards",code:K.H.code,hostToken:K.H.hostToken,game:ID,cards});
  K.H.round=r.round;
  K.H.ext={grid:layout(order.length),cells:order.slice(),cat,wins:{},duels:0,maxDuels:c.duels||0,clockMs:(c.clock||30)*1000,freeze:c.freeze==null?1500:c.freeze,
    used:new Set(),challenger:null,lastChallengers:[],duel:null,last:null,spin:0};
  pickChallenger();
}
function pickChallenger(){
  const x=X();const a=alive(x).filter(p=>neighbors(x,p).length);
  const w=a.map(p=>x.lastChallengers.includes(p)?0.3:1);let t=w.reduce((s,v)=>s+v,0)*Math.random(),k=0;
  for(;k<a.length-1;k++){t-=w[k];if(t<0)break}
  x.challenger=a[k];x.lastChallengers=[x.challenger].concat(x.lastChallengers).slice(0,2);x.spin=Date.now();
}
function startDuel(def){
  const x=X();const ch=x.challenger;if(!ch||!neighbors(x,ch).includes(def))return;
  const cat=x.cat[def];
  x.duel={a:ch,b:def,cat,clk:{[ch]:x.clockMs,[def]:x.clockMs},active:ch,clue:null,wrong:[],lockUntil:0,passUntil:0,startAt:Date.now()+3500,at:Date.now(),over:null,n:0};
  K.setPhase("duel");K.FX.play("whoosh");
}
function nextClue(){const d=X().duel;d.clue=Object.assign(makeClue(d.cat,X().used),{id:++d.n});d.wrong=[];d.passUntil=0;d.lockUntil=0}
function onAct(p){
  const x=X();if(!x)return;const ph=K.H.phase;
  if(p.type==="pick"&&ph==="floor"&&p.pid===x.challenger)return startDuel(String(p.target));
  if(p.type==="next"&&ph==="duelEnd"&&x.last&&p.pid===x.last.winner)return afterDuel(p.keep===true);
  const d=x.duel;if(!d||ph!=="duel"||d.over||!d.clue)return;
  if(p.pid!==d.active||p.id!==d.clue.id)return;
  const now=Date.now();if(now<d.startAt||now<d.passUntil)return;
  if(p.type==="pass"){spend();d.passUntil=now+3000;K.FX.play("swoosh");K.broadcast();K.renderHost();return}
  if(p.type==="answer"){
    if(now<d.lockUntil)return;const i=Number(p.i);if(d.wrong.includes(i))return;
    if(i===d.clue.ans){spend();K.FX.play("accept");d.active=d.active===d.a?d.b:d.a;d.at=Date.now();nextClue();K.broadcast();K.renderHost();return}
    d.wrong.push(i);d.lockUntil=now+x.freeze;K.FX.play("reject");K.broadcast();K.renderHost();
  }
}
/* charge the running clock up to now */
function spend(){const d=X().duel;const now=Date.now();if(now>d.at&&now>=d.startAt){d.clk[d.active]-=now-Math.max(d.at,d.startAt)}d.at=now}
function left(d,pid){if(pid!==d.active||Date.now()<d.startAt||d.over)return d.clk[pid];return d.clk[pid]-(Date.now()-Math.max(d.at,d.startAt))}
function tick(){
  const h=K&&K.H;if(!h||h.game!==ID)return;const x=h.ext;if(!x)return;
  if(h.phase==="duel"){
    const d=x.duel;if(!d||d.over)return;const now=Date.now();
    if(now>=d.startAt&&!d.clue){d.at=now;nextClue();if(K.mode==="host"){K.ANN.say("go");K.FX.play("whoosh")}K.broadcast();K.renderHost();return}
    if(now<d.startAt){const s=Math.ceil((d.startAt-now)/1000);if(s!==d.cd){d.cd=s;if(K.mode==="host"&&s<=3&&s>=1)K.ANN.count(s)}return}
    if(d.passUntil&&now>=d.passUntil){spend();nextClue();K.broadcast();K.renderHost();return}
    [d.a,d.b].forEach(pid=>{const el=document.getElementById("clk-"+pid);if(el){const l=left(d,pid);el.textContent=(Math.max(0,l)/1000).toFixed(l<10000?1:0);el.parentElement.classList.toggle("hurry",pid===d.active&&l<=5000)}});
    const l=left(d,d.active);const sec=Math.ceil(l/1000);
    if(sec!==d.lastSec){d.lastSec=sec;if(K.mode==="host"&&sec<=5&&sec>0)K.FX.play("tick")}
    if(l<=0)endDuel(d.active===d.a?d.b:d.a);
  }
}
function endDuel(winner){
  const x=X();const d=x.duel;spend();d.over={winner,loser:winner===d.a?d.b:d.a};
  const loser=d.over.loser;const took=squares(x,loser);
  x.cells=x.cells.map(o=>o===loser?winner:o);x.wins[winner]=(x.wins[winner]||0)+1;x.duels++;
  x.last={winner,loser,took,cat:d.cat,at:Date.now()};
  K.addScores({[winner]:1});
  if(K.mode==="host"){K.FX.play("buzzer");setTimeout(()=>{if(!K.Music.sting("win"))K.FX.play("win");K.FX.confetti(90)},600)}
  if(alive(x).length===1||(x.maxDuels&&x.duels>=x.maxDuels))return finish();
  K.setPhase("duelEnd");
}
function afterDuel(keep){
  const x=X();if(K.H.phase!=="duelEnd")return;
  if(keep&&neighbors(x,x.last.winner).length){x.challenger=x.last.winner;x.spin=0}else pickChallenger();
  x.duel=null;K.setPhase("floor");
}
function finish(){
  const x=X();const rank=alive(x).sort((p,q)=>squares(x,q)-squares(x,p)||(x.wins[q]||0)-(x.wins[p]||0));
  x.champ=rank[0];K.addScores({[x.champ]:5});K.H.reveal={rp:{[x.champ]:5}};K.setPhase("result");
}
function pub(){
  const x=X();if(!x)return null;const d=x.duel;
  return {grid:x.grid,cells:x.cells,cat:x.cat,challenger:x.challenger,spin:x.spin,wins:x.wins,duels:x.duels,maxDuels:x.maxDuels,last:x.last,champ:x.champ||null,
    nbrs:x.challenger?neighbors(x,x.challenger):[],
    duel:d?{a:d.a,b:d.b,cat:d.cat,active:d.active,clk:{[d.a]:left(d,d.a),[d.b]:left(d,d.b)},snap:Date.now(),startAt:d.startAt,over:d.over,
      clue:d.clue?{id:d.clue.id,p:d.clue.p,emoji:d.clue.emoji,opts:d.clue.opts,ans:d.passUntil||d.over?d.clue.ans:null}:null,
      wrong:d.wrong,lockUntil:d.lockUntil,passUntil:d.passUntil}:null};
}

/* ---------- drawing ---------- */
const PAL=["#c8211a","#2f9a2b","#2f6fd0","#e0a800","#9b4dca","#e07a1f","#1f9e9e","#d64593","#6b8e23","#8b5a2b","#4a5bd6","#c0392b","#16a085","#b7950b"];
function colorOf(x,pid){const ids=Object.keys(x.cat);return PAL[ids.indexOf(pid)%PAL.length]}
function floorGrid(x,nameFn,opts){
  opts=opts||{};const el=K.el;const {cols,rows}=x.grid;
  const g=el("div",{class:"floor-grid",style:`grid-template-columns:repeat(${cols},1fr);grid-template-rows:repeat(${rows},1fr)`});
  const shown=new Set();
  x.cells.forEach((o,i)=>{
    const first=!shown.has(o);shown.add(o);
    const taken=opts.flash&&x.last&&o===x.last.winner&&opts.flash.includes(i);
    const cls="floor-cell"+(o===x.challenger&&opts.phase==="floor"?" chal":"")+((opts.hl||[]).includes(o)?" hl":"")+(taken?" taken":"")+(o===opts.me?" me":"");
    const cell=el("div",{class:cls,style:"--oc:"+colorOf(x,o)+(taken?";animation-delay:"+(opts.flash.indexOf(i)*.12)+"s":"")});
    if(first){cell.append(el("b",{text:nameFn(o)}),el("small",{text:CATS[x.cat[o]].name}))}
    g.append(cell);
  });
  return g;
}
/* Phones and the TV can disagree about the time, so phones count from when each update arrived. */
let snapSeen={};
function tvNow(d){if(!d||!d.snap||K.H)return Date.now();if(!(d.snap in snapSeen))snapSeen={[d.snap]:Date.now()};return d.snap+(Date.now()-snapSeen[d.snap])}
function clockLeft(d,pid){const now=tvNow(d);return Math.max(0,d.clk[pid]-(pid===d.active&&!d.over&&now>=d.startAt?now-Math.max(d.snap,d.startAt):0))}
function clockBox(d,pid,nameFn,me){
  const el=K.el;const l=clockLeft(d,pid);
  return el("div",{class:"duel-clock"+(pid===d.active&&!d.over?" on":"")+(pid===me?" me":"")},el("b",{text:nameFn(pid)+(pid===me?" (you)":"")}),
    el("span",{id:"clk-"+pid,text:(l/1000).toFixed(l<10000?1:0)}));
}

/* ---------- TV screens ---------- */
function renderHost(main,side){
  const h=K.H,x=X(),el=K.el,n=K.nameOf;if(!x)return;const p=pub();
  if(h.phase==="floor"){
    const fresh=x.spin&&Date.now()-x.spin<2600;
    main.append(el("p",{class:"eyebrow",text:"Run the Block · duel "+(x.duels+1)+(x.maxDuels?" of "+x.maxDuels:"")+" · "+alive(x).length+" still standing"}),
      el("p",{class:"big-msg"+(fresh?" spin-in":"")},fresh?document.createTextNode("🎰 The randomizer picks… "):null,el("span",{class:"chal-name",style:"color:"+colorOf(x,x.challenger),text:n(x.challenger)}),document.createTextNode("!")),
      el("p",{class:"sub",text:n(x.challenger)+", pick a neighbor to battle on your phone. You'll play THEIR category."}),
      floorGrid(x,n,{phase:"floor",hl:p.nbrs}));
    const row=el("div",{class:"floor-picks"});p.nbrs.forEach(id=>row.append(el("button",{class:"btn-felt",style:"--oc:"+colorOf(x,id),onclick:()=>startDuel(id)},el("b",{text:n(id)}),el("small",{text:CATS[x.cat[id]].name}))));
    side.append(el("div",{class:"panel"},el("h3",{text:"Or pick for "+n(x.challenger)}),row),el("button",{class:"btn-chalk btn-small",text:"Spin again",onclick:()=>{pickChallenger();K.setPhase("floor")}}));
    return;
  }
  if(h.phase==="duel"){
    const d=x.duel;const pd=p.duel;const now=Date.now();
    main.append(el("p",{class:"eyebrow",text:n(d.a)+" vs. "+n(d.b)+" · "+CATS[d.cat].name}));
    side.append(el("div",{class:"panel"},el("h3",{text:"The block · winner takes "+squares(x,d.a===d.active?d.b:d.a)+"+"}),floorGrid(x,n,{phase:"duel",hl:[d.a,d.b]})));
    const clocks=el("div",{class:"duel-clocks"},clockBox(pd,d.a,n),el("span",{class:"vs",text:"VS"}),clockBox(pd,d.b,n));main.append(clocks);
    if(now<d.startAt){main.append(el("div",{class:"duel-count",text:String(Math.ceil((d.startAt-now)/1000))}),el("p",{class:"sub",text:n(d.a)+" goes first. Answers on your phones!"}));
      setTimeout(()=>{if(K.H&&K.H.phase==="duel")K.renderHost()},Math.min(1000,d.startAt-now+20));return}
    if(d.clue){
      const c=d.clue;const passing=d.passUntil&&now<d.passUntil;
      main.append(el("div",{class:"duel-clue"+(c.emoji?" emoji":"")+(d.shownId!==c.id?" card-in":"")},el("span",{text:c.p})));d.shownId=c.id;
      const ops=el("div",{class:"duel-opts"});c.opts.forEach((o,i)=>ops.append(el("div",{class:"duel-opt"+(d.wrong.includes(i)?" wrong":"")+(passing&&i===c.ans?" right":""),text:o})));
      main.append(ops,el("p",{class:"sub",text:passing?"Pass! The answer was "+c.opts[c.ans]+".":n(d.active)+" is answering…"}));
    }
    return;
  }
  if(h.phase==="duelEnd"){
    const L=x.last;const flash=x.cells.map((o,i)=>o===L.winner?i:-1).filter(i=>i>=0);
    main.append(el("p",{class:"verdict win",text:n(L.winner)+" wins the duel!"}),
      el("p",{class:"reveal-line",text:n(L.loser)+" is off the block. "+n(L.winner)+" takes "+L.took+(L.took===1?" square":" squares")+" and now owns "+squares(x,L.winner)+"."}),
      el("div",{class:"row floor-next"},neighbors(x,L.winner).length?el("button",{class:"btn-big",text:n(L.winner)+" keeps going",onclick:()=>afterDuel(true)}):null,
        el("button",{class:"btn-felt",text:"Back to the randomizer 🎰",onclick:()=>afterDuel(false)})),
      el("p",{class:"sub",text:n(L.winner)+" can choose on their phone too."}));
    side.append(el("div",{class:"panel"},el("h3",{text:"The block now"}),floorGrid(x,n,{phase:"end",flash})));
    return;
  }
  if(h.phase==="result"){
    main.append(el("p",{class:"verdict win",text:"👑 "+n(x.champ)+" runs the block!"}),
      el("p",{class:"reveal-line",text:n(x.champ)+" owns "+squares(x,x.champ)+" of "+x.cells.length+" squares after "+x.duels+(x.duels===1?" duel.":" duels.")}));
    side.append(el("div",{class:"panel"},el("h3",{text:"The final block"}),floorGrid(x,n,{phase:"end"})));
    const sb=K.scoreboard();sb.append(el("p",{class:"sub",style:"font-size:.82rem",text:"Every duel won: +1. Running the block: +5."}));main.append(sb);K.resultFooter(main);
  }
}

/* ---------- phones ---------- */
let phoneTick=null;
function renderPlayer(v,s){
  const x=s.ext,el=K.el,P=K.P;if(!x)return;const rn=pid=>K.rosterName(s,pid);const me=P.pid;
  clearInterval(phoneTick);
  const mine=x.cells.includes(me);
  if(s.phase==="result"){v.append(el("p",{class:"verdict "+(x.champ===me?"win":"lose"),text:x.champ===me?"👑 You run the block!":rn(x.champ)+" runs the block!"}),floorGrid(x,rn,{me}),K.myScore(s));return}
  if(s.phase!=="duel")v.append(el("div",{class:"team-pill t-green",style:"background:"+(mine?colorOf(x,me):"#555")},el("span",{text:mine?"Your category: "+CATS[x.cat[me]].name:"You're off the block. Watch!"}),el("b",{text:mine?squares(x,me)+(squares(x,me)===1?" square":" squares"):""})));
  if(s.phase==="floor"){
    if(x.challenger===me){
      v.append(el("p",{class:"big-msg",text:"You're the challenger!"}),el("p",{class:"sub",text:"Pick a neighbor to battle. You'll play THEIR category."}));
      const g=el("div",{class:"vote-grid floor-nbrs"});x.nbrs.forEach(id=>g.append(el("button",{type:"button",onclick:()=>{K.act("pick",{target:id});K.FX.play("whoosh")}},el("b",{text:rn(id)}),el("small",{text:CATS[x.cat[id]].name}))));
      v.append(g);K.FX.vibrate([80,50,80]);
    }else{
      v.append(el("p",{class:"big-msg",text:rn(x.challenger)+" is picking…"}));
      if(x.nbrs.includes(me))v.append(el("p",{class:"status on-felt",text:"You're next door. Get ready to defend "+CATS[x.cat[me]].name+"!"}));
    }
    v.append(floorGrid(x,rn,{phase:"floor",hl:x.nbrs,me}));return;
  }
  if(s.phase==="duel"){
    const d=x.duel;const inDuel=me===d.a||me===d.b;
    v.append(el("p",{class:"eyebrow",text:CATS[d.cat].name}),el("div",{class:"duel-clocks sm"},clockBox(d,d.a,rn,me),el("span",{class:"vs",text:"VS"}),clockBox(d,d.b,rn,me)));
    const upd=()=>{[d.a,d.b].forEach(pid=>{const e=document.getElementById("clk-"+pid);if(!e)return;const l=clockLeft(d,pid);e.textContent=(l/1000).toFixed(l<10000?1:0)})};
    phoneTick=setInterval(()=>{if(!v.isConnected)return clearInterval(phoneTick);upd()},100);
    const now=tvNow(d);
    if(now<d.startAt||!d.clue){v.append(el("p",{class:"big-msg",text:inDuel?"Get ready…":rn(d.a)+" vs. "+rn(d.b)}),el("div",{class:"duel-count sm",text:now<d.startAt?String(Math.ceil((d.startAt-now)/1000)):"GO"}));
      setTimeout(()=>{if(K.P&&K.P.state===s)K.renderPlayer()},Math.max(100,Math.min(1000,d.startAt-now+50)));return}
    const c=d.clue;const passing=d.passUntil&&now<d.passUntil;
    v.append(el("div",{class:"duel-clue sm"+(c.emoji?" emoji":"")},el("span",{text:c.p})));
    if(me===d.active){
      const locked=now<d.lockUntil;
      const g=el("div",{class:"duel-btns"});
      c.opts.forEach((o,i)=>g.append(el("button",{type:"button",class:(d.wrong.includes(i)?"wrong":"")+(passing&&i===c.ans?" right":""),disabled:d.wrong.includes(i)||passing||locked?"":null,text:o,onclick:()=>{K.act("answer",{id:c.id,i});K.FX.vibrate(12)}})));
      v.append(el("p",{class:"status on-felt your-turn",text:passing?"Pass! It was "+c.opts[c.ans]+".":locked?"Wrong! Wait a sec…":"Your turn! Tap the answer."}),g,
        el("button",{class:"btn-chalk",text:"Pass (−3 sec)",disabled:passing?"":null,onclick:()=>{K.act("pass",{id:c.id});K.FX.play("swoosh")}}));
      if(locked)setTimeout(()=>{if(K.P&&K.P.state===s)K.renderPlayer()},d.lockUntil-now+30);
    }else v.append(el("p",{class:"big-msg",text:inDuel?rn(d.active)+" is answering. You're next!":rn(d.active)+" is answering…"}));
    return;
  }
  if(s.phase==="duelEnd"){
    const L=x.last;
    v.append(el("p",{class:"verdict "+(L.winner===me?"win":L.loser===me?"lose":""),text:L.winner===me?"You won the duel! +1":L.loser===me?"You're off the block.":rn(L.winner)+" wins the duel!"}),floorGrid(x,rn,{phase:"end",me}));
    if(L.winner===me){
      const can=x.cells.some((o,i)=>o===me);
      v.append(el("button",{class:"btn-big",text:"Keep going! Challenge again",onclick:()=>{K.act("next",{keep:true})}}),el("button",{class:"btn-felt",text:"Back to the randomizer",onclick:()=>{K.act("next",{keep:false})}}));
    }
  }
}

window.GN_PLUGINS=window.GN_PLUGINS||{};
window.GN_PLUGINS[ID]={
  config:{name:"Run the Block",min:3,local:false,seg:null,timer:0,timerLabel:"",
    sub:{host:"Open a room. Everyone gets a square and a category on the TV."},
    rules:["Everyone owns a square on the TV, and every square has a category.","The randomizer picks a challenger, who battles a neighbor in the NEIGHBOR's category.","Duels use chess clocks: answer right on your phone and your clock stops while theirs runs. Pass and lose 3 seconds.","Run out of time and you're off the block. The winner takes all your squares, then can keep going or go back to the randomizer.","Last one standing runs the block. Each duel win: +1. Running the block: +5."]},
  defaults:{clock:30,duels:0,freeze:1500},
  startPhase:"floor",cardPhases:["floor","duel","duelEnd","result"],
  init(core){K=core;setInterval(tick,100);window.__floorHost=()=>K.H},
  cfgRows,deal,pub,onAct,renderHost,renderPlayer,
  scene(phase){
    const x=K&&K.H?pub():(K&&K.P&&K.P.state&&K.P.state.ext);if(!x)return null;
    const rn=pid=>K.H?K.nameOf(pid):K.rosterName(K.P.state,pid);
    if(phase==="floor")return ["🎰 The randomizer","Run the Block"];
    if(phase==="duel"&&x.duel)return [rn(x.duel.a)+" vs. "+rn(x.duel.b),CATS[x.duel.cat].name];
    if(phase==="duelEnd"&&x.last)return [rn(x.last.winner)+" takes it!","Run the Block"];
    if(phase==="result")return ["👑 Champion","Run the Block"];
    return null;
  },
  music(ph){return ph==="duel"?["tense",0.12]:ph==="result"||ph==="duelEnd"?["party",0.3]:["deal",0.25]}
};
})();
