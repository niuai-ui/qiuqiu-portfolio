const state={works:[],category:'全部',author:'全部',query:'',sort:'launched',page:1,updateMonthIndex:0,galleryIndex:0,galleryImages:[]};
const $=selector=>document.querySelector(selector);
const esc=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
const dateText=value=>value?value.replaceAll('-','.'):'日期待补充';
const track=(eventName,work)=>{
  if(typeof window.gtag!=='function'||!work)return;
  window.gtag('event',eventName,{
    mod_id:work.id,
    mod_name:work.title,
    mod_english_name:work.englishTitle,
    mod_category:work.category,
  });
};

// 已知前置依赖外链：前置说明里出现对应短语（容错空格/中英写法）即渲染为可点击链接。
// 新增前置只需在此追加一条 {re, url}，详情页会自动为任何用到该前置的作品挂上链接。
const DEP_LINKS=[
  {re:/Lot51\s*核心库/gi, url:'https://lot51.cc/mods/core-library'},
  {re:/Lot51\s*Core\s*Library/gi, url:'https://lot51.cc/mods/core-library'},
  {re:/XML\s*注入器/gi, url:'https://scumbumbomods.com/xml-injector'},
  {re:/XML\s*Injector/gi, url:'https://scumbumbomods.com/xml-injector'},
];
function depHtml(text){
  const safe=esc(text||'');
  if(!safe)return '无需前置';
  const hits=[];
  for(const {re,url} of DEP_LINKS){
    re.lastIndex=0;let m;
    while((m=re.exec(safe))!==null){hits.push({start:m.index,end:m.index+m[0].length,text:m[0],url});if(m[0].length===0)re.lastIndex++;}
  }
  if(!hits.length)return safe;
  hits.sort((a,b)=>b.start-a.start);
  let html=safe;
  for(const h of hits){const link=`<a class="dep-link" href="${esc(h.url)}" target="_blank" rel="noopener">${h.text}</a>`;html=html.slice(0,h.start)+link+html.slice(h.end);}
  return html;
}

function filtered(){
  const q=state.query.toLowerCase();
  const list=state.works.filter(work=>(state.category==='全部'||work.category===state.category)&&(state.author==='全部'||work.author===state.author)&&(!q||[work.title,work.englishTitle,work.author,work.category].join(' ').toLowerCase().includes(q)));
  const dateField=state.sort==='mod-updated'?'modUpdated':state.sort==='translation-updated'?'translationUpdated':'launched';
  return list.sort((a,b)=>state.sort==='title'?a.title.localeCompare(b.title,'zh-CN'):b[dateField].localeCompare(a[dateField])||a.title.localeCompare(b.title,'zh-CN'));
}

function cardDate(work){
  return state.sort==='mod-updated'?work.modUpdated:state.sort==='translation-updated'?work.translationUpdated:work.launched;
}

const EVENT_TYPES={
  new:{label:'新模组上新',className:'event-new'},
  mod:{label:'模组本体更新',className:'event-mod'},
  translation:{label:'汉化文件更新',className:'event-translation'},
};

function updateEvents(){
  const byDate=new Map();
  const add=(date,type,work,detail)=>{
    if(!date)return;
    if(!byDate.has(date))byDate.set(date,[]);
    byDate.get(date).push({type,work,detail});
  };
  state.works.forEach(work=>{
    add(work.launched,'new',work,'新模组首次加入汉化档案馆');
    if(work.modUpdated!==work.launched)add(work.modUpdated,'mod',work,work.translationUpdated===work.modUpdated?'模组本体与汉化在同一天更新':'模组本体更新，汉化文件未变化');
    if(work.translationUpdated!==work.launched)add(work.translationUpdated,'translation',work,'汉化文件有更新');
  });
  return [...byDate.entries()].sort((a,b)=>b[0].localeCompare(a[0]));
}

function calendarMonths(groups){
  if(!groups.length)return [];
  const [maxYear,maxMonth]=groups[0][0].slice(0,7).split('-').map(Number);
  const [minYear,minMonth]=groups.at(-1)[0].slice(0,7).split('-').map(Number);
  const months=[];
  let year=maxYear,month=maxMonth;
  while(year>minYear||(year===minYear&&month>=minMonth)){
    months.push(`${year}-${String(month).padStart(2,'0')}`);
    month-=1;
    if(month===0){month=12;year-=1;}
  }
  return months;
}

