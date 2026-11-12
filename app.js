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
let extra={},meteo={},passadas=[],nCom={},conv={},maxCom={},novas={},temTrilho=new Set(),trilhosP={},mapas={};
const lidas=()=>{try{return JSON.parse(store.get("dorsal.lidas."+grupo)||"null")}catch(_){return null}},guardarLidas=L=>store.set("dorsal.lidas."+grupo,JSON.stringify(L));
function marcarLida(pid,id){if(!id)return;const L=lidas()||{};if((L[pid]||0)<id){L[pid]=id;guardarLidas(L)}if(novas[pid]){delete novas[pid]}}
let provas=[],membros={},pres={},cliques={},loaded=false;
let histTodas=false,vistaCal=store.get("dorsal.vista")==="cal",calMes=null,calDia=null;
let filtroReg=store.get("dorsal.regiao")||"",filtroDist=store.get("dorsal.distrito")||"";
let casa=null;try{casa=JSON.parse(store.get("dorsal.casa")||"null")}catch(_){}
let filtroRaio=+(store.get("dorsal.raio")||0);let filtroTipos=new Set((store.get("dorsal.tipos")||"").split("|").filter(Boolean));
const TIPOS_ORDEM=["Caminhada","Trail kids","Trail curto","Trail longo","Trail ultra","Skyrunning","Backyard"];
const RAIOS=[5,10,15,20,50,100];
let tab=store.get("dorsal.tab")||"grupo",openMsg=null,confirmDel=null;

