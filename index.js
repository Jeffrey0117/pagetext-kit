'use strict';
const { check } = require('./lib/check');

// Words with a blank in them live in the text file as one sentence:  '共 {count} 堂課'
// so the sentence stays whole (and editable as a whole) instead of being cut up in the markup.

const BLANK = /\{([A-Za-z_][A-Za-z0-9_]*)\}/g;

function valueOf(vars, name, template) {
  if (!vars || !(name in vars) || vars[name] === undefined || vars[name] === null) {
    throw new Error(`pagetext: 「${template}」需要 ${name}，但沒有給`);
  }
  return vars[name];
}

// fill('共 {count} 堂課', { count: 3 })  ->  '共 3 堂課'
function fill(template, vars) {
  return String(template).replace(BLANK, (_, name) => String(valueOf(vars, name, template)));
}

// Same, for when a blank holds something that is not text (a link, bold words):
// parts('同意 {terms} 後繼續', { terms: <a key="t" href="/terms">條款</a> })  ->  ['同意 ', <a/>, ' 後繼續']
// Put the result straight between tags.
function parts(template, vars) {
  const text = String(template);
  const out = [];
  let last = 0;
  for (const m of text.matchAll(BLANK)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(valueOf(vars, m[1], text));
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

module.exports = { fill, parts, check };
