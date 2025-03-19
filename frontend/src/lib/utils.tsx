// fake a cache so we don't slow down stuff we've already seen
let fakeCache: Record<string, boolean> = {};

export async function fakeNetwork(key: string) {
  if (!key) {
    fakeCache = {};
  }

  if (fakeCache[key]) {
    return;
  }

  fakeCache[key] = true;
  return new Promise(res => {
    setTimeout(res, Math.random() * 3000);
  });
}