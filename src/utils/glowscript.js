/**
 * VPython/GlowScript 코드를 iframe srcdoc용 HTML로 감싸는 유틸
 *
 * ⚠️ window.__context 는 glow.min.js 보다 먼저 설정되어야
 *    vec, sphere, color 등의 전역이 정상 등록된다.
 */
export function buildGlow(code) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  html,body{margin:0;padding:0;width:100%;height:100%;background:#10101a;overflow:hidden}
  #gs{width:100%;height:100vh}
  canvas{display:block}
</style>
</head>
<body>
<div id="gs" class="glowscript">
<script>window.__context={glowscript_container:document.getElementById("gs")}<\/script>
<script src="https://www.glowscript.org/lib/glow/glow.min.js"><\/script>
<script>
(async function(){
  var vector=vec;
  let scene=canvas({width:window.innerWidth,height:window.innerHeight,background:color.gray(0.1)});
  try{${code.replace(/\n/g, ";\n")}}
  catch(e){scene.caption="<b style='color:#f87171'>Error: "+e.message+"</b>"}
})();
<\/script>
</div>
</body>
</html>`;
}
