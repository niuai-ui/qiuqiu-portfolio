const state={works:[],category:'全部',author:'全部',query:'',sort:'newest'};
const $=selector=>document.querySelector(selector);
const esc=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
const dateText=value=>value?value.replaceAll('-','.'):'日期待补充';

// 已知前置依赖的外链：前置说明里出现对应短语时，渲染成可点击链接。
const DEP_LINKS=[['Lot51 核心库','https://lot51.cc/mods/core-library'],['Lot51','https://lot51.cc/mods/core-library']];
function depHtml(text){
  const safe=esc(text||'');
  if(!safe)return '无需前置';
  for(const [phrase,url] of DEP_LINKS){
    if(safe.includes(phrase)){
      return safe.replaceAll(phrase,`<a class="dep-link" href="${esc(url)}" target="_blank" rel="noopener">${phrase}</a>`);
    }
  }
  return safe;
}

function filtered(){
  const q=state.query.toLowerCase();
  const list=state.works.filter(work=>(state.category==='全部'||work.category===state.category)&&(state.author==='全部'||work.author===state.author)&&(!q||[work.title,work.englishTitle,work.author,work.category].join(' ').toLowerCase().includes(q)));
  return list.sort((a,b)=>state.sort==='oldest'?a.date.localeCompare(b.date):state.sort==='title'?a.title.localeCompare(b.title,'zh-CN'):b.date.localeCompare(a.date));
}

function render(){
  const works=filtered();
  $('#result-count').textContent=`显示 ${works.length} / ${state.works.length} 份作品`;
  $('#empty').hidden=works.length>0;
  $('#work-grid').innerHTML=works.map(work=>`<article class="work-card" tabindex="0" data-id="${esc(work.id)}"><div class="cover"><img src="${esc(work.imageSmall||work.image)}" srcset="${esc(work.imageSmall||work.image)} 480w, ${esc(work.imageLarge||work.image)} 960w" sizes="(max-width:760px) 50vw, (max-width:1100px) 33vw, 25vw" width="3" height="4" alt="${esc(work.title)}封面" loading="lazy" decoding="async"><span class="badge">${esc(work.category)}</span></div><div class="card-meta"><span>${esc(work.author)}</span><time>${dateText(work.date)}</time></div><h3>${esc(work.title)}</h3><div class="english">${esc(work.englishTitle)}</div></article>`).join('');
}

function openDetails(id){
  const work=state.works.find(item=>item.id===id);if(!work)return;
  const download=work.download?`<a class="download" href="${esc(work.download)}" target="_blank" rel="noopener">前往百度网盘 →</a>${work.downloadCode?`<button class="code" type="button" data-code="${esc(work.downloadCode)}" title="点击复制提取码">提取码 ${esc(work.downloadCode)}</button>`:''}`:'<span class="download disabled">下载链接待补充</span>';
  const author=work.originalUrl?`<a class="author-link" href="${esc(work.originalUrl)}" target="_blank" rel="noopener">${esc(work.author)} →</a>`:esc(work.author);
  $('#dialog-content').innerHTML=`<div class="detail-layout"><div class="detail-image"><img src="${esc(work.imageLarge||work.image)}" width="3" height="4" decoding="async" alt="${esc(work.title)}完整封面"></div><div class="detail-copy"><p class="eyebrow">${esc(work.category)} · ${dateText(work.date)}</p><h2>${esc(work.title)}</h2><div class="english">${esc(work.englishTitle)}</div><div class="facts"><div><small>原作者</small><b>${author}</b></div><div><small>汉化支持</small><b>${esc(work.localization||'繁简汉化')}</b></div><div><small>前置说明</small><b>${depHtml(work.dependency)}</b></div><div><small>放置说明</small><b>${esc(work.placement||'无需放第一层')}</b></div><div><small>汉化发布日期</small><b>${dateText(work.date)}</b></div><div><small>汉化更新日期</small><b>${dateText(work.updated)}</b></div></div><div class="actions">${download}</div></div></div>`;
  $('#details').showModal();
}

function setupFilters(){
  const categories=['人物特征','用地特征','职业','覆盖替换','游戏玩法','其他'];
  $('#category-buttons').innerHTML=categories.map(item=>`<button class="filter" data-category="${esc(item)}">${esc(item)}</button>`).join('');
  const authors=[...new Set(state.works.map(work=>work.author))].sort();
  $('#author-filter').innerHTML='<option value="全部">全部作者</option>'+authors.map(item=>`<option value="${esc(item)}">${esc(item)}</option>`).join('');
  $('#author-list').innerHTML=authors.map(author=>{const count=state.works.filter(work=>work.author===author).length;return `<div class="author-row" data-author="${esc(author)}"><b>${esc(author)}</b><span>${count} 份作品</span><i>→</i></div>`}).join('');
}

document.addEventListener('click',event=>{
  const filter=event.target.closest('[data-category]');if(filter){state.category=filter.dataset.category;document.querySelectorAll('[data-category]').forEach(button=>button.classList.toggle('active',button===filter));render();}
  const card=event.target.closest('.work-card');if(card)openDetails(card.dataset.id);
  const author=event.target.closest('[data-author]');if(author){state.author=author.dataset.author;$('#author-filter').value=state.author;location.hash='works';render();}
  const code=event.target.closest('[data-code]');if(code){const value=code.dataset.code;navigator.clipboard?.writeText(value).then(()=>{const label=code.textContent;code.textContent='已复制 '+value;setTimeout(()=>{code.textContent=label;},1600);}).catch(()=>{});}
});
document.addEventListener('keydown',event=>{const card=event.target.closest?.('.work-card');if(card&&(event.key==='Enter'||event.key===' ')){event.preventDefault();openDetails(card.dataset.id);}});
$('#search').addEventListener('input',event=>{state.query=event.target.value.trim();render();});
$('#author-filter').addEventListener('change',event=>{state.author=event.target.value;render();});
$('#sort').addEventListener('change',event=>{state.sort=event.target.value;render();});
$('.close').addEventListener('click',()=>$('#details').close());
$('#details').addEventListener('click',event=>{if(event.target===$('#details'))$('#details').close();});

fetch('data.json').then(response=>{if(!response.ok)throw new Error('读取失败');return response.json();}).then(works=>{state.works=works;$('#hero-count').textContent=works.length;setupFilters();render();}).catch(()=>{$('#result-count').textContent='作品数据读取失败，请稍后再试';$('#empty').hidden=false;});
$('#year').textContent=new Date().getFullYear();