function renderUpdates(){
  const board=$('#updates-board');
  if(!board)return;
  const groups=updateEvents();
  const months=calendarMonths(groups);
  state.updateMonthIndex=Math.min(state.updateMonthIndex,Math.max(0,months.length-1));
  const selected=months[state.updateMonthIndex];
  if(!selected){board.innerHTML='';return;}
  const [year,month]=selected.split('-').map(Number);
  const eventsByDate=new Map(groups);
  const firstWeekday=new Date(Date.UTC(year,month-1,1)).getUTCDay();
  const daysInMonth=new Date(Date.UTC(year,month,0)).getUTCDate();
  const cells=[];
  for(let index=0;index<42;index++){
    const day=index-firstWeekday+1;
    if(day<1||day>daysInMonth){cells.push('<div class="update-day is-empty" aria-hidden="true"></div>');continue;}
    const date=`${selected}-${String(day).padStart(2,'0')}`;
    const events=eventsByDate.get(date)||[];
    if(!events.length){cells.push(`<article class="update-day no-updates"><time datetime="${date}"><b>${day}</b></time></article>`);continue;}
    const counts=Object.keys(EVENT_TYPES).map(type=>({type,count:events.filter(event=>event.type===type).length})).filter(item=>item.count);
    const dayWorks=[...new Map(events.map(event=>[event.work.id,event.work])).values()].map(work=>{
      const types=events.filter(event=>event.work.id===work.id).map(event=>event.type);
      const chipType=types.includes('new')?'new':types.includes('mod')&&types.includes('translation')?'mixed':types[0];
      return {work,chipType};
    });
    cells.push(`<article class="update-day has-events"><time datetime="${date}"><b>${day}</b><span>${dayWorks.length} 项</span></time><div class="update-counts">${counts.map(item=>`<span title="${EVENT_TYPES[item.type].label}"><i class="event-dot ${EVENT_TYPES[item.type].className}"></i>${item.count}</span>`).join('')}</div><div class="update-preview">${dayWorks.map(item=>`<button type="button" class="update-work-link calendar-chip-${item.chipType}" data-update-work="${esc(item.work.id)}">${esc(item.work.title)}</button>`).join('')}<button type="button" class="calendar-more" data-calendar-more aria-haspopup="dialog" aria-controls="calendar-overflow" aria-expanded="false" hidden>更多</button></div></article>`);
  }
  board.innerHTML=cells.join('');
  $('#calendar-month').textContent=`${year}年${month}月`;
  $('#month-prev').disabled=state.updateMonthIndex>=months.length-1;
  $('#month-next').disabled=state.updateMonthIndex===0;
  requestAnimationFrame(fitCalendarPreviews);
}

function fitCalendarPreviews(){
  document.querySelectorAll('.update-preview').forEach(preview=>{
    const entries=[...preview.querySelectorAll('[data-update-work]')];
    const more=preview.querySelector('[data-calendar-more]');
    entries.forEach(entry=>entry.hidden=false);
    more.hidden=true;
    more.setAttribute('aria-expanded','false');
    const top=preview.getBoundingClientRect().top;
    const maxBottom=top+42;
    let hiddenCount=0;
    entries.forEach(entry=>{if(entry.getBoundingClientRect().bottom>maxBottom){entry.hidden=true;hiddenCount+=1;}});
    if(!hiddenCount)return;
    more.hidden=false;
    more.textContent=`更多 +${hiddenCount}`;
    while(more.getBoundingClientRect().bottom>maxBottom){
      const lastVisible=entries.findLast(entry=>!entry.hidden);
      if(!lastVisible)break;
      lastVisible.hidden=true;
      hiddenCount+=1;
      more.textContent=`更多 +${hiddenCount}`;
    }
  });
}

function openCalendarOverflow(day){
  const dialog=$('#calendar-overflow');
  const date=day.querySelector('time')?.dateTime||'';
  const entries=[...day.querySelectorAll('.update-preview [data-update-work]')];
  $('#calendar-overflow-date').textContent=dateText(date);
  $('#calendar-overflow-chips').innerHTML=entries.map(entry=>{
    const typeClass=[...entry.classList].find(className=>className.startsWith('calendar-chip-'))||'';
    return `<button type="button" class="update-work-link ${typeClass}" data-update-work="${esc(entry.dataset.updateWork)}">${esc(entry.textContent)}</button>`;
  }).join('');
  day.querySelector('[data-calendar-more]')?.setAttribute('aria-expanded','true');
  if(!dialog.open)dialog.showModal();
}

