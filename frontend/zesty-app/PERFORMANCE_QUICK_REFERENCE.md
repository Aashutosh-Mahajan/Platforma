# Performance Optimization Quick Reference

Quick guide for developers on using the performance optimizations in the Platforma frontend.

## 1. Lazy Loading Images

**When to use:** All images, especially those below the fold

```typescript
import { LazyImage } from './components/shared';

// Basic usage
<LazyImage
  src="/images/restaurant.jpg"
  alt="Restaurant name"
  className="w-full h-64 object-cover"
/>

// With custom placeholder
<LazyImage
  src="/images/event.jpg"
  alt="Event name"
  placeholder="/images/placeholder.svg"
  onLoad={() => console.log('Loaded')}
  onError={() => console.log('Error')}
/>
```

## 2. Debounced Search

**When to use:** Search inputs, filters, any user input that triggers API calls

```typescript
import { useDebounce } from './hooks';

function SearchComponent() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  useEffect(() => {
    if (debouncedSearchTerm) {
      fetchResults(debouncedSearchTerm);
    }
  }, [debouncedSearchTerm]);

  return (
    <input
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
    />
  );
}
```

## 3. API Response Caching

**When to use:** GET requests for data that doesn't change frequently

```typescript
import { apiCache, createCacheKey } from './utils';

async function fetchRestaurants(params: any) {
  const cacheKey = createCacheKey('/api/restaurants', params);
  
  // Try cache first
  const cached = apiCache.get(cacheKey);
  if (cached) return cached;
  
  // Fetch from API
  const response = await api.get('/restaurants', { params });
  
  // Cache for 5 minutes (default)
  apiCache.set(cacheKey, response.data);
  
  return response.data;
}

// Custom TTL (10 minutes)
apiCache.set(cacheKey, data, 10 * 60 * 1000);

// Clear cache after mutation
apiCache.delete(cacheKey);
apiCache.clear(); // Clear all
```

## 4. Code Splitting (Already Configured)

**When to use:** New pages/routes

```typescript
// In App.tsx or route configuration
import { lazy } from 'react';

const NewPage = lazy(() => import('./pages/NewPage'));

// In routes
<Route path="/new" element={<NewPage />} />
```

## Best Practices

### DO ✅
- Use `LazyImage` for all images
- Use `useDebounce` for search inputs (300ms)
- Cache GET requests with appropriate TTL
- Clear cache after POST/PUT/DELETE
- Use code splitting for new routes
- Test performance with Lighthouse

### DON'T ❌
- Don't cache POST/PUT/DELETE requests
- Don't use very long cache TTL (> 15 minutes)
- Don't forget to clear cache after mutations
- Don't skip lazy loading for above-fold images (it's still beneficial)
- Don't use debounce for non-search inputs

## Common Patterns

### Search with Filters
```typescript
const [search, setSearch] = useState('');
const [filters, setFilters] = useState({});
const debouncedSearch = useDebounce(search, 300);

useEffect(() => {
  fetchData(debouncedSearch, filters);
}, [debouncedSearch, filters]);
```

### Cached List with Refresh
```typescript
async function fetchList(forceRefresh = false) {
  const cacheKey = 'list-key';
  
  if (!forceRefresh) {
    const cached = apiCache.get(cacheKey);
    if (cached) return cached;
  }
  
  const data = await api.get('/list');
  apiCache.set(cacheKey, data);
  return data;
}

// Force refresh
fetchList(true);
```

### Image Gallery
```typescript
{images.map((img) => (
  <LazyImage
    key={img.id}
    src={img.url}
    alt={img.title}
    className="gallery-image"
  />
))}
```

## Performance Checklist

Before deploying:
- [ ] All images use `LazyImage`
- [ ] Search inputs use `useDebounce`
- [ ] GET requests are cached appropriately
- [ ] Cache is cleared after mutations
- [ ] New routes use lazy loading
- [ ] Lighthouse score > 90
- [ ] No console errors
- [ ] Tested on mobile

## Troubleshooting

**Images not loading:**
- Check src path is correct
- Check network tab for 404s
- Verify placeholder is valid

**Search too slow:**
- Reduce debounce delay (but not below 200ms)
- Check API response time
- Verify debounce is applied

**Stale cached data:**
- Reduce cache TTL
- Clear cache after mutations
- Use forceRefresh parameter

**Large bundle size:**
- Verify lazy loading is working
- Check for duplicate dependencies
- Run bundle analyzer

## Monitoring

```typescript
// Check cache stats
import { apiCache } from './utils';

console.log(apiCache.getStats());
// { size: 10, keys: ['key1', 'key2', ...] }

// Clear cache manually (dev tools)
apiCache.clear();
```

## Resources

- Full documentation: `PERFORMANCE_OPTIMIZATIONS.md`
- Implementation details: `PERFORMANCE_IMPLEMENTATION_SUMMARY.md`
- React docs: https://react.dev/reference/react/lazy
- Web Vitals: https://web.dev/vitals/
