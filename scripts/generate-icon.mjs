import { mkdir, writeFile } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';
// Original procedural pixel art matching the game's palette.
const size = 256, pixels = Buffer.alloc(size * size * 4);
function pixel(x,y,r,g,b) {
  if (x<0 || y<0 || x>=size || y>=size) return;
  const p=(y*size+x)*4; pixels[p]=r; pixels[p+1]=g; pixels[p+2]=b; pixels[p+3]=255;
}
for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const xx=Math.floor(x/4)*4,yy=Math.floor(y/4)*4;
  let color=[16+yy/22,25+yy/18,30+yy/25];
  if(yy>221-xx*.52)color=[43,54,46];
  if(Math.abs(yy-(221-xx*.52))<3)color=[156,143,106];
  if((xx-200)**2+(yy-44)**2<17**2)color=[178,185,160];
  const dx=xx-145,dy=yy-99;
  if(dx*dx+dy*dy<43*43){const shade=Math.round(90-dx*.35-dy*.5);color=[shade+6,shade+7,shade];if(((xx*7+yy*13)%53)<9)color=[shade-12,shade-10,shade-15];}
  if((xx===40&&yy===52)||(xx===88&&yy===32)||(xx===52&&yy===100))color=[190,188,158];
  pixel(x,y,...color);
}
function rect(x,y,w,h,color){for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)pixel(xx,yy,...color);}
const skin=[189,149,113],light=[219,180,138];
rect(84,116,16,16,skin);rect(84,112,16,5,[81,76,62]);rect(76,132,18,30,skin);rect(68,156,24,16,[188,185,160]);
rect(92,136,20,7,light);rect(108,126,9,15,light);rect(68,168,7,27,skin);rect(83,168,7,20,skin);
rect(61,190,15,7,[211,193,161]);rect(82,182,15,7,[211,193,161]);
function crc32(data){let crc=0xffffffff;for(const b of data){crc^=b;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return(crc^0xffffffff)>>>0;}
function chunk(type,data){const name=Buffer.from(type),body=Buffer.concat([name,data]),out=Buffer.alloc(12+data.length);out.writeUInt32BE(data.length);body.copy(out,4);out.writeUInt32BE(crc32(body),8+data.length);return out;}
const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(size,0);ihdr.writeUInt32BE(size,4);ihdr[8]=8;ihdr[9]=6;
const rows=Buffer.alloc(size*(size*4+1));for(let y=0;y<size;y++)pixels.copy(rows,y*(size*4+1)+1,y*size*4,(y+1)*size*4);
const png=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',deflateSync(rows)),chunk('IEND',Buffer.alloc(0))]);
const ico=Buffer.alloc(22);ico.writeUInt16LE(1,2);ico.writeUInt16LE(1,4);ico.writeUInt16LE(1,10);ico.writeUInt16LE(32,12);ico.writeUInt32LE(png.length,14);ico.writeUInt32LE(22,18);
await mkdir('build',{recursive:true});await writeFile('build/icon.png',png);await writeFile('build/icon.ico',Buffer.concat([ico,png]));
console.log('Generated build/icon.png and build/icon.ico');
