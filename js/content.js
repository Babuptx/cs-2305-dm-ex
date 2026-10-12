export const statuses = ['unavailable', 'in-progress', 'complete'];
export function entries(manifest) {
  return manifest.chapters.flatMap(chapter => {
    const walk = children => children.flatMap(entry => [{...entry, chapter}, ...walk(entry.children || [])]);
    return walk(chapter.children);
  });
}
export function validateLesson(lesson, entry) {
  if (!lesson || lesson.schemaVersion !== 1 || lesson.id !== entry.id || lesson.title !== entry.title || lesson.status !== entry.status || !Array.isArray(lesson.units) || !lesson.units.length) throw new Error('Lesson metadata does not match the contents.');
  const text = value => typeof value === 'string' && value.trim().length > 0;
  function block(b) {
    if (!b || !text(b.type)) throw new Error('Invalid lesson block.');
    switch(b.type) {
      case 'heading': if (![2,3,4].includes(b.level) || !text(b.text)) throw new Error('Invalid heading.'); break;
      case 'paragraph': if (!text(b.text)) throw new Error('Invalid paragraph.'); break;
      case 'math': if (!text(b.notation) || !text(b.description)) throw new Error('Mathematical notation needs a description.'); break;
      case 'diagram': if (!text(b.title) || !text(b.description) || typeof b.src!=='string' || !/^assets\/[a-z0-9][a-z0-9-]*\.svg$/.test(b.src)) throw new Error('Invalid local diagram.'); break;
      case 'definition': case 'example': case 'callout': if (!text(b.title) || !Array.isArray(b.blocks) || !b.blocks.length) throw new Error('Invalid teaching block.'); b.blocks.forEach(block); break;
      case 'table': if (!Array.isArray(b.headers) || !b.headers.length || !b.headers.every(text) || !Array.isArray(b.rows) || !b.rows.length || !b.rows.every(row => Array.isArray(row) && row.length === b.headers.length && row.every(text))) throw new Error('Invalid comparison table.'); break;
      case 'check': if (!text(b.prompt) || !Array.isArray(b.explanation) || !b.explanation.length) throw new Error('Invalid understanding check.'); b.explanation.forEach(block); break;
      default: throw new Error('Unsupported lesson block.');
    }
  }
  const ids = new Set();
  for(const unit of lesson.units) {
    if (!text(unit.id) || ids.has(unit.id) || !text(unit.title) || !['in-progress','complete'].includes(unit.status) || !Array.isArray(unit.blocks) || !unit.blocks.length) throw new Error('Invalid teaching unit.');
    ids.add(unit.id); unit.blocks.forEach(block);
    if(lesson.status === 'complete' && unit.status !== 'complete') throw new Error('A complete lesson has unfinished units.');
  }
  if(!Array.isArray(lesson.references) || !lesson.references.length || !lesson.references.every(text)) throw new Error('Textbook section references are required.');
  return lesson;
}
