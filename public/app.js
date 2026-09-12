const app = document.getElementById("app");
const modal = document.getElementById("modal");
const modalContent = document.getElementById("modalContent");
const toast = document.getElementById("toast");
let movies = [];
let adminToken = sessionStorage.getItem("adminToken") || null;

function escapeHtml(s=""){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function notify(msg){toast.textContent=msg;toast.classList.add("show");clearTimeout(notify.t);notify.t=setTimeout(()=>toast.classList.remove("show"),2600)}
function openModal(html){modalContent.innerHTML=html;modal.classList.remove("hidden");modal.setAttribute("aria-hidden","false")}
function closeModal(){modal.classList.add("hidden");modal.setAttribute("aria-hidden","true")}
document.getElementById("closeModal").onclick=closeModal;
modal.onclick=e=>{if(e.target===modal)closeModal()};
document.getElementById("homeBtn").onclick=renderHome;
document.getElementById("adminBtn").onclick=()=>adminToken?renderAdmin():showLogin();

async function api(url, opts={}){
  opts.headers={...(opts.headers||{}), "Content-Type":"application/json"};
  if(adminToken) opts.headers.Authorization="Bearer "+adminToken;
  const r=await fetch(url,opts);
  const data=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(data.error||"Error");
  return data;
}
async function loadMovies(){
  app.innerHTML='<div class="spinner">Cargando películas…</div>';
  try{movies=await api("/api/movies");renderHome()}catch(e){app.innerHTML='<div class="empty">No se pudieron cargar las películas.</div>'}
}
function renderHome(){
  if(!movies.length){
    app.innerHTML='<section><h1 class="heroTitle">Películas</h1><p class="sub">Tu catálogo personal.</p><div class="empty">Todavía no hay películas añadidas.</div></section>';
    return;
  }
  app.innerHTML=`<section>
    <h1 class="heroTitle">Películas</h1><p class="sub">Elige una película para ver sus detalles.</p>
    <div class="shelf"><button class="arrow" id="left">‹</button><div class="rail" id="rail">${movies.map(m=>card(m)).join("")}</div><button class="arrow" id="right">›</button></div>
  </section>`;
  document.querySelectorAll(".movieCard").forEach(el=>el.onclick=()=>showDetail(Number(el.dataset.id)));
  const rail=document.getElementById("rail");
  document.getElementById("left").onclick=()=>rail.scrollBy({left:-rail.clientWidth*.8,behavior:"smooth"});
  document.getElementById("right").onclick=()=>rail.scrollBy({left:rail.clientWidth*.8,behavior:"smooth"});
}
function card(m){return `<article class="movieCard" data-id="${m.id}"><img class="poster" loading="lazy" src="${escapeHtml(m.poster)}" alt=""><div class="movieName">${escapeHtml(m.title)}</div></article>`}
function showDetail(id){
  const m=movies.find(x=>x.id===id); if(!m)return;
  app.innerHTML=`<section>
    <button class="back" id="back">← Volver</button>
    <div class="detail"><img class="poster" src="${escapeHtml(m.poster)}" alt="">
      <div><h1>${escapeHtml(m.title)}</h1><p class="desc">${escapeHtml(m.description||"Sin descripción.")}</p>
      <button class="primary watch" id="watch">▶ Ver vídeo</button></div>
    </div>
  </section>`;
  document.getElementById("back").onclick=renderHome;
  document.getElementById("watch").onclick=()=>openPlayer(m);
}
function showLogin(){
  openModal(`<h2 class="modalTitle">Acceso de administrador</h2>
    <form class="form" id="loginForm"><label>Contraseña<input id="password" type="password" autocomplete="current-password" required></label>
    <p class="loginHint">Solo el administrador puede añadir, editar o eliminar películas.</p><button class="primary">Entrar</button></form>`);
  document.getElementById("loginForm").onsubmit=async e=>{
    e.preventDefault();
    try{const d=await api("/api/login",{method:"POST",body:JSON.stringify({password:document.getElementById("password").value})});adminToken=d.token;sessionStorage.setItem("adminToken",adminToken);closeModal();renderAdmin()}
    catch(err){notify(err.message)}
  };
}
function renderAdmin(){
  app.innerHTML=`<section class="panel"><div class="panelHeader"><div><h1 class="heroTitle">Administración</h1><p class="sub">Gestiona el catálogo.</p></div><div class="actions"><button class="primary" id="addMovie">＋ Añadir película</button><button class="secondary" id="logout">Salir</button></div></div>
  <div>${movies.length?movies.map(adminRow).join(""):'<div class="empty">No hay películas. Añade la primera.</div>'}</div></section>`;
  document.getElementById("addMovie").onclick=()=>showMovieForm();
  document.getElementById("logout").onclick=async()=>{try{await api("/api/logout",{method:"POST"})}catch{}adminToken=null;sessionStorage.removeItem("adminToken");renderHome()};
  document.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>showMovieForm(movies.find(m=>m.id==b.dataset.edit)));
  document.querySelectorAll("[data-delete]").forEach(b=>b.onclick=()=>deleteMovie(Number(b.dataset.delete)));
}
function adminRow(m){return `<div class="movieRow"><img src="${escapeHtml(m.poster)}" alt=""><div><strong>${escapeHtml(m.title)}</strong><div class="footerNote">${escapeHtml(m.description||"Sin descripción")}</div></div><div class="actions"><button class="secondary" data-edit="${m.id}">Editar</button><button class="danger" data-delete="${m.id}">Eliminar</button></div></div>`}
function showMovieForm(m=null){
  const edit=!!m;
  openModal(`<h2 class="modalTitle">${edit?"Editar película":"Añadir película"}</h2>
    <form class="form" id="movieForm">
      <label>Enlace de la portada<input id="poster" type="url" placeholder="https://..." value="${edit?escapeHtml(m.poster):""}" required></label>
      <p class="loginHint">Se usa enlace de imagen para que la portada sea accesible para todas las personas.</p>
      <label>Título<input id="title" value="${edit?escapeHtml(m.title):""}" required></label>
      <label>Descripción<textarea id="description" placeholder="Sinopsis…">${edit?escapeHtml(m.description):""}</textarea></label>
      <label>Enlace de vídeo<input id="video" type="url" placeholder="https://... (MP4, HLS .m3u8, etc.)" value="${edit?escapeHtml(m.video):""}" required></label>
      <button class="primary">${edit?"Guardar cambios":"Añadir película"}</button>
    </form>`);
  document.getElementById("movieForm").onsubmit=async e=>{
    e.preventDefault();
    const body={poster:document.getElementById("poster").value,title:document.getElementById("title").value,description:document.getElementById("description").value,video:document.getElementById("video").value};
    try{if(edit)await api("/api/movies/"+m.id,{method:"PUT",body:JSON.stringify(body)});else await api("/api/movies",{method:"POST",body:JSON.stringify(body)});
      closeModal();await loadMovies();renderAdmin();notify(edit?"Película actualizada":"Película añadida");
    }catch(err){notify(err.message)}
  };
}
async function deleteMovie(id){
  const m=movies.find(x=>x.id===id);
  if(!confirm(`¿Eliminar "${m?.title||"esta película"}"?`))return;
  try{await api("/api/movies/"+id,{method:"DELETE"});await loadMovies();renderAdmin();notify("Película eliminada")}catch(e){notify(e.message)}
}
function fmt(sec){if(!Number.isFinite(sec))return "00:00";sec=Math.max(0,Math.floor(sec));const h=Math.floor(sec/3600),mm=Math.floor((sec%3600)/60),ss=sec%60;return h?`${String(h).padStart(2,"0")}:${String(mm).padStart(2,"0")}:${String(ss).padStart(2,"0")}`:`${String(mm).padStart(2,"0")}:${String(ss).padStart(2,"0")}`}
function openPlayer(m){
  const old=document.querySelector(".playerShell");if(old)old.remove();
  const shell=document.createElement("div");shell.className="playerShell";
  shell.innerHTML=`<div class="playerTop"><div class="playerTitle">${escapeHtml(m.title)}</div><div><button class="dots" id="dots">⋮</button></div></div>
    <div class="videoWrap"><video class="video" id="videoPlayer" playsinline preload="auto"></video>
      <div class="seekMenu hidden" id="seekMenu"><strong>Ir a otro punto</strong><div class="seekInputs" style="margin-top:10px"><input id="sh" type="number" min="0" placeholder="Horas"><input id="sm" type="number" min="0" max="59" placeholder="Min"><input id="ss" type="number" min="0" max="59" placeholder="Seg"></div><button class="primary" id="goSeek" style="width:100%;margin-top:10px">Ir</button></div>
      <div class="notice" id="notice"></div>
    </div>
    <div class="playerBottom"><input class="progress" id="progress" type="range" min="0" max="1000" value="0"><div class="controls">
      <div class="ctrlLeft"><button class="ctrl" id="play">▶</button><span class="time" id="time">00:00 / --:--</span></div>
      <div class="ctrlRight"><select class="quality" id="quality"><option>Calidad</option></select><button class="ctrl" id="full">⛶</button><button class="ctrl" id="closePlayer">✕</button></div>
    </div></div>`;
  document.body.appendChild(shell);
  const v=shell.querySelector("#videoPlayer"), progress=shell.querySelector("#progress"), time=shell.querySelector("#time"), quality=shell.querySelector("#quality");
  let hls=null;
  const noticeMsg=msg=>{const n=shell.querySelector("#notice");n.textContent=msg;n.classList.add("show");clearTimeout(noticeMsg.t);noticeMsg.t=setTimeout(()=>n.classList.remove("show"),2200)};
  function setQualityLevels(levels){
    quality.innerHTML='<option value="-1">Calidad automática</option>'+levels.map((x,i)=>`<option value="${i}">${x.height?x.height+"p":"Nivel "+(i+1)}</option>`).join("");
    quality.onchange=()=>{if(hls)hls.currentLevel=Number(quality.value)}
  }
  if(/\.m3u8(\?|$)/i.test(m.video) && window.Hls && Hls.isSupported()){
    hls=new Hls({enableWorker:true,lowLatencyMode:false,maxBufferLength:45,maxMaxBufferLength:90,backBufferLength:30,startLevel:-1});
    hls.loadSource(m.video);hls.attachMedia(v);
    hls.on(Hls.Events.MANIFEST_PARSED,(_,data)=>setQualityLevels(data.levels));
    hls.on(Hls.Events.ERROR,(_,data)=>{if(data.fatal)noticeMsg("No se ha podido cargar el vídeo.")});
  }else{
    v.src=m.video;
    if(v.canPlayType("application/vnd.apple.mpegurl")) v.type="application/vnd.apple.mpegurl";
  }
  shell.querySelector("#play").onclick=()=>v.paused?v.play():v.pause();
  v.onplay=()=>shell.querySelector("#play").textContent="❚❚";
  v.onpause=()=>shell.querySelector("#play").textContent="▶";
  v.ontimeupdate=()=>{if(Number.isFinite(v.duration)){progress.value=(v.currentTime/v.duration)*1000;time.textContent=`${fmt(v.currentTime)} / ${fmt(v.duration)}`}};
  progress.oninput=()=>{if(Number.isFinite(v.duration))v.currentTime=(Number(progress.value)/1000)*v.duration};
  shell.querySelector("#full").onclick=()=>{if(!document.fullscreenElement)shell.requestFullscreen?.();else document.exitFullscreen?.()};
  shell.querySelector("#closePlayer").onclick=()=>{hls?.destroy();shell.remove()};
  shell.querySelector("#dots").onclick=()=>shell.querySelector("#seekMenu").classList.toggle("hidden");
  shell.querySelector("#goSeek").onclick=()=>{
    const h=Number(shell.querySelector("#sh").value||0),mi=Number(shell.querySelector("#sm").value||0),s=Number(shell.querySelector("#ss").value||0);
    const target=h*3600+mi*60+s;
    if(!Number.isFinite(v.duration)||target<0||target>v.duration){noticeMsg("Error: ese punto no existe en el vídeo.");return}
    v.currentTime=target;shell.querySelector("#seekMenu").classList.add("hidden");
  };
  v.addEventListener("loadedmetadata",()=>time.textContent=`00:00 / ${fmt(v.duration)}`);
}
loadMovies();
