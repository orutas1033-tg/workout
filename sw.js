/* =====================================================================
   Service Worker（オフライン動作用）

   役割はひとつだけ: アプリ本体のファイルをキャッシュして、
   ネットワークが無くても（＝ジムの地下でも）起動できるようにする。

   ★重要: トレーニング記録そのものは localStorage にあり、
     この Service Worker は記録を一切扱わない。ここでキャッシュするのは
     index.html などの「アプリのガワ」だけ。
   ===================================================================== */

// アプリを更新したら、この番号を必ず上げること。
// 番号が変わると古いキャッシュが破棄され、新しいファイルが取り込まれる。
const CACHE_NAME = "kintore-memo-v2";

// キャッシュ対象のファイル一覧
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json"
];

// インストール時: 上記ファイルを一括でキャッシュに入れる
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())   // 新しいSWを即座に有効化する
  );
});

// 有効化時: 古いバージョンのキャッシュを削除する
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())  // 開いているページを即座に新SWの管理下に置く
  );
});

// 取得時: キャッシュ優先（cache-first）
//   このアプリは外部通信を一切しないため、
//   「キャッシュにあればそれを返す。無ければネットワークへ」で十分。
self.addEventListener("fetch", (event) => {
  // GET 以外は素通し
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).catch(() => {
        // オフラインかつ未キャッシュ。ページ遷移要求ならトップを返す。
        if (event.request.mode === "navigate") return caches.match("./index.html");
        return new Response("", { status: 504, statusText: "Offline" });
      });
    })
  );
});
