const state={works:[],category:'全部',author:'全部',query:'',sort:'newest',page:1};
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
  return list.sort((a,b)=>state.sort==='oldest'?a.date.localeCompare(b.date):state.sort==='title'?a.title.localeCompare(b.title,'zh-CN'):b.date.localeCompare(a.date));
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
  return `<article class="work-card daily-card" tabindex="${tabIndex}" data-id="${esc(work.id)}"><div class="cover"><img src="${esc(work.imageSmall||work.image)}" srcset="${esc(work.imageSmall||work.image)} 480w, ${esc(work.imageLarge||work.image)} 960w" sizes="(max-width:760px) 64vw, 220px" width="3" height="4" alt="${esc(work.title)}&#x5C01;&#x9762;" loading="lazy" decoding="async"><span class="badge">${esc(work.category)}</span></div><div class="card-meta"><span>${esc(work.author)}</span><time>${dateText(work.date)}</time></div><h3>${esc(work.title)}</h3><div class="english">${esc(work.englishTitle)}</div></article>`;
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
  $('#work-grid').innerHTML=works.map(work=>`<article class="work-card" tabindex="0" data-id="${esc(work.id)}"><div class="cover"><img src="${esc(work.imageSmall||work.image)}" srcset="${esc(work.imageSmall||work.image)} 480w, ${esc(work.imageLarge||work.image)} 960w" sizes="(max-width:760px) 50vw, (max-width:1100px) 33vw, 17vw" width="3" height="4" alt="${esc(work.title)}封面" loading="lazy" decoding="async"><span class="badge">${esc(work.category)}</span></div><div class="card-meta"><span>${esc(work.author)}</span><time>${dateText(work.date)}</time></div><h3>${esc(work.title)}</h3><div class="english">${esc(work.englishTitle)}</div></article>`).join('');
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
  const download=work.download?`<a class="download" href="${esc(work.download)}" target="_blank" rel="noopener">前往百度网盘 →</a>${work.downloadCode?`<button class="code" type="button" data-code="${esc(work.downloadCode)}" title="点击复制提取码">提取码 ${esc(work.downloadCode)}</button>`:''}`:'<span class="download disabled">下载链接待补充</span>';
  const author=work.originalUrl?`<a class="author-link" href="${esc(work.originalUrl)}" target="_blank" rel="noopener">${esc(work.author)} →</a>`:esc(work.author);
  $('#dialog-content').innerHTML=`<div class="detail-layout"><div class="detail-image"><img src="${esc(work.imageLarge||work.image)}" width="3" height="4" decoding="async" alt="${esc(work.title)}完整封面"></div><div class="detail-copy"><p class="eyebrow">${esc(work.category)} · ${dateText(work.date)}</p><h2>${esc(work.title)}</h2><div class="english">${esc(work.englishTitle)}</div><div class="facts"><div><small>原作者</small><b>${author}</b></div><div><small>汉化支持</small><b>${esc(work.localization||'繁简汉化')}</b></div><div><small>前置说明</small><b>${depHtml(work.dependency)}</b></div><div><small>放置说明</small><b>${esc(work.placement||'无需放第一层')}</b></div><div><small>汉化发布日期</small><b>${dateText(work.date)}</b></div><div><small>汉化更新日期</small><b>${dateText(work.updated)}</b></div></div><div class="actions">${download}</div></div></div>`;
  if(!work.download){$('.actions .download').innerHTML='&#x5C0F;&#x7EA2;&#x4E66;&#x9996;&#x53D1;&#x4E2D;&#xFF0C;&#x4E0B;&#x8F7D;&#x94FE;&#x63A5;&#x5F85;&#x8865;&#x5145;';}
  $('#details').showModal();
}

function setupFilters(){
  renderDailyPicks();
  const categories=['人物特征','用地特征','职业','覆盖替换','游戏玩法','其他'];
  $('#category-buttons').innerHTML=categories.map(item=>`<button class="filter" data-category="${esc(item)}">${esc(item)}</button>`).join('');
  const authors=[...new Set(state.works.map(work=>work.author))].sort();
  $('#author-filter').innerHTML='<option value="全部">全部作者</option>'+authors.map(item=>`<option value="${esc(item)}">${esc(item)}</option>`).join('');
  $('#author-list').innerHTML=authors.map(author=>{const count=state.works.filter(work=>work.author===author).length;return `<button class="author-row" type="button" data-author="${esc(author)}"><b>${esc(author)}</b><span>${count} 份作品</span><i aria-hidden="true">→</i></button>`}).join('');
}

document.addEventListener('click',event=>{
  const pageButton=event.target.closest('[data-page]');if(pageButton&&!pageButton.disabled){state.page=Number(pageButton.dataset.page);render();$('#works').scrollIntoView({behavior:'smooth',block:'start'});return;}
  const download=event.target.closest('.download[href]');if(download){track('download_click',state.currentWork);}
  const filter=event.target.closest('[data-category]');if(filter){state.category=filter.dataset.category;state.page=1;document.querySelectorAll('[data-category]').forEach(button=>button.classList.toggle('active',button===filter));render();}
  const card=event.target.closest('.work-card');if(card)openDetails(card.dataset.id);
  const author=event.target.closest('[data-author]');if(author){state.author=author.dataset.author;state.page=1;$('#author-filter').value=state.author;location.hash='works';render();}
  const code=event.target.closest('[data-code]');if(code){const value=code.dataset.code;navigator.clipboard?.writeText(value).then(()=>{const label=code.textContent;code.textContent='已复制 '+value;setTimeout(()=>{code.textContent=label;},1600);}).catch(()=>{});}
});
document.addEventListener('keydown',event=>{const card=event.target.closest?.('.work-card');if(card&&(event.key==='Enter'||event.key===' ')){event.preventDefault();openDetails(card.dataset.id);}});
$('#search').addEventListener('input',event=>{state.query=event.target.value.trim();state.page=1;render();});
$('#author-filter').addEventListener('change',event=>{state.author=event.target.value;state.page=1;render();});
$('#sort').addEventListener('change',event=>{state.sort=event.target.value;state.page=1;render();});
$('.close').addEventListener('click',()=>$('#details').close());
$('#details').addEventListener('click',event=>{if(event.target===$('#details'))$('#details').close();});

fetch('data.json').then(response=>{if(!response.ok)throw new Error('读取失败');return response.json();}).then(works=>{state.works=works;$('#hero-count').textContent=works.length;setupFilters();render();}).catch(()=>{$('#result-count').textContent='作品数据读取失败，请稍后再试';$('#empty').hidden=false;});
$('#year').textContent=new Date().getFullYear();
let lastGridColumns=gridColumns();
window.addEventListener('resize',()=>{const columns=gridColumns();if(columns!==lastGridColumns){lastGridColumns=columns;state.page=1;render();}});