// ---------- código do grupo ----------
function lerCodigo(txt){const t=String(txt||"").trim();const m=t.match(/[?&#]g=([a-z0-9]{6,40})/i);if(m)return m[1].toLowerCase();if(/^[a-z0-9]{6,40}$/i.test(t))return t.toLowerCase();return null}
(function(){const c=lerCodigo(location.search)||lerCodigo(location.hash);const ad=location.hash.match(/[#&]admin=([0-9a-f]{20,80})/i);
  if(c){store.set("dorsal.grupo",c);if(ad)store.set("dorsal.admin."+c,ad[1].toLowerCase());try{history.replaceState(history.state,"",location.pathname+(ad?"":location.hash))}catch(_){}}
  grupo=store.get("dorsal.grupo");if(ad&&c)setTimeout(()=>{verAdmin().then(()=>toast(souAdmin()?"Passaste a administrar este grupo":"Este link de administração já não é válido"))},1500)})();
let entrarAberto=false;
let adminEstado=null;
const chaveAdmin=()=>"dorsal.admin."+grupo,adminTok=()=>store.get(chaveAdmin());
async function verAdmin(){if(!grupo){adminEstado=null;return}try{adminEstado=await api("rpc/admin_estado",{method:"POST",body:{p_token:adminTok()||""}})}catch(_){adminEstado=null}}
const souAdmin=()=>adminEstado==="admin";
const ICS={"calendario":"<rect x=\"3.5\" y=\"5\" width=\"17\" height=\"15\" rx=\"2\"/><path d=\"M3.5 10h17M8 3v4M16 3v4M12 13.5v4M10 15.5h4\"/>","partilhar":"<path d=\"M12 15V3M8 7l4-4 4 4\"/><path d=\"M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7\"/>","mapa":"<path d=\"M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z\"/><circle cx=\"12\" cy=\"10\" r=\"2.4\"/>","conversa":"<path d=\"M4 5h16v11H9l-5 4z\"/><path d=\"M8 9.5h8M8 12.5h5\"/>","provas": "<path d=\"M3 19l5.5-8 3.5 4.5 2.5-3L21 19z\"/><circle cx=\"17\" cy=\"6\" r=\"2\"/>", "estatisticas": "<path d=\"M4 20V10M10 20V4M16 20v-7M22 20H2\"/>", "membros": "<circle cx=\"8\" cy=\"8\" r=\"3.2\"/><circle cx=\"16.5\" cy=\"9\" r=\"2.6\"/><path d=\"M2.5 19c.6-3.3 2.8-5 5.5-5s4.9 1.7 5.5 5M13.5 15.2c.9-.8 1.9-1.2 3-1.2 2.3 0 4 1.5 4.5 4.5\"/>", "mais": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 8v8M8 12h8\"/>", "ferramentas": "<path d=\"M14.5 6.5a4 4 0 0 0-5.4 5.1L3.5 17.2l3.3 3.3 5.6-5.6a4 4 0 0 0 5.1-5.4l-2.6 2.6-2.4-.6-.6-2.4z\"/>", "preparacao": "<path d=\"M13 4.5a1.8 1.8 0 1 0 0-.1M7 21l3-6 3 2v4M10 15l1-5 4 3 3 1M8 10l3-1\"/>", "nutricao": "<path d=\"M8 3v4M12 3v4M10 7v14M8 7h4a0 0 0 0 1 0 0v2a2 2 0 0 1-2 2 2 2 0 0 1-2-2zM17 3c-1.7 1-2.5 3-2.5 6s1 4 2.5 4v8\"/>", "equipamento": "<path d=\"M8 6V4h8v2M5 6h14l-1 15H6z\"/><path d=\"M9 11h6\"/>", "seguranca": "<path d=\"M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6z\"/><path d=\"M12 8v5M12 16h.01\"/>", "saude": "<path d=\"M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z\"/><path d=\"M8 11h2l1-2 2 4 1-2h2\"/>", "historia": "<path d=\"M5 4h10l4 4v12H5z\"/><path d=\"M15 4v4h4M8 12h8M8 16h6\"/>", "glossario": "<path d=\"M4 19V6a2 2 0 0 1 2-2h13v14H6a2 2 0 0 0-2 2zM19 18v3H6\"/><path d=\"M9 8h6\"/>", "privacidade": "<rect x=\"5\" y=\"10\" width=\"14\" height=\"10\" rx=\"2\"/><path d=\"M8 10V7a4 4 0 0 1 8 0v3\"/>"};
function ic(n,txt){const sp=h("span",{class:"ic"});if(ICS[n]){sp.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true">'+ICS[n]+'</svg>'}else sp.textContent=txt||"";return sp}
function gruposConhecidos(){try{return JSON.parse(store.get("dorsal.grupos")||"[]")}catch(_){return[]}}
function lembrarGrupo(c,n){const l=gruposConhecidos().filter(x=>x.c!==c);l.unshift({c,n:n||""});store.set("dorsal.grupos",JSON.stringify(l.slice(0,20)))}
function esquecerGrupo(c){store.set("dorsal.grupos",JSON.stringify(gruposConhecidos().filter(x=>x.c!==c)))}
function mudarGrupo(c){grupo=c;store.set("dorsal.grupo",c);me=c?store.get("dorsal.membro."+c):null;membros={};pres={};extra={};cliques={};grupoNome="";grupoLogo="";
  const k=store.get("dorsal.cache."+c);if(k){try{const o=JSON.parse(k);membros=o.membros||{};pres=o.pres||{};extra=o.extra||{};passadas=o.passadas||[];grupoNome=o.grupoNome||"";grupoLogo=o.grupoLogo||""}catch(_){}}
  entrarAberto=false;status("");draw();window.scrollTo({top:0});carregar()}
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
    if(grupo)reqs.push(api("grupos?select=nome,logo&codigo=eq."+grupo),api("membros?select=id,nome&order=nome.asc"),api("presencas?select=membro_id,prova_id,estado,percurso,boleia,lugares,tempo,km,dplus"),api("cliques?select=prova_id"),api("comentarios?select=prova_id,id,membro_id").catch(()=>[]),api("trilhos?select=prova_id,membro_id").catch(()=>[]));
    const [ps,gs,ms,pr,cl,co,tr]=await Promise.all(reqs);if(grupo)verAdmin().then(()=>{if(!$("editarGrupo").hidden)painelAdmin()});if(tr){temTrilho=new Set(tr.map(x=>x.prova_id+"|"+x.membro_id))}
    provas=ps||[];
    if(grupo){
      if(!gs||!gs.length){status("Esse código de grupo não existe. Confirma o link que recebeste.");esquecerGrupo(grupo);store.set("dorsal.grupo",null);grupo=null;membros={};pres={};}
      else{grupoNome=gs[0].nome||"";grupoLogo=gs[0].logo||"";lembrarGrupo(grupo,grupoNome);membros={};for(const m of ms||[])membros[m.id]=m.nome;
        pres={};extra={};for(const x of pr||[]){(pres[x.prova_id]=pres[x.prova_id]||{})[x.membro_id]=x.estado;(extra[x.prova_id]=extra[x.prova_id]||{})[x.membro_id]={percurso:x.percurso||"",boleia:x.boleia||"",lugares:x.lugares||0,tempo:x.tempo||"",km:x.km,dplus:x.dplus}}
        {const ids=new Set(provas.map(p=>p.id)),falta=Object.keys(pres).filter(id=>!ids.has(id));passadas=[];
          if(falta.length){try{passadas=(await api("provas?select=*&order=data.desc&id=in.("+falta.map(i=>'"'+encodeURIComponent(i)+'"').join(",")+")"))||[]}catch(_){}}}
        cliques={};for(const c of cl||[])cliques[c.prova_id]=(cliques[c.prova_id]||0)+1;
        nCom={};maxCom={};novas={};for(const c of co||[]){nCom[c.prova_id]=(nCom[c.prova_id]||0)+1;maxCom[c.prova_id]=Math.max(maxCom[c.prova_id]||0,c.id)}
        {let L=lidas();if(!L){L={};for(const k in maxCom)L[k]=maxCom[k];guardarLidas(L)}for(const c of co||[])if(c.id>(L[c.prova_id]||0)&&c.membro_id!==me)novas[c.prova_id]=(novas[c.prova_id]||0)+1}{const a=provaAberta();if(a&&conv[a])carregarConversa(a)}
        me=store.get(chaveMe());if(me&&!membros[me]){me=null;store.set(chaveMe(),null)}
        if($("statusText").textContent.startsWith("Sem ligação"))status("");}
    }
    store.set("dorsal.cache."+(grupo||"-"),JSON.stringify({provas,membros,pres,extra,passadas,grupoNome,grupoLogo}));
  }catch(e){
    const c=store.get("dorsal.cache."+(grupo||"-"))||store.get("dorsal.cache");if(c){try{const o=JSON.parse(c);provas=o.provas||[];membros=o.membros||{};pres=o.pres||{};extra=o.extra||{};passadas=o.passadas||[];grupoNome=o.grupoNome||"";grupoLogo=o.grupoLogo||""}catch(_){}}
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
function faltam(s){const n=Math.round((parseD(s)-hoje())/864e5);return n===0?"é hoje":n===1?"é amanhã":n===-1?"foi ontem":n<0?"foi há "+(-n)+" dias":"faltam "+n+" dias"}
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
  const nP=id=>{const x=exDe(p.id,id);return nomeDe(id)+(x.percurso?" ("+x.percurso+")":"")};
  if(q.inscrito.length)L.push("Inscritos: "+q.inscrito.map(nP).join(", "));if(q.vou.length)L.push("Vão: "+q.vou.map(nP).join(", "));
  {const of=Object.keys(pres[p.id]||{}).filter(id=>exDe(p.id,id).boleia==="oferece"),pr=Object.keys(pres[p.id]||{}).filter(id=>exDe(p.id,id).boleia==="precisa");
   if(of.length)L.push("Boleias: "+of.map(id=>nomeDe(id)+" ("+(exDe(p.id,id).lugares||0)+" lugares)").join(", "));if(pr.length)L.push("Precisam de boleia: "+pr.map(nomeDe).join(", "))}if(q.talvez.length)L.push("Talvez: "+q.talvez.map(nomeDe).join(", "));
  if(!temGente(p.id))L.push("Ainda ninguém marcou. Alguém alinha?");
  const i=valid(p.inscricao)||valid(p.info);if(i)L.push((valid(p.inscricao)?"Inscrição: ":"Informação: ")+i);return L.join("\n")}
function resumo(){const lim=new Date(hoje().getTime()+42*864e5);const ps=futuras().filter(p=>parseD(p.data)<=lim&&temGente(p.id));
  if(!ps.length)return "Ainda ninguém marcou presença em provas das próximas 6 semanas.";
  return "Próximas provas do grupo:\n\n"+ps.map(p=>{const q=quem(p.id),d=parseD(p.data),parts=[];if(q.inscrito.length)parts.push("inscritos "+q.inscrito.map(nomeDe).join(", "));if(q.vou.length)parts.push("vão "+q.vou.map(nomeDe).join(", "));if(q.talvez.length)parts.push("talvez "+q.talvez.map(nomeDe).join(", "));
    return "- "+d.getDate()+" de "+MESES[d.getMonth()]+", "+p.nome+(p.concelho?" ("+p.concelho+")":"")+": "+parts.join("; ")+(valid(p.inscricao)?"\n  "+p.inscricao:"")}).join("\n")}

// ---------- acções ----------
const exDe=(pid,id)=>(extra[pid]&&extra[pid][id])||{percurso:"",boleia:"",lugares:0,tempo:"",km:null,dplus:null};
function normTempo(v){v=String(v||"").trim().replace(/[hH]/,":").replace(/[mM']/,":").replace(/[sS"]/,"").replace(/\s+/g,"");if(!v)return"";const m=v.match(/^(\d{1,3}):(\d{1,2})(?::(\d{1,2}))?$/);if(!m||+m[2]>59||(m[3]&&+m[3]>59))return null;return +m[1]+":"+m[2].padStart(2,"0")+(m[3]!=null?":"+m[3].padStart(2,"0"):"")}
// ---------- conversa por prova ----------
function carregarConversa(pid){if(!ONLINE||!grupo)return;conv[pid]=conv[pid]||{estado:"a",lista:[]};
  api("comentarios?select=id,membro_id,texto,criado_em&prova_id=eq."+encodeURIComponent(pid)+"&order=criado_em.asc").then(l=>{conv[pid]={estado:"ok",lista:l||[]};nCom[pid]=(l||[]).length;if(provaAberta()===pid&&l&&l.length)marcarLida(pid,Math.max(...l.map(x=>x.id)));draw()}).catch(()=>{conv[pid].estado="erro";draw()})}
function haQuanto(iso){const s=(Date.now()-new Date(iso).getTime())/1000;if(s<60)return"agora";if(s<3600)return"há "+Math.floor(s/60)+" min";if(s<86400)return"há "+Math.floor(s/3600)+" h";const d=new Date(iso);return d.getDate()+" "+MESES[d.getMonth()].slice(0,3)}
let rascunho={};
function conversa(p){if(!ONLINE||!grupo)return null;if(!conv[p.id])carregarConversa(p.id);const c=conv[p.id]||{estado:"a",lista:[]};
  const lista=c.lista.length?h("ul",{class:"conv"},...c.lista.map(m=>h("li",{class:m.membro_id===me?"meu":null},h("div",{class:"cm-top"},h("strong",{text:nomeDe(m.membro_id)}),h("span",{class:"hint",text:haQuanto(m.criado_em)}),
      m.membro_id===me?h("button",{class:"linkbtn",onclick:async()=>{try{await api("comentarios?id=eq."+m.id,{method:"DELETE"});carregarConversa(p.id)}catch(_){toast("Não foi possível apagar.")}},text:"apagar"}):null),h("p",{text:m.texto})))):
    h("p",{class:"hint",text:c.estado==="a"?"A carregar…":c.estado==="erro"?"Não foi possível carregar a conversa.":"Ainda ninguém escreveu. Combina aqui o encontro, a boleia ou o jantar."});
  let form=null;if(podeMarcar()){const ta=h("textarea",{rows:"2",maxlength:"500",placeholder:"Escreve para o grupo…","aria-label":"Mensagem",oninput:e=>{rascunho[p.id]=e.target.value}});ta.value=rascunho[p.id]||"";
    form=h("form",{class:"cm-form",onsubmit:async e=>{e.preventDefault();const t=ta.value.trim();if(!t)return;const b=e.target.querySelector("button");b.disabled=true;
      try{const r=await api("comentarios",{method:"POST",prefer:"return=representation",body:{grupo,prova_id:p.id,membro_id:me,texto:t.slice(0,500)}});rascunho[p.id]="";carregarConversa(p.id);if(r&&r[0])avisarGrupo(r[0].id)}catch(_){toast("Não foi possível enviar.");b.disabled=false}}},ta,h("button",{class:"btn primary small",type:"submit",text:"Enviar"}))}
  return h("section",{class:"grupo-bloco conversa"},h("h3",null,"Conversa ",h("span",{class:"n",text:String(c.lista.length||"")})),lista,form)}

// ---------- notificações ----------
const FN=ONLINE?CFG.supabaseUrl.replace(/\/$/,"")+"/functions/v1/notificar":"";
const fnHeaders=()=>({apikey:CFG.supabaseAnonKey,Authorization:"Bearer "+CFG.supabaseAnonKey,"x-grupo":grupo||"","Content-Type":"application/json"});
function avisarGrupo(id){if(!FN)return;fetch(FN,{method:"POST",headers:fnHeaders(),body:JSON.stringify({comentario_id:id}),keepalive:true}).catch(()=>{})}
const pushSuportado=()=>"serviceWorker" in navigator&&"PushManager" in window&&"Notification" in window;
const ehStandalone=()=>matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;
const ehIOS=/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
const pushAtivo=()=>!!grupo&&!!store.get("dorsal.push."+grupo)&&"Notification" in window&&Notification.permission==="granted";
function b64u(s){const p="=".repeat((4-s.length%4)%4),b=atob((s+p).replace(/-/g,"+").replace(/_/g,"/"));return Uint8Array.from(b,c=>c.charCodeAt(0))}
let pushOcupado=false;
async function activarPush(){if(pushOcupado)return;if(!pushSuportado()){toast(ehIOS?"Instala a app no ecrã principal para teres notificações.":"Este navegador não suporta notificações.");return}
  pushOcupado=true;draw();
  try{const perm=await Notification.requestPermission();if(perm!=="granted"){toast("Sem autorização, não há notificações.");return}
    const reg=await navigator.serviceWorker.ready;const {publicKey}=await (await fetch(FN,{headers:fnHeaders()})).json();
    let sub=await reg.pushManager.getSubscription();if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64u(publicKey)});
    const j=sub.toJSON();await api("subscricoes?on_conflict=endpoint,grupo",{method:"POST",prefer:"resolution=merge-duplicates,return=minimal",body:{endpoint:j.endpoint,grupo,membro_id:me,p256dh:j.keys.p256dh,auth:j.keys.auth}});
    store.set("dorsal.push."+grupo,j.endpoint);toast("Notificações activadas")}
  catch(e){toast("Não foi possível activar as notificações.")}finally{pushOcupado=false;draw()}}
async function desactivarPush(){const ep=store.get("dorsal.push."+grupo);store.set("dorsal.push."+grupo,null);
  try{if(ep)await api("subscricoes?endpoint=eq."+encodeURIComponent(ep)+"&grupo=eq."+grupo,{method:"DELETE"})}catch(_){}
  const outros=gruposConhecidos().some(g=>g.c!==grupo&&store.get("dorsal.push."+g.c));
  if(!outros&&pushSuportado()){try{const reg=await navigator.serviceWorker.ready;const s=await reg.pushManager.getSubscription();if(s)await s.unsubscribe()}catch(_){}}
  toast("Notificações desactivadas");draw()}
function pushCartao(){if(!me||!ONLINE||pushAtivo()||store.get("dorsal.pushdispensa."+grupo))return null;
  const fechar=h("button",{class:"linkbtn",type:"button",onclick:()=>{store.set("dorsal.pushdispensa."+grupo,"1");draw()},text:"Agora não"});
  let corpo,acao=null;
  if(ehIOS&&!ehStandalone())corpo="Para receberes um aviso quando há mensagem nova numa prova, instala a Dorsal no ecrã principal (Partilhar → Adicionar ao ecrã principal) e activa as notificações a partir daí.";
  else if(!pushSuportado())return null;
  else if(Notification.permission==="denied")corpo="As notificações estão bloqueadas para a Dorsal. Para as receberes, autoriza-as nas definições do telemóvel.";
  else{corpo="Recebe um aviso no telemóvel quando alguém do grupo escreve na conversa de uma prova.";acao=h("button",{class:"btn primary small",type:"button",disabled:pushOcupado?true:null,onclick:activarPush,text:pushOcupado?"A activar…":"Activar notificações"})}
  return h("div",{class:"pushcard"},h("strong",{text:"🔔 Avisos das conversas"}),h("p",{text:corpo}),h("div",{class:"row"},acao,fechar))}

// ---------- trilhos GPS (GPX) ----------
const CORES=["#ee5a0f","#2563eb","#2e6b43","#9333ea","#d97706","#0891b2","#be123c","#4d7c0f"];
const hms=s=>Math.floor(s/3600)+":"+String(Math.floor(s%3600/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0");
function ritmo(dur,km){if(!dur||!km)return"";const s=Math.round(dur/km);return Math.floor(s/60)+":"+String(s%60).padStart(2,"0")+" /km"}
async function guardarTrilho(pid,g){
  if(!(pres[pid]&&pres[pid][me]))await api("presencas?on_conflict=membro_id,prova_id",{method:"POST",prefer:"resolution=merge-duplicates,return=minimal",body:{grupo,membro_id:me,prova_id:pid,estado:"inscrito",atualizado:new Date().toISOString()}});
  await api("trilhos?on_conflict=membro_id,prova_id",{method:"POST",prefer:"resolution=merge-duplicates,return=minimal",body:{grupo,prova_id:pid,membro_id:me,km:g.km,dplus:g.dplus,dminus:g.dminus,duracao_s:g.duracao_s,inicio:g.inicio?g.inicio.toISOString():null,pontos:g.pontos,elev:g.elev,atualizado:new Date().toISOString()}});
  const campos={km:Math.round(g.km*10)/10,dplus:g.dplus};if(g.duracao_s)campos.tempo=hms(g.duracao_s);
  await api("presencas?membro_id=eq."+me+"&prova_id=eq."+encodeURIComponent(pid),{method:"PATCH",prefer:"return=minimal",body:campos});
  temTrilho.add(pid+"|"+me);delete trilhosP[pid];if(mapas[pid]){try{mapas[pid].map.remove()}catch(_){}delete mapas[pid]}}
async function importarGPX(pid,file){try{const g=DorsalGPX.ler(await file.text());
    if(!confirm("GPX lido: "+String(g.km).replace(".",",")+" km, "+g.dplus+" m D+"+(g.duracao_s?", "+hms(g.duracao_s):"")+". Guardar nesta prova?"))return;
    await guardarTrilho(pid,g);toast("Trilho guardado");await carregar()}catch(err){toast(err&&err.message&&!err.status?err.message:"Não foi possível guardar o trilho.")}}
function carregarTrilhos(pid){trilhosP[pid]={estado:"a",lista:[]};api("trilhos?select=membro_id,km,dplus,dminus,duracao_s,pontos,elev&prova_id=eq."+encodeURIComponent(pid))
  .then(l=>{trilhosP[pid]={estado:"ok",lista:(l||[]).sort((a,b)=>nomeDe(a.membro_id).localeCompare(nomeDe(b.membro_id),"pt"))};draw()}).catch(()=>{trilhosP[pid]={estado:"erro",lista:[]};draw()})}
let leafletP=null;
function carregarLeaflet(){if(window.L)return Promise.resolve();if(leafletP)return leafletP;leafletP=new Promise((res,rej)=>{const c=document.createElement("link");c.rel="stylesheet";c.href="vendor/leaflet/leaflet.css";document.head.append(c);
  const s=document.createElement("script");s.src="vendor/leaflet/leaflet.js";s.onload=res;s.onerror=()=>{leafletP=null;rej()};document.head.append(s)});return leafletP}
function mapaTrilhos(pid,lista){let m=mapas[pid];const chave=lista.map(t=>t.membro_id+t.pontos.length).join("|");
  if(m&&m.chave===chave){requestAnimationFrame(()=>m.map&&m.map.invalidateSize());return m.el}
  if(m&&m.map){try{m.map.remove()}catch(_){}}
  const el=h("div",{class:"mapa","aria-label":"Mapa dos trilhos"});m=mapas[pid]={el,chave,map:null};
  carregarLeaflet().then(()=>{if(mapas[pid]!==m)return;const map=L.map(el,{scrollWheelZoom:false,attributionControl:true});m.map=map;
    L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",{maxZoom:17,subdomains:"abc",attribution:'Mapa © <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA) · dados © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(map);
    const b=[];lista.forEach((t,i)=>{const c=DorsalGPX.descodificar(t.pontos);if(c.length<2)return;L.polyline(c,{color:CORES[i%CORES.length],weight:4,opacity:.9}).bindTooltip(nomeDe(t.membro_id)).addTo(map);b.push(...c);
      if(i===0){L.circleMarker(c[0],{radius:6,color:"#fff",weight:2,fillColor:"#2e6b43",fillOpacity:1}).bindTooltip("Partida").addTo(map);L.circleMarker(c[c.length-1],{radius:6,color:"#fff",weight:2,fillColor:"#be123c",fillOpacity:1}).bindTooltip("Chegada").addTo(map)}});
    if(b.length)map.fitBounds(b,{padding:[16,16]});setTimeout(()=>map.invalidateSize(),60)}).catch(()=>{el.textContent="Não foi possível carregar o mapa."});
  return el}
function trilhosView(p){if(!grupo||!ONLINE||parseD(p.data)>hoje())return null;if(!trilhosP[p.id])carregarTrilhos(p.id);const T=trilhosP[p.id]||{estado:"a",lista:[]};
  const meuTem=T.lista.some(t=>t.membro_id===me);
  const imp=podeMarcar()?h("span",null,h("label",{class:"btn small"+(meuTem?"":" primary"),for:"gpx-"+p.id,text:meuTem?"Substituir o meu GPX":"Importar o meu GPX"}),
    h("input",{id:"gpx-"+p.id,type:"file",class:"vh",onchange:e=>{const f=e.target.files[0];e.target.value="";if(f)importarGPX(p.id,f)}})):null;
  const linhas=T.lista.map((t,i)=>h("li",null,h("span",{class:"cor",style:"background:"+CORES[i%CORES.length]}),h("strong",{text:nomeDe(t.membro_id)+(t.membro_id===me?" (tu)":"")}),
    h("span",{class:"tdados",text:String(+t.km).replace(".",",")+" km · "+t.dplus+" m D+"+(t.duracao_s?" · "+hms(t.duracao_s)+" · "+ritmo(t.duracao_s,+t.km):"")}),
    h("button",{class:"linkbtn",type:"button",onclick:()=>descarregarGPX(p,t),text:"GPX ↓"}),
    t.membro_id===me?h("button",{class:"linkbtn",type:"button",onclick:async()=>{if(!confirm("Apagar o teu trilho desta prova?"))return;try{await api("trilhos?membro_id=eq."+me+"&prova_id=eq."+encodeURIComponent(p.id),{method:"DELETE"});temTrilho.delete(p.id+"|"+me);delete trilhosP[p.id];if(mapas[p.id]){try{mapas[p.id].map.remove()}catch(_){}delete mapas[p.id]}draw()}catch(_){toast("Não foi possível apagar.")}},text:"apagar"}):null));
  let perfil=null;if(T.lista.length){perfil=DorsalGPX.perfilSVG(T.lista.map((t,i)=>({coords:DorsalGPX.descodificar(t.pontos),elev:t.elev,cor:CORES[i%CORES.length]})))}
  return h("section",{class:"grupo-bloco trilhos"},h("div",{class:"row between"},h("h3",null,"Trilhos GPS ",h("span",{class:"n",text:T.lista.length?String(T.lista.length):""})),imp),
    T.estado==="a"?h("p",{class:"hint",text:"A carregar…"}):T.lista.length?h("div",null,mapaTrilhos(p.id,T.lista),perfil,h("ul",{class:"tlista"},...linhas)):
    h("p",{class:"hint",text:"Ninguém importou ainda o trilho desta prova. Exporta o GPX do relógio, do Strava ou do Wikiloc e importa-o aqui: a app calcula km, D+, tempo e ritmo."}))}

function descarregarGPX(p,t){const c=DorsalGPX.descodificar(t.pontos),el=t.elev?t.elev.split(","):[];const esc=s=>String(s).replace(/[<>&]/g,m=>({"<":"&lt;",">":"&gt;","&":"&amp;"}[m]));
  const gpx='<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Dorsal" xmlns="http://www.topografix.com/GPX/1/1"><metadata><name>'+esc(p.nome)+'</name></metadata><trk><name>'+esc(p.nome+" · "+nomeDe(t.membro_id))+'</name><trkseg>'+
    c.map((x,i)=>'<trkpt lat="'+x[0].toFixed(5)+'" lon="'+x[1].toFixed(5)+'">'+(el[i]!=null&&el.length===c.length?'<ele>'+el[i]+'</ele>':'')+'</trkpt>').join("")+'</trkseg></trk></gpx>';
  const url=URL.createObjectURL(new Blob([gpx],{type:"application/gpx+xml"}));const a=h("a",{href:url,download:(p.nome+"-"+nomeDe(t.membro_id)).normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9]+/g,"-")+".gpx"});document.body.append(a);a.click();setTimeout(()=>{a.remove();URL.revokeObjectURL(url)},2000)}

// ---------- estatísticas e conquistas ----------
let estQuem="eu",estAno=null;
function feitasDe(id,ano){return passadas.filter(p=>!eTreino(p)&&(!ano||p.data.startsWith(ano))&&foiA(p.id,id))}
function barrasSVG(vals,rotulos,unid,cor){const W=600,H=190,P={l:60,r:8,t:18,b:28},mx=Math.max(1,...vals),bw=(W-P.l-P.r)/vals.length;const ns="http://www.w3.org/2000/svg";
  const svg=document.createElementNS(ns,"svg");svg.setAttribute("viewBox","0 0 "+W+" "+H);svg.setAttribute("class","barras");svg.setAttribute("role","img");
  svg.setAttribute("aria-label",rotulos.map((r,i)=>r+": "+fmtN(Math.round(vals[i]*10)/10)+" "+unid).join("; "));
  const add=(t,a,x)=>{const e=document.createElementNS(ns,t);for(const k in a)e.setAttribute(k,a[k]);if(x!=null)e.textContent=x;svg.append(e);return e};
  for(const f of [0,.5,1]){const y=P.t+(H-P.t-P.b)*(1-f);add("line",{x1:P.l,x2:W-P.r,y1:y,y2:y,class:"grade"});add("text",{x:P.l-6,y:y+6,"text-anchor":"end",class:"eixo"},fmtN(Math.round(mx*f)))}
  vals.forEach((v,i)=>{const hgt=(H-P.t-P.b)*v/mx,x=P.l+i*bw+bw*.15;if(v>0){add("rect",{x,y:H-P.b-hgt,width:bw*.7,height:Math.max(2,hgt),rx:3,fill:cor});add("text",{x:x+bw*.35,y:H-P.b-hgt-4,"text-anchor":"middle",class:"val"},fmtN(Math.round(v)))}
    add("text",{x:x+bw*.35,y:H-8,"text-anchor":"middle",class:"eixo"},rotulos[i])});return svg}
const CONQ=[
  ["Primeira prova","1 prova feita",t=>t.n>=1],["Habitué","5 provas",t=>t.n>=5],["Viciado","10 provas",t=>t.n>=10],["Colecionador","20 provas",t=>t.n>=20],
  ["100 km","100 km em provas",t=>t.km>=100],["250 km","250 km em provas",t=>t.km>=250],["500 km","500 km em provas",t=>t.km>=500],
  ["Montanheiro","5000 m de D+",t=>t.d>=5000],["Everest","8849 m de D+ acumulado",t=>t.d>=8849],["Duplo Everest","17 698 m de D+",t=>t.d>=17698],
  ["Maratona de trilho","uma prova com 42 km ou mais",t=>t.maxKm>=42],["Ultra","uma prova com 50 km ou mais",t=>t.maxKm>=50],["Muro vertical","uma prova com 2000 m de D+",t=>t.maxD>=2000],
  ["Fiel ao grupo","5 provas com mais alguém do grupo",t=>t.comGrupo>=5]];
function estatTotais(id,ano){const fs=feitasDe(id,ano);const t={n:fs.length,km:0,d:0,sg:0,maxKm:0,maxD:0,melhorRitmo:null,comGrupo:0,meses:Array(12).fill(0),mesesD:Array(12).fill(0),provaKm:null,provaD:null,provaRitmo:null};
  for(const p of fs){const x=exDe(p.id,id),km=+x.km||0,d=+x.dplus||0,sg=segDeTempo(x.tempo),m=+p.data.slice(5,7)-1;t.km+=km;t.d+=d;t.sg+=sg;t.meses[m]+=km;t.mesesD[m]+=d;
    if(km>t.maxKm){t.maxKm=km;t.provaKm=p}if(d>t.maxD){t.maxD=d;t.provaD=p}if(km>=5&&sg){const r=sg/km;if(t.melhorRitmo==null||r<t.melhorRitmo){t.melhorRitmo=r;t.provaRitmo=p}}
    if(Object.keys(pres[p.id]||{}).some(o=>o!==id&&foiA(p.id,o)))t.comGrupo++}
  return t}
function estatisticas(){const box=h("article",{class:"sec est"});const anoAtual=String(new Date().getFullYear());estAno=estAno||anoAtual;
  const anos=[...new Set([anoAtual,...passadas.map(p=>p.data.slice(0,4))])].sort().reverse();
  box.append(h("h1",{text:"Estatísticas"}));
  if(!grupo||!me){box.append(h("p",{class:"lead",text:"Entra num grupo e regista as tuas provas feitas para veres aqui os teus números."}));return box}
  box.append(h("div",{class:"row between esttop"},h("div",{class:"seg"},...[["eu","Eu"],["grupo","Grupo"]].map(([k,l])=>h("button",{type:"button","aria-pressed":String(estQuem===k),onclick:()=>{estQuem=k;draw()},text:l}))),
    h("select",{"aria-label":"Ano",onchange:e=>{estAno=e.target.value;draw()}},...anos.map(a=>{const o=h("option",{value:a,text:a});if(a===estAno)o.selected=true;return o}))));
  const ids=estQuem==="eu"?[me]:Object.keys(membros);const T=ids.map(id=>[id,estatTotais(id,estAno)]);
  const soma={n:0,km:0,d:0,sg:0,meses:Array(12).fill(0),mesesD:Array(12).fill(0)};
  if(estQuem==="eu")Object.assign(soma,T[0][1]);else{const vistas=new Set();for(const [id,t] of T){soma.km+=t.km;soma.d+=t.d;soma.sg+=t.sg;t.meses.forEach((v,i)=>soma.meses[i]+=v);t.mesesD.forEach((v,i)=>soma.mesesD[i]+=v);for(const p of feitasDe(id,estAno))vistas.add(p.id)}soma.n=vistas.size}
  const stat=(n,l)=>h("div",{class:"st"},h("b",{text:n}),h("span",{text:l}));
  box.append(h("div",{class:"meuano"},h("span",{class:"k",text:(estQuem==="eu"?nomeDe(me):(grupoNome||"O grupo"))+" · "+estAno}),h("div",{class:"sts"},
    stat(String(soma.n),soma.n===1?"prova":"provas"),stat(fmtN(Math.round(soma.km*10)/10),"km"),stat(soma.d>=1000?fmtN(Math.round(soma.d/100)/10)+"k":String(Math.round(soma.d)),"m D+"),soma.sg?stat(fmtH(soma.sg),"em prova"):null)));
  if(!soma.n){box.append(h("p",{class:"hint",text:"Ainda não há provas feitas em "+estAno+". Regista-as no separador do grupo, em Provas feitas, ou importa o GPX numa prova que já passou."}));return box}
  const M=["J","F","M","A","M","J","J","A","S","O","N","D"];
  box.append(h("h2",{text:"Km por mês"}),barrasSVG(soma.meses,M,"km","#ee5a0f"),h("h2",{text:"D+ por mês (m)"}),barrasSVG(soma.mesesD,M,"m","#2e6b43"));
  if(estQuem==="eu"){const t=T[0][1];
    const rec=(l,v,p)=>h("li",null,h("span",{class:"rl",text:l}),h("strong",{text:v}),p?h("button",{class:"linkbtn",type:"button",onclick:()=>abrir(p.id),text:p.nome}):null);
    box.append(h("h2",{text:"Recordes de "+estAno}),h("ul",{class:"recordes"},
      t.provaKm?rec("Prova mais longa",fmtN(Math.round(t.maxKm*10)/10)+" km",t.provaKm):null,
      t.provaD?rec("Mais D+",t.maxD+" m",t.provaD):null,
      t.provaRitmo?rec("Ritmo mais rápido (≥5 km)",ritmo(t.melhorRitmo,1),t.provaRitmo):null,
      (()=>{const mx=Math.max(...t.meses);return mx?rec("Melhor mês",MESES[t.meses.indexOf(mx)]+" · "+fmtN(Math.round(mx*10)/10)+" km",null):null})()));
    const tTudo=estatTotais(me,null);
    box.append(h("h2",{text:"Conquistas"}),h("p",{class:"hint",text:"Contam todas as provas registadas, de todos os anos."}),h("ul",{class:"conquistas"},...CONQ.map(([n,d,f])=>{const ok=f(tTudo);return h("li",{class:ok?"ok":null},h("span",{class:"med","aria-hidden":"true",text:ok?"★":"☆"}),h("span",null,h("strong",{text:n}),h("small",{text:d})))})))}
  else{const ord=T.filter(([,t])=>t.n).sort((a,b)=>b[1].km-a[1].km||b[1].n-a[1].n);
    box.append(h("h2",{text:"Quadro de "+estAno}),h("table",{class:"pt quadrog"},h("thead",null,h("tr",null,...["","Provas","Km","D+","Tempo"].map(x=>h("th",{text:x})))),
      h("tbody",null,...ord.map(([id,t])=>h("tr",{class:id===me?"eu":null},h("td",null,h("a",{class:"nomel",href:linkMembro(id)},h("strong",{text:nomeDe(id)}))),h("td",{text:String(t.n)}),h("td",{text:fmtN(Math.round(t.km*10)/10)}),h("td",{text:String(Math.round(t.d))}),h("td",{text:t.sg?fmtH(t.sg):"—"}))))))}
  box.append(h("p",{class:"hint",text:"Os números vêm dos km, D+ e tempos registados em cada prova feita (à mão ou por GPX)."}));
  return box}

// ---------- imagem do resultado ----------
function carregarImg(src){return new Promise(r=>{if(!src)return r(null);const i=new Image();i.onload=()=>r(i);i.onerror=()=>r(null);i.src=src})}
async function partilharResultado(p,id){const x=exDe(p.id,id);toast("A preparar a imagem…");
  let tr=null;if(temTrilho.has(p.id+"|"+id)){try{tr=(await api("trilhos?select=pontos,elev,km,dplus,duracao_s&prova_id=eq."+encodeURIComponent(p.id)+"&membro_id=eq."+id))[0]||null}catch(_){}}
  const W=1080,H=1350,c=document.createElement("canvas");c.width=W;c.height=H;const g=c.getContext("2d");
  const fam=getComputedStyle(document.documentElement).getPropertyValue("--display").trim()||"sans-serif";
  try{await document.fonts.load("700 80px "+fam.split(",")[0])}catch(_){}
  const fundo=g.createLinearGradient(0,0,0,H);fundo.addColorStop(0,"#17211b");fundo.addColorStop(1,"#0e1510");g.fillStyle=fundo;g.fillRect(0,0,W,H);
  g.fillStyle="#ee5a0f";for(let i=-H;i<W;i+=56){g.beginPath();g.moveTo(i,0);g.lineTo(i+28,0);g.lineTo(i+28-18,18);g.lineTo(i-18,18);g.fill()}
  const [logo,glogo]=await Promise.all([carregarImg("icons/dorsal-v2.svg"),carregarImg(grupoLogo)]);
  if(logo)g.drawImage(logo,72,72,72,72);g.fillStyle="#fff";g.font="700 52px "+fam;g.textBaseline="middle";g.fillText("DORSAL",160,110);
  if(glogo){g.save();g.beginPath();g.arc(W-108,108,36,0,7);g.clip();g.drawImage(glogo,W-144,72,72,72);g.restore()}
  if(grupoNome){g.font="600 30px "+fam;g.textAlign="right";g.fillStyle="#cfd8cf";g.fillText(grupoNome.toUpperCase(),W-(glogo?160:72),110);g.textAlign="left"}
  // título com quebra de linha
  g.fillStyle="#fff";g.font="700 92px "+fam;g.textBaseline="alphabetic";const pal=p.nome.toUpperCase().split(/\s+/),linhas=[];let l="";
  for(const w of pal){const t=l?l+" "+w:w;if(g.measureText(t).width>W-144&&l){linhas.push(l);l=w}else l=t}linhas.push(l);let y=260;
  for(const ln of linhas.slice(0,3)){g.fillText(ln,72,y);y+=92}
  g.font="500 36px "+fam;g.fillStyle="#ee5a0f";g.fillText([dataLonga(p.data),[p.concelho,p.distrito].filter(Boolean).join(", "),x.percurso].filter(Boolean).join("  ·  "),72,y+4);
  // traçado
  const area={x:72,y:y+50,w:W-144,h:400};
  if(tr&&tr.pontos){const pts=DorsalGPX.descodificar(tr.pontos);if(pts.length>1){const la=pts.map(q=>q[0]),lo=pts.map(q=>q[1]),k=Math.cos((Math.min(...la)+Math.max(...la))/2*Math.PI/180);
    const dx=(Math.max(...lo)-Math.min(...lo))*k||1e-6,dy=(Math.max(...la)-Math.min(...la))||1e-6,sc=Math.min(area.w/dx,area.h/dy),ox=area.x+(area.w-dx*sc)/2,oy=area.y+(area.h-dy*sc)/2;
    g.lineJoin="round";g.lineCap="round";g.beginPath();pts.forEach((q,i)=>{const px=ox+(q[1]-Math.min(...lo))*k*sc,py=oy+(Math.max(...la)-q[0])*sc;i?g.lineTo(px,py):g.moveTo(px,py)});
    g.strokeStyle="rgba(238,90,15,.25)";g.lineWidth=22;g.stroke();g.strokeStyle="#ee5a0f";g.lineWidth=8;g.stroke()}}
  // números
  const km=+x.km||(tr&&+tr.km)||0,dp=+x.dplus||(tr&&+tr.dplus)||0,sg=segDeTempo(x.tempo)||(tr&&tr.duracao_s)||0;
  const st=[[km?fmtKm(km):"—","KM"],[dp?String(dp):"—","M D+"],[sg?(x.tempo||hms(sg)):"—","TEMPO"]];if(sg&&km>=1)st.push([ritmo(sg/km,1).replace(" /km",""),"MIN/KM"]);
  const sy=area.y+area.h+(tr&&tr.elev?40:0),cw=(W-144)/st.length;
  let fs=110;g.font="700 "+fs+"px "+fam;while(fs>40&&st.some(([v])=>g.measureText(v).width>cw-28)){fs-=4;g.font="700 "+fs+"px "+fam}
  st.forEach(([v,r],i)=>{const cx=72+i*cw;g.fillStyle="#fff";g.font="700 "+fs+"px "+fam;g.fillText(v,cx,sy+100);g.fillStyle="#9aa89e";g.font="600 28px "+fam;g.fillText(r,cx,sy+144)});
  // perfil
  if(tr&&tr.elev){const el=tr.elev.split(",").map(Number);if(el.length>1){const mn=Math.min(...el),mx=Math.max(...el),py0=H-90,ph=170,pw=W-144;
    g.beginPath();g.moveTo(72,py0);el.forEach((e,i)=>g.lineTo(72+pw*i/(el.length-1),py0-ph*(e-mn)/Math.max(1,mx-mn)));g.lineTo(72+pw,py0);g.closePath();
    const gr=g.createLinearGradient(0,py0-ph,0,py0);gr.addColorStop(0,"rgba(46,107,67,.9)");gr.addColorStop(1,"rgba(46,107,67,.15)");g.fillStyle=gr;g.fill()}}
  g.fillStyle="#6f7d73";g.font="500 26px "+fam;g.fillText(nomeDe(id)+"  ·  possn.github.io/Dorsal",72,H-40);
  const blob=await new Promise(r=>c.toBlob(r,"image/png"));const nomeF=(p.nome.normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/gi,"-").toLowerCase()||"prova")+".png";
  const file=new File([blob],nomeF,{type:"image/png"});
  try{if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title:p.nome});return}}catch(e){if(e&&e.name==="AbortError")return}
  const a=h("a",{href:URL.createObjectURL(blob),download:nomeF});document.body.append(a);a.click();a.remove();toast("Imagem descarregada")}

// ---------- privacidade ----------
let apagarConf="";
async function exportarDados(){if(!grupo||!me)return;toast("A juntar os teus dados…");
  try{const q="membro_id=eq."+me;const [pr,co,tr]=await Promise.all([api("presencas?"+q),api("comentarios?"+q),api("trilhos?"+q)]);
    const dados={exportado_em:new Date().toISOString(),app:"Dorsal",grupo:{nome:grupoNome},membro:{id:me,nome:nomeDe(me)},presencas_e_resultados:pr,mensagens:co,trilhos_gpx:tr};
    const blob=new Blob([JSON.stringify(dados,null,2)],{type:"application/json"});const a=h("a",{href:URL.createObjectURL(blob),download:"dorsal-os-meus-dados.json"});document.body.append(a);a.click();a.remove();toast("Ficheiro descarregado")}
  catch(e){toast("Não foi possível exportar. Tenta outra vez.")}}
async function apagarDados(){if(apagarConf.trim().toLowerCase()!==nomeDe(me).trim().toLowerCase()){toast("Escreve o teu nome tal como aparece no grupo.");return}
  try{const ok=await api("rpc/apagar_membro",{method:"POST",body:{p_id:me}});if(!ok)throw 0;
    try{desactivarPush().catch(()=>{})}catch(_){}
    store.set(chaveMe(),null);me=null;apagarConf="";toast("Os teus dados foram apagados deste grupo");history.pushState(null,"",location.pathname+location.search);await carregar()}
  catch(e){toast("Não foi possível apagar. Tenta outra vez.")}}
function privacidade(){const box=h("article",{class:"sec privacidade"});
  const it=(t,d)=>h("li",null,h("strong",{text:t}),h("span",{text:d}));
  box.append(h("h1",{text:"Privacidade e dados"}),
    h("p",{class:"lead",text:"O Dorsal não pede email, telefone nem palavra-passe. Não tem publicidade nem rastreadores. Cada grupo é privado e só entra quem tem o link."}),
    h("h2",{text:"O que guardamos"}),h("ul",{class:"privlista"},
      it("O nome que escolhes","Só o vê quem está no teu grupo."),
      it("As tuas marcações e resultados","Inscrito, vou ou talvez, percurso, boleias, km, D+ e tempos."),
      it("Mensagens","As que escreves na conversa de cada prova."),
      it("Trilhos GPX","Só os que importas. Mostram por onde passaste, por isso partilha-os só com quem confias."),
      it("Notificações","Se as activares, o endereço técnico do teu telemóvel para receber avisos. Desliga-se quando quiseres.")),
    h("h2",{text:"Onde fica"}),h("p",{text:"Os dados ficam numa base de dados Supabase na União Europeia (Frankfurt). A app está alojada no GitHub Pages. A previsão do tempo vem da Open-Meteo e os mapas do OpenTopoMap: a estes serviços só se envia a localização da prova, nunca a tua."}),
    h("p",{text:"Neste telemóvel ficam guardados o grupo, quem és e uma cópia das provas para funcionar sem rede. Apagas isso limpando os dados do site no browser."}),
    h("h2",{text:"Os teus direitos"}),h("p",{text:"Ao abrigo do RGPD podes ver, levar e apagar os teus dados quando quiseres, aqui mesmo."}));
  if(!grupo||!me){box.append(h("p",{class:"hint",text:"Entra num grupo e escolhe o teu nome para exportares ou apagares os teus dados."}));return box}
  const inp=h("input",{placeholder:nomeDe(me),"aria-label":"Escreve o teu nome para confirmar",value:apagarConf,oninput:e=>{apagarConf=e.target.value}});
  box.append(h("div",{class:"privacoes"},
    h("div",{class:"calc"},h("h2",{text:"Levar os meus dados"}),h("p",{class:"hint",text:"Descarrega um ficheiro com as tuas marcações, resultados, mensagens e trilhos em "+(grupoNome||"este grupo")+"."}),h("button",{class:"btn primary",type:"button",onclick:exportarDados,text:"Exportar (JSON)"})),
    h("div",{class:"calc perigo"},h("h2",{text:"Apagar os meus dados"}),h("p",{class:"hint",text:"Apaga o teu nome, marcações, resultados, mensagens, trilhos e notificações em "+(grupoNome||"este grupo")+". Não se pode desfazer. As provas que criaste continuam no calendário do grupo."}),
      h("label",null,"Para confirmar, escreve "+nomeDe(me),inp),h("button",{class:"btn danger",type:"button",onclick:apagarDados,text:"Apagar tudo o que é meu"}))));
  return box}

// ---------- membros ----------
const linkMembro=id=>"#s=membro&m="+id;
const fmtKm=n=>fmtN(Math.round(n*10)/10);
function membrosView(){const box=h("article",{class:"sec est"});box.append(h("h1",{text:"Membros"}));
  if(!grupo){box.append(h("p",{class:"lead",text:"Entra num grupo para veres os membros."}));return box}
  const ano=String(new Date().getFullYear());
  const ids=Object.keys(membros).sort((a,b)=>(a===me?-1:b===me?1:0)||estatTotais(b,ano).km-estatTotais(a,ano).km||nomeDe(a).localeCompare(nomeDe(b),"pt"));
  box.append(h("p",{class:"lead",text:(grupoNome||"O grupo")+" · "+ids.length+(ids.length===1?" membro":" membros")}),
    h("ul",{class:"membros"},...ids.map(id=>{const t=estatTotais(id,ano),prox=futuras().filter(p=>foiA(p.id,id)).length;
      return h("li",null,h("a",{href:linkMembro(id)},h("span",{class:"av","aria-hidden":"true",text:(nomeDe(id).trim()[0]||"?").toUpperCase()}),
        h("span",{class:"mi"},h("strong",{text:nomeDe(id)+(id===me?" (tu)":"")}),h("small",{text:[t.n?t.n+(t.n===1?" prova":" provas")+" em "+ano:"Sem provas registadas em "+ano,t.km?fmtKm(t.km)+" km":"",prox?prox+(prox===1?" próxima":" próximas"):""].filter(Boolean).join(" · ")})),
        h("span",{class:"seta","aria-hidden":"true",text:"›"})))})));
  return box}
function perfil(id){const box=h("article",{class:"sec est perfil"});
  if(!grupo||!membros[id]){box.append(h("h1",{text:"Membro"}),h("p",{class:"lead",text:"Este membro não está no grupo actual."}),h("a",{class:"btn small",href:"#s=membros",text:"Ver membros"}));return box}
  const ano=String(new Date().getFullYear()),t=estatTotais(id,ano),tudo=estatTotais(id,null),nome=nomeDe(id);
  const stat=(n,l)=>h("div",{class:"st"},h("b",{text:n}),h("span",{text:l}));
  box.append(h("a",{class:"voltar",href:"#s=membros",text:"‹ Membros"}),
    h("div",{class:"phead"},h("span",{class:"av grande","aria-hidden":"true",text:(nome.trim()[0]||"?").toUpperCase()}),h("div",null,h("h1",{text:nome}),h("p",{class:"hint",text:id===me?"És tu":(grupoNome||"")}))),
    h("div",{class:"meuano"},h("span",{class:"k",text:ano}),h("div",{class:"sts"},stat(String(t.n),t.n===1?"prova":"provas"),stat(fmtKm(t.km),"km"),stat(t.d>=1000?fmtN(Math.round(t.d/100)/10)+"k":String(Math.round(t.d)),"m D+"),t.sg?stat(fmtH(t.sg),"em prova"):null)),
    ...(tudo.n>t.n?[h("p",{class:"hint",text:"Desde sempre: "+tudo.n+" provas · "+fmtKm(tudo.km)+" km · "+Math.round(tudo.d)+" m D+"})]:[]));
  const linhaProva=(p,extra)=>h("li",null,h("button",{class:"linkbtn",type:"button",onclick:()=>abrir(p.id),text:p.nome}),h("small",{text:[dataLonga(p.data),...extra].filter(Boolean).join(" · ")}));
  const prox=futuras().filter(p=>pres[p.id]&&pres[p.id][id]).sort((a,b)=>a.data.localeCompare(b.data));
  box.append(h("h2",{text:"Próximas provas"}),prox.length?h("ul",{class:"plist"},...prox.map(p=>{const x=exDe(p.id,id),e=pres[p.id][id];
    return linhaProva(p,[(ESTADOS.find(k=>k[0]===e)||[,""])[1],x.percurso,x.boleia==="oferece"?"oferece boleia":x.boleia==="precisa"?"precisa de boleia":""])})):h("p",{class:"hint",text:"Nenhuma marcada."}));
  if(id!==me&&me){const comum=futuras().filter(p=>foiA(p.id,id)&&foiA(p.id,me)).length,feitasJuntos=passadas.filter(p=>!eTreino(p)&&foiA(p.id,id)&&foiA(p.id,me)).length;
    if(comum||feitasJuntos)box.append(h("p",{class:"nota",text:"Contigo: "+[feitasJuntos?feitasJuntos+(feitasJuntos===1?" prova feita":" provas feitas"):"",comum?comum+(comum===1?" próxima":" próximas"):""].filter(Boolean).join(" · ")}))}
  const feitas=feitasDe(id,null).sort((a,b)=>b.data.localeCompare(a.data));
  box.append(h("h2",{text:"Provas feitas"}),feitas.length?h("ul",{class:"plist"},...feitas.map(p=>{const x=exDe(p.id,id),sg=segDeTempo(x.tempo);
    const li=linhaProva(p,[x.percurso,x.km?fmtKm(+x.km)+" km":"",x.dplus?x.dplus+" m D+":"",x.tempo||"",(sg&&+x.km>=1)?ritmo(sg/ +x.km,1):"",temTrilho.has(p.id+"|"+id)?"📍 GPX":""]);li.append(h("button",{class:"linkbtn",type:"button",onclick:()=>partilharResultado(p,id),text:"↗ Imagem do resultado"}));return li})):h("p",{class:"hint",text:id===me?"Regista as provas que fizeste no separador do grupo, em Provas feitas.":"Ainda não registou provas feitas."}));
  if(t.n){const M=["J","F","M","A","M","J","J","A","S","O","N","D"];box.append(h("h2",{text:"Km por mês em "+ano}),barrasSVG(t.meses,M,"km","#ee5a0f"))}
  if(souAdmin()&&id!==me){box.append(h("div",{class:"calc perigo admrem"},h("strong",{text:"Administração"}),h("p",{class:"hint",text:"Remover "+nome+" apaga as marcações, resultados, mensagens e trilhos dessa pessoa neste grupo. Não se pode desfazer. Se continuar a ter o link, pode voltar a juntar-se; muda o código para o impedir."}),
    h("button",{class:"btn danger",type:"button",onclick:async ev=>{const b=ev.currentTarget;if(b.dataset.conf!=="1"){b.dataset.conf="1";b.textContent="Confirmar: remover "+nome;return}
      try{const ok=await api("rpc/admin_remover",{method:"POST",body:{p_token:adminTok(),p_id:id}});if(!ok)throw 0;toast(nome+" foi removido");location.hash="s=membros";await carregar()}catch(_){toast("Não foi possível remover. Tenta outra vez.")}},text:"Remover do grupo"})))}
  const ganhas=CONQ.filter(([, ,f])=>f(tudo));
  box.append(h("h2",{text:"Conquistas ("+ganhas.length+"/"+CONQ.length+")"}),h("ul",{class:"conquistas"},...CONQ.map(([n,d,f])=>{const ok=f(tudo);return h("li",{class:ok?"ok":null},h("span",{class:"med","aria-hidden":"true",text:ok?"★":"☆"}),h("span",null,h("strong",{text:n}),h("small",{text:d})))})));
  return box}

// ---------- plano de treino ----------
const ALVO_LONGA={"Caminhada":120,"Trail curto":100,"Trail longo":180,"Skyrunning":150,"Trail ultra":300,"Backyard":300};
function planoTreino(p,percurso,atual){const corrida=parseD(p.data),seg=new Date(hoje());seg.setDate(seg.getDate()-((seg.getDay()+6)%7));
  const semanas=Math.floor((corrida-seg)/(7*864e5))+1;const alvo=ALVO_LONGA[percurso]||(/ultra/i.test(percurso)?300:/long/i.test(percurso)?180:100);
  if(semanas<3)return{semanas,linhas:[],aviso:"Faltam menos de 3 semanas: já não é altura de aumentar a carga. Mantém corridas fáceis e descansa nos dois dias antes."};
  const linhas=[];let longa=Math.max(30,atual),pico=0;const nTreino=semanas-2;
  for(let w=1;w<=semanas;w++){const ini=new Date(seg);ini.setDate(ini.getDate()+(w-1)*7);let tipo,l;
    if(w===semanas){tipo="Semana da prova";l=0}
    else if(w===semanas-1){tipo="Afinar";l=Math.round(pico*.6/5)*5}
    else if(w%4===0){tipo="Recuperação";l=Math.round(longa*.75/5)*5}
    else{if(w>1)longa=Math.min(alvo,longa*1.1);tipo=longa>=alvo?"Pico":"Construção";l=Math.round(longa/5)*5;pico=Math.max(pico,l)}
    linhas.push({w,ini,tipo,l})}
  const aviso=pico<alvo?"Com "+nTreino+" semanas de treino, subindo cerca de 10% por semana, a corrida longa chega a "+pico+" min. O habitual para "+percurso.toLowerCase()+" é rondar "+alvo+" min: considera um percurso mais curto ou começar já com mais volume, se o teu histórico o permitir.":"";
  return{semanas,linhas,aviso,alvo}}
let planoAberto={};
function planoView(p){if(!podeMarcar()||!(pres[p.id]&&pres[p.id][me]))return null;const x=exDe(p.id,me);if(parseD(p.data)<hoje())return null;
  if(!x.percurso)return h("p",{class:"hint",text:"Escolhe o teu percurso em cima para veres um plano de treino até à prova."});
  if(/kids/i.test(x.percurso))return null;
  const atual=+(store.get("dorsal.longa")||60);const r=planoTreino(p,x.percurso,atual);
  const inp=h("select",{"aria-label":"A tua corrida longa actual",onchange:e=>{store.set("dorsal.longa",e.target.value);draw()}},...[30,45,60,75,90,105,120,150,180,210,240].map(m=>h("option",{value:String(m),text:m+" min"})));inp.value=String([30,45,60,75,90,105,120,150,180,210,240].reduce((a,b)=>Math.abs(b-atual)<Math.abs(a-atual)?b:a));
  const det=h("details",{class:"plano-treino"},h("summary",null,h("strong",{text:"Plano de treino até à prova"}),h("span",{class:"hint",text:" · "+r.semanas+(r.semanas===1?" semana":" semanas")})),
    h("label",{class:"lug"},"A tua corrida longa hoje ",inp),
    r.aviso?h("div",{class:"nota",text:r.aviso}):null,
    r.linhas.length?h("table",{class:"pt"},h("thead",null,h("tr",null,h("th",{text:"Semana"}),h("th",{text:"Corrida longa"}),h("th",{text:"Resto da semana"}))),
      h("tbody",null,...r.linhas.map(l=>h("tr",{class:l.tipo==="Recuperação"?"rec":l.tipo==="Semana da prova"?"prova":null},
        h("td",null,h("b",{text:l.ini.getDate()+" "+MESES[l.ini.getMonth()].slice(0,3)}),h("small",{text:l.tipo})),
        h("td",{text:l.tipo==="Semana da prova"?"A prova":l.l+" min"}),
        h("td",{text:l.tipo==="Semana da prova"?"2 corridas fáceis curtas, descanso nos 2 dias antes":l.tipo==="Afinar"?"1 sessão curta de subidas, 1 fácil, 1 força leve":l.tipo==="Recuperação"?"2 fáceis, 1 força":"1 de subidas, 1–2 fáceis, 2 força"}))))):null,
    h("p",{class:"hint"},"Exemplo genérico, sem conhecer o teu histórico nem lesões: a corrida longa sobe cerca de 10% por semana, alivia a cada 4.ª semana e baixa nas duas últimas. Fundamentos e fontes em ",h("a",{href:"#s=preparacao",text:"Preparação física"}),"."));
  if(planoAberto[p.id])det.open=true;det.addEventListener("toggle",()=>{planoAberto[p.id]=det.open});return det}

// ---------- calendário mensal ----------
function calendario(ps,box){const porDia={};for(const p of ps)(porDia[p.data]=porDia[p.data]||[]).push(p);
  if(!calMes){const fm=$("fMes").value;calMes=fm||(ps[0]?ps[0].data.slice(0,7):hojeISO().slice(0,7))}
  const [y,m]=calMes.split("-").map(Number),prim=new Date(y,m-1,1),nDias=new Date(y,m,0).getDate(),off=(prim.getDay()+6)%7,hj=hojeISO();
  const mover=d=>{const x=new Date(y,m-1+d,1);calMes=x.getFullYear()+"-"+String(x.getMonth()+1).padStart(2,"0");calDia=null;draw()};
  const cel=[];for(let i=0;i<off;i++)cel.push(h("div",{class:"cal-d vazio"}));
  for(let d=1;d<=nDias;d++){const iso=calMes+"-"+String(d).padStart(2,"0"),l=porDia[iso]||[],grp=l.some(p=>temGente(p.id)),meu=me&&l.some(p=>pres[p.id]&&pres[p.id][me]);
    cel.push(h("button",{type:"button",class:"cal-d"+(l.length?" tem":"")+(grp?" grp":"")+(meu?" meu":"")+(iso===hj?" hoje":"")+(iso===calDia?" sel":""),disabled:l.length?null:true,"aria-label":d+" de "+MESES[m-1]+(l.length?": "+l.length+(l.length===1?" prova":" provas"):""),onclick:()=>{calDia=calDia===iso?null:iso;draw()}},
      h("span",{class:"n",text:String(d)}),l.length?h("span",{class:"pts",text:"•".repeat(Math.min(l.length,3))}):null))}
  const doMes=ps.filter(p=>p.data.startsWith(calMes)),lista=calDia?(porDia[calDia]||[]):doMes;
  box.replaceChildren(h("div",{class:"cal"},
    h("div",{class:"cal-head"},h("button",{type:"button",class:"btn small","aria-label":"Mês anterior",onclick:()=>mover(-1),text:"‹"}),h("strong",{text:MESES[m-1]+" "+y}),h("button",{type:"button",class:"btn small","aria-label":"Mês seguinte",onclick:()=>mover(1),text:"›"})),
    h("div",{class:"cal-sem"},...["seg","ter","qua","qui","sex","sáb","dom"].map(x=>h("span",{text:x}))),
    h("div",{class:"cal-grid"},...cel),
    h("p",{class:"hint cal-leg"},h("span",{class:"lg tem"}),"com provas ",h("span",{class:"lg grp"}),"o grupo vai ",h("span",{class:"lg meu"}),"tu vais")),
    h("h2",{class:"month",text:calDia?dataLonga(calDia):(doMes.length?doMes.length+(doMes.length===1?" prova em ":" provas em ")+MESES[m-1]:"Sem provas em "+MESES[m-1]+" com estes filtros")}),
    h("div",{class:"list"},...lista.map(card)))}

// ---------- o meu ano ----------
function segDeTempo(t){if(!t)return 0;const x=t.split(":").map(Number);return x.length===3?x[0]*3600+x[1]*60+x[2]:x[0]*3600+x[1]*60}
const fmtH=sg=>Math.floor(sg/3600)+"h"+String(Math.floor(sg%3600/60)).padStart(2,"0");
const fmtN=n=>Number.isInteger(n)?String(n):n.toFixed(1).replace(".",",");
const foiA=(pid,id)=>{const e=pres[pid]&&pres[pid][id];return e==="inscrito"||e==="vou"};
function totais(id,ano){const feitas=passadas.filter(p=>!eTreino(p)&&p.data.startsWith(ano)&&foiA(p.id,id));let km=0,d=0,sg=0;
  for(const p of feitas){const x=exDe(p.id,id);km+=+x.km||0;d+=+x.dplus||0;sg+=segDeTempo(x.tempo)}return{n:feitas.length,km,d,sg}}
function meuAno(){if(!me||!grupo)return null;const ano=String(new Date().getFullYear());const t=totais(me,ano);const prox=futuras().filter(p=>!eTreino(p)&&foiA(p.id,me));
  if(!t.n&&!prox.length)return null;const stat=(n,l)=>h("div",{class:"st"},h("b",{text:n}),h("span",{text:l}));
  return h("div",{class:"meuano"},h("span",{class:"k",text:"O meu "+ano}),h("div",{class:"sts"},
    stat(String(t.n),t.n===1?"prova feita":"provas feitas"),t.km?stat(fmtN(Math.round(t.km*10)/10),"km"):null,t.d?stat(t.d>=1000?fmtN(Math.round(t.d/100)/10)+"k":String(t.d),"m D+"):null,t.sg?stat(fmtH(t.sg),"em prova"):null,stat(String(prox.length),prox.length===1?"próxima":"próximas")),
    !t.km&&t.n?h("p",{class:"hint",text:"Acrescenta os km e o D+ às tuas provas feitas, em baixo, para veres os totais."}):null)}

let regAberto=false,quadroPor="provas",editHist=null,regDraft={},regGPX=null;
const PERCURSOS=["Caminhada","Trail curto","Trail longo","Trail ultra","Skyrunning","Backyard","Estrada","Outro"];
function registoForm(){const v=id=>$(id)?$(id).value:"";
  const f=h("form",{class:"form registo",onsubmit:async e=>{e.preventDefault();const nome=$("rNome").value.trim(),data=$("rData").value;if(!nome||!data)return;
      if(data>hojeISO()){toast("Para provas futuras usa Nova prova.");return}
      const t=normTempo($("rTempo").value);if(t===null){toast("Escreve o tempo como 4:35:12");return}
      const km=$("rKm").value?+String($("rKm").value).replace(",","."):null,dp=$("rD").value?parseInt($("rD").value,10):null;
      if(km!=null&&!(km>=0&&km<=400)){toast("Km entre 0 e 400.");return}
      const b=f.querySelector("button[type=submit]");b.disabled=true;
      let id=(nome.normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,60)||"prova")+"-"+data;
      const body={id,nome:nome.slice(0,120),data,distrito:$("rDist").value,concelho:$("rConc").value.trim().slice(0,80),distancias:$("rPerc").value,fonte:"registo",grupo,criado_por:me};
      try{try{await api("provas",{method:"POST",prefer:"return=minimal",body})}catch(err){if(err.status!==409)throw err;
          const existe=passadas.find(x=>x.id===id);if(!existe){id=id.slice(0,70)+"-"+Math.random().toString(36).slice(2,6);body.id=id;await api("provas",{method:"POST",prefer:"return=minimal",body})}}
        await api("presencas?on_conflict=membro_id,prova_id",{method:"POST",prefer:"resolution=merge-duplicates,return=minimal",body:{grupo,membro_id:me,prova_id:id,estado:"inscrito",percurso:$("rPerc").value,km,dplus:dp,tempo:t||"",atualizado:new Date().toISOString()}});
        if(regGPX){try{await guardarTrilho(id,regGPX)}catch(_){toast("A prova ficou registada, mas o trilho não foi guardado.")}}
        regAberto=false;regDraft={};regGPX=null;toast("Prova registada");await carregar()}
      catch(err){toast("Não foi possível registar. Tenta outra vez.")}finally{b.disabled=false}}},
    h("div",{class:"full gpxpre"},h("label",{class:"btn small",for:"rGpx",text:regGPX?"GPX: "+regGPX.km.toString().replace(".",",")+" km ✓":"Preencher a partir de um GPX"}),h("input",{id:"rGpx",type:"file",class:"vh",onchange:async e=>{const f=e.target.files[0];if(!f)return;
      try{const g=DorsalGPX.ler(await f.text());regGPX=g;if(g.nome&&!$("rNome").value)regDraft.rNome=g.nome;if(g.inicio)regDraft.rData=g.inicio.getFullYear()+"-"+String(g.inicio.getMonth()+1).padStart(2,"0")+"-"+String(g.inicio.getDate()).padStart(2,"0");
        regDraft.rKm=String(Math.round(g.km*10)/10).replace(".",",");regDraft.rD=String(g.dplus);if(g.duracao_s)regDraft.rTempo=hms(g.duracao_s);
        {const c=DorsalGPX.descodificar(g.pontos)[0],cc=c&&concelhoMaisPerto(c[0],c[1]);if(cc){regDraft.rConc=cc[4];regDraft.rDist=cc[1]}}draw()}
      catch(err){toast(err.message||"Não consegui ler esse GPX.")}}}),h("span",{class:"hint",text:" Lê nome, data, km, D+, tempo e local do ficheiro do relógio, Strava ou Wikiloc."})),
    h("label",{class:"full",for:"rNome"},"Nome da prova",h("input",{id:"rNome",required:true,maxlength:"120"})),
    h("label",{for:"rData"},"Data",h("input",{id:"rData",type:"date",required:true,max:hojeISO()})),
    h("label",{for:"rPerc"},"Percurso",h("select",{id:"rPerc"},...PERCURSOS.map(x=>h("option",{value:x,text:x})))),
    h("label",{for:"rDist"},"Distrito",h("select",{id:"rDist"},h("option",{value:"",text:"—"}),...DISTRITOS.map(d=>h("option",{value:d,text:d})))),
    h("label",{for:"rConc"},"Concelho ou terra",h("input",{id:"rConc",maxlength:"80"})),
    h("label",{for:"rKm"},"Km",h("input",{id:"rKm",inputmode:"decimal",placeholder:"25"})),
    h("label",{for:"rD"},"D+ (m)",h("input",{id:"rD",inputmode:"numeric",placeholder:"1200"})),
    h("label",{class:"full",for:"rTempo"},"Tempo (opcional)",h("input",{id:"rTempo",inputmode:"numeric",placeholder:"3:45:10"})),
    h("div",{class:"full row"},h("button",{class:"btn primary",type:"submit",text:"Registar"}),h("button",{class:"btn",type:"button",onclick:()=>{regAberto=false;draw()},text:"Cancelar"})));
  f.querySelector("#rPerc").value="Trail curto";
  for(const k in regDraft){const el=f.querySelector("#"+k);if(el&&el.type!=="file")el.value=regDraft[k]}
  const guarda=e=>{if(e.target.id&&e.target.type!=="file")regDraft[e.target.id]=e.target.value};f.addEventListener("input",guarda);f.addEventListener("change",guarda);return f}
let apagarHist=null;
function editarFeita(p,x,quem){const minha=p.grupo&&p.grupo===grupo;
  const inp=(id,attrs)=>h("input",Object.assign({id},attrs));
  const f=h("form",{class:"form registo editfeita",onsubmit:async e=>{e.preventDefault();const b=f.querySelector("button[type=submit]");
      const t=normTempo($("eTempo").value);if(t===null){toast("Escreve o tempo como 4:35:12");return}
      const km=$("eKm").value.trim()?+$("eKm").value.replace(",","."):null,dp=$("eD").value.trim()?parseInt($("eD").value,10):null;
      if(km!=null&&!(km>=0&&km<=400)){toast("Km entre 0 e 400.");return}if(dp!=null&&!(dp>=0&&dp<=20000)){toast("D+ entre 0 e 20000 m.");return}
      let prova=null;if(minha){const nome=$("eNome").value.trim(),data=$("eData").value;if(!nome||!data){toast("Falta o nome ou a data.");return}if(data>hojeISO()){toast("A data tem de ser de hoje ou antes.");return}
        prova={nome:nome.slice(0,120),data,distrito:$("eDist").value,concelho:$("eConc").value.trim().slice(0,80),distancias:$("ePerc").value}}
      b.disabled=true;
      try{if(prova){await api("provas?id=eq."+encodeURIComponent(p.id),{method:"PATCH",prefer:"return=minimal",body:prova});Object.assign(p,prova)}
        const ok=await setExtra(p.id,{km,dplus:dp,tempo:t||"",percurso:$("ePerc").value});if(ok){editHist=null;toast("Guardado");draw()}}
      catch(err){toast("Não foi possível guardar. Tenta outra vez.")}finally{b.disabled=false}}},
    minha?h("label",{class:"full",for:"eNome"},"Nome da prova",inp("eNome",{required:true,maxlength:"120",value:p.nome})):null,
    minha?h("label",{for:"eData"},"Data",inp("eData",{type:"date",required:true,max:hojeISO(),value:p.data})):null,
    h("label",{for:"ePerc"},"Percurso",h("select",{id:"ePerc"},...[...new Set([...PERCURSOS,x.percurso||""])].filter(Boolean).map(v=>h("option",{value:v,text:v})))),
    minha?h("label",{for:"eDist"},"Distrito",h("select",{id:"eDist"},h("option",{value:"",text:"—"}),...DISTRITOS.map(d=>h("option",{value:d,text:d})))):null,
    minha?h("label",{for:"eConc"},"Concelho ou terra",inp("eConc",{maxlength:"80",value:p.concelho||""})):null,
    h("label",{for:"eKm"},"Km",inp("eKm",{inputmode:"decimal",placeholder:"25",value:x.km!=null?String(x.km).replace(".",","):""})),
    h("label",{for:"eD"},"D+ (m)",inp("eD",{inputmode:"numeric",placeholder:"1200",value:x.dplus!=null?String(x.dplus):""})),
    h("label",{class:"full",for:"eTempo"},"Tempo",inp("eTempo",{inputmode:"numeric",placeholder:"3:45:10",value:x.tempo||""})),
    minha?null:h("p",{class:"hint full",text:"O nome, a data e o local desta prova vêm do calendário geral e não se mudam aqui. Os teus dados sim."}),
    h("div",{class:"full row"},h("button",{class:"btn primary",type:"submit",text:"Guardar"}),h("button",{class:"btn",type:"button",onclick:()=>{editHist=null;apagarHist=null;draw()},text:"Cancelar"}),
      h("button",{class:"btn danger",type:"button",onclick:()=>tirarFeita(p,quem),text:apagarHist===p.id?(minha&&quem.length===1?"Confirmar: apagar a prova":"Confirmar: tirar da lista"):(minha&&quem.length===1?"Apagar prova":"Tirar da minha lista")})));
  const pc=f.querySelector("#ePerc");pc.value=x.percurso||p.distancias&&PERCURSOS.find(v=>v===p.distancias)||"Trail curto";
  if(minha)f.querySelector("#eDist").value=p.distrito||"";
  return f}
async function tirarFeita(p,quem){if(apagarHist!==p.id){apagarHist=p.id;draw();return}apagarHist=null;
  const apagaProva=p.grupo&&p.grupo===grupo&&quem.length===1;
  try{await api("presencas?membro_id=eq."+me+"&prova_id=eq."+encodeURIComponent(p.id),{method:"DELETE"});
    if(apagaProva){try{await api("trilhos?membro_id=eq."+me+"&prova_id=eq."+encodeURIComponent(p.id),{method:"DELETE"})}catch(_){}
      await api("provas?id=eq."+encodeURIComponent(p.id),{method:"DELETE"})}
    editHist=null;toast(apagaProva?"Prova apagada":"Tirada da tua lista");await carregar()}
  catch(err){toast("Não foi possível. Tenta outra vez.");draw()}}
function historico(){if(!grupo||!me)return null;const ano=String(new Date().getFullYear());
  const ids=new Set();for(const p of passadas)if(p.data.startsWith(ano))for(const id of Object.keys(pres[p.id]||{}))if(foiA(p.id,id))ids.add(id);
  const quadro=[...ids].map(id=>[id,totais(id,ano)]).sort((a,b)=>quadroPor==="km"?(b[1].km-a[1].km||b[1].n-a[1].n):(b[1].n-a[1].n||b[1].km-a[1].km)||nomeDe(a[0]).localeCompare(nomeDe(b[0]),"pt"));
  const linha=p=>{const quem=Object.keys(pres[p.id]||{}).filter(id=>foiA(p.id,id)).sort((a,b)=>nomeDe(a).localeCompare(nomeDe(b),"pt"));const d=parseD(p.data);
    let meu=null;if(quem.includes(me)&&podeMarcar()){const x=exDe(p.id,me);
      if(editHist===p.id)meu=editarFeita(p,x,quem);
      else meu=h("button",{class:"linkbtn",type:"button",onclick:()=>{editHist=p.id;draw()},text:"✎ Editar"});if(editHist!==p.id)meu=h("div",{class:"row histacts"},meu,h("button",{class:"linkbtn",type:"button",onclick:()=>partilharResultado(p,me),text:"↗ Partilhar resultado"}))}
    return h("li",{class:"hist"},h("div",{class:"hist-top"},h("span",{class:"hd",text:d.getDate()+" "+MESES[d.getMonth()].slice(0,3)+" "+d.getFullYear()}),h("button",{class:"titlebtn",onclick:()=>abrir(p.id),text:p.nome})),
      quem.length?h("div",{class:"people"},...quem.map(id=>{const x=exDe(p.id,id);return h("span",{class:"p inscrito",text:nomeDe(id)+(x.percurso?" · "+x.percurso:"")+(x.km?" · "+fmtN(+x.km)+" km":"")+(x.tempo?" · "+x.tempo:"")+(temTrilho.has(p.id+"|"+id)?" · 📍":"")})})):null,meu)};
  const lista=passadas.filter(p=>!eTreino(p)&&Object.keys(pres[p.id]||{}).some(id=>foiA(p.id,id)));
  return h("section",{class:"historico"},h("div",{class:"row between"},h("h2",{class:"month",text:"Provas feitas"}),regAberto?null:h("button",{class:"btn small",type:"button",onclick:()=>{regAberto=true;draw();setTimeout(()=>$("rNome")&&$("rNome").focus(),50)},text:"+ Registar prova feita"})),
    regAberto?registoForm():null,
    quadro.length?h("div",{class:"quadro"},h("div",{class:"row between"},h("strong",{text:"Quadro de "+ano}),h("div",{class:"seg"},...[["provas","Provas"],["km","Km"]].map(([k,l])=>h("button",{type:"button","aria-pressed":String(quadroPor===k),onclick:()=>{quadroPor=k;draw()},text:l})))),
      h("ol",null,...quadro.map(([id,t],i)=>h("li",{class:id===me?"eu":null},h("span",{class:"pos",text:String(i+1)}),h("span",{class:"qn",text:nomeDe(id)}),h("span",{class:"qc",text:quadroPor==="km"?fmtN(Math.round(t.km*10)/10)+" km · "+t.n+(t.n===1?" prova":" provas"):t.n+(t.n===1?" prova":" provas")+(t.km?" · "+fmtN(Math.round(t.km*10)/10)+" km":"")}))))):null,
    lista.length?h("ul",{class:"histlista"},...lista.slice(0,histTodas?999:5).map(linha)):(regAberto?null:h("p",{class:"hint",text:"Ainda não há provas feitas registadas. Regista as que fizeste este ano para teres os teus totais de km e D+."})),
    lista.length>5?h("button",{class:"linkbtn",onclick:()=>{histTodas=!histTodas;draw()},text:histTodas?"Mostrar menos":"Ver todas ("+lista.length+")"}):null)}
async function setExtra(pid,campos){if(!podeMarcar()||!(pres[pid]&&pres[pid][me]))return;const m=extra[pid]=extra[pid]||{};const antes=Object.assign({},exDe(pid,me));m[me]=Object.assign({},antes,campos);draw();
  try{await api("presencas?membro_id=eq."+me+"&prova_id=eq."+encodeURIComponent(pid),{method:"PATCH",prefer:"return=minimal",body:campos});return true}catch(err){m[me]=antes;draw();toast("Não foi possível guardar. Tenta outra vez.");return false}}
const eTreino=p=>p&&p.fonte==="treino";
function icsDe(p){if(eTreino(p)&&p.hora){const [H,M]=p.hora.split(":").map(Number),ini=parseD(p.data);ini.setHours(H,M,0,0);const fim=new Date(ini.getTime()+2*3600e3);
    const f=x=>x.getFullYear()+String(x.getMonth()+1).padStart(2,"0")+String(x.getDate()).padStart(2,"0")+"T"+String(x.getHours()).padStart(2,"0")+String(x.getMinutes()).padStart(2,"0")+"00";
    const esc=s=>String(s||"").replace(/[\\;,]/g,m=>"\\"+m).replace(/\n/g,"\\n");
    return ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Dorsal//PT","BEGIN:VEVENT","UID:"+p.id+"@dorsal","DTSTAMP:"+new Date().toISOString().replace(/[-:]/g,"").slice(0,15)+"Z","DTSTART;TZID=Europe/Lisbon:"+f(ini),"DTEND;TZID=Europe/Lisbon:"+f(fim),"SUMMARY:"+esc(p.nome),
      "LOCATION:"+esc([p.nota,p.concelho,p.distrito].filter(Boolean).join(", ")),"DESCRIPTION:"+esc(mensagem(p)),"BEGIN:VALARM","TRIGGER:-PT2H","ACTION:DISPLAY","DESCRIPTION:"+esc(p.nome),"END:VALARM","END:VEVENT","END:VCALENDAR"].join("\r\n")}const d=p.data.replace(/-/g,""),d2=(()=>{const x=parseD(p.data);x.setDate(x.getDate()+1);return x.getFullYear()+String(x.getMonth()+1).padStart(2,"0")+String(x.getDate()).padStart(2,"0")})();
  const esc=s=>String(s||"").replace(/[\\;,]/g,m=>"\\"+m).replace(/\n/g,"\\n");const url=valid(p.inscricao)||valid(p.info)||"";
  return ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Dorsal//PT","BEGIN:VEVENT","UID:"+p.id+"@dorsal","DTSTAMP:"+new Date().toISOString().replace(/[-:]/g,"").slice(0,15)+"Z","DTSTART;VALUE=DATE:"+d,"DTEND;VALUE=DATE:"+d2,"SUMMARY:"+esc(p.nome),
    "LOCATION:"+esc([p.concelho,p.distrito].filter(Boolean).join(", ")),"DESCRIPTION:"+esc(mensagem(p)),url?"URL:"+url:null,"BEGIN:VALARM","TRIGGER:-P2D","ACTION:DISPLAY","DESCRIPTION:"+esc(p.nome),"END:VALARM","END:VEVENT","END:VCALENDAR"].filter(Boolean).join("\r\n")}
