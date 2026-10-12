import {entries, validateLesson} from './content.js';
const $ = id => document.getElementById(id);
const view = $('view'), sidebar = $('sidebar'), menu = $('menu');
let manifest, all = [], request = 0, controller;
const el = (tag, text, className) => {const node=document.createElement(tag); if(text !== undefined) node.textContent=text; if(className) node.className=className; return node;};
function link(text, id, className) {const a=el('a',text,className); a.href='#'+id; return a;}
function drawer(open, restore=true) {
  document.body.classList.toggle('drawer-open',open); menu.setAttribute('aria-expanded',String(open)); $('backdrop').hidden=!open;
  if(matchMedia('(max-width:800px)').matches) sidebar.inert=!open; else sidebar.inert=false;
  if(open) $('close-menu').focus(); else if(restore) menu.focus();
}
menu.addEventListener('click',()=>drawer(menu.getAttribute('aria-expanded') !== 'true'));
$('close-menu').addEventListener('click',()=>drawer(false)); $('backdrop').addEventListener('click',()=>drawer(false));
document.addEventListener('keydown',event=>{
  if(!document.body.classList.contains('drawer-open')) return;
  if(event.key==='Escape') {event.preventDefault();drawer(false);}
  if(event.key==='Tab') {
    const focusable=[...sidebar.querySelectorAll('button,a,summary')].filter(node=>node.checkVisibility());
    const first=focusable[0],last=focusable.at(-1);
    if(event.shiftKey && document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first.focus();}
  }
});
matchMedia('(max-width:800px)').addEventListener('change',()=>drawer(false,false)); drawer(false,false);
function navigation() {
  const expanded=new Set([...$('contents').querySelectorAll('details[open]')].map(group=>group.dataset.chapter));
  $('contents').replaceChildren();
  const add = (entry,parent) => {
    const a=link('',entry.id); a.dataset.entry=entry.id;
    if(entry.number) a.append(el('span',entry.number,'section-number'));
    a.append(el('span',entry.title)); parent.append(a);
    if(entry.children?.length) {const group=el('details'); group.append(el('summary','Subsections'));entry.children.forEach(child=>add(child,group));parent.append(group);}
  };
  manifest.chapters.forEach(chapter=>{
    const group=el('details'); group.dataset.chapter=chapter.id;
    group.open=expanded.has(chapter.id);
    group.append(el('summary',(chapter.number ? chapter.number+' · ' : '')+chapter.title));
    chapter.children.forEach(entry=>add(entry,group)); $('contents').append(group);
  });
}
function home() {
  view.innerHTML=`<section class="hero"><h1>Make sense of discrete mathematics.</h1><p class="lead">Build understanding, one idea at a time. Follow Rosen’s textbook, find your section, and work through clear, beginner-friendly explanations.</p><a class="action" href="#1.1">Explore Section 1.1 <span aria-hidden="true">→</span></a><p class="quiz-link">Ready to practice? Visit the <a href="https://babuptx.github.io/cs-2305-dm/" target="_blank" rel="noopener noreferrer"><strong>Discrete Mathematics Quiz Site</strong></a> to practice the skills you learn here. Opens in a new tab.</p></section><div class="overview"><div><strong>13</strong><span>textbook chapters</span></div><div><strong>72</strong><span>numbered sections</span></div><div><strong>0</strong><span>study lessons</span></div></div><section class="guide"><span class="eyebrow">HOW TO USE THE COMPANION</span><h2>Your book. A clearer path through it.</h2><div class="steps"><div><span class="step-number">01 / FIND YOUR PLACE</span><h3>Browse the contents</h3><p>Expand a chapter in the sidebar. Section numbers and titles follow Rosen’s eighth edition. On a phone, open Contents.</p></div><div><span class="step-number">02 / BUILD UNDERSTANDING</span><h3>Work through an idea</h3><p>Read the explanation, follow a worked example, and try each check before opening its answer.</p></div><div><span class="step-number">03 / COME BACK TO IT</span><h3>Keep your place</h3><p>Bookmark or share a section’s URL so you can return to the same place as you study.</p></div></div></section><div class="notice"><h3>Continue your study</h3><p>Choose a section from the contents to explore the textbook.</p></div>`;
  const stats=view.querySelectorAll('.overview strong');stats[0].textContent=manifest.chapters.filter(c=>c.number).length;stats[1].textContent=all.filter(e=>/^\d+\.\d+$/.test(e.id)).length;stats[2].textContent=all.filter(e=>e.status!=='unavailable').length;
  const available=all.filter(entry=>entry.status!=='unavailable');
  if(available.length) {
    const notice=view.querySelector('.notice p');notice.textContent='Choose a lesson: ';
    available.forEach((entry,index)=>{if(index)notice.append(document.createTextNode(' · '));notice.append(link((entry.number?entry.number+' — ':'')+entry.title,entry.id));});
  }
}
function renderBlock(block) {
  switch(block.type) {
    case 'heading': return el('h'+block.level,block.text);
    case 'paragraph': return el('p',block.text);
    case 'math': {const node=el('div',block.notation,'math');node.setAttribute('role','math');node.setAttribute('aria-label',block.description);return node;}
    case 'diagram': {const figure=el('figure',undefined,'lesson-diagram'),frame=el('div',undefined,'diagram-frame'),img=el('img'),caption=el('figcaption',block.title);img.src=block.src;img.alt=block.description;img.loading='lazy';frame.tabIndex=0;frame.setAttribute('role','region');frame.setAttribute('aria-label',block.title);frame.append(img);caption.append(el('span',' Swipe or scroll horizontally to see the full diagram.','diagram-hint'));figure.append(frame,caption);return figure;}
    case 'definition': case 'example': case 'callout': {const node=el('section',undefined,block.type);node.append(el('h3',block.title),...block.blocks.map(renderBlock));return node;}
    case 'check': {const node=el('section',undefined,'check');node.append(el('p',block.prompt));const details=el('details');details.append(el('summary','Show explanation'),...block.explanation.map(renderBlock));node.append(details);return node;}
    case 'table': {const wrap=el('div',undefined,'table-wrap'),table=el('table'),head=el('thead'),row=el('tr');wrap.tabIndex=0;wrap.setAttribute('role','region');wrap.setAttribute('aria-label','Table: '+block.headers.join(', '));for(const header of block.headers){const cell=el('th',header);cell.scope='col';row.append(cell);}head.append(row);const body=el('tbody');for(const cells of block.rows){const row=el('tr');cells.forEach(text=>row.append(el('td',text)));body.append(row);}table.append(head,body);wrap.append(table);return wrap;}
  }
}
function error(message,retry) {const box=el('div',undefined,'error');box.append(el('h2','Something went wrong'),el('p',message));const button=el('button','Try again','retry');button.addEventListener('click',retry);box.append(button);view.replaceChildren(box);}
async function fetchJSON(path,signal) {const response=await fetch(path,{signal,cache:'no-cache'});if(!response.ok) throw new Error('Could not load '+path);return response.json();}
async function route(refresh=true) {
  if(!manifest) return;
  const token=++request;controller?.abort();controller=new AbortController();
  if(refresh) {
    view.setAttribute('aria-busy','true');
    try {
      const latest=await fetchJSON('data/manifest.json',controller.signal);
      if(token!==request)return;
      if(latest.schemaVersion!==1||!Array.isArray(latest.chapters))throw new Error('Invalid contents');
      if(JSON.stringify(latest)!==JSON.stringify(manifest)){manifest=latest;all=entries(manifest);navigation();}
    } catch(e) {
      if(e.name==='AbortError'||token!==request)return;
      view.setAttribute('aria-busy','false');error('The latest contents could not be loaded. Check your connection and retry.',()=>route());return;
    }
  }
  let id;try{id=decodeURIComponent(location.hash.slice(1))||'home';}catch{id='unknown';}
  const entry=all.find(e=>e.id===id);
  drawer(false,false);
  document.querySelectorAll('[aria-current]').forEach(node=>node.removeAttribute('aria-current'));
  const selected=[...document.querySelectorAll('[data-entry]')].find(node=>node.dataset.entry===id);
  if(selected){selected.setAttribute('aria-current','page');let parent=selected.parentElement;while(parent&&parent!==sidebar){if(parent.tagName==='DETAILS')parent.open=true;parent=parent.parentElement;}if(!matchMedia('(max-width:800px)').matches)selected.scrollIntoView({block:'center'});}
  $('breadcrumbs').replaceChildren(link('Home','home'));
  view.setAttribute('aria-busy','false');
  if(id==='home') {document.querySelector('.brand').setAttribute('aria-current','page');document.title=manifest.title;home();}
  else if(!entry) {document.title='Section not found · '+manifest.title;view.replaceChildren(el('h1','Section not found'),el('p','This address does not match a section in the companion.'),link('Return to the companion home','home','action'));}
  else {
    $('breadcrumbs').append(el('span','/'),el('span',(entry.chapter.number?'Chapter '+entry.chapter.number+': ':'')+entry.chapter.title),el('span','/'),el('span',entry.number||entry.title));
    document.title=(entry.number?entry.number+' · ':'')+entry.title+' · '+manifest.title;
    const header=el('header',undefined,'section-heading');header.append(el('span',entry.number?'SECTION '+entry.number:entry.chapter.title.toUpperCase(),'eyebrow'),el('h1',entry.title));view.replaceChildren(header);
    if(entry.status==='unavailable'){const empty=el('section',undefined,'empty');empty.append(el('h2','Not yet available.'),el('p','This section has not been written yet. Its place in the textbook map is ready, and its explanation will appear here when published.'));const refresh=el('button','Check for updates','retry');refresh.addEventListener('click',()=>route());empty.append(refresh);view.append(empty);}
    else {
      const content=el('div','Loading this section…');view.append(content);view.setAttribute('aria-busy','true');
      try {const lesson=validateLesson(await fetchJSON(entry.path,controller.signal),entry);if(token!==request)return;content.replaceChildren();
        const outline=el('nav',undefined,'lesson-outline');outline.setAttribute('aria-label','In this section');outline.append(el('h2','In this section'));const list=el('ol');outline.append(list);content.append(outline);
        for(const unit of lesson.units){
          const section=el('section',undefined,'lesson-unit');section.id='unit-'+unit.id;
          const heading=el('h2',unit.title);heading.tabIndex=-1;section.append(heading,...unit.blocks.map(renderBlock));content.append(section);
          const item=el('li'),button=el('button',unit.title.replace(/^\d+\.\s*/,''));button.type='button';button.addEventListener('click',()=>{heading.focus({preventScroll:true});heading.scrollIntoView({block:'start'});});item.append(button);list.append(item);
        }
        content.append(el('p',lesson.references.join(' · '),'lesson-references'));
      }catch(e){if(e.name==='AbortError'||token!==request)return;content.replaceChildren(el('p','This lesson could not be loaded. Please try again.','error'));const retry=el('button','Try again','retry');retry.addEventListener('click',route);content.append(retry);}finally{if(token===request)view.setAttribute('aria-busy','false');}
    }
    const index=all.findIndex(e=>e.id===id),nav=el('nav',undefined,'section-nav');nav.setAttribute('aria-label','Adjacent sections');if(index>0)nav.append(link('← '+(all[index-1].number||'')+' '+all[index-1].title,all[index-1].id));if(index<all.length-1)nav.append(link((all[index+1].number||'')+' '+all[index+1].title+' →',all[index+1].id));view.append(nav);
  }
  $('reading').focus({preventScroll:true});window.scrollTo(0,0);
}
async function init() {
  try {manifest=await fetchJSON('data/manifest.json');if(manifest.schemaVersion!==1||!Array.isArray(manifest.chapters))throw new Error('Invalid contents');all=entries(manifest);navigation();await route(false);}
  catch {view.setAttribute('aria-busy','false');$('contents').replaceChildren(el('p','Contents unavailable.'));error('The companion’s contents could not be loaded. Check your connection and retry.',init);}
}
window.addEventListener('hashchange',()=>route());init();

