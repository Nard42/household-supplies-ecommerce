class ProductCache {
    constructor() {
        this.cacheKey = 'products-cache';
        this.cacheTimeKey = 'products-cache-time';
        this.cacheDuration = 5 * 60 * 1000; // 5 minutes
    }

    // Save products to cache
    set(products) {
        localStorage.setItem(this.cacheKey, JSON.stringify(products));
        localStorage.setItem(this.cacheTimeKey, Date.now().toString());
    }

    // Get products from cache if valid
    get() {
        const cached = localStorage.getItem(this.cacheKey);
        const cacheTime = localStorage.getItem(this.cacheTimeKey);
        
        if (!cached || !cacheTime) return null;
        
        const now = Date.now();
        if (now - parseInt(cacheTime) > this.cacheDuration) {
            this.clear(); // Cache expired
            return null;
        }
        
        return JSON.parse(cached);
    }

    clear() {
        localStorage.removeItem(this.cacheKey);
        localStorage.removeItem(this.cacheTimeKey);
    }
}