function partilhar(p){const url=location.origin+location.pathname+"#p="+encodeURIComponent(p.id);const txt=mensagem(p);
  if(navigator.share)navigator.share({title:p.nome,text:txt,url}).catch(()=>{});else copiar(txt+"\n"+url,null)}
const METEO={0:"céu limpo",1:"pouco nublado",2:"parcialmente nublado",3:"nublado",45:"nevoeiro",48:"nevoeiro",51:"chuvisco",53:"chuvisco",55:"chuvisco forte",61:"chuva fraca",63:"chuva",65:"chuva forte",66:"chuva gelada",67:"chuva gelada",71:"neve fraca",73:"neve",75:"neve forte",80:"aguaceiros",81:"aguaceiros",82:"aguaceiros fortes",95:"trovoada",96:"trovoada com granizo",99:"trovoada com granizo"};
function previsao(p){const dias=Math.round((parseD(p.data)-hoje())/864e5);const c=coordsDe(p);
  if(dias<0||dias>15||!c)return h("p",{class:"hint",text:dias>15?"A previsão do tempo aparece a partir de 16 dias antes da prova.":c?"":"Sem local conhecido para a previsão do tempo."});
  const m=meteo[p.id];
  if(!m){meteo[p.id]={estado:"a"};fetch("https://api.open-meteo.com/v1/forecast?latitude="+c[0]+"&longitude="+c[1]+"&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max&timezone=Europe%2FLisbon&start_date="+p.data+"&end_date="+p.data)
    .then(r=>r.ok?r.json():Promise.reject()).then(j=>{const d=j.daily;meteo[p.id]={estado:"ok",cod:d.weather_code[0],max:d.temperature_2m_max[0],min:d.temperature_2m_min[0],chuva:d.precipitation_probability_max[0],vento:d.wind_speed_10m_max[0]};draw()})
    .catch(()=>{meteo[p.id]={estado:"erro"};draw()});return h("p",{class:"hint",text:"A carregar a previsão do tempo…"})}
  if(m.estado==="a")return h("p",{class:"hint",text:"A carregar a previsão do tempo…"});
  if(m.estado==="erro")return h("p",{class:"hint",text:"Não foi possível obter a previsão do tempo."});
  return h("div",{class:"meteo"},h("b",{text:Math.round(m.min)+"–"+Math.round(m.max)+" °C"}),h("span",{text:(METEO[m.cod]||"")+(m.chuva!=null?" · chuva "+m.chuva+"%":"")+(m.vento!=null?" · vento até "+Math.round(m.vento)+" km/h":"")}),
    h("small",{text:"Previsão Open-Meteo para o centro do concelho"+(dias>7?"; a mais de uma semana é pouco fiável":"")+"."}))}
