// main.js — The Round Book's web shell. The dashboard is publicly VIEWABLE
// (no login) by the owner's choice: the payload holds derived golf stats only
// (no GPS; supabase/schema.sql). Signing in is only for the owner: it unlocks
// the Sync button, and the arccos-sync function verifies the session's email
// server-side, so visitors can never trigger Arccos traffic.
//
// The engine (engine.js/metrics.js/bodyHtml.js) is ported VERBATIM from
// build_dash.py and verified side by side against golf-dashboard.html; this
// file only handles data loading, the optional sign-in, and mounting.
import { createClient } from '@supabase/supabase-js'
import { initRoundBook } from './engine.js'
import { RB_BODY_HTML } from './bodyHtml.js'
import { wireDeepLinks } from './deepLinks.js'
import './roundbook.css'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const app = document.getElementById('app')

let session = null
let destroyEngine = null
let destroyDeepLinks = null

function setView(html) {
  if (destroyEngine) {
    destroyEngine()
    destroyEngine = null
  }
  if (destroyDeepLinks) {
    destroyDeepLinks()
    destroyDeepLinks = null
  }
  app.innerHTML = html
  return app
}

function showConfigError() {
  setView(
    '<div class="rb-page"><div class="rb-state"><h2>Not configured</h2>' +
      '<p>Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> ' +
      '(Vercel project env vars, or <code>web/.env.local</code> for local dev), then rebuild.</p></div></div>'
  )
}

// Owner sign-in. Viewing never needs it; it exists to unlock the Sync button.
function showLogin(supabase, errorText) {
  setView(
    '<div class="rb-page"><div class="rb-state rb-login">' +
      '<h2>The Round Book</h2>' +
      '<p>Viewing needs no account. Signing in is for the owner, to sync from Arccos.</p>' +
      '<form id="rb-login-form">' +
      '<input id="rb-email" type="email" autocomplete="username" placeholder="Email" required>' +
      '<input id="rb-pass" type="password" autocomplete="current-password" placeholder="Password" required>' +
      '<p id="rb-login-err" class="rb-err" hidden></p>' +
      '<button class="rb-retry" type="submit">Sign in</button>' +
      '</form>' +
      '<p><button class="rb-back" id="rb-login-back">&larr; Back to the book</button></p>' +
      '</div></div>'
  )
  const err = document.getElementById('rb-login-err')
  if (errorText) {
    err.textContent = errorText
    err.hidden = false
  }
  document.getElementById('rb-login-back').addEventListener('click', () => loadDashboard(supabase))
  document.getElementById('rb-login-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    const button = e.target.querySelector('button[type="submit"]')
    button.disabled = true
    err.hidden = true
    const { data, error } = await supabase.auth.signInWithPassword({
      email: document.getElementById('rb-email').value.trim(),
      password: document.getElementById('rb-pass').value,
    })
    if (error) {
      err.textContent = error.message
      err.hidden = false
      button.disabled = false
      return
    }
    session = data?.session || null
    loadDashboard(supabase)
  })
}

// Topbar right side: owners get Sync + Sign out, visitors get a quiet Sign in.
function topbarRight() {
  return session
    ? '<span class="rb-topbar-right"><span class="rb-updated" id="rb-updated"></span>' +
        '<button class="rb-sync" id="rb-sync" title="Pull the latest rounds from Arccos now">Sync</button>' +
        '<button class="rb-back" id="rb-signout">Sign out</button></span>'
    : '<span class="rb-topbar-right"><span class="rb-updated" id="rb-updated"></span>' +
        '<button class="rb-back" id="rb-signin" title="Owner sign-in (unlocks sync)">Sign in</button></span>'
}

function wireTopbar(supabase) {
  const out = document.getElementById('rb-signout')
  if (out)
    out.addEventListener('click', async () => {
      await supabase.auth.signOut()
      session = null
      loadDashboard(supabase)
    })
  const sin = document.getElementById('rb-signin')
  if (sin) sin.addEventListener('click', () => showLogin(supabase))
  wireSync(supabase)
}

