const root = new URL('../', import.meta.url);
const app = document.querySelector('#app');
const draft = document.body.dataset.buildMode === 'draft';
const storageKey = 'faith60.preview.completed.v1';
const escapeHTML = value => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const urlFor = path => new URL(path, root).href;
const storyURL = id => urlFor(`stories/${id}/`);
const imageURL = lesson => urlFor(`artwork/${lesson.artwork}`);
let content, config, completed = new Set(), storageAvailable = true;
try {
  const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
  if (Array.isArray(saved)) completed = new Set(saved.filter(id => typeof id === 'string'));
} catch { storageAvailable = false; }
if (draft) document.querySelector('#draft-badge').hidden = false;

function imageFallbacks() {
  document.querySelectorAll('img[data-artwork]').forEach(image => {
    image.addEventListener('error', () => {
      const message = document.createElement('div');
      message.className = 'image-missing';
      message.textContent = 'This illustration could not load.';
      image.replaceWith(message);
    }, { once: true });
  });
}
function persist(id) {
  completed.add(id);
  try { localStorage.setItem(storageKey, JSON.stringify([...completed])); }
  catch { storageAvailable = false; }
}
function credit() {
  const footer = document.querySelector('#translation-credit');
  footer.innerHTML = `<a href="${escapeHTML(content.translation.url)}" target="_blank" rel="noopener noreferrer">World English Bible · Classic · Public domain</a>`;
}
function home() {
  const current = content.lessons.find(lesson => !completed.has(lesson.id)) || content.lessons[0];
  const completeCount = content.lessons.filter(lesson => completed.has(lesson.id)).length;
  const dots = content.lessons.map(lesson => `<span class="dot${completed.has(lesson.id) ? ' done' : ''}"></span>`).join('');
  app.innerHTML = `<div class="topline"><span class="eyebrow">Your daily discovery</span><span class="daily-count"><span class="dots" aria-hidden="true">${dots}</span>${completeCount} of 7 explored</span></div>
  <section class="hero" aria-labelledby="today-heading">
    <div class="hero-art"><img data-artwork src="${imageURL(current)}" alt="${escapeHTML(current.artworkAlt)}"><span class="art-tag">${escapeHTML(current.reference)}</span></div>
    <div class="hero-copy"><span class="eyebrow">${completeCount === 7 ? 'A story to return to' : 'Today · Session ' + current.number}</span><h1 id="today-heading">${escapeHTML(current.title)}</h1><p class="subtitle">${escapeHTML(current.subtitle)}</p><div class="tag-row"><span class="tag">About a minute</span><span class="tag">One small discovery</span></div><a class="primary" href="${storyURL(current.id)}">${completeCount === 7 ? 'Explore again' : 'Begin the story'}<span class="arrow" aria-hidden="true">↗</span></a><p class="home-note">Take your time. There is no countdown.</p></div>
  </section>
  <section class="journey" id="journey" aria-labelledby="journey-heading"><div class="section-head"><div><span class="eyebrow">A week in the Gospels</span><h2 id="journey-heading">Your journey</h2></div><p>Seven stories to discover.<br>Open any preview below.</p></div><div class="journey-grid">${content.lessons.map(lesson => `<a class="journey-card" href="${storyURL(lesson.id)}"><div class="journey-image"><img data-artwork loading="lazy" src="${imageURL(lesson)}" alt="${escapeHTML(lesson.artworkAlt)}"></div><div class="journey-card-copy"><span class="card-number">Session ${String(lesson.number).padStart(2, '0')}${completed.has(lesson.id) ? '<span class="card-check">Explored ✓</span>' : ''}</span><h3>${escapeHTML(lesson.title)}</h3><p class="micro">${escapeHTML(lesson.reference)}</p></div></a>`).join('')}</div></section>
  <p class="intro-note">These are short, original introductions to Gospel passages. Each story includes the full passage, a discovery challenge, and an optional moment of reflection.</p>
  <p class="storage-note">${storageAvailable ? 'Your preview progress stays in this browser. No account needed.' : 'This browser cannot save progress. You can still play every story.'}</p>
  ${draft ? '<p class="draft-footnote">Editorial draft for review. Stories and illustrations have not yet been approved for public distribution.</p>' : ''}`;
  imageFallbacks();
}
function story(lesson) {
  document.title = `${lesson.title} · Faith in 60`;
  const question = lesson.challenge;
  app.innerHTML = `<div class="story-heading"><a class="back-link" href="${root.href}"><span aria-hidden="true">←</span> Your journey</a><span class="micro">Session ${lesson.number} of 7 · About a minute</span></div>
  <div class="story-layout"><aside class="story-visual" aria-label="Story illustration"><div class="image-wrap"><img data-artwork src="${imageURL(lesson)}" alt="${escapeHTML(lesson.artworkAlt)}"><span class="art-tag">${escapeHTML(lesson.reference)}</span></div><p class="caption">An original illustration, inspired by the passage.<br>A quiet invitation to look a little closer.</p></aside>
  <article class="story-body"><span class="eyebrow">${escapeHTML(lesson.reference)}</span><h1>${escapeHTML(lesson.title)}</h1><p class="story-subtitle">${escapeHTML(lesson.subtitle)}</p><p class="copy-label">The story · Original summary</p><p class="story-intro">${escapeHTML(lesson.summary)}</p><section class="discovery" aria-labelledby="challenge-heading"><p class="question-type">${question.type === 'sequence' ? 'Connect the moments' : 'Notice the detail'}</p><h2 id="challenge-heading" tabindex="-1">${escapeHTML(question.prompt)}</h2><div id="challenge"></div><div id="feedback" aria-live="polite" aria-atomic="true"></div></section><div id="completion"></div>${draft ? '<p class="draft-footnote">Editorial draft · This story and its illustration await human review.</p>' : ''}</article></div>`;
  imageFallbacks();
  let selected = [], solved = false;
  const challenge = document.querySelector('#challenge');
  const feedback = document.querySelector('#feedback');
  function renderChoices(wrongID = null) {
    challenge.innerHTML = `${question.type === 'sequence' ? `<p class="sequence-hint">Tap the moments in order. You can undo before checking.</p><ol class="sequence-order" aria-label="Your chosen order">${[0,1,2].map(index => `<li${selected[index] ? '' : ' class="empty"'}>${index + 1}. ${selected[index] ? escapeHTML(question.choices.find(choice => choice.id === selected[index]).text) : 'Choose a moment below'}</li>`).join('')}</ol>` : ''}<div class="choices">${question.choices.map((choice,index) => {
      const selectedIndex = selected.indexOf(choice.id);
      const state = solved && question.answer.includes(choice.id) ? ' correct' : choice.id === wrongID ? ' wrong' : selectedIndex !== -1 ? ' selected' : '';
      return `<button class="choice${state}" data-choice="${escapeHTML(choice.id)}" ${solved || selectedIndex !== -1 ? 'disabled' : ''}><span class="choice-marker" aria-hidden="true">${solved && question.answer.includes(choice.id) ? '✓' : selectedIndex !== -1 ? selectedIndex + 1 : question.type === 'observation' ? String.fromCharCode(65 + index) : '+'}</span><span>${escapeHTML(choice.text)}</span></button>`;
    }).join('')}</div>${!solved ? '<button class="text-button" id="read-explanation">Read the explanation</button>' : ''}${question.type === 'sequence' && !solved ? `<div class="sequence-actions"><button class="text-button" id="undo-choice" ${selected.length === 0 ? 'disabled' : ''}>Undo last choice</button><button class="primary" id="check-order" ${selected.length !== 3 ? 'disabled' : ''}>Check order <span aria-hidden="true">→</span></button></div>` : ''}`;
    challenge.querySelectorAll('[data-choice]').forEach(button => button.addEventListener('click', () => {
      if (solved) return;
      if (question.type === 'observation') check([button.dataset.choice], button.dataset.choice);
      else {
        selected.push(button.dataset.choice);
        feedback.innerHTML = '';
        renderChoices();
        const next = challenge.querySelector('[data-choice]:not(:disabled)') || challenge.querySelector('#check-order');
        next?.focus({preventScroll:true});
      }
    }));
    challenge.querySelector('#undo-choice')?.addEventListener('click', () => { selected.pop(); feedback.innerHTML = ''; renderChoices(); challenge.querySelector('[data-choice]:not(:disabled)')?.focus({preventScroll:true}); });
    challenge.querySelector('#check-order')?.addEventListener('click', () => check(selected));
    challenge.querySelector('#read-explanation')?.addEventListener('click', () => {
      solved = true;
      selected = question.type === 'sequence' ? [...question.answer] : [];
      persist(lesson.id);
      renderChoices();
      feedback.innerHTML = `<div class="feedback" tabindex="-1"><h3>Here’s the connection.</h3><p>${escapeHTML(question.explanation)}</p></div>`;
      finish();
      feedback.firstElementChild.focus({preventScroll:true});
    });
  }
  function check(answer, wrongID = null) {
    const correct = answer.length === question.answer.length && answer.every((id,index) => id === question.answer[index]);
    if (correct) {
      solved = true;
      persist(lesson.id);
      renderChoices();
      feedback.innerHTML = `<div class="feedback" tabindex="-1"><h3>That’s the connection.</h3><p>${escapeHTML(question.explanation)}</p></div>`;
      finish();
      feedback.firstElementChild.focus({preventScroll:true});
    } else {
      if (question.type === 'observation') renderChoices(wrongID);
      feedback.innerHTML = `<div class="feedback retry"><h3>A chance to look again.</h3><p>${escapeHTML(question.explanation)}</p><button class="text-button" id="retry">Try again</button></div>`;
      feedback.querySelector('#retry').addEventListener('click', () => { selected = []; feedback.innerHTML = ''; renderChoices(); challenge.querySelector('button')?.focus({preventScroll:true}); });
      feedback.querySelector('#retry').focus({preventScroll:true});
      // No points, lives, penalty, or countdown. The explanation stays visible while learning.
    }
  }
  function finish() {
    const next = content.lessons[lesson.number];
    const appStore = config.distributionChannel === 'appStore';
    const invitation = appStore ? config.appStoreURL : config.testFlightURL;
    const appStorePending = appStore && config.appStoreReleaseState !== 'live';
    const invitationCopy = appStorePending
      ? '<p>The iPhone app is coming soon. Explore all seven stories here while we prepare its App Store release.</p>'
      : invitation
      ? `<p>${appStore ? 'Seven illustrated Gospel stories, saved stories, and offline practice for iPhone.' : 'Try the seven-day iPhone pilot through Apple TestFlight.'}</p><a class="secondary" href="${escapeHTML(invitation)}" target="_blank" rel="noopener noreferrer">${appStore ? 'View on the App Store' : 'Join the iPhone pilot'} ↗</a>`
      : '<p>The iPhone app link is not available yet. You can keep exploring these browser previews.</p>';
    document.querySelector('#completion').innerHTML = `<section class="completion" aria-label="Your discovery"><span class="eyebrow finished-label">A thought to carry with you</span><p class="takeaway">${escapeHTML(lesson.takeaway)}</p>
    <details class="optional-card"><summary><span><span class="optional-hint">If you have another moment</span>Read the full passage</span></summary><div class="passage">${lesson.verses.map(verse => `<p><sup>${verse.number}</sup>${escapeHTML(verse.text)}</p>`).join('')}<p class="source-credit">${escapeHTML(lesson.reference)} · World English Bible Classic. Public domain. Verse text is unchanged; layout whitespace is normalized. <a href="${escapeHTML(lesson.sourceURL)}" target="_blank" rel="noopener noreferrer">Read at eBible.org ↗</a></p></div></details>
    <details class="optional-card"><summary><span><span class="optional-hint">Optional · Personal reflection</span>Let it meet your day</span></summary><p class="reflection-prompt">${escapeHTML(lesson.application)}</p><p class="reflection-note">Take this with you, or simply pause. There is no answer to submit or grade.</p></details>
    <div class="end-actions"><button class="secondary" id="share-story">Share this story <span aria-hidden="true">↗</span></button><a class="primary" href="${next ? storyURL(next.id) : root.href}">${next ? 'Next preview' : 'Back to your journey'} <span aria-hidden="true">→</span></a></div><p class="share-status" id="share-status" role="status"></p><button class="text-button replay" id="replay">Explore this story again</button>
    <div class="app-invitation"><h3>Seven stories. More ways to return.</h3>${invitationCopy}${config.feedbackEmail ? `<p><a href="mailto:${escapeHTML(config.feedbackEmail)}">Contact support</a></p>` : ''}</div>${!storageAvailable ? '<p class="storage-note">Your progress could not be saved in this browser.</p>' : ''}</section>`;
    document.querySelector('#replay').addEventListener('click', () => { story(lesson); document.querySelector('#challenge-heading').focus({preventScroll:true}); });
    const share = document.querySelector('#share-story');
    const status = document.querySelector('#share-status');
    if (!config.previewBaseURL || draft) {
      share.disabled = true;
      status.textContent = draft ? 'Sharing will be available after editorial approval and publication.' : 'Public sharing is not available yet.';
    } else {
      share.addEventListener('click', async () => {
        const url = new URL(`stories/${lesson.id}/`, config.previewBaseURL.replace(/\/?$/, '/')).href;
        const payload = { title: `${lesson.title} · Faith in 60`, text: 'One Gospel story. One small discovery.', url };
        try {
          if (navigator.share) { await navigator.share(payload); status.textContent = 'Your share sheet has closed.'; }
          else if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(url); status.textContent = 'Story link copied.'; }
          else { status.innerHTML = `Your story link: <a href="${escapeHTML(url)}">${escapeHTML(url)}</a>`; }
        } catch(error) {
          if (error.name !== 'AbortError') status.innerHTML = `Copy this story link: <a href="${escapeHTML(url)}">${escapeHTML(url)}</a>`;
        }
      });
    }
  }
  renderChoices();
}
async function start() {
  try {
    const responses = await Promise.all([fetch(urlFor('data/lessons.json')), fetch(urlFor('data/config.json'))]);
    if (responses.some(response => !response.ok)) throw new Error('Content could not be loaded.');
    [content, config] = await Promise.all(responses.map(response => response.json()));
    if (content.schemaVersion !== 1 || !Array.isArray(content.lessons) || content.lessons.length !== 7) throw new Error('Content format is not supported.');
    credit();
    const path = decodeURIComponent(location.pathname).slice(root.pathname.length).replace(/^\/+|\/+$/g, '');
    if (path === '' || path === 'index.html') home();
    else {
      const match = /^stories\/([a-z0-9-]+)(?:\/index\.html)?$/.exec(path);
      const lesson = match && content.lessons.find(item => item.id === match[1]);
      if (lesson) story(lesson);
      else app.innerHTML = `<div class="not-found"><span class="eyebrow">A different path</span><h1>This story isn’t here.</h1><p>Choose one of the seven Gospel stories in your journey.</p><a class="primary" href="${root.href}">Return to your journey</a></div>`;
    }
  } catch (error) {
    app.innerHTML = `<div class="not-found"><span class="eyebrow">A small interruption</span><h1>Your story couldn’t open.</h1><p>Check your connection and reload. For a local preview, open this page through the project’s local web server.</p><button class="primary" id="reload">Try again</button></div>`;
    document.querySelector('#reload').addEventListener('click', () => location.reload());
    console.error(error);
  }
}
start();