async function setEstado(pid,e){if(!podeMarcar())return;const m=pres[pid]=pres[pid]||{};const antes=m[me];
  if(antes===e)delete m[me];else m[me]=e;draw();
  try{if(antes===e)await api("presencas?membro_id=eq."+me+"&prova_id=eq."+encodeURIComponent(pid),{method:"DELETE"});
    else await api("presencas?on_conflict=membro_id,prova_id",{method:"POST",prefer:"resolution=merge-duplicates,return=minimal",body:{grupo,membro_id:me,prova_id:pid,estado:e,atualizado:new Date().toISOString()}});
    if(antes!==e&&(e==="inscrito"||e==="vou"))fetch(FN,{method:"POST",headers:fnHeaders(),body:JSON.stringify({tipo:"presenca",prova_id:pid,membro_id:me}),keepalive:true}).catch(()=>{});}
  catch(err){if(antes)m[me]=antes;else delete m[me];draw();toast("Não foi possível guardar. Tenta outra vez.")}}
function cliqueInsc(pid){if(!ONLINE||!grupo)return;cliques[pid]=(cliques[pid]||0)+1;api("cliques",{method:"POST",prefer:"return=minimal",body:{grupo,prova_id:pid,membro_id:me}}).catch(()=>{})}
async function remover(pid){if(confirmDel!==pid){confirmDel=pid;draw();return}confirmDel=null;
  try{await api("provas?id=eq."+encodeURIComponent(pid),{method:"DELETE"});provas=provas.filter(p=>p.id!==pid);draw();toast("Prova removida")}catch(e){toast("Não foi possível remover.")}}

