import { PUSHES_PER_CLIMB } from './state.js';

const clamp = x => Math.max(0, Math.min(1, x));
function random(seed) { let n = seed; return () => { n = (n * 1664525 + 1013904223) >>> 0; return n / 4294967296; }; }

export class GameScene {
  constructor(canvas, state) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.state = state;
    this.position = state.climbPushes / PUSHES_PER_CLIMB;
    this.lastPush = -1000; this.lastFrame = 0; this.dust = [];
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const rand = random(74);
    this.stars = Array.from({length:100}, () => [rand(),rand()*.72,rand()]);
    this.stones = Array.from({length:750}, () => [rand(),rand(),rand(),rand()]);
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }
  resize() {
    this.w = this.canvas.width = Math.round(Math.min(1000, innerWidth / 1.6));
    this.h = this.canvas.height = Math.round(this.canvas.clientHeight / (innerWidth / this.w));
    this.mobile = this.w < 410;
    this.start = {x:this.w * (this.mobile ? .18 : .29), y:this.h * .79};
    this.end = {x:this.w * .82, y:this.h * (this.mobile ? .47 : .39)};
    this.scale = Math.max(.65, Math.min(1.3, this.w / (this.mobile ? 350 : 850)));
    this.ctx.imageSmoothingEnabled = false;
  }
  point(progress) { return {x:this.start.x + (this.end.x-this.start.x)*progress, y:this.start.y+(this.end.y-this.start.y)*progress}; }
  push() {
    this.lastPush = performance.now();
    const p = this.point(this.position);
    for (let i=0;i<7;i++) this.dust.push({x:p.x-27*this.scale,y:p.y+7*this.scale,vx:-8-Math.random()*25,vy:-8-Math.random()*18,life:.4+Math.random()*.5});
  }
  finishReset() { this.position = 0; }
  poly(points, color) {
    const c=this.ctx; c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(Math.round(x),Math.round(y)):c.moveTo(Math.round(x),Math.round(y)));c.closePath();c.fill();
  }
  rect(x,y,w,h,color) { this.ctx.fillStyle=color;this.ctx.fillRect(Math.round(x),Math.round(y),Math.ceil(w),Math.ceil(h)); }
  draw(time, reset) {
    const c=this.ctx,w=this.w,h=this.h,s=this.scale,t=time/1000;
    const dt=Math.min(.05,(time-this.lastFrame)/1000 || .016);this.lastFrame=time;
    const impulse=this.reduced?0:Math.max(0,1-(time-this.lastPush)/230);
    c.save();c.clearRect(0,0,w,h);
    if(impulse)c.translate(Math.round(Math.sin(time*.09)*impulse),Math.round(impulse*.6));
    const sky=c.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#10191e');sky.addColorStop(.6,'#263637');sky.addColorStop(1,'#14201f');c.fillStyle=sky;c.fillRect(0,0,w,h);
    for(const [x,y,a] of this.stars){c.globalAlpha=.2+a*.45+(this.reduced?0:Math.sin(t*.5+x*30)*.1);this.rect(x*w,y*h,a>.9?2:1,1,'#d0c6a0');}c.globalAlpha=1;
    // A stepped moon and thin cloud bands keep the entire environment pixel-native.
    const mx=w*.73,my=h*.18,mr=18*s;
    for(let y=-mr;y<=mr;y+=2){const width=Math.sqrt(mr*mr-y*y);this.rect(mx-width,my+y,width*2,2,'#b2b9a0');}
    this.rect(mx-9*s,my-6*s,7*s,3*s,'#a2ac97');this.rect(mx+3*s,my+6*s,9*s,4*s,'#a2ac97');
    for(let i=0;i<7;i++){
      const x=((i*.193*w+(this.reduced?0:t*(i%2?1:-1)*.9)+w*2)%(w*1.4))-w*.2;
      const y=h*(.13+i*.053); c.globalAlpha=.15;
      this.rect(x,y,75*s,3*s,'#728780');this.rect(x+17*s,y-3*s,35*s,3*s,'#728780');c.globalAlpha=1;
    }
    this.poly([[0,h*.59],[w*.08,h*.51],[w*.16,h*.56],[w*.27,h*.39],[w*.35,h*.48],[w*.43,h*.4],[w*.53,h*.59],[w*.66,h*.47],[w*.81,h*.59],[w,h*.42],[w,h],[0,h]],'#243331');
    this.poly([[0,h*.73],[w*.16,h*.61],[w*.27,h*.65],[w*.4,h*.53],[w*.55,h*.69],[w*.69,h*.57],[w*.83,h*.7],[w,h*.59],[w,h],[0,h]],'#1c2b2a');
    // Distant temple silhouettes.
    this.temple(w*.13,h*.61,.65*s,'#34403a');
    this.temple(w*.52,h*.58,.45*s,'#2e3d36');
    for(let i=0;i<5;i++){c.globalAlpha=.055;this.rect(0,h*(.60+i*.046),w,8+i*2,'#a3b9a1');}c.globalAlpha=1;
    const a=this.start,b=this.end;
    const ridge=[];for(let i=0;i<=64;i++){const p=this.point(i/64);ridge.push([p.x,p.y+(i%3===0?-1:1)]);}
    this.poly([[0,h*.96],[a.x-55*s,a.y+18*s],...ridge,[b.x+22*s,b.y+2*s],[b.x+60*s,b.y+35*s],[w,h*.53],[w,h],[0,h]],'#303832');
    this.poly([[a.x+30*s,a.y+30*s],[b.x,b.y+7*s],[b.x+27*s,b.y+50*s],[w*.68,h],[w*.35,h]],'#252e29');
    this.poly([[b.x+35*s,b.y+25*s],[w,h*.54],[w,h],[w*.75,h]],'#202b27');
    // Rock strata follow the diagonal ascent, with deterministic chiseled flecks.
    for(const [rx,ry,rz,ra] of this.stones){
      const x=rx*w,y=h*(.39+ry*.61);
      const line=a.y+(b.y-a.y)*(x-a.x)/(b.x-a.x);
      if(y>line+8*s && x>a.x-55*s && (x<b.x || y>b.y+(x-b.x)*.75))
        this.rect(x,y,(2+rz*10)*s,(1+ra*2)*s,ra>.88?'#535143':ra>.45?'#384038':'#1e2925');
    }
    c.strokeStyle='#77705a';c.lineWidth=2*s;c.beginPath();ridge.forEach(([x,y],i)=>i?c.lineTo(Math.round(x),Math.round(y)):c.moveTo(x,y));c.stroke();
    c.strokeStyle='#a0936c';c.lineWidth=s;c.beginPath();c.moveTo(a.x,a.y-1);c.lineTo(b.x,b.y-1);c.stroke();
    // Broken columns mark a summit that offers no escape.
    this.column(b.x+12*s,b.y-1*s,28*s,5*s);this.column(b.x+30*s,b.y+9*s,42*s,7*s);
    this.rect(b.x+24*s,b.y-37*s,20*s,4*s,'#727363');
    let rockProgress,personProgress;
    if(reset!==null){
      this.position+=(1-this.position)*(1-Math.exp(-dt*18));
      rockProgress=reset<.5?this.position:1-Math.pow(clamp((reset-.5)/1.45),.75);
      personProgress=reset<.85?this.position:1-clamp((reset-.85)/1.9);
    } else {this.position=this.state.climbPushes/PUSHES_PER_CLIMB;rockProgress=personProgress=this.position;}
    const rock=this.point(rockProgress),person=this.point(personProgress);
    const moving=reset===null && Math.abs(this.state.boulderVelocity)>.08;
    this.character(person.x,person.y,impulse,t,(reset!==null && reset>.65)||moving,reset!==null && reset<.5);
    this.boulder(rock.x,rock.y,rockProgress*9+(reset!==null&&reset>.5?(reset-.5)*12:0),s);
    for(const p of this.dust){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=22*dt;p.life-=dt;c.globalAlpha=clamp(p.life*1.4);this.rect(p.x,p.y,2*s,2*s,'#bda273');}this.dust=this.dust.filter(p=>p.life>0);c.globalAlpha=1;
    for(let i=0;i<16;i++){const x=(i*67.7+(this.reduced?0:t*3))%w,y=h*.60+Math.sin(i*12+(this.reduced?0:t*.2))*h*.22;c.globalAlpha=.12+Math.sin(i+t)*.1;this.rect(x,y,1,1,'#e3ba72');}c.globalAlpha=1;
    // Foreground shale and grass frame the lower edge.
    this.poly([[0,h*.89],[w*.11,h*.85],[w*.22,h*.92],[w*.37,h*.90],[w*.5,h],[0,h]],'#101c1b');
    for(let i=0;i<20;i++){const x=i*w*.012,y=h*.9+Math.sin(i)*5;this.rect(x,y,1,8,'#24302a');this.rect(x-2,y+3,2,1,'#343d30');}
    c.restore();
  }
  column(x,y,height,width){this.rect(x,y-height,width,height,'#555c50');this.rect(x+1,y-height,1,height,'#85836b');this.rect(x-2,y-height-3,width+4,3,'#747760');this.rect(x-2,y-2,width+4,3,'#68705b');}
  temple(x,y,s,color){this.rect(x-2*s,y,65*s,4*s,color);for(let i=0;i<5;i++)this.rect(x+i*13*s,y-25*s,5*s,25*s,color);this.rect(x-3*s,y-30*s,64*s,5*s,color);this.poly([[x-7*s,y-30*s],[x+29*s,y-43*s],[x+64*s,y-30*s]],color);}
  boulder(x,y,angle,s){
    const c=this.ctx,r=31*s,cx=x+8*s,cy=y-r-4*s;
    const rand=random(61);
    // Rasterized sphere: lighting stays fixed while mineral patches rotate.
    for(let yy=-32;yy<32;yy+=2)for(let xx=-32;xx<32;xx+=2){
      if(xx*xx+yy*yy>31*31)continue;
      const shade=(-xx*.48-yy*.65)/32;const edge=Math.sqrt(xx*xx+yy*yy)/31;
      const value=Math.round(79+shade*24-(edge>.89?14:0)+rand()*8);
      this.rect(cx+xx*s,cy+yy*s,2*s,2*s,`rgb(${value+6},${value+7},${value})`);
    }
    c.save();c.beginPath();c.arc(cx,cy,r-3*s,0,Math.PI*2);c.clip();
    const rr=random(29);
    for(let i=0;i<55;i++){const px=(rr()-.5)*56,py=(rr()-.5)*56;const rx=px*Math.cos(angle)-py*Math.sin(angle),ry=px*Math.sin(angle)+py*Math.cos(angle);this.rect(cx+rx*s,cy+ry*s,(2+rr()*5)*s,2*s,i%3?'#424a4270':'#97978470');}
    c.restore();this.rect(cx-16*s,cy-27*s,17*s,2*s,'#aaa58a');this.rect(cx-24*s,cy-20*s,7*s,2*s,'#92977e');
  }
  character(x,y,push,t,walking,upright){
    const c=this.ctx,s=this.scale;c.save();c.translate(Math.round(x-28*s),Math.round(y+11*s));c.scale(s,s);
    const gait=walking&&!this.reduced?Math.sin(t*15)*4:push*3;
    const lean=upright?-3:push*2;
    const skin='#bd9571',light='#dbb48a',shadow='#8a7058';
    const limb=(pts,color,width)=>{c.strokeStyle=color;c.lineWidth=width;c.lineJoin='miter';c.lineCap='square';c.beginPath();pts.forEach(([xx,yy],i)=>i?c.lineTo(Math.round(xx),Math.round(yy)):c.moveTo(Math.round(xx),Math.round(yy)));c.stroke();};
    limb([[-4,-13],[-10-gait,-5],[-13-gait,0]],shadow,4);limb([[1,-13],[5+gait,-8],[3+gait,-1]],skin,4);
    this.rect(-17-gait,-1,8,3,'#b3a28b');this.rect(1+gait,-2,8,3,'#d2bb95');
    this.poly([[-8,-23],[1,-24],[4,-13],[-7,-10],[-11,-13]],'#bcb9a0');this.rect(-7,-17,2,5,'#777e6c');
    limb([[-5,-23],[-2+lean,-32],[3+lean,-36]],skin,8);
    limb([[1+lean,-31],[9+lean,-28],[17,-35]],shadow,3);
    limb([[2+lean,-34],[10+lean,-31],[17,-38]],light,3);
    this.rect(1+lean,-43,8,8,skin);this.rect(0+lean,-44,8,3,'#514c3e');this.rect(6+lean,-39,4,3,light);this.rect(4+lean,-36,5,3,'#615640');
    this.rect(-6,-26,7,3,'#d2c5a1');c.restore();
  }
}
