'use strict';
(()=>{
const BASE='https://nrrlygoknpuoemcqwitx.supabase.co',KEY='sb_publishable_A3wOscl8id1tX8I5SrLWDA_N-6RdVWd',ENDPOINT=BASE+'/functions/v1/solbitnarae-raffle';
const admin=document.body.classList.contains('quiz-admin'),$=id=>document.getElementById(id),node=(tag,value='',cls='')=>{const n=document.createElement(tag);n.textContent=value;if(cls)n.className=cls;return n;};
const read=(key,temporary=false)=>{try{return(temporary?sessionStorage:localStorage).getItem(key)||'';}catch{return '';}};
const session=()=>read('sf-parent-session'),tabId=crypto.randomUUID();
let busy=false,starting=false,lastHeartbeat=0,current=null,offset=0,lastServer=0,overlay=null,overlayStage='',lastCredential='',lastError='',dismissed=[];
try{dismissed=JSON.parse(read('sf-raffle-dismissed')||'[]');if(!Array.isArray(dismissed))dismissed=[];}catch{}
function message(value){const e=$('raffleFeedback');if(e)e.textContent=value;}
async function api(action,extra={}){const before=Date.now(),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);try{const res=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json',apikey:KEY},body:JSON.stringify({action,...(admin?{token:read('sf-admin-token',true)}:{session:session(),tabId}),...extra}),signal:controller.signal});const data=await res.json();if(!res.ok)throw Error(data.error||'추첨 연결을 확인해 주세요.');data.clockOffset=data.serverTime?data.serverTime-(before+Date.now())/2:0;return data;}finally{clearTimeout(timer);}}
function closeOverlay(){if(!overlay)return;overlay.close();overlay.remove();overlay=null;overlayStage='';}
function dismiss(){if(current?.state.draw_id){dismissed.push(current.state.draw_id);dismissed=dismissed.slice(-100);try{localStorage.setItem('sf-raffle-dismissed',JSON.stringify(dismissed));}catch{}}closeOverlay();}
function show(stage,title,detail,number=''){
 if(!overlay){overlay=node('dialog','','raffle-overlay');overlay.setAttribute('aria-labelledby','raffleTitle');const card=node('div','','raffle-card');card.append(node('div','SOLBITNARAE LUCKY DRAW','raffle-eyebrow'),node('h2',title),node('p',detail),node('strong',number,'raffle-number'));card.children[1].id='raffleTitle';card.children[3].setAttribute('aria-live','polite');overlay.append(card);overlay.addEventListener('cancel',e=>{e.preventDefault();if(overlayStage==='winner')dismiss();});document.body.append(overlay);overlay.showModal();}
 if(overlayStage!==stage){overlayStage=stage;overlay.querySelector('h2').textContent=title;overlay.querySelector('p').textContent=detail;overlay.querySelector('.raffle-number').textContent=number;overlay.classList.toggle('raffle-winner',stage==='winner');if(stage==='winner'){const button=node('button','확인했어요','q-button q-primary');button.onclick=dismiss;overlay.querySelector('.raffle-card').append(button);button.focus();}}
}
function tick(){
 if(admin){if(!current)return;const remaining=new Date(current.state.reveal_at).getTime()-(Date.now()+offset);const button=$('startRaffle');if(button)button.disabled=starting||busy||!current.candidates?.length||remaining>-10000;const label=$('rafflePhase');if(label)label.textContent=remaining>3000?'추첨 중입니다…':remaining>0?'추첨 중 · '+Math.ceil(remaining/1000):current.state.draw_id?'추첨 완료':'추첨 대기';return;}
 if(!current||!session()||document.hidden){closeOverlay();return;}
 const {state,eligible,won}=current;if(!state.draw_id||!eligible||dismissed.includes(state.draw_id)){closeOverlay();return;}
 const remaining=new Date(state.reveal_at).getTime()-(Date.now()+offset);
 if(remaining>3000)show('drawing','추첨 중입니다','행운의 주인공을 뽑고 있어요. 잠시만 기다려 주세요.','✦');
 else if(remaining>0){const count=String(Math.ceil(remaining/1000));show('count-'+count,'추첨 중입니다','곧 당첨자를 공개합니다.',count);}
 else if(won)show('winner','축하합니다! 🎉','회원님의 참여 코드가 당첨되었습니다. 확인번호 '+current.reference+' · 이 화면을 진행자에게 보여 주세요.','당첨');
 else if(current.serverTime>=new Date(state.reveal_at).getTime())closeOverlay();
 else show('checking','결과 확인 중입니다','당첨 여부를 확인하고 있어요.','✦');
}
function renderAdmin(){if(!current||!$('raffleCandidates'))return;const names=$('raffleCandidates');names.replaceChildren();for(const c of current.candidates)names.append(node('span',c.nickname+' · '+c.reference,'raffle-candidate'));$('raffleCount').textContent=current.candidates.length+'개 코드 접속 중';const list=$('raffleHistory');list.replaceChildren();for(const d of current.history){const row=node('p',new Date(d.created_at).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})+' · '+d.winner_name+' 님 당첨 · 확인번호 '+d.reference+' · 대상 '+d.count+'명');list.append(row);}if(!current.history.length)list.append(node('p','아직 완료된 추첨이 없습니다.'));tick();}
async function sync(forceHeartbeat=false){if(busy||document.hidden)return;const credential=admin?read('sf-admin-token',true):session();if(!credential){current=null;closeOverlay();return;}busy=true;const heartbeat=!admin&&(forceHeartbeat||Date.now()-lastHeartbeat>=10000);try{const data=await api(admin?'admin_status':heartbeat?'heartbeat':'status');if(credential!==(admin?read('sf-admin-token',true):session()))return;if(data.serverTime<lastServer)return;if(current&&data.state.revision<current.state.revision)return;lastServer=data.serverTime;offset=data.clockOffset;if(current?.state.draw_id!==data.state.draw_id)closeOverlay();current=data;if(heartbeat)lastHeartbeat=Date.now();lastError='';if(admin)renderAdmin();else tick();}catch(e){lastError=e.name==='AbortError'?'추첨 연결을 다시 확인하고 있습니다.':e.message;if(admin)message(lastError);}finally{busy=false;if(admin)tick();if(document.hidden&&!admin)leave(credential);}}
function leave(credential=session()){if(!credential||admin)return;fetch(ENDPOINT,{method:'POST',keepalive:true,headers:{'Content-Type':'application/json',apikey:KEY},body:JSON.stringify({action:'leave',session:credential,tabId})}).catch(()=>{});}
if(admin&&$('startRaffle')){
 $('refreshRaffle').onclick=()=>sync();$('startRaffle').onclick=async()=>{if(starting||!current)return;starting=true;tick();message('추첨을 시작하고 있습니다…');try{const data=await api('admin_start',{revision:current.state.revision});current=data;offset=data.clockOffset;lastServer=data.serverTime;message('참가자에게 추첨 안내를 전송했습니다. 카운트다운 후 당첨자가 표시됩니다.');renderAdmin();}catch(e){message(e.message);await sync();}finally{starting=false;tick();}};
}
window.addEventListener('sf-parent-session',()=>{current=null;lastHeartbeat=0;lastServer=0;closeOverlay();sync(true);});
window.addEventListener('storage',e=>{if(e.key==='sf-parent-session'){current=null;lastHeartbeat=0;lastServer=0;closeOverlay();sync(true);}if(e.key==='sf-raffle-dismissed'){try{dismissed=JSON.parse(e.newValue||'[]');}catch{}tick();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){closeOverlay();leave();}else sync(true);});window.addEventListener('pagehide',()=>leave());
try{if(window.supabase){const client=window.supabase.createClient(BASE,KEY,{auth:{storageKey:'sf-raffle-realtime',persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});client.channel('sf-raffle-updates').on('postgres_changes',{event:'UPDATE',schema:'public',table:'sf_raffle_state'},()=>sync()).subscribe(status=>{if(status==='SUBSCRIBED')sync(true);});}}catch{}
setInterval(()=>{const credential=admin?read('sf-admin-token',true):session();if(credential!==lastCredential){lastCredential=credential;current=null;lastServer=0;lastHeartbeat=0;closeOverlay();}sync();},2000);setInterval(tick,150);sync(true);
})();
