# React Query Data Fetching Pattern

## Always Use React Query Hooks Instead of Manual Loading

When fetching data in React components, **always** use React Query hooks (`useQueryApi`) instead of manual loading patterns with `useState` + `useEffect` + manual API calls.

### ✅ Correct Pattern:

```typescript
// In hooks/api/use-my-queries.ts
export function useMyData(inviteCode: string | null | undefined) {
	return useQueryApi<MyDataResponse>(
		inviteCode ? `/api/path/${inviteCode}` : '',
		{
			enabled: !!inviteCode,
		},
	);
}

// In component
const { data, isLoading } = useMyData(inviteCode);
const items = useMemo(() => data?.items || [], [data?.items]);
```

### ❌ Anti-Pattern (DO NOT USE):

```typescript
// DON'T do this:
const [items, setItems] = useState([]);
const [isLoading, setIsLoading] = useState(false);

const loadItems = useCallback(async () => {
	setIsLoading(true);
	try {
		const response = await apiClient.getItems();
		setItems(response.items || []);
	} catch (error) {
		// error handling
	} finally {
		setIsLoading(false);
	}
}, [inviteCode]);

useEffect(() => {
	if (visible && inviteCode) {
		loadItems();
	}
}, [visible, inviteCode, loadItems]);
```

## Key Principles:

1. **Create query hooks** in `hooks/api/` that use `useQueryApi`
2. **Call hooks directly** in components - don't pass data as props
3. **Use query data directly**: `const { data, isLoading } = useMyQueryHook(params)`
4. **Extract data inside useMemo** if needed: `const items = useMemo(() => data?.items || [], [data?.items])`
5. **Never pass fetched data as props** - let components fetch their own data via hooks

## Benefits:

- ✅ Automatic caching and refetching
- ✅ Proper loading states handled by React Query
- ✅ Consistent pattern across codebase
- ✅ Better error handling
- ✅ Automatic invalidation on mutations

## Example from codebase:

See `components/npc-selector.tsx`:
- Uses `useNpcDefinitions(inviteCode)` for NPCs
- Uses `useGameCharacters(inviteCode)` for characters
- No manual loading logic
- No data passed as props