function closeCalendarOverflow(){
  const dialog=$('#calendar-overflow');
  if(dialog.open)dialog.close();
  document.querySelectorAll('[data-calendar-more]').forEach(button=>button.setAttribute('aria-expanded','false'));
}

function stableHash(value){
  let hash=2166136261;
  for(const char of value){hash^=char.codePointAt(0);hash=Math.imul(hash,16777619);}
  return hash>>>0;
}

function dailyPicks(works,count=10){
  if(!works.length)return [];
  const ordered=[...works].sort((a,b)=>stableHash(a.id)-stableHash(b.id)||a.id.localeCompare(b.id));
  const size=Math.min(count,ordered.length);
  const chinaDay=Math.floor((Date.now()+8*60*60*1000)/86400000);
  const start=(chinaDay*size)%ordered.length;
  return Array.from({length:size},(_,index)=>ordered[(start+index)%ordered.length]);
}

function dailyCardHtml(work,isClone=false){
  const tabIndex=isClone?'-1':'0';
  return `<article class="work-card daily-card" tabindex="${tabIndex}" data-id="${esc(work.id)}"><div class="cover"><img src="${esc(work.imageSmall||work.image)}" srcset="${esc(work.imageSmall||work.image)} 480w, ${esc(work.imageLarge||work.image)} 960w" sizes="(max-width:760px) 64vw, 220px" width="3" height="4" alt="${esc(work.title)}&#x5C01;&#x9762;" loading="lazy" decoding="async"><span class="badge">${esc(work.category)}</span></div><div class="card-meta"><span>${esc(work.author)}</span><time>${dateText(work.modUpdated)}</time></div><h3>${esc(work.title)}</h3><div class="english">${esc(work.englishTitle)}</div></article>`;
}

function renderDailyPicks(){
  const track=$('#daily-track');
  if(!track)return;
  const picks=dailyPicks(state.works);
  if(!picks.length){track.closest('.daily-section').hidden=true;return;}
  const cards=picks.map(work=>dailyCardHtml(work)).join('');
  const clones=picks.map(work=>dailyCardHtml(work,true)).join('');
  track.innerHTML=`<div class="daily-group">${cards}</div><div class="daily-group daily-clone" aria-hidden="true">${clones}</div>`;
}
function gridColumns(){
  const columns=Number.parseInt(getComputedStyle($('#work-grid')).getPropertyValue('--grid-columns'),10);
  return Number.isFinite(columns)&&columns>0?columns:6;
}

function render(){
  const allWorks=filtered();
  const pageSize=gridColumns()*6;
  const pageCount=Math.max(1,Math.ceil(allWorks.length/pageSize));
  state.page=Math.min(state.page,pageCount);
  const start=(state.page-1)*pageSize;
  const works=allWorks.slice(start,start+pageSize);
  $('#result-count').textContent=allWorks.length?`显示 ${start+1}–${start+works.length} / ${allWorks.length} 份作品`:`显示 0 / ${state.works.length} 份作品`;
  $('#empty').hidden=allWorks.length>0;
  $('#work-grid').innerHTML=works.map(work=>`<article class="work-card" tabindex="0" data-id="${esc(work.id)}"><div class="cover"><img src="${esc(work.imageSmall||work.image)}" srcset="${esc(work.imageSmall||work.image)} 480w, ${esc(work.imageLarge||work.image)} 960w" sizes="(max-width:760px) 50vw, (max-width:1100px) 33vw, 17vw" width="3" height="4" alt="${esc(work.title)}封面" loading="lazy" decoding="async"><span class="badge">${esc(work.category)}</span></div><div class="card-meta"><span>${esc(work.author)}</span><time>${dateText(cardDate(work))}</time></div><h3>${esc(work.title)}</h3><div class="english">${esc(work.englishTitle)}</div></article>`).join('');
  renderPagination(pageCount);
}