// ---------- desenho ----------
function segDe(p){const mine=pres[p.id]&&pres[p.id][me];return podeMarcar()?h("div",{class:"seg",role:"group","aria-label":"A tua presença"},...ESTADOS.filter(([k])=>!(eTreino(p)&&k==="inscrito")).map(([k,l])=>h("button",{class:k,"aria-pressed":String(mine===k),onclick:()=>setEstado(p.id,k),text:l}))):null}
function msgDe(p){if(openMsg!==p.id)return null;const txt=mensagem(p),ta=h("textarea",{readonly:true,"aria-label":"Mensagem para o WhatsApp"});ta.value=txt;
  return h("div",{class:"msg"},ta,h("div",{class:"row"},h("button",{class:"btn primary small",onclick:()=>copiar(txt,ta),text:"Copiar"}),h("a",{class:"btn small",href:"https://wa.me/?text="+encodeURIComponent(txt),target:"_blank",rel:"noopener",text:"Abrir no WhatsApp"})))}
function contagem(q){const parts=[];if(q.inscrito.length)parts.push(q.inscrito.length+(q.inscrito.length===1?" inscrito":" inscritos"));if(q.vou.length)parts.push(q.vou.length+(q.vou.length===1?" vai":" vão"));if(q.talvez.length)parts.push(q.talvez.length+" talvez");return parts.join(" · ")}
function card(p){const d=parseD(p.data),q=quem(p.id);
  const people=h("div",{class:"people"},...ESTADOS.flatMap(([k,l])=>q[k].map(id=>h("span",{class:"p "+k,title:l,text:nomeDe(id)+(k==="inscrito"?" ✓":"")}))));
  const seg=segDe(p);
  const insc=valid(p.inscricao),info=valid(p.info);
  const tr=eTreino(p);
  const links=h("div",{class:"links"},
    insc?h("a",{href:insc,target:"_blank",rel:"noopener",onclick:()=>cliqueInsc(p.id),text:"Inscrição ↗"}):null,
    info?h("a",{href:info,target:"_blank",rel:"noopener",text:"Info ↗"}):null,
    h("button",{class:"linkbtn",onclick:()=>abrir(p.id),text:ONLINE&&grupo?"Quem vai"+(temGente(p.id)?" ("+(q.inscrito.length+q.vou.length+q.talvez.length)+")":""):"Abrir prova"}),
    nCom[p.id]?h("button",{class:"linkbtn com"+(novas[p.id]?" nova":""),onclick:()=>abrir(p.id),text:"💬 "+nCom[p.id]+(novas[p.id]?" · "+novas[p.id]+(novas[p.id]===1?" nova":" novas"):"")}):null,
    (podeMarcar()&&p.grupo&&p.grupo===grupo)?h("button",{class:"linkbtn",onclick:()=>remover(p.id),text:confirmDel===p.id?"Confirmar remoção":"Remover"}):null);
  const n=cliques[p.id]||0,dias=Math.round((d-hoje())/864e5);
  return h("article",{class:"card"+(tr?" treino":"")},
    h("div",{class:"bib",role:"button",tabindex:"0","aria-label":dataLonga(p.data)+". Abrir "+p.nome,onclick:()=>abrir(p.id)},h("div",{class:"d",text:d.getDate()}),h("div",{class:"m",text:MESES[d.getMonth()].slice(0,3)}),h("div",{class:"w",text:DIAS[d.getDay()]})),
    h("div",{class:"info"},tr?h("span",{class:"tagtreino",text:"Treino do grupo"+(p.hora?" · "+p.hora:"")}):null,h("h3",null,h("button",{class:"titlebtn",onclick:()=>abrir(p.id),text:p.nome})),
      tr&&p.nota?h("div",{class:"ponto",text:"📍 "+p.nota}):null,
      h("div",{class:"meta"},h("strong",{text:[p.concelho,p.distrito].filter(Boolean).join(", ")||"Local por confirmar"}),"  ·  ",h("span",{class:dias<=7?"cd urg":"cd",text:faltam(p.data)}),(kmAte(p)!=null?"  ·  ≈ "+Math.round(kmAte(p))+" km de casa":"")+(p.nota&&!tr?"  ·  "+p.nota:"")),
      p.distancias?(()=>{const t=String(p.distancias).split(",").map(s=>s.trim()).filter(Boolean),M=t.length>3?2:3;return h("div",{class:"dist"},...t.slice(0,M).map(s=>h("span",{text:s})),t.length>M?h("span",{class:"mais",title:t.slice(M).join(", "),text:"+"+(t.length-M)}):null)})():null,
      people.childNodes.length?people:null,h("div",{class:"accao"},seg,links),
      n?h("div",{class:"owner",text:n+(n===1?" clique":" cliques")+" do grupo no link de inscrição"}):null))}
