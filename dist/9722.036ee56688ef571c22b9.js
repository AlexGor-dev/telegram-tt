<<<<<<<< HEAD:dist/9722.d34db8099e340829340c.js
(()=>{"use strict";var e,t,r={79722:(e,t,r)=>{var i=r(87784),a=r(49357);let o;importScripts(new URL(r(25404),r.b));const s=new Promise((e=>{Module.onRuntimeInitialized=()=>{o={init:Module.cwrap("lottie_init","",[]),destroy:Module.cwrap("lottie_destroy","",["number"]),resize:Module.cwrap("lottie_resize","",["number","number","number"]),buffer:Module.cwrap("lottie_buffer","number",["number"]),render:Module.cwrap("lottie_render","",["number","number"]),loadFromData:Module.cwrap("lottie_load_from_data","number",["number","number"])},e()}})),n=new Map;async function c(e){const t=await fetch(e),r=t.headers.get("Content-Type");if(r?.startsWith("text/"))return t.text();const a=await t.arrayBuffer();return(0,i.inflate)(a,{to:"string"})}function l(e,t,r){const i=t?30:60,a=JSON.parse(e).fr||i,o=a%i==0?a/i:1;return{reduceFactor:o,msPerFrame:1e3/(a/o),reducedFramesCount:Math.ceil(r/o)}}const d={"rlottie:init":async function(e,t,r,i,a,d){o||await s;const u=await c(t),f=allocate(intArrayFromString(u),"i8",0),h=o.init(),m=o.loadFromData(h,f);o.resize(h,r,r);const p=new ImageData(r,r),{reduceFactor:v,msPerFrame:g,reducedFramesCount:w}=l(u,i,m);n.set(e,{imgSize:r,reduceFactor:v,handle:h,imageData:p,customColor:a}),d(v,g,w)},"rlottie:changeData":async function(e,t,r,i){o||await s;const a=await c(t),d=allocate(intArrayFromString(a),"i8",0),{handle:u}=n.get(e),f=o.loadFromData(u,d),{reduceFactor:h,msPerFrame:m,reducedFramesCount:p}=l(a,r,f);i(h,m,p)},"rlottie:renderFrames":async function(e,t,r){o||await s;const{imgSize:i,reduceFactor:a,handle:c,imageData:l,customColor:d}=n.get(e),u=t*a;o.render(c,u);const f=o.buffer(c),h=Module.HEAPU8.subarray(f,f+i*i*4);if(d){const e=new Uint8ClampedArray(h);!function(e,t){for(let r=0;r<e.length;r+=4)e[r]=t[0],e[r+1]=t[1],e[r+2]=t[2]}(e,d),l.data.set(e)}else l.data.set(h);r(t,await createImageBitmap(l))},"rlottie:destroy":function e(t,r=!1){try{const e=n.get(t);o.destroy(e.handle),n.delete(t)}catch(i){r||setTimeout((()=>e(t,!0)),1e3)}}};(0,a.C)(d,"media");var u=r(65905),f=r(37836);const h=new Map;function m(e,t,r){var i;return(t="symbol"==typeof(i=function(e,t){if("object"!=typeof e||!e)return e;var r=e[Symbol.toPrimitive];if(void 0!==r){var i=r.call(e,"string");if("object"!=typeof i)return i;throw new TypeError("@@toPrimitive must return a primitive value.")}return String(e)}(t))?i:i+"")in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r,e}self.addEventListener("message",(e=>{const{type:t,messageId:r,result:i}=e.data;if("partResponse"===t){const e=h.get(r);e&&e.resolve(i)}}));const p=1024;var v=function(e){return e.loading="loading",e.ready="ready",e.closed="closed",e}(v||{});class g{constructor(e,{onConfig:t,onChunk:r,stepOffset:i,stepMultiplier:a,isPolyfill:o,maxFrames:s}){m(this,"url",void 0),m(this,"file",void 0),m(this,"status",v.loading),m(this,"stepOffset",void 0),m(this,"stepMultiplier",void 0),m(this,"maxFrames",void 0),m(this,"isPolyfill",void 0),m(this,"decodedSamples",new Set),m(this,"lastSample",0),m(this,"onConfig",void 0),m(this,"onChunk",void 0),this.url=e,this.stepOffset=i,this.stepMultiplier=a,this.maxFrames=s,this.isPolyfill=o,this.onConfig=t,this.onChunk=r,this.file=u.createFile(),this.file.onError=e=>{console.error(e)},this.file.onReady=this.onReady.bind(this),this.file.onSamples=this.onSamples.bind(this),this.loadMetadata()}async loadMetadata(){let e=0;for(;void 0!==e;){try{e=await this.requestPart(e,131072)}catch(e){console.error(e)}if(this.status===v.ready)break}}async loadNextFrames(e,t,r){let i=e*this.stepOffset,a=0,o=this.file.seek(i,!0);for(;this.status!==v.closed;)try{if(await this.requestPart(o.offset,r),i>t)break;this.lastSample>1&&a<this.lastSample&&(i+=e*this.stepMultiplier,a=this.lastSample),o=this.file.seek(i,!0)}catch(e){console.error(e)}this.file.flush()}async requestPart(e,t,r=!0){const i=e%p,a=e-i,o=a+t-1;let s=await function(e){const t=Date.now().toString(36)+Math.random().toString(36).slice(2),r={};let i=!1;const a=Promise.race([(0,f.v7)(3e4).then((()=>i?void 0:Promise.reject(new Error("ERROR_PART_TIMEOUT")))),new Promise(((e,t)=>{Object.assign(r,{resolve:e,reject:t})}))]);return h.set(t,r),a.catch((()=>{})).finally((()=>{h.delete(t),i=!0})),postMessage({type:"requestPart",messageId:t,params:e}),a}({url:this.url,start:a,end:o});if(!s)return;i&&(s=s.slice(i)),s.fileStart=e;const n=this.file.appendBuffer(s);return r?n:e+s.byteLength}description(e){const t=this.file.getTrackById(e.id);for(const e of t.mdia.minf.stbl.stsd.entries)if(e.avcC||e.hvcC||e.av1C){const t=new u.DataStream(void 0,0,u.DataStream.BIG_ENDIAN);return e.avcC?e.avcC.write(t):e.hvcC?e.hvcC.write(t):e.av1C&&e.av1C.write(t),new Uint8Array(t.buffer,8)}throw new Error("avcC, hvcC ro av1C not found")}onReady(e){const t=e.videoTracks[0];let r=t.codec;r.startsWith("avc1")&&(r="avc1.4d001f"),this.onConfig({codec:r,codedHeight:t.video.height,codedWidth:t.video.width,description:this.description(t)});const i=e.duration/e.timescale,a=this.isPolyfill?24:12,o=(s=t.bitrate/a)+p-s%p;var s;const n=function(e,t){return Math.round((e+t)/t)}(i,this.maxFrames);this.file.setExtractionOptions(t.id,void 0,{nbSamples:1}),this.file.start(),this.status=v.ready,this.loadNextFrames(n,i,o)}onSamples(e,t,r){if(this.status===v.ready)for(const t of r){const r=t.cts/t.timescale,i=t.is_sync?"key":"delta",a=`${i}${t.number}`;this.decodedSamples.has(a)||(this.onChunk(new EncodedVideoChunk({type:i,timestamp:1e6*r,duration:1e6*t.duration/t.timescale,data:t.data})),this.decodedSamples.add(a),this.lastSample=parseInt(t.number,10),t.is_sync&&this.file.releaseUsedSamples(e,t.number))}}close(){this.file.flush(),this.file.stop(),this.status=v.closed}}let w,y,b;const C={"video-preview:init":function(e,t,r,i,a){const o="VideoDecoder"in globalThis;if(!o)return console.log("[Video Preview] WebCodecs not supported"),new Promise((e=>{b=e}));const s=new Set;return w=new VideoDecoder({async output(e){const t=e.timestamp/1e6,r=Math.floor(t);if(!s.has(r)){const t=await createImageBitmap(e);s.add(r),a(r,t)}e.close()},error(e){console.error("[Video Preview] error",e)}}),y=new g(e,{stepOffset:r,stepMultiplier:i,isPolyfill:!o,maxFrames:t,onConfig(e){w?.configure(e)},onChunk(e){"configured"===w?.state&&w?.decode(e)}}),new Promise((e=>{b=e}))},"video-preview:destroy":function(){try{w?.close(),y?.close()}catch{}w=void 0,y=void 0,b?.()}};(0,a.C)(C,"media");const P=[1,57,41,21,203,34,97,73,227,91,149,62,105,45,39,137,241,107,3,173,39,71,65,238,219,101,187,87,81,151,141,133,249,117,221,209,197,187,177,169,5,153,73,139,133,127,243,233,223,107,103,99,191,23,177,171,165,159,77,149,9,139,135,131,253,245,119,231,224,109,211,103,25,195,189,23,45,175,171,83,81,79,155,151,147,9,141,137,67,131,129,251,123,30,235,115,113,221,217,53,13,51,50,49,193,189,185,91,179,175,43,169,83,163,5,79,155,19,75,147,145,143,35,69,17,67,33,65,255,251,247,243,239,59,29,229,113,111,219,27,213,105,207,51,201,199,49,193,191,47,93,183,181,179,11,87,43,85,167,165,163,161,159,157,155,77,19,75,37,73,145,143,141,35,138,137,135,67,33,131,129,255,63,250,247,61,121,239,237,117,29,229,227,225,111,55,109,216,213,211,209,207,205,203,201,199,197,195,193,48,190,47,93,185,183,181,179,178,176,175,173,171,85,21,167,165,41,163,161,5,79,157,78,154,153,19,75,149,74,147,73,144,143,71,141,140,139,137,17,135,134,133,66,131,65,129,1],S=[0,9,10,10,14,12,14,14,16,15,16,15,16,15,15,17,18,17,12,18,16,17,17,19,19,18,19,18,18,19,19,19,20,19,20,20,20,20,20,20,15,20,19,20,20,20,21,21,21,20,20,20,21,18,21,21,21,21,20,21,17,21,21,21,22,22,21,22,22,21,22,21,19,22,22,19,20,22,22,21,21,21,22,22,22,18,22,22,21,22,22,23,22,20,23,22,22,23,23,21,19,21,21,21,23,23,23,22,23,23,21,23,22,23,18,22,23,20,22,23,23,23,21,22,20,22,21,22,24,24,24,24,24,22,21,24,23,23,24,21,24,23,24,22,24,24,22,24,24,22,23,24,24,24,20,23,22,23,24,24,24,24,24,24,24,23,21,23,22,23,24,24,24,22,24,24,24,23,22,24,24,25,23,25,25,23,24,25,25,24,22,25,25,25,24,23,24,25,25,25,25,25,25,25,25,25,25,25,25,23,25,23,24,25,25,25,25,25,25,25,25,25,24,22,25,25,23,25,25,20,24,25,24,25,25,22,24,25,24,25,24,25,25,24,25,25,25,25,22,25,25,25,24,25,24,25,18];async function F(e){const t=await fetch(e),r=await t.blob();return createImageBitmap(r)}const x={"offscreen-canvas:blurThumb":async function(e,t,r){const i=t.startsWith("data:")?await function(e){const t=atob(e.split(",")[1]),r=e.split(",")[0].split(":")[1].split(";")[0],i=new ArrayBuffer(t.length),a=new Uint8Array(i);for(let e=0;e<t.length;e++)a[e]=t.charCodeAt(e);const o=new Blob([i],{type:r});return createImageBitmap(o)}(t):await F(t),{width:a,height:o}=e,s=e.getContext("2d"),n="filter"in s;n&&(s.filter=`blur(${r}px)`),s.drawImage(i,2*-r,2*-r,a+4*r,o+4*r),n||function(e,t,r,i,a,o,s){if(Number.isNaN(o)||o<1)return;o|=0,Number.isNaN(s)&&(s=1),(s|=0)>3&&(s=3),s<1&&(s=1);const n=e.getImageData(0,0,i,a),c=n.data;let l,d,u,f,h,m,p,v,g,w,y,b,C=i-1,F=a-1,x=o+1,M=[],O=[],k=[],I=P[o],D=S[o],j=[],_=[];for(;s-- >0;){for(b=y=0,h=0;h<a;h++){for(l=c[b]*x,d=c[b+1]*x,u=c[b+2]*x,m=1;m<=o;m++)p=b+((m>C?C:m)<<2),l+=c[p++],d+=c[p++],u+=c[p++];for(f=0;f<i;f++)M[y]=l,O[y]=d,k[y]=u,0==h&&(j[f]=((p=f+x)<C?p:C)<<2,_[f]=(p=f-o)>0?p<<2:0),v=b+j[f],g=b+_[f],l+=c[v++]-c[g++],d+=c[v++]-c[g++],u+=c[v++]-c[g++],y++;b+=i<<2}for(f=0;f<i;f++){for(w=f,l=M[w]*x,d=O[w]*x,u=k[w]*x,m=1;m<=o;m++)w+=m>F?0:i,l+=M[w],d+=O[w],u+=k[w];for(y=f<<2,h=0;h<a;h++)c[y]=l*I>>>D,c[y+1]=d*I>>>D,c[y+2]=u*I>>>D,0==f&&(j[h]=((p=h+x)<F?p:F)*i,_[h]=(p=h-o)>0?p*i:0),v=f+j[h],g=f+_[h],l+=M[v]-M[g],d+=O[v]-O[g],u+=k[v]-k[g],y+=i<<2}}e.putImageData(n,0,0)}(s,0,0,a,o,r,2)},"offscreen-canvas:getAppendixColorFromImage":async function(e,t){const r=await F(e),{width:i,height:a}=r,o=new OffscreenCanvas(i,a).getContext("2d");o.drawImage(r,0,0,i,a);const s=t?i-1:0,n=a-1;return`rgba(${Array.from(o.getImageData(s,n,1,1).data).join(",")})`}};(0,a.C)(x,"media")},37836:(e,t,r)=>{function i(e){return function(e,t){let r,i=!1;return(...a)=>{r=a,i||(i=!0,e((()=>{i=!1,t(...r)})))}}(s,e)}r.d(t,{Fe:()=>i,v7:()=>a});const a=e=>new Promise((t=>{setTimeout((()=>t()),e)}));let o;function s(e){o?o.push(e):(o=[e],Promise.resolve().then((()=>{const e=o;o=void 0,e.forEach((e=>e()))})))}},25404:(e,t,r)=>{e.exports=r.p+"rlottie-wasm.f013598f1b2ba719f25e.js"}},i={};function a(e){var t=i[e];if(void 0!==t)return t.exports;var o=i[e]={exports:{}};return r[e].call(o.exports,o,o.exports,a),o.exports}a.m=r,a.x=()=>{var e=a.O(void 0,[7784,5905,9357],(()=>a(79722)));return a.O(e)},e=[],a.O=(t,r,i,o)=>{if(!r){var s=1/0;for(d=0;d<e.length;d++){for(var[r,i,o]=e[d],n=!0,c=0;c<r.length;c++)(!1&o||s>=o)&&Object.keys(a.O).every((e=>a.O[e](r[c])))?r.splice(c--,1):(n=!1,o<s&&(s=o));if(n){e.splice(d--,1);var l=i();void 0!==l&&(t=l)}}return t}o=o||0;for(var d=e.length;d>0&&e[d-1][2]>o;d--)e[d]=e[d-1];e[d]=[r,i,o]},a.d=(e,t)=>{for(var r in t)a.o(t,r)&&!a.o(e,r)&&Object.defineProperty(e,r,{enumerable:!0,get:t[r]})},a.f={},a.e=e=>Promise.all(Object.keys(a.f).reduce(((t,r)=>(a.f[r](e,t),t)),[])),a.u=e=>e+"."+{5905:"efaeccc9ed0bc890f551",7784:"4e167a928464165e6412",9357:"277c456048ff35fe977c"}[e]+".js",a.miniCssF=e=>{},a.g=function(){if("object"==typeof globalThis)return globalThis;try{return this||new Function("return this")()}catch(e){if("object"==typeof window)return window}}(),a.o=(e,t)=>Object.prototype.hasOwnProperty.call(e,t),(()=>{var e;a.g.importScripts&&(e=a.g.location+"");var t=a.g.document;if(!e&&t&&(t.currentScript&&(e=t.currentScript.src),!e)){var r=t.getElementsByTagName("script");if(r.length)for(var i=r.length-1;i>-1&&(!e||!/^http(s?):/.test(e));)e=r[i--].src}if(!e)throw new Error("Automatic publicPath is not supported in this browser");e=e.replace(/#.*$/,"").replace(/\?.*$/,"").replace(/\/[^\/]+$/,"/"),a.p=e})(),(()=>{a.b=self.location+"";var e={9722:1};a.f.i=(t,r)=>{e[t]||importScripts(a.p+a.u(t))};var t=self.webpackChunktelegram_t=self.webpackChunktelegram_t||[],r=t.push.bind(t);t.push=t=>{var[i,o,s]=t;for(var n in o)a.o(o,n)&&(a.m[n]=o[n]);for(s&&s(a);i.length;)e[i.pop()]=1;r(t)}})(),t=a.x,a.x=()=>Promise.all([7784,5905,9357].map(a.e,a)).then(t),a.x()})();
//# sourceMappingURL=9722.d34db8099e340829340c.js.map
========
(()=>{"use strict";var e,t,r={79722:(e,t,r)=>{var i=r(87784),a=r(49357);let o;importScripts(new URL(r(25404),r.b));const s=new Promise((e=>{Module.onRuntimeInitialized=()=>{o={init:Module.cwrap("lottie_init","",[]),destroy:Module.cwrap("lottie_destroy","",["number"]),resize:Module.cwrap("lottie_resize","",["number","number","number"]),buffer:Module.cwrap("lottie_buffer","number",["number"]),render:Module.cwrap("lottie_render","",["number","number"]),loadFromData:Module.cwrap("lottie_load_from_data","number",["number","number"])},e()}})),n=new Map;async function c(e){const t=await fetch(e),r=t.headers.get("Content-Type");if(r?.startsWith("text/"))return t.text();const a=await t.arrayBuffer();return(0,i.inflate)(a,{to:"string"})}function l(e,t,r){const i=t?30:60,a=JSON.parse(e).fr||i,o=a%i==0?a/i:1;return{reduceFactor:o,msPerFrame:1e3/(a/o),reducedFramesCount:Math.ceil(r/o)}}const d={"rlottie:init":async function(e,t,r,i,a,d){o||await s;const u=await c(t),f=allocate(intArrayFromString(u),"i8",0),h=o.init(),m=o.loadFromData(h,f);o.resize(h,r,r);const p=new ImageData(r,r),{reduceFactor:v,msPerFrame:g,reducedFramesCount:w}=l(u,i,m);n.set(e,{imgSize:r,reduceFactor:v,handle:h,imageData:p,customColor:a}),d(v,g,w)},"rlottie:changeData":async function(e,t,r,i){o||await s;const a=await c(t),d=allocate(intArrayFromString(a),"i8",0),{handle:u}=n.get(e),f=o.loadFromData(u,d),{reduceFactor:h,msPerFrame:m,reducedFramesCount:p}=l(a,r,f);i(h,m,p)},"rlottie:renderFrames":async function(e,t,r){o||await s;const{imgSize:i,reduceFactor:a,handle:c,imageData:l,customColor:d}=n.get(e),u=t*a;o.render(c,u);const f=o.buffer(c),h=Module.HEAPU8.subarray(f,f+i*i*4);if(d){const e=new Uint8ClampedArray(h);!function(e,t){for(let r=0;r<e.length;r+=4)e[r]=t[0],e[r+1]=t[1],e[r+2]=t[2]}(e,d),l.data.set(e)}else l.data.set(h);r(t,await createImageBitmap(l))},"rlottie:destroy":function e(t,r=!1){try{const e=n.get(t);o.destroy(e.handle),n.delete(t)}catch(i){r||setTimeout((()=>e(t,!0)),1e3)}}};(0,a.C)(d,"media");var u=r(65905),f=r(37836);const h=new Map;function m(e,t,r){var i;return(t="symbol"==typeof(i=function(e,t){if("object"!=typeof e||!e)return e;var r=e[Symbol.toPrimitive];if(void 0!==r){var i=r.call(e,"string");if("object"!=typeof i)return i;throw new TypeError("@@toPrimitive must return a primitive value.")}return String(e)}(t))?i:i+"")in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r,e}self.addEventListener("message",(e=>{const{type:t,messageId:r,result:i}=e.data;if("partResponse"===t){const e=h.get(r);e&&e.resolve(i)}}));const p=1024;var v=function(e){return e.loading="loading",e.ready="ready",e.closed="closed",e}(v||{});class g{constructor(e,{onConfig:t,onChunk:r,stepOffset:i,stepMultiplier:a,isPolyfill:o,maxFrames:s}){m(this,"url",void 0),m(this,"file",void 0),m(this,"status",v.loading),m(this,"stepOffset",void 0),m(this,"stepMultiplier",void 0),m(this,"maxFrames",void 0),m(this,"isPolyfill",void 0),m(this,"decodedSamples",new Set),m(this,"lastSample",0),m(this,"onConfig",void 0),m(this,"onChunk",void 0),this.url=e,this.stepOffset=i,this.stepMultiplier=a,this.maxFrames=s,this.isPolyfill=o,this.onConfig=t,this.onChunk=r,this.file=u.createFile(),this.file.onError=e=>{console.error(e)},this.file.onReady=this.onReady.bind(this),this.file.onSamples=this.onSamples.bind(this),this.loadMetadata()}async loadMetadata(){let e=0;for(;void 0!==e;){try{e=await this.requestPart(e,131072)}catch(e){console.error(e)}if(this.status===v.ready)break}}async loadNextFrames(e,t,r){let i=e*this.stepOffset,a=0,o=this.file.seek(i,!0);for(;this.status!==v.closed;)try{if(await this.requestPart(o.offset,r),i>t)break;this.lastSample>1&&a<this.lastSample&&(i+=e*this.stepMultiplier,a=this.lastSample),o=this.file.seek(i,!0)}catch(e){console.error(e)}this.file.flush()}async requestPart(e,t,r=!0){const i=e%p,a=e-i,o=a+t-1;let s=await function(e){const t=Date.now().toString(36)+Math.random().toString(36).slice(2),r={};let i=!1;const a=Promise.race([(0,f.v7)(3e4).then((()=>i?void 0:Promise.reject(new Error("ERROR_PART_TIMEOUT")))),new Promise(((e,t)=>{Object.assign(r,{resolve:e,reject:t})}))]);return h.set(t,r),a.catch((()=>{})).finally((()=>{h.delete(t),i=!0})),postMessage({type:"requestPart",messageId:t,params:e}),a}({url:this.url,start:a,end:o});if(!s)return;i&&(s=s.slice(i)),s.fileStart=e;const n=this.file.appendBuffer(s);return r?n:e+s.byteLength}description(e){const t=this.file.getTrackById(e.id);for(const e of t.mdia.minf.stbl.stsd.entries)if(e.avcC||e.hvcC||e.av1C){const t=new u.DataStream(void 0,0,u.DataStream.BIG_ENDIAN);return e.avcC?e.avcC.write(t):e.hvcC?e.hvcC.write(t):e.av1C&&e.av1C.write(t),new Uint8Array(t.buffer,8)}throw new Error("avcC, hvcC ro av1C not found")}onReady(e){const t=e.videoTracks[0];let r=t.codec;r.startsWith("avc1")&&(r="avc1.4d001f"),this.onConfig({codec:r,codedHeight:t.video.height,codedWidth:t.video.width,description:this.description(t)});const i=e.duration/e.timescale,a=this.isPolyfill?24:12,o=(s=t.bitrate/a)+p-s%p;var s;const n=function(e,t){return Math.round((e+t)/t)}(i,this.maxFrames);this.file.setExtractionOptions(t.id,void 0,{nbSamples:1}),this.file.start(),this.status=v.ready,this.loadNextFrames(n,i,o)}onSamples(e,t,r){if(this.status===v.ready)for(const t of r){const r=t.cts/t.timescale,i=t.is_sync?"key":"delta",a=`${i}${t.number}`;this.decodedSamples.has(a)||(this.onChunk(new EncodedVideoChunk({type:i,timestamp:1e6*r,duration:1e6*t.duration/t.timescale,data:t.data})),this.decodedSamples.add(a),this.lastSample=parseInt(t.number,10),t.is_sync&&this.file.releaseUsedSamples(e,t.number))}}close(){this.file.flush(),this.file.stop(),this.status=v.closed}}let w,y,b;const C={"video-preview:init":function(e,t,r,i,a){const o="VideoDecoder"in globalThis;if(!o)return console.log("[Video Preview] WebCodecs not supported"),new Promise((e=>{b=e}));const s=new Set;return w=new VideoDecoder({async output(e){const t=e.timestamp/1e6,r=Math.floor(t);if(!s.has(r)){const t=await createImageBitmap(e);s.add(r),a(r,t)}e.close()},error(e){console.error("[Video Preview] error",e)}}),y=new g(e,{stepOffset:r,stepMultiplier:i,isPolyfill:!o,maxFrames:t,onConfig(e){w?.configure(e)},onChunk(e){"configured"===w?.state&&w?.decode(e)}}),new Promise((e=>{b=e}))},"video-preview:destroy":function(){try{w?.close(),y?.close()}catch{}w=void 0,y=void 0,b?.()}};(0,a.C)(C,"media");const P=[1,57,41,21,203,34,97,73,227,91,149,62,105,45,39,137,241,107,3,173,39,71,65,238,219,101,187,87,81,151,141,133,249,117,221,209,197,187,177,169,5,153,73,139,133,127,243,233,223,107,103,99,191,23,177,171,165,159,77,149,9,139,135,131,253,245,119,231,224,109,211,103,25,195,189,23,45,175,171,83,81,79,155,151,147,9,141,137,67,131,129,251,123,30,235,115,113,221,217,53,13,51,50,49,193,189,185,91,179,175,43,169,83,163,5,79,155,19,75,147,145,143,35,69,17,67,33,65,255,251,247,243,239,59,29,229,113,111,219,27,213,105,207,51,201,199,49,193,191,47,93,183,181,179,11,87,43,85,167,165,163,161,159,157,155,77,19,75,37,73,145,143,141,35,138,137,135,67,33,131,129,255,63,250,247,61,121,239,237,117,29,229,227,225,111,55,109,216,213,211,209,207,205,203,201,199,197,195,193,48,190,47,93,185,183,181,179,178,176,175,173,171,85,21,167,165,41,163,161,5,79,157,78,154,153,19,75,149,74,147,73,144,143,71,141,140,139,137,17,135,134,133,66,131,65,129,1],S=[0,9,10,10,14,12,14,14,16,15,16,15,16,15,15,17,18,17,12,18,16,17,17,19,19,18,19,18,18,19,19,19,20,19,20,20,20,20,20,20,15,20,19,20,20,20,21,21,21,20,20,20,21,18,21,21,21,21,20,21,17,21,21,21,22,22,21,22,22,21,22,21,19,22,22,19,20,22,22,21,21,21,22,22,22,18,22,22,21,22,22,23,22,20,23,22,22,23,23,21,19,21,21,21,23,23,23,22,23,23,21,23,22,23,18,22,23,20,22,23,23,23,21,22,20,22,21,22,24,24,24,24,24,22,21,24,23,23,24,21,24,23,24,22,24,24,22,24,24,22,23,24,24,24,20,23,22,23,24,24,24,24,24,24,24,23,21,23,22,23,24,24,24,22,24,24,24,23,22,24,24,25,23,25,25,23,24,25,25,24,22,25,25,25,24,23,24,25,25,25,25,25,25,25,25,25,25,25,25,23,25,23,24,25,25,25,25,25,25,25,25,25,24,22,25,25,23,25,25,20,24,25,24,25,25,22,24,25,24,25,24,25,25,24,25,25,25,25,22,25,25,25,24,25,24,25,18];async function F(e){const t=await fetch(e),r=await t.blob();return createImageBitmap(r)}const x={"offscreen-canvas:blurThumb":async function(e,t,r){const i=t.startsWith("data:")?await function(e){const t=atob(e.split(",")[1]),r=e.split(",")[0].split(":")[1].split(";")[0],i=new ArrayBuffer(t.length),a=new Uint8Array(i);for(let e=0;e<t.length;e++)a[e]=t.charCodeAt(e);const o=new Blob([i],{type:r});return createImageBitmap(o)}(t):await F(t),{width:a,height:o}=e,s=e.getContext("2d"),n="filter"in s;n&&(s.filter=`blur(${r}px)`),s.drawImage(i,2*-r,2*-r,a+4*r,o+4*r),n||function(e,t,r,i,a,o,s){if(Number.isNaN(o)||o<1)return;o|=0,Number.isNaN(s)&&(s=1),(s|=0)>3&&(s=3),s<1&&(s=1);const n=e.getImageData(0,0,i,a),c=n.data;let l,d,u,f,h,m,p,v,g,w,y,b,C=i-1,F=a-1,x=o+1,M=[],O=[],k=[],I=P[o],D=S[o],j=[],_=[];for(;s-- >0;){for(b=y=0,h=0;h<a;h++){for(l=c[b]*x,d=c[b+1]*x,u=c[b+2]*x,m=1;m<=o;m++)p=b+((m>C?C:m)<<2),l+=c[p++],d+=c[p++],u+=c[p++];for(f=0;f<i;f++)M[y]=l,O[y]=d,k[y]=u,0==h&&(j[f]=((p=f+x)<C?p:C)<<2,_[f]=(p=f-o)>0?p<<2:0),v=b+j[f],g=b+_[f],l+=c[v++]-c[g++],d+=c[v++]-c[g++],u+=c[v++]-c[g++],y++;b+=i<<2}for(f=0;f<i;f++){for(w=f,l=M[w]*x,d=O[w]*x,u=k[w]*x,m=1;m<=o;m++)w+=m>F?0:i,l+=M[w],d+=O[w],u+=k[w];for(y=f<<2,h=0;h<a;h++)c[y]=l*I>>>D,c[y+1]=d*I>>>D,c[y+2]=u*I>>>D,0==f&&(j[h]=((p=h+x)<F?p:F)*i,_[h]=(p=h-o)>0?p*i:0),v=f+j[h],g=f+_[h],l+=M[v]-M[g],d+=O[v]-O[g],u+=k[v]-k[g],y+=i<<2}}e.putImageData(n,0,0)}(s,0,0,a,o,r,2)},"offscreen-canvas:getAppendixColorFromImage":async function(e,t){const r=await F(e),{width:i,height:a}=r,o=new OffscreenCanvas(i,a).getContext("2d");o.drawImage(r,0,0,i,a);const s=t?i-1:0,n=a-1;return`rgba(${Array.from(o.getImageData(s,n,1,1).data).join(",")})`}};(0,a.C)(x,"media")},37836:(e,t,r)=>{function i(e){return function(e,t){let r,i=!1;return(...a)=>{r=a,i||(i=!0,e((()=>{i=!1,t(...r)})))}}(s,e)}r.d(t,{Fe:()=>i,v7:()=>a});const a=e=>new Promise((t=>{setTimeout((()=>t()),e)}));let o;function s(e){o?o.push(e):(o=[e],Promise.resolve().then((()=>{const e=o;o=void 0,e.forEach((e=>e()))})))}},25404:(e,t,r)=>{e.exports=r.p+"rlottie-wasm.f013598f1b2ba719f25e.js"}},i={};function a(e){var t=i[e];if(void 0!==t)return t.exports;var o=i[e]={exports:{}};return r[e].call(o.exports,o,o.exports,a),o.exports}a.m=r,a.x=()=>{var e=a.O(void 0,[7784,5905,9357],(()=>a(79722)));return a.O(e)},e=[],a.O=(t,r,i,o)=>{if(!r){var s=1/0;for(d=0;d<e.length;d++){for(var[r,i,o]=e[d],n=!0,c=0;c<r.length;c++)(!1&o||s>=o)&&Object.keys(a.O).every((e=>a.O[e](r[c])))?r.splice(c--,1):(n=!1,o<s&&(s=o));if(n){e.splice(d--,1);var l=i();void 0!==l&&(t=l)}}return t}o=o||0;for(var d=e.length;d>0&&e[d-1][2]>o;d--)e[d]=e[d-1];e[d]=[r,i,o]},a.d=(e,t)=>{for(var r in t)a.o(t,r)&&!a.o(e,r)&&Object.defineProperty(e,r,{enumerable:!0,get:t[r]})},a.f={},a.e=e=>Promise.all(Object.keys(a.f).reduce(((t,r)=>(a.f[r](e,t),t)),[])),a.u=e=>e+"."+{5905:"efaeccc9ed0bc890f551",7784:"4e167a928464165e6412",9357:"e0e1cebb9759d9ad94cd"}[e]+".js",a.miniCssF=e=>{},a.g=function(){if("object"==typeof globalThis)return globalThis;try{return this||new Function("return this")()}catch(e){if("object"==typeof window)return window}}(),a.o=(e,t)=>Object.prototype.hasOwnProperty.call(e,t),(()=>{var e;a.g.importScripts&&(e=a.g.location+"");var t=a.g.document;if(!e&&t&&(t.currentScript&&(e=t.currentScript.src),!e)){var r=t.getElementsByTagName("script");if(r.length)for(var i=r.length-1;i>-1&&(!e||!/^http(s?):/.test(e));)e=r[i--].src}if(!e)throw new Error("Automatic publicPath is not supported in this browser");e=e.replace(/#.*$/,"").replace(/\?.*$/,"").replace(/\/[^\/]+$/,"/"),a.p=e})(),(()=>{a.b=self.location+"";var e={9722:1};a.f.i=(t,r)=>{e[t]||importScripts(a.p+a.u(t))};var t=self.webpackChunktelegram_t=self.webpackChunktelegram_t||[],r=t.push.bind(t);t.push=t=>{var[i,o,s]=t;for(var n in o)a.o(o,n)&&(a.m[n]=o[n]);for(s&&s(a);i.length;)e[i.pop()]=1;r(t)}})(),t=a.x,a.x=()=>Promise.all([7784,5905,9357].map(a.e,a)).then(t),a.x()})();
//# sourceMappingURL=9722.036ee56688ef571c22b9.js.map
>>>>>>>> 0cc36140886395c7c039ad8dd87022c65e872041:dist/9722.036ee56688ef571c22b9.js
