import {entries, labels, validateLesson} from './content.js';
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
  $('contents').replaceChildren();
  const add = (entry,parent) => {
    const a=link('',entry.id); a.dataset.entry=entry.id; a.title=labels[entry.status];
    if(entry.number) a.append(el('span',entry.number,'section-number'));
    a.append(el('span',entry.title)); parent.append(a);
    if(entry.children?.length) {const group=el('details'); group.append(el('summary','Subsections'));entry.children.forEach(child=>add(child,group));parent.append(group);}
  };
  manifest.chapters.forEach(chapter=>{
    const group=el('details'); group.dataset.chapter=chapter.id;
    group.append(el('summary',(chapter.number ? chapter.number+' · ' : '')+chapter.title));
    chapter.children.forEach(entry=>add(entry,group)); $('contents').append(group);
  });
}
function home() {
  view.innerHTML=`<section class="hero"><span class="pill">A COMPANION IN THE MAKING</span><h1>Make sense of discrete mathematics.</h1><p class="lead">A place to build understanding, one idea at a time. Follow the full textbook map, find your section, and return as clear, beginner-friendly explanations become available.</p><a class="action" href="#1.1">Explore Section 1.1 <span aria-hidden="true">→</span></a></section><div class="overview"><div><strong>13</strong><span>textbook chapters</span></div><div><strong>72</strong><span>numbered sections</span></div><div><strong>0</strong><span>lessons available</span></div></div><section class="guide"><span class="eyebrow">HOW TO USE THE COMPANION</span><h2>Your book. A clearer path through it.</h2><div class="steps"><div><span class="step-number">01 / FIND YOUR PLACE</span><h3>Browse the contents</h3><p>Expand a chapter in the sidebar. Section numbers and titles follow Rosen’s eighth edition. On a phone, open Contents.</p></div><div><span class="step-number">02 / CHECK THE STATUS</span><h3>See what’s available</h3><p>Each section states whether it is not yet available, in progress, or complete. The navigation is ready; lessons are still to come.</p></div><div><span class="step-number">03 / COME BACK TO IT</span><h3>Keep your place</h3><p>Bookmark or share a section’s URL. As explanations are published, they will appear at the same address.</p></div></div></section><div class="notice"><span class="eyebrow">CURRENT STATE</span><h3>The map is ready. The lessons are next.</h3><p>This first release provides the full chapter and section navigation. Unwritten sections show an empty state. Future lessons will introduce symbols, explain ideas in everyday language, and offer worked examples and short understanding checks.</p></div>`;
  const stats=view.querySelectorAll('.overview strong');stats[0].textContent=manifest.chapters.filter(c=>c.number).length;stats[1].textContent=all.filter(e=>/^\d+\.\d+$/.test(e.id)).length;stats[2].textContent=all.filter(e=>e.status!=='unavailable').length;
  if(all.some(entry=>entry.status!=='unavailable')) {
    view.querySelector('.steps > div:nth-child(2) p').textContent='Each section states whether it is not yet available, in progress, or complete. In-progress lessons are drafts that may be revised after review.';
    view.querySelector('.notice h3').textContent='Section 1.1 is ready for review.';
    view.querySelector('.notice p').textContent='Start with Propositional Logic: plain-English explanations, worked examples, truth tables, and short checks with expandable explanations. This first lesson is an in-progress review draft. Other sections will be added one at a time.';
  }
}
function renderBlock(block) {
  switch(block.type) {
    case 'heading': return el('h'+block.level,block.text);
    case 'paragraph': return el('p',block.text);
    case 'math': {const node=el('div',block.notation,'math');node.setAttribute('role','math');node.setAttribute('aria-label',block.description);return node;}
    case 'definition': case 'example': case 'callout': {const node=el('section',undefined,block.type);node.append(el('h3',block.title),...block.blocks.map(renderBlock));return node;}
    case 'check': {const node=el('section',undefined,'check');node.append(el('p',block.prompt));const details=el('details');details.append(el('summary','Show explanation'),...block.explanation.map(renderBlock));node.append(details);return node;}
    case 'table': {const wrap=el('div',undefined,'table-wrap'),table=el('table'),head=el('thead'),row=el('tr');wrap.tabIndex=0;wrap.setAttribute('role','region');wrap.setAttribute('aria-label','Table: '+block.headers.join(', '));for(const header of block.headers){const cell=el('th',header);cell.scope='col';row.append(cell);}head.append(row);const body=el('tbody');for(const cells of block.rows){const row=el('tr');cells.forEach(text=>row.append(el('td',text)));body.append(row);}table.append(head,body);wrap.append(table);return wrap;}
  }
}
function error(message,retry) {const box=el('div',undefined,'error');box.append(el('h2','Something went wrong'),el('p',message));const button=el('button','Try again','retry');button.addEventListener('click',retry);box.append(button);view.replaceChildren(box);}
async function fetchJSON(path,signal) {const response=await fetch(path,{signal});if(!response.ok) throw new Error('Could not load '+path);return response.json();}
async function route() {
  if(!manifest) return;
  const token=++request;controller?.abort();controller=new AbortController();
  let id;try{id=decodeURIComponent(location.hash.slice(1))||'home';}catch{id='unknown';}
  const entry=all.find(e=>e.id===id);
  drawer(false,false);
  document.querySelectorAll('[aria-current]').forEach(node=>node.removeAttribute('aria-current'));
  const selected=[...document.querySelectorAll('[data-entry]')].find(node=>node.dataset.entry===id);
  if(selected){selected.setAttribute('aria-current','page');let parent=selected.parentElement;while(parent&&parent!==sidebar){if(parent.tagName==='DETAILS')parent.open=true;parent=parent.parentElement;}if(!matchMedia('(max-width:800px)').matches)selected.scrollIntoView({block:'center'});}
  $('breadcrumbs').replaceChildren(link('Home','home'));
  view.setAttribute('aria-busy','false');
  if(id==='home') {document.querySelector('.home-link').setAttribute('aria-current','page');document.title=manifest.title;home();}
  else if(!entry) {document.title='Section not found · '+manifest.title;view.replaceChildren(el('h1','Section not found'),el('p','This address does not match a section in the companion.'),link('Return to the companion home','home','action'));}
  else {
    $('breadcrumbs').append(el('span','/'),el('span',(entry.chapter.number?'Chapter '+entry.chapter.number+': ':'')+entry.chapter.title),el('span','/'),el('span',entry.number||entry.title));
    document.title=(entry.number?entry.number+' · ':'')+entry.title+' · '+manifest.title;
    const header=el('header',undefined,'section-heading');header.append(el('span',entry.number?'SECTION '+entry.number:entry.chapter.title.toUpperCase(),'eyebrow'),el('h1',entry.title),el('span',labels[entry.status],'pill'));view.replaceChildren(header);
    if(entry.status==='unavailable'){const empty=el('section',undefined,'empty');empty.append(el('h2','Not yet available.'),el('p','This section has not been written yet. Its place in the textbook map is ready, and its explanation will appear here when published.'));view.append(empty);}
    else {
      const content=el('div','Loading this section…');view.append(content);view.setAttribute('aria-busy','true');
      try {const lesson=validateLesson(await fetchJSON(entry.path,controller.signal),entry);if(token!==request)return;content.replaceChildren();
        if(lesson.status==='in-progress')content.append(el('p','In progress · Review draft. Explanations may be revised and teaching units may be added.','notice'));
        const outline=el('nav',undefined,'lesson-outline');outline.setAttribute('aria-label','In this section');outline.append(el('h2','In this section'));const list=el('ol');outline.append(list);content.append(outline);
        for(const unit of lesson.units){
          const section=el('section',undefined,'lesson-unit');section.id='unit-'+unit.id;
          const heading=el('h2',unit.title);heading.tabIndex=-1;section.append(heading,el('span',labels[unit.status],'pill'),...unit.blocks.map(renderBlock));content.append(section);
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
  try {manifest=await fetchJSON('data/manifest.json');if(manifest.schemaVersion!==1||!Array.isArray(manifest.chapters))throw new Error('Invalid contents');all=entries(manifest);navigation();await route();}
  catch {view.setAttribute('aria-busy','false');$('contents').replaceChildren(el('p','Contents unavailable.'));error('The companion’s contents could not be loaded. Check your connection and retry.',init);}
}
window.addEventListener('hashchange',route);init();