function detalhe(pid){const box=$("view-prova");box.replaceChildren();
  const voltar=h("button",{class:"back",onclick:fechar,text:"← Provas"});
  const p=provas.find(x=>x.id===pid)||passadas.find(x=>x.id===pid);
  if(!p){box.append(voltar,h("div",{class:"empty",text:loaded?"Esta prova já não está no calendário.":"A carregar…"}));return}
  const d=parseD(p.data),q=quem(p.id),insc=valid(p.inscricao),info=valid(p.info);
  const pessoa=(id,k)=>{const x=exDe(p.id,id);return h("li",{class:"pessoa "+k},h("a",{class:"nome",href:linkMembro(id),text:nomeDe(id)+(id===me?" (tu)":"")}),
    h("span",{class:"ptag"},x.percurso?h("span",{text:x.percurso}):null,x.boleia==="oferece"?h("span",{class:"car",text:"🚗 "+(x.lugares?x.lugares+(x.lugares===1?" lugar":" lugares"):"leva carro")}):x.boleia==="precisa"?h("span",{class:"car precisa",text:"precisa de boleia"}):null))};
  const bloco=(k,titulo,ids,vazio)=>h("section",{class:"grupo-bloco "+k},h("h3",null,titulo+" ",h("span",{class:"n",text:String(ids.length)})),
    ids.length?h("ul",{class:"pessoas"},...ids.map(id=>pessoa(id,k))):h("p",{class:"hint",text:vazio}));
  let gente;
  if(!ONLINE)gente=h("div",{class:"notice"},h("p",{text:"A lista de quem está inscrito aparece quando a app estiver ligada ao servidor do grupo."}));
  else if(!grupo)gente=h("div",{class:"notice"},h("p",{text:"Entra no grupo para veres quem está inscrito nesta prova."}));
  else{const marcados=new Set([...q.inscrito,...q.vou,...q.talvez]);const falta=Object.keys(membros).filter(id=>!marcados.has(id)).sort((a,b)=>nomeDe(a).localeCompare(nomeDe(b),"pt"));
    gente=h("div",{class:"gente"},
      bloco("inscrito","Inscritos",q.inscrito,"Ninguém do grupo está inscrito ainda."),
      bloco("vou",eTreino(p)?"Vão":"Vão, ainda sem inscrição",q.vou,"Ninguém."),
      q.talvez.length?bloco("talvez","Talvez",q.talvez,""):null,
      falta.length?h("details",{class:"falta"},h("summary",{text:"Ainda não marcaram ("+falta.length+")"}),h("p",{class:"hint",text:falta.map(nomeDe).join(", ")})):null)}
  box.append(voltar,h("article",{class:"detalhe"},
    h("div",{class:"card"},
      h("div",{class:"bib","aria-label":dataLonga(p.data)},h("div",{class:"d",text:d.getDate()}),h("div",{class:"m",text:MESES[d.getMonth()].slice(0,3)}),h("div",{class:"w",text:DIAS[d.getDay()]})),
      h("div",{class:"info"},eTreino(p)?h("span",{class:"tagtreino",text:"Treino do grupo"+(p.hora?" · "+p.hora:"")}):null,h("h2",{class:"titulo",text:p.nome}),
        eTreino(p)&&p.nota?h("div",{class:"ponto",text:"📍 Encontro: "+p.nota}):null,
        h("div",{class:"meta"},h("strong",{text:[p.concelho,p.distrito].filter(Boolean).join(", ")||"Local por confirmar"}),"  ·  "+dataLonga(p.data)+(p.hora?" às "+p.hora:"")+", "+faltam(p.data)+(p.nota&&!eTreino(p)?"  ·  "+p.nota:"")),
        p.distancias?h("div",{class:"dist"},...String(p.distancias).split(",").map(s=>s.trim()).filter(Boolean).map(s=>h("span",{text:s}))):null,
        h("div",{class:"links"},insc?h("a",{href:insc,target:"_blank",rel:"noopener",onclick:()=>cliqueInsc(p.id),text:"Inscrição ↗"}):eTreino(p)?null:h("span",{class:"hint",text:"Sem link de inscrição"}),info?h("a",{href:info,target:"_blank",rel:"noopener",text:eTreino(p)?"Percurso ↗":"Informação ↗"}):null))),
    podeMarcar()?h("div",{class:"eu"},h("span",{class:"hint",text:"A tua presença"}),segDe(p)):null,
    h("div",{class:"acoes icons"},
      h("a",{class:"acao",href:"data:text/calendar;charset=utf-8,"+encodeURIComponent(icsDe(p)),download:p.id+".ics"},ic("calendario"),h("span",{text:"Calendário"})),
      h("button",{class:"acao",type:"button",onclick:()=>partilhar(p)},ic("partilhar"),h("span",{text:"Partilhar"})),
      (p.concelho&&p.distrito)?h("a",{class:"acao",href:"https://www.google.com/maps/search/?api=1&query="+encodeURIComponent((eTreino(p)&&p.nota?p.nota+", ":"")+p.concelho+", "+p.distrito+", Portugal"),target:"_blank",rel:"noopener"},ic("mapa"),h("span",{text:"Mapa"})):null,
      grupo?h("button",{class:"acao",type:"button",onclick:()=>{const c=document.querySelector("#view-prova .conversa");if(c)c.scrollIntoView({behavior:"smooth",block:"start"})}},ic("conversa"),h("span",{text:"Conversa"+(nCom[p.id]?" ("+nCom[p.id]+")":"")})):null),
    previsao(p),
    (podeMarcar()&&pres[p.id]&&pres[p.id][me])?(()=>{const x=exDe(p.id,me),ops=String(p.distancias||"").split(",").map(s=>s.trim()).filter(Boolean);
      const selP=h("select",{"aria-label":"O teu percurso",onchange:e=>setExtra(p.id,{percurso:e.target.value})},h("option",{value:"",text:"Que percurso vais fazer?"}),...ops.map(o=>h("option",{value:o,text:o})),x.percurso&&!ops.includes(x.percurso)?h("option",{value:x.percurso,text:x.percurso}):null);selP.value=x.percurso;
      const boleia=h("div",{class:"chips"},...[["","Vou por mim"],["oferece","Ofereço boleia"],["precisa","Preciso de boleia"]].map(([v,t])=>h("button",{type:"button",class:"chip-reg","aria-pressed":String(x.boleia===v),onclick:()=>setExtra(p.id,{boleia:v,lugares:v==="oferece"?(x.lugares||3):0})},t)));
      const lug=x.boleia==="oferece"?h("label",{class:"lug"},"Lugares livres ",(()=>{const s=h("select",{onchange:e=>setExtra(p.id,{lugares:+e.target.value})},...[1,2,3,4,5,6,7].map(n=>h("option",{value:String(n),text:String(n)})));s.value=String(x.lugares||3);return s})()):null;
      return h("div",{class:"plano"},h("strong",{text:"O teu plano"}),ops.length?selP:h("input",{placeholder:"Percurso (por exemplo 25K)",maxlength:"40",value:x.percurso,onchange:e=>setExtra(p.id,{percurso:e.target.value.trim()})}),boleia,lug)})():null,
    gente,
    (()=>{if(!grupo)return null;const ofer=[],prec=[];for(const id of Object.keys(pres[p.id]||{})){const x=exDe(p.id,id);if(x.boleia==="oferece")ofer.push(id);if(x.boleia==="precisa")prec.push(id)}
      if(!ofer.length&&!prec.length)return null;const livres=ofer.reduce((a,id)=>a+(exDe(p.id,id).lugares||0),0);
      return h("section",{class:"grupo-bloco boleias"},h("h3",null,"Boleias ",h("span",{class:"n",text:livres+(livres===1?" lugar livre":" lugares livres")})),
        ofer.length?h("p",null,h("strong",{text:"Oferecem: "}),ofer.map(id=>nomeDe(id)+" ("+(exDe(p.id,id).lugares||0)+")").join(", ")):null,
        prec.length?h("p",null,h("strong",{text:"Precisam: "}),prec.map(nomeDe).join(", ")):null)})(),
    conversa(p),
    planoView(p),
    trilhosView(p),
    h("div",{class:"links"},h("button",{class:"linkbtn",onclick:()=>{openMsg=openMsg===p.id?null:p.id;draw()},text:openMsg===p.id?"Fechar mensagem":"Mensagem para o WhatsApp"})),
    msgDe(p)))}
