const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
function setup(options = {}) {
  const timers = [], messages = [], elements = new Map();
  const element = id => {
    if (!elements.has(id)) elements.set(id, { style: {}, value: '', classList: { add() {}, remove() {} } });
    return elements.get(id);
  };
  let listener, locked = false, syncs = 0, receivedPassword;
  const user = { id: 'test-user', email: 'test@example.invalid', user_metadata: {} };
  const client = {
    auth: {
      async getSession() { return { data: { session: null } }; },
      onAuthStateChange(fn) { listener = fn; },
      async signInWithPassword({ password }) {
        receivedPassword = password;
        if (options.throws) throw new Error('Network unavailable');
        if (options.invalid) return { error: { message: 'Invalid login credentials' } };
        if (options.empty) return { data: {} };
        locked = true;
        // Supabase waits for subscribers while holding its session lock.
        const notification = listener('SIGNED_IN', { user });
        assert.equal(notification, undefined, 'Auth subscriber must return synchronously');
        await notification;
        locked = false;
        return { data: { user, session: { user } } };
      }
    },
    from() {
      return { select() { return this; }, eq() { return this; },
        async maybeSingle() {
          assert.equal(locked, false, 'Profile query must run outside the auth lock');
          if (options.profile) return options.profile;
          return { data: { role: 'teacher', student_id: null } };
        }
      };
    }
  };
  const context = vm.createContext({
    console: { log() {}, warn() {}, error() {} },
    setTimeout(fn) { timers.push(fn); },
    document: { getElementById: element, querySelector: element, querySelectorAll: () => [], addEventListener() {} },
    supabaseClient: client, location: { hash: '#login' }, addEventListener() {}, scrollTo() {}
  });
  context.window = context;
  context.messages = messages;
  context.syncStore = async () => { syncs++; };
  vm.runInContext('const Toast = { show: (...args) => messages.push(args) }; const Store = { loadAllFromSupabase: syncStore };', context);
  for (const file of ['js/data.js', 'js/auth.js', 'js/router.js', 'js/pages/login.js', 'js/app.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context);
  }
  const { Auth, Router, LoginPage, App } = vm.runInContext('({ Auth, Router, LoginPage, App })', context);
  Router.pageContainer = element('page-content');
  Router._initialized = true;
  Router.register('home', container => { container.innerHTML = 'HOME'; });
  Router.register('login', container => { container.innerHTML = 'LOGIN'; });
  element('login-email').value = user.email;
  element('login-password').value = ' password with spaces ';
  return { Auth, Router, LoginPage, App, context, element, messages, user,
    emit: (...args) => listener(...args), syncs: () => syncs, password: () => receivedPassword,
    async flush() { while (timers.length) await timers.shift()(); }
  };
}
test('password login completes outside auth lock, opens home and shows navigation', async () => {
  const h = setup();
  assert.equal(h.context.Auth, undefined, 'Classic-script const is not a window property');
  await h.Auth.init();
  await h.LoginPage.handleLogin();
  h.context.location.hash = '#home';
  h.Router.handleRoute();
  await h.flush();
  assert.equal(h.Router.currentPage, 'home');
  assert.equal(h.element('page-content').innerHTML, 'HOME');
  assert.equal(h.element('.bottom-nav').style.display, 'flex');
  assert.ok(h.syncs() >= 1);
  assert.equal(h.password(), ' password with spaces ');
  assert.equal(h.Auth.currentUser.role, 'teacher');
});
test('unauthenticated home redirects to login', () => {
  const h = setup();
  h.context.location.hash = '#home';
  h.Router.handleRoute();
  assert.equal(h.context.location.hash, 'login');
});
test('existing session skips login screen', () => {
  const h = setup();
  h.Auth.currentUser = h.user;
  h.Router.handleRoute();
  assert.equal(h.context.location.hash, 'home');
});
for (const failure of ['invalid', 'throws', 'empty']) {
  test(`${failure} login displays an error and stays on login`, async () => {
    const h = setup({ [failure]: true });
    await h.Auth.init();
    await h.LoginPage.handleLogin();
    assert.equal(h.context.location.hash, '#login');
    assert.equal(h.Auth.isAuthenticated(), false);
    assert.equal(h.messages.at(-1)[1], 'error');
  });
}
test('sign out cancels queued profile work', async () => {
  const h = setup();
  await h.Auth.init();
  h.emit('SIGNED_IN', { user: h.user });
  h.emit('SIGNED_OUT', null);
  await h.flush();
  assert.equal(h.Auth.currentUser, null);
  assert.equal(h.element('.bottom-nav').style.display, 'none');
});
test('profile response arriving after sign out cannot restore the session', async () => {
  let resolve;
  const h = setup({ profile: new Promise(done => { resolve = done; }) });
  await h.Auth.init();
  const pending = h.Auth.fetchUserProfile(h.user);
  h.emit('SIGNED_OUT', null);
  resolve({ data: { role: 'teacher', student_id: null } });
  await pending;
  assert.equal(h.Auth.currentUser, null);
});
