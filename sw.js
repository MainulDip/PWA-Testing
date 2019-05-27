const version = '1.0';

// Static Core App Shell

const appAssets = [
    'index.html',
    'main.js',
    'images/flame.png',
    'images/icon.png',
    'images/sync.png',
    'vendor/bootstrap.min.css',
    'vendor/jquery.min.js',
]

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(`static-${version}`)
        .then(cache => cache.addAll(appAssets))
    );
})

self.addEventListener('activate', (e) => {
    //clean static old caches

    let cleaned = caches.keys().then(keys => {
        keys.forEach(key => {
            if (key !== `static-${version}` && key.match('static-')) {
                return caches.delete(key);
            }
        })
    })

    e.waitUntil(cleaned);
})

//Static Cache -> Cache With Network Fallback

const staticCache = (req, cacheName = `static-${version}`) => {
    return caches.match(req).then(cacheRes => {
        if (cacheRes) return cacheRes;

        return fetch(req).then(networkRes => {
            caches.open(cacheName).then(cache => cache.put(req, networkRes));
            return networkRes.clone();
        })
    })
}

//Fallback Cache

const fallbackCache = (req) => {
    return fetch(req)
        .then(networkRes => {
            //checks networkRes is ok, else go to cache
            if (!networkRes.ok) throw 'Fetch Error';

            // if success, update the cache

            caches.open(`static-${version}`)
                .then(cache => cache.put(req, networkRes));

            return networkRes.clone();

        }).catch(err => {
            console.log('catch block is called');
            return caches.match(req);
        });
}

// Clean Old Caches From Giphy Cache

const cleanGiphyCache = (giphy) => {
    caches.open('giphy').then(cache => {
        cache.keys().then(keys => {
            //Loop Entries For Deleting Other Than Asking
            keys.forEach(key => {
                //if entry is not part of current giphy, delete
                if (!giphy.includes(key.url)) cache.delete(key);
            })
        })
    })
}

self.addEventListener('fetch', (e) => {
    if (e.request.url.match(location.origin)) {
        e.respondWith(staticCache(e.request));
    } else if (e.request.url.match('https://api.giphy.com/v1/gifs/trending')) {
        e.respondWith(fallbackCache(e.request));
    } else if (e.request.url.match('giphy.com/media/')) {
        e.respondWith(staticCache(e.request, 'giphy'));
    }
})

//Listen For Message From

self.addEventListener('message', e => {
	if(e.data.action == 'cleanGiphyCache') cleanGiphyCache(e.data.giphys);
})