function listaPorMes(ps,box,vazio){box.replaceChildren();if(!ps.length){box.append(h("div",{class:"empty",text:vazio}));return}
  let cur="",list=null;for(const p of ps){const d=parseD(p.data),k=MESES[d.getMonth()]+" "+d.getFullYear();if(k!==cur){cur=k;box.append(h("h2",{class:"month",text:k}));list=h("div",{class:"list"});box.append(list)}list.append(card(p))}}
function fillSel(sel,first,opts){const v=sel.value,key=JSON.stringify(opts);if(sel.dataset.k===key)return;sel.dataset.k=key;sel.replaceChildren(h("option",{value:"",text:first}),...opts.map(([v,t])=>h("option",{value:v,text:t})));if(opts.some(o=>o[0]===v))sel.value=v}

function draw(){
  const sec=secAtual();$("pg-sec").hidden=!sec;$("pg-provas").hidden=!!sec;desenharMenu();
  if(sec)desenharSec(sec);else secDesenhada=null;
  $("entrar").hidden=!(ONLINE&&(!grupo||entrarAberto));$("hero").hidden=!!grupo;$("entrarX").hidden=!grupo;
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
  for(const t of ["grupo","todas","nova"]){$("tab-"+t).setAttribute("aria-current",(!sec&&!aberta&&tab===t)?"page":"false");$("view-"+t).hidden=tab!==t}
  $("vistaSeg").hidden=tab!=="todas";for(const b of $("vistaSeg").children)b.setAttribute("aria-pressed",String((b.dataset.v==="cal")===vistaCal));
  $("pgTitle").textContent=tab==="grupo"?"O grupo vai":tab==="todas"?"Provas":"Nova prova";$("resumoBtn").hidden=tab!=="grupo";if(tab!=="grupo")$("resumo").hidden=true;$("pgHead").hidden=!!aberta;
  if(aberta)detalhe(aberta);
  const fut=futuras();const grp=fut.filter(p=>temGente(p.id)||(eTreino(p)&&p.grupo===grupo));
  $("nGrupo").textContent=loaded&&grp.length?grp.length:"";$("nTodas").textContent="";
  if(!loaded){$("view-grupo").replaceChildren(h("div",{class:"empty",text:"A carregar as provas…"}));return}
  const minhas=me?fut.filter(p=>pres[p.id]&&(pres[p.id][me]==="inscrito"||pres[p.id][me]==="vou")):[];
  const banner=minhas.length?(()=>{const p=minhas[0],e=pres[p.id][me],x=exDe(p.id,me);return h("button",{type:"button",class:"proxima",onclick:()=>abrir(p.id)},
    h("span",{class:"k",text:eTreino(p)?"O teu próximo treino":"A tua próxima prova"}),h("span",{class:"t",text:p.nome}),h("span",{class:"s",text:dataLonga(p.data)+(p.hora?" às "+p.hora:"")+" · "+faltam(p.data)+(eTreino(p)?(p.nota?" · "+p.nota:""):" · "+(e==="inscrito"?"inscrito":"ainda sem inscrição"))+(x.percurso?" · "+x.percurso:"")}),
    ...(()=>{const outros=Object.keys(pres[p.id]||{}).filter(id=>id!==me&&foiA(p.id,id)).map(nomeDe);const dias=Math.round((parseD(p.data)-hoje())/864e5);
      if(dias>=0&&dias<=15&&coordsDe(p)&&!meteo[p.id])previsao(p);const m=meteo[p.id];
      return [outros.length?h("span",{class:"s",text:"Contigo: "+outros.join(", ")}):null,m&&m.estado==="ok"?h("span",{class:"s mt",text:(METEO[m.cod]||"")+" · "+Math.round(m.min)+"–"+Math.round(m.max)+" °C"+(m.chuva!=null?" · chuva "+m.chuva+"%":"")}):null].filter(Boolean)})())})():null;
  listaPorMes(grp,$("view-grupo"),podeMarcar()?"Ainda ninguém marcou presença. Vai a Todas e carrega em Vou, Inscrito ou Talvez.":"Quando entrares no grupo, aqui aparecem as provas a que o grupo vai.");
  {const ma=meuAno();if(ma)$("view-grupo").prepend(ma)}
  {const ids=Object.keys(novas).filter(k=>novas[k]);if(ids.length){const todasP=[...provas,...passadas];$("view-grupo").prepend(h("div",{class:"novasbox"},h("strong",{text:"💬 Mensagens novas"}),...ids.map(pid=>{const pp=todasP.find(x=>x.id===pid);return pp?h("button",{type:"button",class:"linkbtn",onclick:()=>abrir(pid),text:pp.nome+" ("+novas[pid]+")"}):null})))}}
  {const pc=pushCartao();if(pc)$("view-grupo").prepend(pc)}
  $("tab-grupo").classList.toggle("temnovas",Object.values(novas).some(Boolean));
  $("pushBtn").hidden=!(me&&ONLINE&&pushSuportado()&&(pushAtivo()||store.get("dorsal.pushdispensa."+grupo)));$("pushBtn").textContent=pushAtivo()?"Desactivar notificações":"Activar notificações";
  if(banner)$("view-grupo").prepend(banner);
  {const hs=historico();if(hs)$("view-grupo").append(hs)}
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
  $("tiposTxt").textContent=filtroTipos.size&&semTipo?semTipo+(semTipo===1?" prova ainda sem percursos publicados fica":" provas ainda sem percursos publicados ficam")+" de fora deste filtro.":"";$("tiposTxt").hidden=!$("tiposTxt").textContent;
  $("tipos").prepend(h("button",{type:"button",class:"chip-reg","aria-pressed":String(!filtroTipos.size),onclick:()=>{filtroTipos.clear();store.set("dorsal.tipos",null);draw()}},"Todos os percursos"));
  $("raios").replaceChildren(...[0,...RAIOS].map(r=>h("button",{type:"button",class:"chip-reg","aria-pressed":String(filtroRaio===r),disabled:!casa&&r?true:null,onclick:()=>{filtroRaio=r;store.set("dorsal.raio",r?String(r):null);draw()}},r?"até "+r+" km":"Qualquer distância")));
  const semLocal=fut.filter(p=>!coordsDe(p)).length;
  $("casaTxt").replaceChildren(...(casa?["Casa: ",h("strong",{text:casa.nome}),". ",h("button",{type:"button",class:"linkbtn",onclick:()=>{definirCasa(null);filtroRaio=0;store.set("dorsal.raio",null);draw()},text:"Esquecer"}),
    " Distância em linha recta até ao centro do concelho da prova, por isso é aproximada."+(filtroRaio&&semLocal?" "+semLocal+(semLocal===1?" prova sem local conhecido fica":" provas sem local conhecido ficam")+" de fora.":"")]:["Escolhe a tua localização ou o teu concelho para filtrar por distância. Fica só neste telemóvel."]));
  if(!$("concelhosList").options.length)$("concelhosList").replaceChildren(...LUG.c.map(c=>h("option",{value:c[4]+" ("+c[1]+")"})));
  {const nf=(filtroRaio&&casa?1:0)+($("fDistrito").value?1:0)+($("fMes").value?1:0);$("maisBtn").textContent=nf?"Filtros ("+nf+")":"Filtros";$("maisBtn").classList.toggle("on",!!nf)}
  const todas=fut.filter(p=>!eTreino(p)&&naReg(p)&&(!filtroRaio||!casa||(kmAte(p)!=null&&kmAte(p)<=filtroRaio))&&(!filtroTipos.size||tiposDe(p).some(t=>filtroTipos.has(t)))&&(!fd||p.distrito===fd)&&(!fm||p.data.slice(0,7)===fm)&&(!q||[p.nome,p.concelho,p.distrito].join(" ").toLowerCase().includes(q)));
  if(vistaCal)calendario(todas,$("todasList"));else listaPorMes(todas,$("todasList"),fut.length?"Nenhuma prova com estes filtros.":"Ainda não há provas.");
  fillSel($("fMes"),"Todos os meses",[...new Set(fut.map(p=>p.data.slice(0,7)))].sort().map(m=>[m,MESES[+m.slice(5)-1]+" "+m.slice(0,4)]));
  $("view-nova").querySelectorAll("input,select,button").forEach(el=>el.disabled=!podeMarcar());
  if(!$("resumo").hidden)$("resumoText").value=resumo();
}

