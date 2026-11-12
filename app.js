(function(){
"use strict";
const CFG=window.DORSAL_CONFIG||{};
const ONLINE=!!(CFG.supabaseUrl&&CFG.supabaseAnonKey);
const DISTRITOS=["Aveiro","Beja","Braga","Bragança","Castelo Branco","Coimbra","Évora","Faro","Guarda","Leiria","Lisboa","Portalegre","Porto","Santarém","Setúbal","Viana do Castelo","Vila Real","Viseu","Açores","Madeira"];
const MESES=["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
const DIAS=["domingo","segunda","terça","quarta","quinta","sexta","sábado"];
const REGIOES=[["norte","Norte",["Viana do Castelo","Braga","Porto","Vila Real","Bragança"]],["centro","Centro",["Aveiro","Viseu","Guarda","Coimbra","Castelo Branco","Leiria"]],["lisboa","Lisboa e Vale do Tejo",["Lisboa","Santarém","Setúbal"]],["alentejo","Alentejo",["Portalegre","Évora","Beja"]],["algarve","Algarve",["Faro"]],["ilhas","Açores e Madeira",["Açores","Madeira"]]];
const ESTADOS=[["inscrito","Inscrito"],["vou","Vou"],["talvez","Talvez"]];
const $=id=>document.getElementById(id);
function h(tag,attrs,...kids){const el=document.createElement(tag);if(attrs)for(const[k,v]of Object.entries(attrs)){if(v==null||v===false)continue;if(k==="class")el.className=v;else if(k==="text")el.textContent=v;else if(k.startsWith("on"))el.addEventListener(k.slice(2),v);else el.setAttribute(k,v===true?"":v)}for(const c of kids.flat()){if(c==null||c===false)continue;el.append(c.nodeType?c:document.createTextNode(String(c)))}return el}
const store={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{v==null?localStorage.removeItem(k):localStorage.setItem(k,v)}catch(e){}}};

// ---------- estado ----------
let grupo=null,grupoNome="",grupoLogo="",me=null;
let provas=[],membros={},pres={},cliques={},loaded=false;
let filtroReg=store.get("dorsal.regiao")||"",filtroDist=store.get("dorsal.distrito")||"";
let casa=null;try{casa=JSON.parse(store.get("dorsal.casa")||"null")}catch(_){}
let filtroRaio=+(store.get("dorsal.raio")||0);let filtroTipos=new Set((store.get("dorsal.tipos")||"").split("|").filter(Boolean));
const TIPOS_ORDEM=["Caminhada","Trail kids","Trail curto","Trail longo","Trail ultra","Skyrunning","Backyard"];
const RAIOS=[5,10,15,20,50,100];
let tab=store.get("dorsal.tab")||"grupo",openMsg=null,confirmDel=null;

// ---------- código do grupo ----------
function lerCodigo(txt){const t=String(txt||"").trim();const m=t.match(/[?&#]g=([a-z0-9]{6,40})/i);if(m)return m[1].toLowerCase();if(/^[a-z0-9]{6,40}$/i.test(t))return t.toLowerCase();return null}
(function(){const c=lerCodigo(location.search)||lerCodigo(location.hash);if(c)store.set("dorsal.grupo",c);grupo=store.get("dorsal.grupo")})();
function chaveMe(){return "dorsal.membro."+grupo}
function provaAberta(){const m=location.hash.match(/[#&]p=([^&]+)/);return m?decodeURIComponent(m[1]):null}
function abrir(pid){openMsg=null;location.hash="p="+encodeURIComponent(pid)}
function fechar(){if(history.state&&history.state.dorsal)history.back();else{history.replaceState(null,"",location.pathname+location.search);draw()}}

// ---------- servidor ----------
async function api(path,opt={}){
  const headers={apikey:CFG.supabaseAnonKey,Authorization:"Bearer "+CFG.supabaseAnonKey,"x-grupo":grupo||"","Content-Type":"application/json"};
  if(opt.prefer)headers.Prefer=opt.prefer;
  const r=await fetch(CFG.supabaseUrl.replace(/\/$/,"")+"/rest/v1/"+path,{method:opt.method||"GET",headers,body:opt.body?JSON.stringify(opt.body):undefined});
  if(!r.ok){const e=new Error("api "+r.status);e.status=r.status;try{e.detail=await r.json()}catch(_){}throw e}
  return r.status===204?null:r.json().catch(()=>null);
}
const hojeISO=()=>{const t=new Date();return t.getFullYear()+"-"+String(t.getMonth()+1).padStart(2,"0")+"-"+String(t.getDate()).padStart(2,"0")};

async function carregar(){
  if(!ONLINE){
    try{provas=await (await fetch("provas.json",{cache:"no-cache"})).json()}catch(e){provas=[]}
    loaded=true;status("A partilha de presenças ainda não está ligada. Por agora só se vê o calendário.");draw();return;
  }
  try{
    const hoje=hojeISO();
    const reqs=[api("provas?select=*&data=gte."+hoje+"&order=data.asc,nome.asc")];
    if(grupo)reqs.push(api("grupos?select=nome,logo&codigo=eq."+grupo),api("membros?select=id,nome&order=nome.asc"),api("presencas?select=membro_id,prova_id,estado"),api("cliques?select=prova_id"));
    const [ps,gs,ms,pr,cl]=await Promise.all(reqs);
    provas=ps||[];
    if(grupo){
      if(!gs||!gs.length){status("Esse código de grupo não existe. Confirma o link que recebeste.");store.set("dorsal.grupo",null);grupo=null;membros={};pres={};}
      else{grupoNome=gs[0].nome||"";grupoLogo=gs[0].logo||"";membros={};for(const m of ms||[])membros[m.id]=m.nome;
        pres={};for(const x of pr||[])(pres[x.prova_id]=pres[x.prova_id]||{})[x.membro_id]=x.estado;
        cliques={};for(const c of cl||[])cliques[c.prova_id]=(cliques[c.prova_id]||0)+1;
        me=store.get(chaveMe());if(me&&!membros[me]){me=null;store.set(chaveMe(),null)}
        if($("statusText").textContent.startsWith("Sem ligação"))status("");}
    }
    store.set("dorsal.cache",JSON.stringify({provas,membros,pres,grupoNome,grupoLogo}));
  }catch(e){
    const c=store.get("dorsal.cache");if(c){try{const o=JSON.parse(c);provas=o.provas||[];membros=o.membros||{};pres=o.pres||{};grupoNome=o.grupoNome||"";grupoLogo=o.grupoLogo||""}catch(_){}}
    else{try{provas=await (await fetch("provas.json")).json()}catch(_){}}
    status("Sem ligação ao servidor. Estás a ver a última versão guardada.");
  }
  loaded=true;draw();
}

// ---------- localização ----------
const LUG=window.DORSAL_LUGARES||{c:[],l:[]};
const norm=s=>String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z ]/g,"").replace(/\s+/g," ").trim();
const geoMemo={};
function coordsDe(p){if(!p.distrito||!p.concelho)return null;const k=p.concelho+"|"+p.distrito;if(k in geoMemo)return geoMemo[k];
  const nome=norm(p.concelho),base=norm(p.concelho.replace(/\s*\(.*\)/,"")),dentro=[...p.concelho.matchAll(/\(([^)]+)\)/g)].map(m=>norm(m[1]));
  const ordem=[[LUG.c,nome],[LUG.c,base],[LUG.l,nome],[LUG.l,base],...dentro.map(d=>[LUG.c,d]),...dentro.map(d=>[LUG.l,d])];
  let r=null;for(const [tab,c] of ordem){const f=tab.find(x=>x[0]===c&&x[1]===p.distrito);if(f){r=[f[2],f[3]];break}}
  return geoMemo[k]=r}
function distKm(a,b){const R=6371,rad=x=>x*Math.PI/180,dLa=rad(b[0]-a[0]),dLo=rad(b[1]-a[1]);const s=Math.sin(dLa/2)**2+Math.cos(rad(a[0]))*Math.cos(rad(b[0]))*Math.sin(dLo/2)**2;return 2*R*Math.asin(Math.sqrt(s))}
function kmAte(p){if(!casa)return null;const c=coordsDe(p);return c?distKm([casa.lat,casa.lon],c):null}
function concelhoMaisPerto(lat,lon){let best=null,bd=1e9;for(const c of LUG.c){const d=distKm([lat,lon],[c[2],c[3]]);if(d<bd){bd=d;best=c}}return best}
function definirCasa(c){casa=c;store.set("dorsal.casa",c?JSON.stringify(c):null);if(c&&!filtroRaio){filtroRaio=50;store.set("dorsal.raio","50")}draw()}

// ---------- utilitários ----------
function parseD(s){const[y,m,d]=String(s).split("-").map(Number);return new Date(y,m-1,d)}
function hoje(){const t=new Date();return new Date(t.getFullYear(),t.getMonth(),t.getDate())}
function faltam(s){const n=Math.round((parseD(s)-hoje())/864e5);return n===0?"é hoje":n===1?"é amanhã":"faltam "+n+" dias"}
function dataLonga(s){const d=parseD(s);return DIAS[d.getDay()]+", "+d.getDate()+" de "+MESES[d.getMonth()]}
function valid(u){return typeof u==="string"&&/^https?:\/\//i.test(u)?u:null}
function nomeDe(id){return membros[id]||"Alguém"}
function quem(pid){const out={inscrito:[],vou:[],talvez:[]};const m=pres[pid]||{};for(const[id,e]of Object.entries(m))if(out[e])out[e].push(id);for(const k in out)out[k].sort((a,b)=>nomeDe(a).localeCompare(nomeDe(b),"pt"));return out}
function temGente(pid){const m=pres[pid];return !!m&&Object.keys(m).length>0}
function futuras(){const t=hoje();return provas.filter(p=>p.data&&parseD(p.data)>=t)}
function toast(t){const el=$("toast");el.textContent=t;el.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>el.hidden=true,2200)}
function status(t){$("statusText").textContent=t||"";$("status").hidden=!t}
function copiar(text,ta){const falha=()=>{if(ta){ta.focus();ta.select()}toast("Selecionado: usa Copiar do telemóvel")};if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(text).then(()=>toast("Copiado"),falha);else falha()}
const podeMarcar=()=>ONLINE&&grupo&&me;

// ---------- mensagens ----------
function mensagem(p){const q=quem(p.id),L=[];L.push(p.nome+" — "+dataLonga(p.data)+" ("+faltam(p.data)+")");
  const local=[p.concelho,p.distrito].filter(Boolean).join(", ");if(local)L.push("Local: "+local);if(p.distancias)L.push("Distâncias: "+p.distancias);
  if(q.inscrito.length)L.push("Inscritos: "+q.inscrito.map(nomeDe).join(", "));if(q.vou.length)L.push("Vão: "+q.vou.map(nomeDe).join(", "));if(q.talvez.length)L.push("Talvez: "+q.talvez.map(nomeDe).join(", "));
  if(!temGente(p.id))L.push("Ainda ninguém marcou. Alguém alinha?");
  const i=valid(p.inscricao)||valid(p.info);if(i)L.push((valid(p.inscricao)?"Inscrição: ":"Informação: ")+i);return L.join("\n")}
function resumo(){const lim=new Date(hoje().getTime()+42*864e5);const ps=futuras().filter(p=>parseD(p.data)<=lim&&temGente(p.id));
  if(!ps.length)return "Ainda ninguém marcou presença em provas das próximas 6 semanas.";
  return "Próximas provas do grupo:\n\n"+ps.map(p=>{const q=quem(p.id),d=parseD(p.data),parts=[];if(q.inscrito.length)parts.push("inscritos "+q.inscrito.map(nomeDe).join(", "));if(q.vou.length)parts.push("vão "+q.vou.map(nomeDe).join(", "));if(q.talvez.length)parts.push("talvez "+q.talvez.map(nomeDe).join(", "));
    return "- "+d.getDate()+" de "+MESES[d.getMonth()]+", "+p.nome+(p.concelho?" ("+p.concelho+")":"")+": "+parts.join("; ")+(valid(p.inscricao)?"\n  "+p.inscricao:"")}).join("\n")}

// ---------- acções ----------
async function setEstado(pid,e){if(!podeMarcar())return;const m=pres[pid]=pres[pid]||{};const antes=m[me];
  if(antes===e)delete m[me];else m[me]=e;draw();
  try{if(antes===e)await api("presencas?membro_id=eq."+me+"&prova_id=eq."+encodeURIComponent(pid),{method:"DELETE"});
    else await api("presencas?on_conflict=membro_id,prova_id",{method:"POST",prefer:"resolution=merge-duplicates,return=minimal",body:{grupo,membro_id:me,prova_id:pid,estado:e,atualizado:new Date().toISOString()}});}
  catch(err){if(antes)m[me]=antes;else delete m[me];draw();toast("Não foi possível guardar. Tenta outra vez.")}}
function cliqueInsc(pid){if(!ONLINE||!grupo)return;cliques[pid]=(cliques[pid]||0)+1;api("cliques",{method:"POST",prefer:"return=minimal",body:{grupo,prova_id:pid,membro_id:me}}).catch(()=>{})}
async function remover(pid){if(confirmDel!==pid){confirmDel=pid;draw();return}confirmDel=null;
  try{await api("provas?id=eq."+encodeURIComponent(pid),{method:"DELETE"});provas=provas.filter(p=>p.id!==pid);draw();toast("Prova removida")}catch(e){toast("Não foi possível remover.")}}

// ---------- desenho ----------
function segDe(p){const mine=pres[p.id]&&pres[p.id][me];return podeMarcar()?h("div",{class:"seg",role:"group","aria-label":"A tua presença"},...ESTADOS.map(([k,l])=>h("button",{class:k,"aria-pressed":String(mine===k),onclick:()=>setEstado(p.id,k),text:l}))):null}
function msgDe(p){if(openMsg!==p.id)return null;const txt=mensagem(p),ta=h("textarea",{readonly:true,"aria-label":"Mensagem para o WhatsApp"});ta.value=txt;
  return h("div",{class:"msg"},ta,h("div",{class:"row"},h("button",{class:"btn primary small",onclick:()=>copiar(txt,ta),text:"Copiar"}),h("a",{class:"btn small",href:"https://wa.me/?text="+encodeURIComponent(txt),target:"_blank",rel:"noopener",text:"Abrir no WhatsApp"})))}
function contagem(q){const parts=[];if(q.inscrito.length)parts.push(q.inscrito.length+(q.inscrito.length===1?" inscrito":" inscritos"));if(q.vou.length)parts.push(q.vou.length+(q.vou.length===1?" vai":" vão"));if(q.talvez.length)parts.push(q.talvez.length+" talvez");return parts.join(" · ")}
function card(p){const d=parseD(p.data),q=quem(p.id);
  const people=h("div",{class:"people"},...ESTADOS.flatMap(([k,l])=>q[k].map(id=>h("span",{class:"p "+k,title:l,text:nomeDe(id)+(k==="inscrito"?" ✓":"")}))));
  const seg=segDe(p);
  const insc=valid(p.inscricao),info=valid(p.info);
  const links=h("div",{class:"links"},
    insc?h("a",{href:insc,target:"_blank",rel:"noopener",onclick:()=>cliqueInsc(p.id),text:"Inscrição ↗"}):h("span",{class:"hint",text:"Sem link de inscrição"}),
    info?h("a",{href:info,target:"_blank",rel:"noopener",text:"Informação ↗"}):null,
    h("button",{class:"linkbtn",onclick:()=>abrir(p.id),text:ONLINE&&grupo?"Quem vai"+(temGente(p.id)?" ("+contagem(q)+")":""):"Abrir prova"}),
    h("button",{class:"linkbtn",onclick:()=>{openMsg=openMsg===p.id?null:p.id;draw()},text:openMsg===p.id?"Fechar mensagem":"Mensagem para o grupo"}),
    (podeMarcar()&&p.grupo&&p.grupo===grupo)?h("button",{class:"linkbtn",onclick:()=>remover(p.id),text:confirmDel===p.id?"Confirmar remoção":"Remover"}):null);
  const msg=msgDe(p);
  const n=cliques[p.id]||0;
  return h("article",{class:"card"},
    h("div",{class:"bib","aria-label":dataLonga(p.data)},h("div",{class:"d",text:d.getDate()}),h("div",{class:"m",text:MESES[d.getMonth()].slice(0,3)}),h("div",{class:"w",text:DIAS[d.getDay()]})),
    h("div",{class:"info"},h("h3",null,h("button",{class:"titlebtn",onclick:()=>abrir(p.id),text:p.nome})),
      h("div",{class:"meta"},h("strong",{text:[p.concelho,p.distrito].filter(Boolean).join(", ")||"Local por confirmar"}),"  ·  "+faltam(p.data)+(kmAte(p)!=null?"  ·  ≈ "+Math.round(kmAte(p))+" km de casa":"")+(p.nota?"  ·  "+p.nota:"")),
      p.distancias?h("div",{class:"dist"},...String(p.distancias).split(",").map(s=>s.trim()).filter(Boolean).map(s=>h("span",{text:s}))):null,
      people.childNodes.length?people:null,seg,links,msg,
      n?h("div",{class:"owner",text:n+(n===1?" clique":" cliques")+" do grupo no link de inscrição"}):null))}
function detalhe(pid){const box=$("view-prova");box.replaceChildren();
  const voltar=h("button",{class:"back",onclick:fechar,text:"← Provas"});
  const p=provas.find(x=>x.id===pid);
  if(!p){box.append(voltar,h("div",{class:"empty",text:loaded?"Esta prova já não está no calendário.":"A carregar…"}));return}
  const d=parseD(p.data),q=quem(p.id),insc=valid(p.inscricao),info=valid(p.info);
  const pessoa=(id,k)=>h("li",{class:"pessoa "+k},h("span",{class:"nome",text:nomeDe(id)+(id===me?" (tu)":"")}));
  const bloco=(k,titulo,ids,vazio)=>h("section",{class:"grupo-bloco "+k},h("h3",null,titulo+" ",h("span",{class:"n",text:String(ids.length)})),
    ids.length?h("ul",{class:"pessoas"},...ids.map(id=>pessoa(id,k))):h("p",{class:"hint",text:vazio}));
  let gente;
  if(!ONLINE)gente=h("div",{class:"notice"},h("p",{text:"A lista de quem está inscrito aparece quando a app estiver ligada ao servidor do grupo."}));
  else if(!grupo)gente=h("div",{class:"notice"},h("p",{text:"Entra no grupo para veres quem está inscrito nesta prova."}));
  else{const marcados=new Set([...q.inscrito,...q.vou,...q.talvez]);const falta=Object.keys(membros).filter(id=>!marcados.has(id)).sort((a,b)=>nomeDe(a).localeCompare(nomeDe(b),"pt"));
    gente=h("div",{class:"gente"},
      bloco("inscrito","Inscritos",q.inscrito,"Ninguém do grupo está inscrito ainda."),
      bloco("vou","Vão, ainda sem inscrição",q.vou,"Ninguém."),
      q.talvez.length?bloco("talvez","Talvez",q.talvez,""):null,
      falta.length?h("details",{class:"falta"},h("summary",{text:"Ainda não marcaram ("+falta.length+")"}),h("p",{class:"hint",text:falta.map(nomeDe).join(", ")})):null)}
  box.append(voltar,h("article",{class:"detalhe"},
    h("div",{class:"card"},
      h("div",{class:"bib","aria-label":dataLonga(p.data)},h("div",{class:"d",text:d.getDate()}),h("div",{class:"m",text:MESES[d.getMonth()].slice(0,3)}),h("div",{class:"w",text:DIAS[d.getDay()]})),
      h("div",{class:"info"},h("h2",{class:"titulo",text:p.nome}),
        h("div",{class:"meta"},h("strong",{text:[p.concelho,p.distrito].filter(Boolean).join(", ")||"Local por confirmar"}),"  ·  "+dataLonga(p.data)+", "+faltam(p.data)+(p.nota?"  ·  "+p.nota:"")),
        p.distancias?h("div",{class:"dist"},...String(p.distancias).split(",").map(s=>s.trim()).filter(Boolean).map(s=>h("span",{text:s}))):null,
        h("div",{class:"links"},insc?h("a",{href:insc,target:"_blank",rel:"noopener",onclick:()=>cliqueInsc(p.id),text:"Inscrição ↗"}):h("span",{class:"hint",text:"Sem link de inscrição"}),info?h("a",{href:info,target:"_blank",rel:"noopener",text:"Informação ↗"}):null))),
    podeMarcar()?h("div",{class:"eu"},h("span",{class:"hint",text:"A tua presença"}),segDe(p)):null,
    gente,
    h("div",{class:"links"},h("button",{class:"linkbtn",onclick:()=>{openMsg=openMsg===p.id?null:p.id;draw()},text:openMsg===p.id?"Fechar mensagem":"Mensagem para o grupo"})),
    msgDe(p)))}
function listaPorMes(ps,box,vazio){box.replaceChildren();if(!ps.length){box.append(h("div",{class:"empty",text:vazio}));return}
  let cur="",list=null;for(const p of ps){const d=parseD(p.data),k=MESES[d.getMonth()]+" "+d.getFullYear();if(k!==cur){cur=k;box.append(h("h2",{class:"month",text:k}));list=h("div",{class:"list"});box.append(list)}list.append(card(p))}}
function fillSel(sel,first,opts){const v=sel.value,key=JSON.stringify(opts);if(sel.dataset.k===key)return;sel.dataset.k=key;sel.replaceChildren(h("option",{value:"",text:first}),...opts.map(([v,t])=>h("option",{value:v,text:t})));if(opts.some(o=>o[0]===v))sel.value=v}

function draw(){
  const sec=secAtual();$("pg-sec").hidden=!sec;$("pg-provas").hidden=!!sec;desenharMenu();
  if(sec)desenharSec(sec);else secDesenhada=null;
  $("entrar").hidden=!(ONLINE&&!grupo);
  $("quem").hidden=!(ONLINE&&grupo&&loaded&&!me);
  if(!$("quem").hidden){$("nomes").replaceChildren(...Object.entries(membros).sort((a,b)=>a[1].localeCompare(b[1],"pt")).map(([id,n])=>h("button",{type:"button",onclick:()=>{me=id;store.set(chaveMe(),id);draw()},text:n})))}
  $("meBtn").hidden=!me;
  if(me){const logoOk=/^data:image\/(png|jpeg|webp);base64,/.test(grupoLogo);
    $("meBtn").replaceChildren(...[logoOk?h("img",{class:"glogo",src:grupoLogo,alt:"",width:"30",height:"30"}):null,
      h("span",{class:"gtxt"},grupoNome?h("span",{class:"gnome",text:grupoNome}):null,h("span",{class:"pnome",text:nomeDe(me)}))].filter(Boolean));
    $("meBtn").setAttribute("aria-label",(grupoNome?grupoNome+", ":"")+nomeDe(me))}
  $("partilhar").hidden=!(ONLINE&&grupo);$("sair").hidden=!me;$("editarBtn").hidden=!podeMarcar();
  const aberta=provaAberta();
  $("lista").hidden=!!aberta;$("view-prova").hidden=!aberta;
  for(const t of ["grupo","todas","nova"]){$("tab-"+t).setAttribute("aria-selected",String(tab===t));$("view-"+t).hidden=tab!==t}
  if(aberta)detalhe(aberta);
  const fut=futuras();const grp=fut.filter(p=>temGente(p.id));
  $("nGrupo").textContent=loaded?grp.length:"";$("nTodas").textContent=loaded?fut.length:"";
  if(!loaded){$("view-grupo").replaceChildren(h("div",{class:"empty",text:"A carregar as provas…"}));return}
  listaPorMes(grp,$("view-grupo"),podeMarcar()?"Ainda ninguém marcou presença. Vai a Todas e carrega em Vou, Inscrito ou Talvez.":"Quando entrares no grupo, aqui aparecem as provas a que o grupo vai.");
  const reg=REGIOES.find(r=>r[0]===filtroReg),naReg=p=>!reg||reg[2].includes(p.distrito);
  $("regioes").replaceChildren(...[["","Todo o país",null],...REGIOES].map(([id,nome])=>{const n=id?fut.filter(p=>REGIOES.find(r=>r[0]===id)[2].includes(p.distrito)).length:fut.length;
    return h("button",{type:"button",class:"chip-reg","aria-pressed":String(filtroReg===id),onclick:()=>{filtroReg=id;filtroDist="";store.set("dorsal.regiao",id||null);store.set("dorsal.distrito",null);$("fDistrito").value="";draw()}},nome+" ",h("span",{class:"n",text:String(n)}))}));
  {const sel=$("regioes").querySelector('[aria-pressed="true"]');if(sel&&filtroReg&&!$("view-todas").hidden)requestAnimationFrame(()=>{const r=$("regioes");r.scrollLeft=sel.offsetLeft-r.offsetLeft-8})}
  fillSel($("fDistrito"),reg?"Todos os distritos de "+(reg[0]==="ilhas"?"Açores e Madeira":reg[1]):"Todos os distritos",[...new Set(fut.filter(naReg).map(p=>p.distrito).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"pt")).map(x=>[x,x]));
  if(filtroDist&&[...$("fDistrito").options].some(o=>o.value===filtroDist))$("fDistrito").value=filtroDist;
  const q=$("q").value.trim().toLowerCase(),fd=$("fDistrito").value,fm=$("fMes").value;
  // filtros extra: distância e tipo de percurso
  const tiposDe=p=>String(p.distancias||"").split(",").map(s=>s.trim()).filter(Boolean);
  const tiposExist=[...new Set(fut.flatMap(tiposDe))].sort((a,b)=>{const ia=TIPOS_ORDEM.indexOf(a),ib=TIPOS_ORDEM.indexOf(b);return (ia<0?99:ia)-(ib<0?99:ib)||a.localeCompare(b,"pt")});
  $("tipos").replaceChildren(...tiposExist.map(t=>h("button",{type:"button",class:"chip-reg","aria-pressed":String(filtroTipos.has(t)),onclick:()=>{filtroTipos.has(t)?filtroTipos.delete(t):filtroTipos.add(t);store.set("dorsal.tipos",[...filtroTipos].join("|")||null);draw()}},t)));
  const semTipo=fut.filter(p=>!tiposDe(p).length).length;
  $("tiposTxt").textContent=filtroTipos.size?(semTipo?semTipo+(semTipo===1?" prova ainda sem percursos publicados fica":" provas ainda sem percursos publicados ficam")+" de fora.":""):"Escolhe um ou mais. Sem escolha, aparecem todas.";
  $("raios").replaceChildren(...[0,...RAIOS].map(r=>h("button",{type:"button",class:"chip-reg","aria-pressed":String(filtroRaio===r),disabled:!casa&&r?true:null,onclick:()=>{filtroRaio=r;store.set("dorsal.raio",r?String(r):null);draw()}},r?"até "+r+" km":"Qualquer distância")));
  const semLocal=fut.filter(p=>!coordsDe(p)).length;
  $("casaTxt").replaceChildren(...(casa?["Casa: ",h("strong",{text:casa.nome}),". ",h("button",{type:"button",class:"linkbtn",onclick:()=>{definirCasa(null);filtroRaio=0;store.set("dorsal.raio",null);draw()},text:"Esquecer"}),
    " Distância em linha recta até ao centro do concelho da prova, por isso é aproximada."+(filtroRaio&&semLocal?" "+semLocal+(semLocal===1?" prova sem local conhecido fica":" provas sem local conhecido ficam")+" de fora.":"")]:["Escolhe a tua localização ou o teu concelho para filtrar por distância. Fica só neste telemóvel."]));
  if(!$("concelhosList").options.length)$("concelhosList").replaceChildren(...LUG.c.map(c=>h("option",{value:c[4]+" ("+c[1]+")"})));
  const nExtra=(filtroRaio&&casa?1:0)+(filtroTipos.size?1:0);$("maisBtn").textContent=nExtra?"Mais filtros ("+nExtra+")":"Mais filtros";
  const todas=fut.filter(p=>naReg(p)&&(!filtroRaio||!casa||(kmAte(p)!=null&&kmAte(p)<=filtroRaio))&&(!filtroTipos.size||tiposDe(p).some(t=>filtroTipos.has(t)))&&(!fd||p.distrito===fd)&&(!fm||p.data.slice(0,7)===fm)&&(!q||[p.nome,p.concelho,p.distrito].join(" ").toLowerCase().includes(q)));
  listaPorMes(todas,$("todasList"),fut.length?"Nenhuma prova com estes filtros.":"Ainda não há provas.");
  fillSel($("fMes"),"Todos os meses",[...new Set(fut.map(p=>p.data.slice(0,7)))].sort().map(m=>[m,MESES[+m.slice(5)-1]+" "+m.slice(0,4)]));
  $("view-nova").querySelectorAll("input,select,button").forEach(el=>el.disabled=!podeMarcar());
  if(!$("resumo").hidden)$("resumoText").value=resumo();
}

// ---------- secções (menu lateral) ----------
const SECOES=window.DORSAL_SECOES||[];
function secAtual(){const m=location.hash.match(/[#&]s=([a-z-]+)/);return m&&SECOES.some(x=>x.id===m[1])?m[1]:null}
let secDesenhada=null;
function comRefs(texto,sid){const out=[];let i=0;String(texto).replace(/\[(\d+)\]/g,(m,n,pos)=>{out.push(texto.slice(i,pos));
  out.push(h("sup",null,h("a",{href:"#",onclick:e=>{e.preventDefault();const f=document.getElementById("f-"+sid+"-"+n);if(f)f.scrollIntoView({behavior:"smooth",block:"center"})},"aria-label":"Fonte "+n,text:"["+n+"]"})));i=pos+m.length;return m});
  out.push(texto.slice(i));return out}
function numIn(id,attrs){return h("input",Object.assign({id,type:"number",inputmode:"decimal",min:"0"},attrs))}
function calcEsforco(sid){const out=h("div",{class:"res"});
  const box=h("div",{class:"calc"},h("h2",{text:"Esforço de uma prova"}),
    h("div",{class:"campos"},h("label",{for:"ceKm"},"Distância (km)",numIn("ceKm",{value:"25",step:"0.1"})),h("label",{for:"ceD"},"D+ (m)",numIn("ceD",{value:"1000",step:"10"})),
      h("label",{class:"full",for:"ceR",style:"grid-column:1/-1"},"O teu ritmo por km-esforço (min), opcional",numIn("ceR",{placeholder:"por exemplo 8",step:"0.5"}))),out);
  const calc=()=>{const km=parseFloat($("ceKm").value)||0,d=parseFloat($("ceD").value)||0,r=parseFloat($("ceR").value);const ke=km+d/100;
    out.replaceChildren(h("div",null,h("b",{text:ke.toFixed(1).replace(".",",")})," km-esforço"),
      h("p",{class:"hint"},...comRefs(String(km).replace(".",",")+" km + "+d+" m ÷ 100, a convenção da ITRA e do UTMB [1][2]. "+(km>0?"Equivale a "+(ke/km).toFixed(2).replace(".",",")+" vezes a distância em plano.":""),sid)),
      r>0?h("p",null,"Tempo estimado: ",h("strong",{text:hm(ke*r/60)})," a "+String(r).replace(".",",")+" min por km-esforço."):null)};
  box.addEventListener("input",calc);setTimeout(calc);return box}
function hm(horas){const t=Math.round(horas*60);return Math.floor(t/60)+" h "+String(t%60).padStart(2,"0")+" min"}
function calcAbast(sid){const out=h("div",{class:"res"});
  const box=h("div",{class:"calc"},h("h2",{text:"Plano de abastecimento"}),
    h("div",{class:"campos"},h("label",{for:"caH"},"Duração prevista (h)",numIn("caH",{value:"3",step:"0.25"})),h("label",{for:"caG"},"Gramas por gel ou barra",numIn("caG",{value:"25",step:"1"}))),out);
  const calc=()=>{const hrs=parseFloat($("caH").value)||0,g=parseFloat($("caG").value)||25;let lo,hi,ref;
    if(hrs<1){out.replaceChildren(h("p",null,"Abaixo de 1 hora não precisas de comer durante o esforço. Bebe conforme a sede.")) ;return}
    if(hrs<=2.5){lo=30;hi=60;ref="[3]"}else{lo=60;hi=90;ref="[3]"}
    const tl=Math.round(lo*hrs),th=Math.round(hi*hrs);
    out.replaceChildren(
      h("div",null,h("b",{text:lo+"–"+hi+" g/h"})," de hidratos de carbono"),
      h("p",null,...comRefs("Total para "+String(hrs).replace(".",",")+" h: "+tl+"–"+th+" g, ou seja, cerca de "+Math.ceil(tl/g)+" a "+Math.ceil(th/g)+" unidades de "+g+" g "+ref+"."+(hrs>2.5?" Acima de 60 g/h usa misturas de glucose com frutose [3].":""),sid)),
      h("p",null,...comRefs("Líquidos: bebe com sede [5]. Em ultras, a referência da ISSN é 450–750 mL/h, ou "+Math.round(.45*hrs*10)/10+"–"+Math.round(.75*hrs*10)/10+" L no total; mais com calor [4].",sid).map(x=>typeof x==="string"?x.replace(/(\d)\.(\d)/g,"$1,$2"):x)))};
  box.addEventListener("input",calc);setTimeout(calc);return box}
function checklist(b){const key=i=>"dorsal.check."+b.id+"."+i;let i=0;const total=b.grupos.reduce((a,g)=>a+g.itens.length,0);
  const prog=h("p",{class:"prog"});const upd=()=>{let n=0;for(let k=0;k<total;k++)if(store.get(key(k))==="1")n++;prog.textContent=n+" de "+total+" prontos"};
  const grupos=b.grupos.map(g=>h("div",{class:"check"},h("h2",{text:g.h}),...g.itens.map(t=>{const k=i++;const cb=h("input",{type:"checkbox"});cb.checked=store.get(key(k))==="1";
    cb.addEventListener("change",()=>{store.set(key(k),cb.checked?"1":null);upd()});return h("label",null,cb,h("span",{text:t}))})));
  const limpar=h("button",{class:"btn small",onclick:()=>{for(let k=0;k<total;k++)store.set(key(k),null);secDesenhada=null;draw()},text:"Limpar tudo"});
  upd();return h("div",null,h("div",{class:"row between"},prog,limpar),...grupos)}
function bloco(b,sid){switch(b.t){
  case "h":return h("h2",{text:b.x});
  case "p":return h("p",null,...comRefs(b.x,sid));
  case "nota":return h("div",{class:"nota"},...comRefs(b.x,sid));
  case "lista":return h("ul",{class:"pl"},...b.itens.map(x=>h("li",null,...comRefs(x,sid))));
  case "factos":return h("div",{class:"factos"},...b.itens.map(f=>h("div",{class:"facto"},h("b",{text:f.n}),h("span",null,...comRefs(f.x,sid)))));
  case "linha":return h("ol",{class:"linha"},...b.itens.map(f=>h("li",null,h("b",{text:f.a}),h("span",null,...comRefs(f.x,sid)))));
  case "termos":return h("dl",{class:"termos"},...b.itens.flatMap(([t,d])=>[h("dt",{text:t}),h("dd",{text:d})]));
  case "checklist":return checklist(b);
  case "calc-esforco":return calcEsforco(sid);
  case "calc-abast":return calcAbast(sid);
  default:return null}}
function desenharSec(sid){if(secDesenhada===sid)return;secDesenhada=sid;const S=SECOES.find(x=>x.id===sid);const box=$("pg-sec");
  box.replaceChildren(h("article",{class:"sec"},h("h1",{text:S.titulo}),h("p",{class:"lead",text:S.resumo}),...S.blocos.map(b=>bloco(b,sid)),
    S.fontes.length?h("section",{class:"fontes"},h("strong",{text:"Fontes"}),h("ol",null,...S.fontes.map((f,i)=>h("li",{id:"f-"+sid+"-"+(i+1)},f.t+" ",h("a",{href:f.u,target:"_blank",rel:"noopener",text:"Abrir ↗"}))))):null))}
function abrirMenu(abrir){$("menu").hidden=!abrir;$("scrim").hidden=!abrir;$("menuBtn").setAttribute("aria-expanded",String(abrir));document.body.style.overflow=abrir?"hidden":"";if(abrir)$("menuList").querySelector("[aria-current]")?.focus()}
function desenharMenu(){const cur=secAtual()||"provas";
  $("menuList").replaceChildren(
    h("li",null,h("a",{href:"#",onclick:e=>{e.preventDefault();history.pushState(null,"",location.pathname+location.search);abrirMenu(false);draw();window.scrollTo({top:0})},"aria-current":cur==="provas"?"page":null},h("span",{class:"ic",text:"◆"}),"Provas")),
    h("li",{class:"sep"}),
    ...SECOES.map(x=>h("li",null,h("a",{href:"#s="+x.id,onclick:()=>abrirMenu(false),"aria-current":cur===x.id?"page":null},h("span",{class:"ic",text:x.icone}),x.titulo))))}
$("menuBtn").addEventListener("click",()=>abrirMenu(true));
$("menuX").addEventListener("click",()=>abrirMenu(false));
$("scrim").addEventListener("click",()=>abrirMenu(false));
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("menu").hidden)abrirMenu(false)});

// ---------- eventos ----------
document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>{tab=b.dataset.tab;store.set("dorsal.tab",tab);draw()}));
["q","fMes"].forEach(id=>$(id).addEventListener("input",draw));
$("maisBtn").addEventListener("click",()=>{const m=$("maisFiltros");m.hidden=!m.hidden;$("maisBtn").setAttribute("aria-expanded",String(!m.hidden))});
$("geoBtn").addEventListener("click",()=>{if(!navigator.geolocation){toast("Este telemóvel não dá a localização.");return}$("geoBtn").disabled=true;$("geoBtn").textContent="A localizar…";
  navigator.geolocation.getCurrentPosition(pos=>{const lat=+pos.coords.latitude.toFixed(3),lon=+pos.coords.longitude.toFixed(3),c=concelhoMaisPerto(lat,lon);$("geoBtn").disabled=false;$("geoBtn").textContent="Usar a minha localização";definirCasa({lat,lon,nome:"localização actual"+(c?", perto de "+c[4]:"")})},
    err=>{$("geoBtn").disabled=false;$("geoBtn").textContent="Usar a minha localização";toast(err.code===1?"Localização recusada. Escreve o teu concelho.":"Não consegui a localização. Escreve o teu concelho.")},{enableHighAccuracy:false,timeout:10000,maximumAge:3600000})});
$("casaIn").addEventListener("change",()=>{const v=$("casaIn").value,m=v.match(/^(.*?)\s*\(([^)]+)\)\s*$/);const nome=norm(m?m[1]:v),dist=m?m[2]:null;
  const c=LUG.c.find(x=>x[0]===nome&&(!dist||x[1]===dist));if(!c){toast("Não encontrei esse concelho.");return}$("casaIn").value="";definirCasa({lat:c[2],lon:c[3],nome:c[4]})});
$("fDistrito").addEventListener("input",()=>{filtroDist=$("fDistrito").value;store.set("dorsal.distrito",filtroDist||null);draw()});
$("resumoBtn").addEventListener("click",()=>{const r=$("resumo");r.hidden=!r.hidden;if(!r.hidden){const t=resumo();$("resumoText").value=t;$("resumoWa").href="https://wa.me/?text="+encodeURIComponent(t)}});
$("resumoCopy").addEventListener("click",()=>copiar($("resumoText").value,$("resumoText")));
$("codigoForm").addEventListener("submit",e=>{e.preventDefault();const c=lerCodigo($("codigo").value)||lerCodigo("?g="+$("codigo").value.trim());if(!c){$("codigoMsg").textContent="Não reconheci esse link ou código.";return}grupo=c;store.set("dorsal.grupo",c);loaded=false;draw();carregar()});
$("novoForm").addEventListener("submit",async e=>{e.preventDefault();const nome=$("novoNome").value.trim().slice(0,30);if(!nome)return;
  try{const r=await api("membros",{method:"POST",prefer:"return=representation",body:{grupo,nome}});const m=r&&r[0];if(!m)throw 0;membros[m.id]=m.nome;me=m.id;store.set(chaveMe(),m.id);$("novoNome").value="";draw();toast("Bem-vindo, "+m.nome)}
  catch(err){toast("Não foi possível juntar-te. Tenta outra vez.")}});
$("meBtn").addEventListener("click",()=>{tab="grupo";draw();window.scrollTo({top:0,behavior:"smooth"})});
// ---------- editar grupo (nome e logótipo) ----------
let novoLogo=null;
function reduzirImagem(file){return new Promise((res,rej)=>{const img=new Image(),url=URL.createObjectURL(file);img.onload=()=>{const S=128,c=document.createElement("canvas");c.width=c.height=S;const x=c.getContext("2d");
  const lado=Math.min(img.width,img.height);x.drawImage(img,(img.width-lado)/2,(img.height-lado)/2,lado,lado,0,0,S,S);URL.revokeObjectURL(url);
  let d=c.toDataURL("image/webp",.8);if(!d.startsWith("data:image/webp"))d=c.toDataURL("image/jpeg",.82);res(d)};img.onerror=rej;img.src=url})}
$("editarBtn").addEventListener("click",()=>{const p=$("editarGrupo");p.hidden=!p.hidden;if(!p.hidden){$("gNome").value=grupoNome;novoLogo=null;$("gPrev").src=grupoLogo||"icons/dorsal-v2.svg";$("gMsg").textContent="";p.scrollIntoView({behavior:"smooth",block:"center"})}});
$("gFicheiro").addEventListener("change",async e=>{const f=e.target.files[0];if(!f)return;try{novoLogo=await reduzirImagem(f);$("gPrev").src=novoLogo}catch(_){$("gMsg").textContent="Não consegui ler essa imagem."}});
$("gTirar").addEventListener("click",()=>{novoLogo="";$("gPrev").src="icons/dorsal-v2.svg"});
$("gForm").addEventListener("submit",async e=>{e.preventDefault();if(!podeMarcar())return;const nome=$("gNome").value.trim().slice(0,40);if(!nome){$("gMsg").textContent="O grupo precisa de um nome.";return}
  const body={nome};if(novoLogo!==null)body.logo=novoLogo;
  try{await api("grupos?codigo=eq."+grupo,{method:"PATCH",prefer:"return=minimal",body});grupoNome=nome;if(novoLogo!==null)grupoLogo=novoLogo;$("editarGrupo").hidden=true;draw();toast("Grupo actualizado")}
  catch(err){$("gMsg").textContent="Não foi possível guardar. Tenta outra vez."}});
$("sair").addEventListener("click",()=>{me=null;store.set(chaveMe(),null);draw();window.scrollTo({top:0})});
$("partilhar").addEventListener("click",()=>{const link=location.origin+location.pathname+"?g="+grupo;copiar("Junta-te"+(grupoNome?" aos "+grupoNome:" ao grupo")+" no Dorsal para combinarmos as provas de trail: "+link,null)});
$("nDistrito").replaceChildren(h("option",{value:"",text:"Escolher"}),...DISTRITOS.map(d=>h("option",{value:d,text:d})));
$("novaForm").addEventListener("submit",async e=>{e.preventDefault();if(!podeMarcar())return;
  const nome=$("nNome").value.trim(),data=$("nData").value;if(!nome||!data)return;
  const id=(nome.normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,60)||"prova")+"-"+data;
  const body={id,nome,data,distrito:$("nDistrito").value,concelho:$("nConcelho").value.trim(),distancias:$("nDist").value.trim(),inscricao:valid($("nInsc").value.trim())||"",info:valid($("nInfo").value.trim())||"",fonte:"grupo",grupo,criado_por:me};
  try{await api("provas",{method:"POST",prefer:"return=minimal",body});$("novaForm").reset();$("novaMsg").textContent="";toast("Prova acrescentada");tab="todas";await carregar()}
  catch(err){$("novaMsg").textContent=err.status===409?"Essa prova já existe nessa data.":"Não foi possível guardar. Tenta outra vez."}});

let ultimaAberta=provaAberta();
window.addEventListener("hashchange",()=>{const a=provaAberta();if(a&&!ultimaAberta)history.replaceState({dorsal:1},"");ultimaAberta=a;draw();window.scrollTo({top:0})});
draw();carregar();
setInterval(()=>{if(document.visibilityState==="visible"&&ONLINE)carregar()},30000);
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&ONLINE&&loaded)carregar()});
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
})();
