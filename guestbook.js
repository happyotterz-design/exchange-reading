/* ===== 교환독서 방명록 =====
   구글 Apps Script 배포 주소(…/exec)를 아래 따옴표 안에 넣으면 작동해요.
   메인 화면과 탈퇴 페이지가 같은 방명록을 함께 씁니다. */
const GUESTBOOK_URL = 'https://script.google.com/macros/s/AKfycbw_GaeCrYOQXMUnqvrkQmlQMEhx8LVo0a8ILQbJ4DMgbWMMjIjyXv_0aV3xkd5zp95O/exec';

(function () {
  const root = document.getElementById('guestbook');
  if (!root) return;

  const css = `
  #guestbook { max-width: 760px; margin: 70px auto 0; padding: 0 20px; text-align: left; color: #3b2f25;
    font-family: 'Gowun Dodum', 'Jua', sans-serif; position: relative; z-index: 5; word-break: keep-all; }
  #guestbook .gb-card { background: #fffdf8; border-radius: 18px; padding: 28px 24px;
    box-shadow: 0 8px 26px rgba(0,0,0,.18); border: 2px solid #e8dcc6; }
  #guestbook h2 { text-wrap: balance; font-size: 26px; text-align: center; margin-bottom: 6px; color: #3b2f25; text-shadow: none; }
  #guestbook .gb-sub { text-wrap: balance; text-align: center; color: #7a6654; margin-bottom: 20px; font-size: 16px; }
  #guestbook form { display: grid; grid-template-columns: 140px 1fr auto; gap: 10px; }
  #guestbook input, #guestbook textarea { font: inherit; font-size: 16px; padding: 12px 14px; border-radius: 10px;
    border: 1.5px solid #d9c9b0; background: #fff; color: #3b2f25; width: 100%; }
  #guestbook textarea { resize: none; height: 48px; }
  #guestbook button { font: inherit; font-size: 16px; font-weight: bold; padding: 0 22px; border-radius: 10px; border: none;
    background: #3b2f25; color: #fff; cursor: pointer; }
  #guestbook button:disabled { opacity: .5; cursor: default; }
  #guestbook .gb-status { min-height: 22px; margin: 10px 2px 4px; font-size: 14px; color: #b0533c; }
  #guestbook .gb-list { list-style: none; margin-top: 8px; max-height: 420px; overflow-y: auto; padding-right: 4px; }
  #guestbook .gb-item { background: #fff7e8; border-radius: 12px; padding: 12px 16px; margin-bottom: 10px;
    border-left: 5px solid var(--c, #ffd166); animation: gbIn .35s ease-out; }
  #guestbook .gb-head { display: flex; justify-content: space-between; gap: 10px; font-size: 13px; color: #9a8570; margin-bottom: 4px; }
  #guestbook .gb-name { font-weight: bold; font-size: 15px; color: #3b2f25; }
  #guestbook .gb-tag { font-size: 11px; background: #3b2f25; color: #fff; border-radius: 999px; padding: 1px 8px; margin-left: 6px; vertical-align: 2px; }
  #guestbook .gb-tag.fail { background: #ff0040; }
  #guestbook .gb-msg { font-size: 16px; line-height: 1.55; white-space: pre-wrap; word-break: break-word; }
  #guestbook .gb-empty { text-align: center; color: #9a8570; padding: 20px 0; }
  @keyframes gbIn { from { opacity: 0; transform: translateY(8px); } }
  @media (max-width: 600px) { #guestbook { padding: 0 14px; margin-top: 50px; } #guestbook .gb-card { padding: 22px 16px; } #guestbook h2 { font-size: 22px; } #guestbook .gb-sub { font-size: 14px; } #guestbook form { grid-template-columns: 1fr; } #guestbook button { height: 46px; } }
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  root.innerHTML = `
    <div class="gb-card">
      <h2></h2>
      <p class="gb-sub"></p>
      <form>
        <input name="name" maxlength="20" placeholder="이름 (예: 김샘)" required>
        <textarea name="msg" maxlength="200" placeholder="한마디 남기기 (200자까지)" required></textarea>
        <button type="submit">남기기</button>
      </form>
      <div class="gb-status"></div>
      <ul class="gb-list"><li class="gb-empty">불러오는 중…</li></ul>
    </div>`;
  root.querySelector('h2').textContent = root.dataset.title || '📝 방명록';
  root.querySelector('.gb-sub').textContent = root.dataset.sub || '';

  const form = root.querySelector('form');
  const list = root.querySelector('.gb-list');
  const status = root.querySelector('.gb-status');
  const btn = form.querySelector('button');
  const page = root.dataset.page || '';
  const colors = ['#ffd166', '#ef8354', '#06d6a0', '#4cc9f0', '#c77dff', '#ff7aa2'];

  // 이름 기억해두기 (다음에 또 쓸 때 편하게)
  try { form.name.value = localStorage.getItem('gb-name') || ''; } catch (e) {}

  function fmt(t) {
    const d = new Date(t);
    if (isNaN(d)) return '';
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  function render(items) {
    list.innerHTML = '';
    if (!items.length) {
      list.innerHTML = '<li class="gb-empty">아직 아무도 안 썼어요. 첫 번째 주인공이 되어주세요! ✨</li>';
      return;
    }
    items.forEach((it, i) => {
      const li = document.createElement('li');
      li.className = 'gb-item';
      li.style.setProperty('--c', colors[i % colors.length]);
      li.innerHTML = `<div class="gb-head"><span><span class="gb-name"></span><span class="gb-tag"></span></span><span class="gb-time"></span></div><div class="gb-msg"></div>`;
      li.querySelector('.gb-name').textContent = it.name;
      const tag = li.querySelector('.gb-tag');
      if (it.page) { tag.textContent = it.page === '탈퇴실패' ? '탈퇴 실패자 😝' : it.page; if (it.page === '탈퇴실패') tag.classList.add('fail'); }
      else tag.remove();
      li.querySelector('.gb-time').textContent = fmt(it.time);
      li.querySelector('.gb-msg').textContent = it.msg;
      list.appendChild(li);
    });
  }

  async function load() {
    if (!GUESTBOOK_URL) {
      list.innerHTML = '<li class="gb-empty">방명록 연결 준비 중이에요 🛠️ 곧 열립니다!</li>';
      btn.disabled = true;
      return;
    }
    try {
      const res = await fetch(GUESTBOOK_URL + '?t=' + Date.now());
      const data = await res.json();
      render(data.items || []);
    } catch (e) {
      list.innerHTML = '<li class="gb-empty">방명록을 불러오지 못했어요. 잠시 후 새로고침 해주세요 🙏</li>';
    }
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const name = form.name.value.trim(), msg = form.msg.value.trim();
    if (!name || !msg || !GUESTBOOK_URL) return;
    btn.disabled = true;
    status.textContent = '남기는 중…';
    try {
      // text/plain 으로 보내야 구글 Apps Script에서 막히지 않아요
      await fetch(GUESTBOOK_URL, { method: 'POST', body: JSON.stringify({ name, msg, page }) });
      try { localStorage.setItem('gb-name', name); } catch (e) {}
      form.msg.value = '';
      status.textContent = '고마워요! 방명록에 남겨졌어요 💌';
      await load();
    } catch (err) {
      status.textContent = '앗, 저장이 안 됐어요. 다시 한 번 눌러주세요!';
    } finally {
      btn.disabled = false;
      setTimeout(() => { status.textContent = ''; }, 4000);
    }
  });

  load();
})();