// ---------- secções (menu lateral) ----------
const SECOES=window.DORSAL_SECOES||[];
function secAtual(){const m=location.hash.match(/[#&]s=([a-z-]+)/);return m&&(m[1]==="estatisticas"||m[1]==="membros"||m[1]==="membro"||m[1]==="privacidade"||SECOES.some(x=>x.id===m[1]))?m[1]:null}
let secDesenhada=null;
function comRefs(texto,sid){const out=[];let i=0;String(texto).replace(/\[(\d+)\]/g,(m,n,pos)=>{out.push(texto.slice(i,pos));
  out.push(h("sup",null,h("a",{href:"#",onclick:e=>{e.preventDefault();const f=document.getElementById("f-"+sid+"-"+n);const d=f&&f.closest("details");if(d)d.open=true;if(f){f.classList.add("piscar");setTimeout(()=>f.classList.remove("piscar"),1600)}if(f)f.scrollIntoView({behavior:"smooth",block:"center"})},"aria-label":"Fonte "+n,text:"["+n+"]"})));i=pos+m.length;return m});
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
function desenharSec(sid){if(sid==="estatisticas"){secDesenhada=null;$("pg-sec").replaceChildren(estatisticas());return}
  if(sid==="privacidade"){secDesenhada=null;$("pg-sec").replaceChildren(privacidade());return}
  if(sid==="membros"){secDesenhada=null;$("pg-sec").replaceChildren(membrosView());return}
  if(sid==="membro"){secDesenhada=null;const m=location.hash.match(/[#&]m=([0-9a-z-]{1,40})/i);$("pg-sec").replaceChildren(perfil(m?m[1]:me));return}if(secDesenhada===sid)return;secDesenhada=sid;const S=SECOES.find(x=>x.id===sid);const box=$("pg-sec");
  // blocos agrupados em cartões, um por cada título
  const cartoes=[];let atual=null,k=0;const topo=[];
  for(const b of S.blocos){if(b.t==="h"){k++;atual=h("section",{class:"seccard",id:"sc-"+sid+"-"+k},h("h2",{text:b.x}));cartoes.push(atual);continue}
    const el=bloco(b,sid);if(!el)continue;if(atual)atual.append(el);else topo.push(el)}
  const indice=cartoes.length>2?h("nav",{class:"indice","aria-label":"Nesta secção"},...cartoes.map(c=>h("button",{type:"button",class:"chip-reg",onclick:()=>c.scrollIntoView({behavior:"smooth",block:"start"}),text:c.firstChild.textContent}))):null;
  const fontes=S.fontes.length?h("details",{class:"fontes"},h("summary",null,h("strong",{text:"Fontes ("+S.fontes.length+")"}),h("span",{class:"hint",text:" · os números entre parênteses rectos levam à fonte"})),h("ol",null,...S.fontes.map((f,i)=>h("li",{id:"f-"+sid+"-"+(i+1)},f.t+" ",h("a",{href:f.u,target:"_blank",rel:"noopener",text:"Abrir ↗"}))))):null;
  box.replaceChildren(h("article",{class:"sec"},
    h("header",{class:"sechero"},h("span",{class:"secic"},ic(sid,S.icone)),h("div",null,h("h1",{text:S.titulo}),h("p",{class:"lead",text:S.resumo}))),
    indice,...topo,...cartoes,fontes));
}
function abrirMenu(abrir){$("menu").hidden=!abrir;$("scrim").hidden=!abrir;$("menuBtn").setAttribute("aria-expanded",String(abrir));document.body.style.overflow=abrir?"hidden":"";if(abrir)$("menuList").querySelector("[aria-current]")?.focus()}
function desenharMenu(){const cur=secAtual()||"provas";
  $("menuList").replaceChildren(
    h("li",null,h("a",{href:"#",onclick:e=>{e.preventDefault();history.pushState(null,"",location.pathname+location.search);abrirMenu(false);draw();window.scrollTo({top:0})},"aria-current":cur==="provas"?"page":null},ic("provas"),"Provas")),
    ...(ONLINE?[h("li",{class:"sep"}),h("li",null,h("a",{href:"#s=estatisticas",onclick:()=>abrirMenu(false),"aria-current":cur==="estatisticas"?"page":null},ic("estatisticas"),"Estatísticas")),h("li",null,h("a",{href:"#s=membros",onclick:()=>abrirMenu(false),"aria-current":(cur==="membros"||cur==="membro")?"page":null},ic("membros"),"Membros")),h("li",{class:"lbl",text:"Grupos"}),
      ...gruposConhecidos().map(g=>h("li",null,h("a",{href:"#",onclick:e=>{e.preventDefault();abrirMenu(false);history.pushState(null,"",location.pathname);if(g.c!==grupo)mudarGrupo(g.c);else draw()},"aria-current":g.c===grupo?"true":null},h("span",{class:"ic",text:g.c===grupo?"●":"○"}),g.n||"Grupo sem nome"))),
      h("li",null,h("a",{href:"#",onclick:e=>{e.preventDefault();abrirMenu(false);history.pushState(null,"",location.pathname);entrarAberto=true;draw();window.scrollTo({top:0});$("criarNome").focus()}},ic("mais"),"Criar ou entrar noutro grupo"))]:[]),
    h("li",{class:"sep"}),
    ...SECOES.map(x=>h("li",null,h("a",{href:"#s="+x.id,onclick:()=>abrirMenu(false),"aria-current":cur===x.id?"page":null},ic(x.id,x.icone),x.titulo))),
    h("li",{class:"sep"}),h("li",null,h("a",{href:"#s=privacidade",onclick:()=>abrirMenu(false),"aria-current":cur==="privacidade"?"page":null},ic("privacidade"),"Privacidade e dados")))}
$("menuBtn").addEventListener("click",()=>abrirMenu(true));
// ---------- puxar para actualizar ----------
(function(){const el=$("ptr"),t=el.querySelector(".ptr-t"),LIM=72;let y0=null,dy=0,aCarregar=false;
  const pode=()=>window.scrollY<=0&&$("menu").hidden&&!aEscrever()&&ONLINE;
  window.addEventListener("touchstart",e=>{if(aCarregar||!pode()||e.touches.length!==1){y0=null;return}y0=e.touches[0].clientY;dy=0},{passive:true});
  window.addEventListener("touchmove",e=>{if(y0==null)return;dy=e.touches[0].clientY-y0;if(dy<=0||window.scrollY>0){el.classList.remove("ver");return}
    const d=Math.min(110,dy*.5);el.style.transform="translate(-50%,"+d+"px)";el.classList.add("ver");el.classList.toggle("pronto",dy>LIM*2);t.textContent=dy>LIM*2?"Larga para actualizar":"Puxa para actualizar"},{passive:true});
  window.addEventListener("touchend",async()=>{if(y0==null)return;const ok=dy>LIM*2;y0=null;
    if(!ok){el.classList.remove("ver","pronto");el.style.transform="";return}
    aCarregar=true;el.classList.add("a-carregar");t.textContent="A actualizar…";el.style.transform="translate(-50%,40px)";
    const t0=Date.now();try{conv={};await carregar()}catch(_){}
    await new Promise(r=>setTimeout(r,Math.max(0,500-(Date.now()-t0))));
    t.textContent="Actualizado às "+new Date().toLocaleTimeString("pt-PT",{hour:"2-digit",minute:"2-digit"});el.classList.remove("a-carregar","pronto");el.classList.add("feito");
    setTimeout(()=>{el.classList.remove("ver","feito");el.style.transform="";aCarregar=false},900)})})();
$("menuX").addEventListener("click",()=>abrirMenu(false));
$("scrim").addEventListener("click",()=>abrirMenu(false));
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("menu").hidden)abrirMenu(false)});

// ---------- eventos ----------
document.querySelectorAll(".tab[data-tab]").forEach(b=>b.addEventListener("click",()=>{tab=b.dataset.tab;store.set("dorsal.tab",tab);if(location.hash)history.pushState(null,"",location.pathname);draw();window.scrollTo({top:0})}));
$("tab-menu").addEventListener("click",()=>abrirMenu(true));
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
$("pushBtn").addEventListener("click",()=>{if(pushAtivo())desactivarPush();else{store.set("dorsal.pushdispensa."+grupo,null);activarPush()}});
$("entrarX").addEventListener("click",()=>{entrarAberto=false;draw()});
$("criarForm").addEventListener("submit",async e=>{e.preventDefault();const nome=$("criarNome").value.trim().slice(0,40);if(!nome){$("criarMsg").textContent="Escreve o nome do grupo.";return}
  const b=$("criarForm").querySelector("button");b.disabled=true;$("criarMsg").textContent="A criar…";
  try{const r=await api("rpc/criar_grupo2",{method:"POST",body:{p_nome:nome}});const c=r&&r.codigo;if(typeof c!=="string"||!/^[a-z0-9]{6,40}$/.test(c))throw 0;store.set("dorsal.admin."+c,r.admin);
    $("criarNome").value="";$("criarMsg").textContent="";lembrarGrupo(c,nome);mudarGrupo(c);toast("Grupo criado. Junta-te com o teu nome e depois convida os outros.")}
  catch(err){$("criarMsg").textContent=err&&err.status===400?"Demasiados grupos criados há pouco. Tenta mais tarde.":"Não foi possível criar o grupo. Tenta outra vez."}
  finally{b.disabled=false}});
$("codigoForm").addEventListener("submit",e=>{e.preventDefault();const c=lerCodigo($("codigo").value)||lerCodigo("?g="+$("codigo").value.trim());if(!c){$("codigoMsg").textContent="Não reconheci esse link ou código.";return}$("codigo").value="";$("codigoMsg").textContent="";mudarGrupo(c)});
$("novoForm").addEventListener("submit",async e=>{e.preventDefault();const nome=$("novoNome").value.trim().slice(0,30);if(!nome)return;
  try{const r=await api("membros",{method:"POST",prefer:"return=representation",body:{grupo,nome}});const m=r&&r[0];if(!m)throw 0;membros[m.id]=m.nome;me=m.id;store.set(chaveMe(),m.id);$("novoNome").value="";draw();toast("Bem-vindo, "+m.nome)}
  catch(err){toast("Não foi possível juntar-te. Tenta outra vez.")}});
$("meBtn").addEventListener("click",()=>{tab="grupo";draw();window.scrollTo({top:0,behavior:"smooth"})});
// ---------- editar grupo (nome e logótipo) ----------
let novoLogo=null;
function reduzirImagem(file){return new Promise((res,rej)=>{const img=new Image(),url=URL.createObjectURL(file);img.onload=()=>{const S=128,c=document.createElement("canvas");c.width=c.height=S;const x=c.getContext("2d");
  const lado=Math.min(img.width,img.height);x.drawImage(img,(img.width-lado)/2,(img.height-lado)/2,lado,lado,0,0,S,S);URL.revokeObjectURL(url);
  let d=c.toDataURL("image/webp",.8);if(!d.startsWith("data:image/webp"))d=c.toDataURL("image/jpeg",.82);res(d)};img.onerror=rej;img.src=url})}
$("editarBtn").addEventListener("click",()=>{const p=$("editarGrupo");p.hidden=!p.hidden;if(!p.hidden){$("gNome").value=grupoNome;novoLogo=null;$("gPrev").src=grupoLogo||"icons/dorsal-v2.svg";$("gMsg").textContent="";painelAdmin();verAdmin().then(painelAdmin);p.scrollIntoView({behavior:"smooth",block:"center"})}});
let confAdmin="";
function painelAdmin(){const box=$("adminBox");if(!box)return;const e=adminEstado,bloq=e==="outro";
  $("gForm").querySelectorAll("input,button,label.btn").forEach(x=>{if(x.tagName==="LABEL")x.classList.toggle("off",bloq);else x.disabled=bloq});
  if(!e){box.replaceChildren();return}
  if(e==="livre"){box.replaceChildren(h("h3",{text:"Administração"}),h("p",{class:"hint",text:"Ninguém administra este grupo. Quem administra pode mudar o nome e o logótipo, remover membros e mudar o código se o link circular onde não deve."}),
    h("button",{class:"btn primary",type:"button",onclick:async()=>{try{const t=await api("rpc/admin_reclamar",{method:"POST",body:{}});if(!t)throw 0;store.set(chaveAdmin(),t);await verAdmin();painelAdmin();toast("Passaste a administrar o grupo")}catch(_){toast("Não foi possível. Outra pessoa pode já ter ficado com a administração.");verAdmin().then(painelAdmin)}},text:"Ficar como administrador"}));return}
  if(e==="outro"){box.replaceChildren(h("h3",{text:"Administração"}),h("p",{class:"hint",text:"Este grupo tem administrador. Só ele muda o nome, o logótipo e o código, ou remove membros. Se precisares, pede-lhe o link de administração."}));return}
  const linkAdmin=()=>location.origin+location.pathname+"?g="+grupo+"#admin="+adminTok();
  box.replaceChildren(h("h3",{text:"Administração ✓"}),h("p",{class:"hint",text:"Administras este grupo neste telemóvel. Removes membros na página de cada um (menu, Membros)."}),
    h("div",{class:"adminacts"},
      h("div",null,h("strong",{text:"Partilhar a administração"}),h("p",{class:"hint",text:"Quem abrir este link fica também administrador. Usa-o para passar a gestão a outra pessoa ou para administrares noutro telemóvel."}),
        h("button",{class:"btn small",type:"button",onclick:()=>copiar(linkAdmin()),text:"Copiar link de administração"})),
      h("div",null,h("strong",{text:"Retirar a administração aos outros"}),h("p",{class:"hint",text:"Cria um link de administração novo. Os links antigos deixam de servir; só este telemóvel continua a administrar."}),
        h("button",{class:"btn small",type:"button",onclick:async()=>{if(confAdmin!=="token"){confAdmin="token";painelAdmin();return}confAdmin="";try{const t=await api("rpc/admin_novo_token",{method:"POST",body:{p_token:adminTok()}});if(!t)throw 0;store.set(chaveAdmin(),t);toast("Só tu administras agora")}catch(_){toast("Não foi possível. Tenta outra vez.")}painelAdmin()},text:confAdmin==="token"?"Confirmar":"Retirar"})),
      h("div",null,h("strong",{text:"Mudar o código do grupo"}),h("p",{class:"hint",text:"Para quando o link circulou onde não devia. O link antigo deixa de funcionar e tens de enviar o novo a todos os membros. Nada se perde."}),
        h("button",{class:"btn small danger",type:"button",onclick:mudarCodigo,text:confAdmin==="codigo"?"Confirmar: mudar o código":"Mudar o código"}))))}
async function mudarCodigo(){if(confAdmin!=="codigo"){confAdmin="codigo";painelAdmin();return}confAdmin="";
  try{const novo=await api("rpc/admin_novo_codigo",{method:"POST",body:{p_token:adminTok()}});if(typeof novo!=="string"||!/^[a-z0-9]{6,40}$/.test(novo))throw 0;
    const velho=grupo;for(const k of ["dorsal.membro.","dorsal.admin.","dorsal.pushdispensa."]){const v=store.get(k+velho);if(v!=null){store.set(k+novo,v);store.set(k+velho,null)}}
    const ep=store.get("dorsal.push."+velho);if(ep!=null){store.set("dorsal.push."+novo,ep);store.set("dorsal.push."+velho,null)}
    store.set("dorsal.cache."+velho,null);const n=grupoNome;esquecerGrupo(velho);lembrarGrupo(novo,n);
    history.replaceState(null,"",location.pathname+"?g="+novo);$("editarGrupo").hidden=true;mudarGrupo(novo);
    toast("Código mudado. Envia o link novo a todos os membros.");setTimeout(()=>{const b=$("partilhar");if(b&&!b.hidden)b.click()},900)}
  catch(_){toast("Não foi possível mudar o código. Tenta outra vez.");painelAdmin()}}
$("gFicheiro").addEventListener("change",async e=>{const f=e.target.files[0];if(!f)return;try{novoLogo=await reduzirImagem(f);$("gPrev").src=novoLogo}catch(_){$("gMsg").textContent="Não consegui ler essa imagem."}});
$("gTirar").addEventListener("click",()=>{novoLogo="";$("gPrev").src="icons/dorsal-v2.svg"});
$("gForm").addEventListener("submit",async e=>{e.preventDefault();if(!podeMarcar())return;const nome=$("gNome").value.trim().slice(0,40);if(!nome){$("gMsg").textContent="O grupo precisa de um nome.";return}
  const body={nome};if(novoLogo!==null)body.logo=novoLogo;
  if(adminEstado==="outro"){$("gMsg").textContent="Só o administrador pode mudar o nome e o logótipo.";return}
  try{if(souAdmin()){const ok=await api("rpc/admin_editar",{method:"POST",body:{p_token:adminTok(),p_nome:nome,p_logo:novoLogo!==null?novoLogo:(grupoLogo||"")}});if(!ok)throw 0}
    else await api("grupos?codigo=eq."+grupo,{method:"PATCH",prefer:"return=minimal",body});lembrarGrupo(grupo,nome);grupoNome=nome;if(novoLogo!==null)grupoLogo=novoLogo;$("editarGrupo").hidden=true;draw();toast("Grupo actualizado")}
  catch(err){$("gMsg").textContent="Não foi possível guardar. Tenta outra vez."}});
$("sair").addEventListener("click",()=>{me=null;store.set(chaveMe(),null);draw();window.scrollTo({top:0})});
const linkGrupo=()=>location.origin+location.pathname+"?g="+grupo,textoConvite=()=>"Junta-te"+(grupoNome?" aos "+grupoNome:" ao grupo")+" no Dorsal para combinarmos as provas de trail: "+linkGrupo();
function carregarQR(){return window.qrcode?Promise.resolve():new Promise((res,rej)=>{const s=document.createElement("script");s.src="qrcode.min.js?v=1";s.onload=res;s.onerror=rej;document.head.append(s)})}
$("partilhar").addEventListener("click",async()=>{const c=$("convite");c.hidden=false;c.scrollIntoView({behavior:"smooth",block:"center"});$("qrBox").textContent="A gerar o código…";
  try{await carregarQR();const q=qrcode(0,"M");q.addData(linkGrupo());q.make();$("qrBox").innerHTML=q.createSvgTag({cellSize:6,margin:3,scalable:true})}catch(_){$("qrBox").textContent="Não foi possível gerar o código QR. Usa o link."}});
$("conviteX").addEventListener("click",()=>{$("convite").hidden=true});
$("conviteCopy").addEventListener("click",()=>copiar(textoConvite(),null));
$("conviteShare").addEventListener("click",()=>{if(navigator.share)navigator.share({title:"Dorsal"+(grupoNome?" · "+grupoNome:""),text:textoConvite()}).catch(()=>{});else copiar(textoConvite(),null)});
document.querySelectorAll("#vistaSeg button").forEach(b=>b.addEventListener("click",()=>{vistaCal=b.dataset.v==="cal";store.set("dorsal.vista",vistaCal?"cal":null);draw()}));
$("nDistrito").replaceChildren(h("option",{value:"",text:"Escolher"}),...DISTRITOS.map(d=>h("option",{value:d,text:d})));
let novaTipo="prova";
function mostrarNovaTipo(){const t=novaTipo==="treino";for(const b of $("novaTipo").children)b.setAttribute("aria-pressed",String(b.dataset.t===novaTipo));
  document.querySelectorAll("#novaForm .sotreino").forEach(x=>x.hidden=!t);document.querySelectorAll("#novaForm .soprova").forEach(x=>x.hidden=t);
  $("nHora").required=t;$("nNomeL").textContent=t?"Nome do treino":"Nome da prova";$("nNome").placeholder=t?"Por exemplo: Longo de sábado em Sintra":"";
  $("nDistL").textContent=t?"Distância e D+ previstos":"Distâncias (por exemplo 12K, 25K, caminhada 8K)";$("nDist").placeholder=t?"16 km, 700 D+":"";
  $("nInfoL").textContent=t?"Link do percurso (Strava, Wikiloc…)":"Link com mais informação";$("novaBtn").textContent=t?"Marcar treino":"Acrescentar prova";
  $("nData").min=t?hojeISO():""}
$("novaTipo").addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;novaTipo=b.dataset.t;mostrarNovaTipo()});
$("novaForm").addEventListener("submit",async e=>{e.preventDefault();if(!podeMarcar())return;
  const nome=$("nNome").value.trim(),data=$("nData").value,treino=novaTipo==="treino";if(!nome||!data)return;
  if(treino&&!/^\d{2}:\d{2}$/.test($("nHora").value)){$("novaMsg").textContent="Falta a hora do treino.";return}
  const id=(treino?"treino-":"")+(nome.normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,50)||"prova")+"-"+data+(treino?"-"+$("nHora").value.replace(":","")+"-"+grupo.slice(0,4):"");
  const body={id,nome,data,distrito:$("nDistrito").value,concelho:$("nConcelho").value.trim(),distancias:$("nDist").value.trim(),inscricao:treino?"":(valid($("nInsc").value.trim())||""),info:valid($("nInfo").value.trim())||"",fonte:treino?"treino":"grupo",grupo,criado_por:me};
  if(treino){body.hora=$("nHora").value;body.nota=$("nPonto").value.trim().slice(0,120)}
  try{await api("provas",{method:"POST",prefer:"return=minimal",body});$("novaForm").reset();$("novaMsg").textContent="";
    if(treino){try{await api("presencas",{method:"POST",prefer:"resolution=merge-duplicates,return=minimal",body:{grupo,membro_id:me,prova_id:id,estado:"vou",atualizado:new Date().toISOString()}})}catch(_){}
      fetch(FN,{method:"POST",headers:fnHeaders(),body:JSON.stringify({tipo:"treino",prova_id:id,membro_id:me}),keepalive:true}).catch(()=>{});
      toast("Treino marcado. O grupo vai ser avisado.");tab="grupo"}else{toast("Prova acrescentada");tab="todas"}
    novaTipo="prova";mostrarNovaTipo();await carregar()}
  catch(err){$("novaMsg").textContent=err.status===409?"Essa prova já existe nessa data.":"Não foi possível guardar. Tenta outra vez."}});

let ultimaAberta=provaAberta();
window.addEventListener("hashchange",()=>{const a=provaAberta();if(a&&!ultimaAberta)history.replaceState({dorsal:1},"");ultimaAberta=a;draw();window.scrollTo({top:0})});
draw();carregar();
const aEscrever=()=>{const a=document.activeElement;return !!a&&(a.tagName==="TEXTAREA"||(a.tagName==="INPUT"&&!/checkbox|radio|button/.test(a.type))||a.tagName==="SELECT")};
setInterval(()=>{if(document.visibilityState==="visible"&&ONLINE&&!aEscrever())carregar()},30000);
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&ONLINE&&loaded)carregar()});
if("serviceWorker" in navigator){const tinha=!!navigator.serviceWorker.controller;let recarregou=false;
  navigator.serviceWorker.addEventListener("controllerchange",()=>{if(tinha&&!recarregou){recarregou=true;location.reload()}});
  window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js",{updateViaCache:"none"}).then(r=>{document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")r.update().catch(()=>{})})}).catch(()=>{}))}
})();
