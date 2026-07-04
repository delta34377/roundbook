// Shell navigation wiring, all done by driving the engine's own buttons so
// engine.js stays verbatim:
//  - deep links: #tab=anatomy&course=Birchwood%20CC selects that view on load,
//    and the hash tracks the current tab + course filter, so a bookmark or a
//    reopened phone browser lands where you left off
//  - switching tabs scrolls back to the top of the content (the tab bar is
//    sticky, so you never switch into the middle of a page)
//  - the active tab keeps itself visible inside the scrollable mobile strip
export function wireDeepLinks(host) {
  // Where the tab bar sits in the document. Measured once at mount, while the
  // page is at its natural scroll position, because a stuck sticky element
  // reports its pinned position instead of its place in the layout.
  const tabsEl = host.querySelector('.tabs')
  const tabsTop = tabsEl
    ? tabsEl.getBoundingClientRect().top + window.scrollY
    : 0

  const revealActiveTab = () => {
    const t = host.querySelector('.tab.on')
    if (t && t.scrollIntoView) t.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }

  const apply = () => {
    const p = new URLSearchParams(location.hash.slice(1))
    const course = p.get('course')
    const tab = p.get('tab')
    const sel = host.querySelector('#courseSel')
    if (course && sel && sel.value !== course && [...sel.options].some((o) => o.value === course)) {
      sel.value = course
      sel.dispatchEvent(new Event('change', { bubbles: true }))
    }
    const t = tab && host.querySelector(`.tab[data-tab="${tab}"]`)
    if (t && !t.classList.contains('on')) t.click()
    revealActiveTab()
  }

  const record = () => {
    const t = host.querySelector('.tab.on')?.dataset.tab
    const c = host.querySelector('#courseSel')?.value
    const p = new URLSearchParams()
    if (t && t !== 'overview') p.set('tab', t)
    if (c && c !== 'All') p.set('course', c)
    const h = p.toString()
    history.replaceState(null, '', h ? '#' + h : location.pathname + location.search)
  }

  host.addEventListener('change', (e) => {
    if (e.target && e.target.id === 'courseSel') setTimeout(record, 0)
  })
  host.addEventListener('click', (e) => {
    const hitTab = e.target.closest('.tab')
    if (hitTab || e.target.closest('#resetF')) setTimeout(record, 0)
    if (hitTab) {
      if (window.scrollY > tabsTop) window.scrollTo({ top: tabsTop })
      revealActiveTab()
    }
  })
  window.addEventListener('hashchange', apply)
  apply()
  return () => window.removeEventListener('hashchange', apply)
}
