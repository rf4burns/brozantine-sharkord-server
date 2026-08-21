const warmedUrls = new Set<string>();

const preloadEmojiImages = (urls: string[]) => {
  for (const url of urls) {
    if (!url || warmedUrls.has(url)) continue;

    warmedUrls.add(url);

    const image = new Image();
    image.src = url;
  }
};

const scheduleIdlePreload = (urls: string[]) => {
  const run = () => preloadEmojiImages(urls);

  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(run, { timeout: 2000 });
    return;
  }

  setTimeout(run, 100);
};

export { preloadEmojiImages, scheduleIdlePreload };