function renderPagination(pageCount){
  const pagination=$('#pagination');
  pagination.hidden=pageCount<=1;
  if(pageCount<=1){pagination.innerHTML='';return;}
  const pages=Array.from({length:pageCount},(_,index)=>index+1);
  pagination.innerHTML=`<button type="button" data-page="${state.page-1}" ${state.page===1?'disabled':''} aria-label="上一页">←</button>${pages.map(page=>`<button type="button" data-page="${page}" class="${page===state.page?'active':''}" ${page===state.page?'aria-current="page"':''}>${page}</button>`).join('')}<button type="button" data-page="${state.page+1}" ${state.page===pageCount?'disabled':''} aria-label="下一页">→</button>`;
}

function openDetails(id){
  const work=state.works.find(item=>item.id===id);if(!work)return;
  track('mod_open',work);
  state.currentWork=work;
  state.galleryImages=[work.imageLarge||work.image,...(work.gallery||[])];
  state.galleryIndex=0;
  const download=work.download?`<a class="download" href="${esc(work.download)}" target="_blank" rel="noopener">下载汉化文件（百度网盘） →</a>${work.downloadCode?`<button class="code" type="button" data-code="${esc(work.downloadCode)}" title="点击复制提取码">提取码 ${esc(work.downloadCode)}</button>`:''}`:'<span class="download disabled">汉化下载链接待补充</span>';
  const author=work.originalUrl?`<a class="author-link" href="${esc(work.originalUrl)}" target="_blank" rel="noopener">${esc(work.author)} →</a>`:esc(work.author);
  const modLink=work.modUrl?`<a class="original" href="${esc(work.modUrl)}" target="_blank" rel="noopener">查看模组本体 →</a>`:'<span class="original disabled">模组本体链接待补充</span>';
  const galleryControls=state.galleryImages.length>1?'<button class="gallery-nav gallery-prev" type="button" data-gallery-step="-1" aria-label="上一张介绍图">←</button><button class="gallery-nav gallery-next" type="button" data-gallery-step="1" aria-label="下一张介绍图">→</button>':'';
  $('#dialog-content').innerHTML=`<div class="detail-layout"><div class="detail-image detail-gallery"><img id="gallery-image" src="${esc(state.galleryImages[0])}" decoding="async" alt="${esc(work.title)}封面"><span class="gallery-count">1 / ${state.galleryImages.length}</span>${galleryControls}</div><div class="detail-copy"><p class="eyebrow">${esc(work.category)} · ${dateText(work.launched)}</p><h2>${esc(work.title)}</h2><div class="english">${esc(work.englishTitle)}</div><div class="facts"><div><small>原作者</small><b>${author}</b></div><div><small>汉化支持</small><b>${esc(work.localization||'繁简汉化')}</b></div><div><small>前置说明</small><b>${depHtml(work.dependency)}</b></div><div><small>放置说明</small><b>${esc(work.placement||'无需放第一层')}</b></div><div><small>上新日期</small><b>${dateText(work.launched)}</b></div><div><small>模组更新日期</small><b>${dateText(work.modUpdated)}</b></div><div><small>汉化更新日期</small><b>${dateText(work.translationUpdated)}</b></div></div><div class="actions" aria-label="相关链接"><div class="action-entry action-entry-original"><div class="action-label"><strong>模组本体</strong></div>${modLink}</div><div class="action-entry action-entry-download"><div class="action-label"><strong>汉化文件</strong><span>百度网盘下载</span></div><div class="action-controls">${download}</div></div></div></div></div>`;
  if(!work.download){$('.actions .download').innerHTML='&#x5C0F;&#x7EA2;&#x4E66;&#x9996;&#x53D1;&#x4E2D;&#xFF0C;&#x4E0B;&#x8F7D;&#x94FE;&#x63A5;&#x5F85;&#x8865;&#x5145;';}
  $('#details').showModal();
}

function moveGallery(step){
  if(state.galleryImages.length<2)return;
  state.galleryIndex=(state.galleryIndex+step+state.galleryImages.length)%state.galleryImages.length;
  const image=$('#gallery-image');
  image.src=state.galleryImages[state.galleryIndex];
  image.alt=`${state.currentWork.title}${state.galleryIndex===0?'封面':`介绍图 ${state.galleryIndex}`}`;
  $('.gallery-count').textContent=`${state.galleryIndex+1} / ${state.galleryImages.length}`;
  const next=state.galleryImages[(state.galleryIndex+1)%state.galleryImages.length];
  new Image().src=next;
}

