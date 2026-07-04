// Deep links: #tab=anatomy&course=Birchwood%20CC selects that view on load,
// and the hash tracks the current tab + course filter so a bookmark or a
// reopened phone browser lands where you left off. Implemented entirely by
// driving the engine's own buttons, so engine.js stays verbatim.
export function wireDeepLinks(host) {
  const apply = () => {
    const p = new URLSearchParams(location.hash.slice(1))
    const course = p.get('course')
    const tab = p.get('tab')
    if (course) {
      const b = [...host.querySelectorAll('#coursebtns [data-course]')].find(
        (x) => x.dataset.course === course
      )
      if (b && !b.classList.contains('on')) b.click()
    }
    const t = tab && host.querySelector(`.tab[data-tab="${tab}"]`)
    if (t && !t.classList.contains('on')) t.click()
  }
  const record = () => {
    const t = host.querySelector('.tab.on')?.dataset.tab
    const c = host.querySelector('#coursebtns .btn.on')?.dataset.course
    const p = new URLSearchParams()
    if (t && t !== 'overview') p.set('tab', t)
    if (c && c !== 'All') p.set('course', c)
    const h = p.toString()
    history.replaceState(null, '', h ? '#' + h : location.pathname + location.search)
  }
  host.addEventListener('click', (e) => {
    if (e.target.closest('.tab, [data-course], #resetF')) setTimeout(record, 0)
  })
  window.addEventListener('hashchange', apply)
  apply()
  return () => window.removeEventListener('hashchange', apply)
}
