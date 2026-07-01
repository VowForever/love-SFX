const CACHE = "lovejournal-v1";
const IMG_CACHE = "lovejournal-img-v1";
const KEEP = [CACHE, IMG_CACHE];
const SHELL = [
  "./index.html",
  "./style.css",
  "./script.js",
  "./data.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !KEEP.includes(k)).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// 图片请求识别：<img> 触发的加载，或路径/域名指向 images 资源
function isImageRequest(request, url) {
  return (
    request.destination === "image" ||
    url.hostname === "raw.githubusercontent.com" ||
    /\/images\//.test(url.pathname)
  );
}

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);

  // 图片：缓存优先。文件名内容唯一、上传后不变，命中即秒开、离线可看；
  // 未命中才联网下载并写入长期图片缓存（版本更新时不清空）。
  if (isImageRequest(e.request, url)) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        if (cached) return cached;
        return fetch(e.request).then((res) => {
          if (res && (res.ok || res.type === "opaque")) {
            const copy = res.clone();
            caches.open(IMG_CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
          }
          return res;
        });
      })
    );
    return;
  }

  // app 代码与数据：网络优先，断网回退缓存（保证代码/数据能及时更新）
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match("./index.html")))
  );
});