function setupFilters(){
  renderDailyPicks();
  renderUpdates();
  const categories=['人物特征','用地特征','职业','覆盖替换','游戏玩法','其他'];
  $('#category-buttons').innerHTML=categories.map(item=>`<button class="filter" data-category="${esc(item)}">${esc(item)}</button>`).join('');
  const authors=[...new Set(state.works.map(work=>work.author))].sort();
  $('#author-filter').innerHTML='<option value="全部">全部作者</option>'+authors.map(item=>`<option value="${esc(item)}">${esc(item)}</option>`).join('');
  $('#author-list').innerHTML=authors.map(author=>{const count=state.works.filter(work=>work.author===author).length;return `<button class="author-row" type="button" data-author="${esc(author)}"><b>${esc(author)}</b><span>${count} 份作品</span><i aria-hidden="true">→</i></button>`}).join('');
}

document.addEventListener('click',event=>{
  const pageButton=event.target.closest('[data-page]');if(pageButton&&!pageButton.disabled){state.page=Number(pageButton.dataset.page);render();$('#works').scrollIntoView({behavior:'smooth',block:'start'});return;}
  const updateWork=event.target.closest('[data-update-work]');if(updateWork){event.stopPropagation();closeCalendarOverflow();openDetails(updateWork.dataset.updateWork);return;}
  const calendarMore=event.target.closest('[data-calendar-more]');if(calendarMore){event.stopPropagation();openCalendarOverflow(calendarMore.closest('.update-day'));return;}
  const download=event.target.closest('.download[href]');if(download){track('download_click',state.currentWork);}
  const filter=event.target.closest('[data-category]');if(filter){state.category=filter.dataset.category;state.page=1;document.querySelectorAll('[data-category]').forEach(button=>button.classList.toggle('active',button===filter));render();}
  const card=event.target.closest('.work-card');if(card)openDetails(card.dataset.id);
  const author=event.target.closest('[data-author]');if(author){state.author=author.dataset.author;state.page=1;$('#author-filter').value=state.author;location.hash='works';render();}
  const code=event.target.closest('[data-code]');if(code){const value=code.dataset.code;navigator.clipboard?.writeText(value).then(()=>{const label=code.textContent;code.textContent='已复制 '+value;setTimeout(()=>{code.textContent=label;},1600);}).catch(()=>{});}
  const gallery=event.target.closest('[data-gallery-step]');if(gallery){event.stopPropagation();moveGallery(Number(gallery.dataset.galleryStep));}
});
document.addEventListener('keydown',event=>{if($('#details').open&&(event.key==='ArrowLeft'||event.key==='ArrowRight')){event.preventDefault();moveGallery(event.key==='ArrowLeft'?-1:1);return;}const card=event.target.closest?.('.work-card');if(card&&(event.key==='Enter'||event.key===' ')){event.preventDefault();openDetails(card.dataset.id);}});
$('#search').addEventListener('input',event=>{state.query=event.target.value.trim();state.page=1;render();});
$('#author-filter').addEventListener('change',event=>{state.author=event.target.value;state.page=1;render();});
$('#sort').addEventListener('change',event=>{state.sort=event.target.value;state.page=1;render();});
$('#month-prev').addEventListener('click',()=>{state.updateMonthIndex+=1;renderUpdates();});
$('#month-next').addEventListener('click',()=>{state.updateMonthIndex-=1;renderUpdates();});
$('.close').addEventListener('click',()=>$('#details').close());
$('#details').addEventListener('click',event=>{if(event.target===$('#details'))$('#details').close();});
$('#calendar-overflow-close').addEventListener('click',closeCalendarOverflow);
$('#calendar-overflow').addEventListener('click',event=>{if(event.target===$('#calendar-overflow'))closeCalendarOverflow();});

fetch('data.json').then(response=>{if(!response.ok)throw new Error('读取失败');return response.json();}).then(works=>{state.works=works;$('#hero-count').textContent=works.length;setupFilters();render();}).catch(()=>{$('#result-count').textContent='作品数据读取失败，请稍后再试';$('#empty').hidden=false;});
$('#year').textContent=new Date().getFullYear();
let lastGridColumns=gridColumns();
window.addEventListener('resize',()=>{const columns=gridColumns();if(columns!==lastGridColumns){lastGridColumns=columns;state.page=1;render();}});