function stateCard(title, bodyHtml) {
  return (
    '<div class="rb-page"><div class="rb-topbar">' +
    '<span class="rb-brand">The Round Book</span>' +
    topbarRight() +
    `</div><div class="rb-state"><h2>${title}</h2>${bodyHtml}</div></div>`
  )
}

async function loadDashboard(supabase) {
  setView('<div class="rb-page"><div class="rb-state"><h2>The Round Book</h2><p>Loading&hellip;</p></div></div>')

  let res
  try {
    res = await supabase.from('roundbook_data').select('data, updated_at').eq('id', 1).maybeSingle()
  } catch (e) {
    setView(stateCard('Could not load the data', '<p id="rb-err-msg"></p><button class="rb-retry" id="rb-retry">Try again</button>'))
    document.getElementById('rb-err-msg').textContent = e?.message || 'Unknown error'
    wireTopbar(supabase)
    document.getElementById('rb-retry').addEventListener('click', () => loadDashboard(supabase))
    return
  }

  const { data, error } = res
  if (error && error.code !== 'PGRST205' && error.code !== '42P01') {
    setView(stateCard('Could not load the data', '<p id="rb-err-msg"></p><button class="rb-retry" id="rb-retry">Try again</button>'))
    document.getElementById('rb-err-msg').textContent = error.message
    wireTopbar(supabase)
    document.getElementById('rb-retry').addEventListener('click', () => loadDashboard(supabase))
    return
  }

  if (error || !data || !data.data) {
    // Table missing, row missing, or RLS kept it hidden (public read not
    // enabled and this browser is not signed in as the owner).
    setView(
      stateCard(
        'No data to show',
        '<p>If this is a fresh setup: run <code>supabase/schema.sql</code>, seed with ' +
          '<code>node web/scripts/seed-roundbook-data.mjs</code>, and deploy the ' +
          '<code>arccos-sync</code> function (steps in the README). If the site is ' +
          'meant to be publicly viewable, also run the public-read policy from the ' +
          'schema file. Owner sign-in always works.</p>'
      )
    )
    wireTopbar(supabase)
    return
  }

  const updated = data.updated_at
    ? 'Last sync ' +
      new Date(data.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : ''
  setView(
    '<div class="rb-page"><div class="rb-topbar">' +
      '<span class="rb-brand">The Round Book</span>' +
      topbarRight() +
      '</div><div id="rb-host" class="rb-scope"></div></div>'
  )
  document.getElementById('rb-updated').textContent = updated
  wireTopbar(supabase)
  const host = document.getElementById('rb-host')
  host.innerHTML = RB_BODY_HTML
  destroyEngine = initRoundBook(host, data.data)
  destroyDeepLinks = wireDeepLinks(host)
}

// The Sync button calls the arccos-sync function with the logged-in session
// token; the function verifies server-side that the token belongs to the
// owner before touching Arccos, so no secret ever reaches the browser.
function wireSync(supabase) {
  const btn = document.getElementById('rb-sync')
  if (!btn) return
  btn.addEventListener('click', async () => {
    btn.disabled = true
    btn.textContent = 'Syncing…'
    const { data, error } = await supabase.functions.invoke('arccos-sync', { body: {} })
    if (error || data?.error) {
      console.error('sync failed:', error || data?.error)
      btn.disabled = false
      btn.textContent = 'Sync failed - retry'
      btn.title = String(data?.error || error?.message || 'Unknown error')
      return
    }
    loadDashboard(supabase) // re-render with whatever the sync just wrote
  })
}

async function start() {
  if (!supabaseUrl || !supabaseAnonKey) {
    showConfigError()
    return
  }
  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  const { data } = await supabase.auth.getSession()
  session = data?.session || null
  loadDashboard(supabase)
}

start()
