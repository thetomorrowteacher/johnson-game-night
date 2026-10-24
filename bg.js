/* Animated background: soft glowing blobs in the family colors drift behind everything, with card suits,
   stars and dice floating up slowly. The mood shifts with the game (calm, hype, tense, night, party).
   Light on phones, paused when the tab is hidden, and a still picture for reduced motion. */
window.GN_BG=(function(){
  "use strict";
  const reduce=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;
  const cv=document.createElement("canvas");cv.id="bgfx";cv.setAttribute("aria-hidden","true");
  document.body.prepend(cv);
  const g=cv.getContext("2d");
  const phone=window.matchMedia&&matchMedia("(hover: none)").matches;
  let W=0,H=0,dpr=1;
  function size(){dpr=Math.min(phone?1.5:2,window.devicePixelRatio||1);W=innerWidth;H=innerHeight;cv.width=W*dpr;cv.height=H*dpr;g.setTransform(dpr,0,0,dpr,0,0)}
  size();addEventListener("resize",size);
  const MOODS={
    calm:{blobs:["#2f9a2b","#c8211a","#f6c21c"],alpha:.32,speed:1,glyphs:.6,tint:null},
    hype:{blobs:["#f6c21c","#c8211a","#2f9a2b"],alpha:.42,speed:1.8,glyphs:1,tint:null},
    tense:{blobs:["#c8211a","#5a120e","#2f9a2b"],alpha:.3,speed:.6,glyphs:.35,tint:"rgba(40,0,0,.18)"},
    night:{blobs:["#1c4b8c","#0b1f3a","#5a3a8c"],alpha:.38,speed:.45,glyphs:.25,tint:"rgba(5,12,40,.45)",stars:true},
    party:{blobs:["#f6c21c","#2f9a2b","#c8211a","#ffffff"],alpha:.45,speed:2.2,glyphs:1.4,tint:null,sparks:true}
  };
  let mood=MOODS.calm,cur={alpha:.32,speed:1,glyphs:.6,tint:0};
  const blobs=[];const N=phone?4:6;
  for(let i=0;i<N;i++)blobs.push({x:Math.random(),y:Math.random(),r:.25+Math.random()*.25,a:Math.random()*Math.PI*2,s:.00012+Math.random()*.00018,c:i});
  const GL=["♠","♥","♦","♣","★","⚄","✦"];
  const glyphs=[];const G=phone?14:30;
  for(let i=0;i<G;i++)glyphs.push(newGlyph(true));
  function newGlyph(any){return {x:Math.random(),y:any?Math.random():1.08,z:.4+Math.random()*.9,t:GL[Math.floor(Math.random()*GL.length)],rot:Math.random()*6,vr:(Math.random()-.5)*.01,sway:Math.random()*6}}
  const stars=[];for(let i=0;i<(phone?40:90);i++)stars.push({x:Math.random(),y:Math.random()*.7,r:Math.random()*1.4+.3,p:Math.random()*6});
  const sparks=[];
  let last=performance.now(),raf=0,running=false;
  function hexA(h,a){const n=parseInt(h.slice(1),16);return `rgba(${n>>16&255},${n>>8&255},${n&255},${a})`}
  function frame(now){
    const dt=Math.min(50,now-last);last=now;
    cur.alpha+=(mood.alpha-cur.alpha)*.03;cur.speed+=(mood.speed-cur.speed)*.03;cur.glyphs+=(mood.glyphs-cur.glyphs)*.03;
    cur.tint+=((mood.tint?1:0)-cur.tint)*.03;
    g.clearRect(0,0,W,H);
    g.globalCompositeOperation="lighter";
    blobs.forEach((b,i)=>{
      b.a+=b.s*dt*cur.speed;const x=(b.x+Math.cos(b.a)*.18)*W,y=(b.y+Math.sin(b.a*1.3)*.16)*H,r=b.r*Math.max(W,H);
      const col=mood.blobs[i%mood.blobs.length];const gr=g.createRadialGradient(x,y,0,x,y,r);
      gr.addColorStop(0,hexA(col,cur.alpha*.55));gr.addColorStop(1,hexA(col,0));g.fillStyle=gr;g.fillRect(0,0,W,H);
    });
    g.globalCompositeOperation="source-over";
    if(cur.tint>.02&&mood.tint){g.globalAlpha=cur.tint;g.fillStyle=mood.tint;g.fillRect(0,0,W,H);g.globalAlpha=1}
    if(mood.stars){stars.forEach(s=>{s.p+=dt*.002;g.globalAlpha=.35+.35*Math.sin(s.p);g.fillStyle="#fffaee";g.beginPath();g.arc(s.x*W,s.y*H,s.r,0,7);g.fill()});g.globalAlpha=1}
    g.textAlign="center";g.textBaseline="middle";
    glyphs.forEach((q,i)=>{
      q.y-=.00004*dt*q.z*cur.speed;q.rot+=q.vr*dt*.1;
      if(q.y<-.08)glyphs[i]=newGlyph(false);
      const x=(q.x+Math.sin(q.y*q.sway)*.015)*W,y=q.y*H;
      g.save();g.translate(x,y);g.rotate(q.rot*.3);g.globalAlpha=Math.min(.2,.11*q.z*cur.glyphs);
      g.fillStyle=(q.t==="♥"||q.t==="♦")?"#ff6b5e":q.t==="★"||q.t==="✦"?"#f6c21c":"#fffaee";
      g.font=`${Math.round(18+28*q.z)}px serif`;g.fillText(q.t,0,0);g.restore();
    });
    if(mood.sparks&&sparks.length<(phone?20:50)&&Math.random()<.4)sparks.push({x:Math.random()*W,y:H+10,vy:-(1+Math.random()*2.5),life:0,c:["#f6c21c","#fffaee","#3fb02f","#ff6b5e"][Math.floor(Math.random()*4)]});
    for(let i=sparks.length-1;i>=0;i--){const s=sparks[i];s.y+=s.vy*dt*.06;s.life+=dt;g.globalAlpha=Math.max(0,.7-s.life/4000);g.fillStyle=s.c;g.beginPath();g.arc(s.x+Math.sin(s.life/300)*8,s.y,2.2,0,7);g.fill();if(s.y<-10||s.life>4000)sparks.splice(i,1)}
    g.globalAlpha=1;
    raf=requestAnimationFrame(frame);
  }
  function start(){if(running||reduce)return;running=true;last=performance.now();raf=requestAnimationFrame(frame)}
  function stop(){running=false;cancelAnimationFrame(raf)}
  document.addEventListener("visibilitychange",()=>{document.hidden?stop():start()});
  if(reduce){frame(performance.now());stop()}else start();
  return {
    mood(m){const n=MOODS[m]||MOODS.calm;if(n===mood)return;mood=n;document.body.dataset.mood=m;if(reduce){frame(performance.now());cancelAnimationFrame(raf)}}
  };
})();
