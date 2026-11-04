/**
 * 교환독서 방명록 – 구글 Apps Script
 * 1) 새 구글 시트를 만들고, 메뉴 [확장 프로그램] → [Apps Script] 를 엽니다.
 * 2) 원래 있던 코드를 모두 지우고 이 파일 내용을 붙여넣은 뒤 저장합니다.
 * 3) [배포] → [새 배포] → 유형: 웹 앱
 *      - 다음 사용자로 실행: 나
 *      - 액세스 권한: 모든 사용자
 *    → [배포] → 권한 허용 → 나오는 "웹 앱 URL"(…/exec)을 복사합니다.
 * 4) 그 주소를 guestbook.js 맨 위 GUESTBOOK_URL 에 넣으면 끝!
 */

const SHEET_NAME = '방명록';
const MAX_ITEMS = 300;

// 시트에 붙은 스크립트면 그 시트를, 따로 만든 스크립트면 '교환독서 방명록' 시트를 새로 만들어 씁니다.
function getSpreadsheet_() {
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('SHEET_ID');
  if (id) return SpreadsheetApp.openById(id);
  const ss = SpreadsheetApp.create('교환독서 방명록');
  props.setProperty('SHEET_ID', ss.getId());
  return ss;
}

// 처음 한 번 실행해서 권한 허용 + 시트 만들기
function setup() {
  const sh = getSheet_();
  Logger.log('방명록 시트: ' + sh.getParent().getUrl());
}

function getSheet_() {
  const ss = getSpreadsheet_();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(['시간', '이름', '내용', '쓴 곳']);
    sh.setFrozenRows(1);
  }
  return sh;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// 방명록 목록 불러오기 (최신 글이 위로)
function doGet() {
  const sh = getSheet_();
  const last = sh.getLastRow();
  if (last < 2) return json_({ items: [] });
  const start = Math.max(2, last - MAX_ITEMS + 1);
  const rows = sh.getRange(start, 1, last - start + 1, 4).getValues();
  const items = rows
    .filter(r => r[1] && r[2])
    .map(r => ({ time: new Date(r[0]).toISOString(), name: String(r[1]), msg: String(r[2]), page: String(r[3] || '') }))
    .reverse();
  return json_({ items: items });
}

// 방명록 글 남기기
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const data = JSON.parse(e.postData.contents || '{}');
    const name = String(data.name || '').trim().slice(0, 20);
    const msg = String(data.msg || '').trim().slice(0, 200);
    const page = String(data.page || '').trim().slice(0, 20);
    if (!name || !msg) return json_({ ok: false, error: 'empty' });
    // 수식으로 해석되지 않도록 앞에 = + - @ 가 오면 ' 를 붙여요
    const safe = s => /^[=+\-@]/.test(s) ? "'" + s : s;
    getSheet_().appendRow([new Date(), safe(name), safe(msg), page]);
    return json_({ ok: true });
  } finally {
    lock.releaseLock();
  }
}
