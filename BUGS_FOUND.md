# Bugs and Issues Found During Audit

## 🔴 CRITICAL - Fixed

### 1. removeGuidanceFromPrompt() Logic Error
**File**: `lib/services/prompts.service.ts:180-206`
**Status**: ✅ FIXED
**Test Coverage**: ✅ Regression tests added

**Problem**:
```typescript
// BEFORE - BROKEN
async removeGuidanceFromPrompt(promptId: string, guidanceIds: string[]) {
  return this.transaction(async (tx) => {
    // Step 1: Delete ALL guidance (WRONG!)
    await tx.delete(promptGuidance).where(eq(promptGuidance.promptId, promptId));

    // Step 2: Try to query which ones to delete - but already deleted everything!
    const toDelete = await tx.query.promptGuidance.findMany({
      where: eq(promptGuidance.promptId, promptId),
    }); // Returns empty array always
```

**Impact**: Method would delete ALL guidance associations for a prompt, regardless of which specific IDs were requested.

**Fix**: Use `and()` with `inArray()` to delete only specified guidance IDs.

---

## 🟡 PERFORMANCE ISSUES - Identified

### 2. In-Memory Filtering in images.service.ts
**File**: `lib/services/images.service.ts:95-106`
**Status**: ⚠️ NEEDS FIX
**Priority**: High

**Problem**:
```typescript
// Fetches ALL images from database
let result = await query;

// Then filters in memory (inefficient!)
if (options?.favoritesOnly) {
  result = result.filter(img => img.isFavorite);
}

if (options?.limit) {
  result = result.slice(0, options.limit);
}
```

**Impact**:
- Fetches unnecessary data from database
- 10-100x slower for large datasets
- Increases memory usage

**Recommended Fix**:
```typescript
const whereConditions = [inArray(images.generationId, generationIds)];

if (options?.favoritesOnly) {
  whereConditions.push(eq(images.isFavorite, true));
}

const result = await db.query.images.findMany({
  where: and(...whereConditions),
  limit: options?.limit,
  // ...
});
```

---

## 📊 Test Coverage Added

### Tests Written (41 tests, 100% pass rate)

1. **base.service.test.ts** (13 tests)
   - ✅ CRUD operations
   - ✅ Transaction support
   - ✅ Error handling
   - ✅ Automatic updatedAt timestamp

2. **prompts.service.test.ts** (8 tests)
   - ✅ Transaction logic for creating prompts
   - ✅ Guidance deduplication
   - ✅ **REGRESSION TESTS for bug fix** - ensures only specified guidances removed
   - ✅ Cascade delete operations

3. **batches.service.test.ts** (20 tests)
   - ✅ Atomic batch + prompts creation
   - ✅ **Optimistic concurrency control** (version mismatch detection)
   - ✅ Generation creation based on count overrides
   - ✅ Batch completion status calculations
   - ✅ Status updates with completedAt timestamps

### Key Test Findings

- **Version mismatch detection works correctly** - prevents race conditions
- **Transaction rollback works** - ensures data consistency
- **Prompt order preservation works** - maintains user-defined order
- **Count overrides work** - correctly creates multiple generations per prompt

---

## 🔍 Code Quality Issues Identified

### Widespread `any` Usage
**Files**: 10 service files with `/* eslint-disable @typescript-eslint/no-explicit-any */`

**Examples**:
- `batches.service.ts`: Dynamic JSON fields typed as `any`
- `prompts.service.ts`: Drizzle ORM results typed as `any`
- `images.service.ts`: Filter results typed as `any`

**Impact**: Loss of type safety at runtime

**Plan**: Create proper type definitions in Phase 2

---

## ✅ What's Working Well

1. **Transaction Usage** - All multi-step operations properly wrapped
2. **Service Layer Pattern** - Good separation of concerns
3. **JSDoc Documentation** - All public methods documented
4. **Eager Loading** - Prevents N+1 query problems
5. **Singleton Pattern** - Easy service imports

---

## 📈 Next Steps

1. ✅ Fix critical bug (DONE)
2. ✅ Add test infrastructure (DONE)
3. ✅ Write priority tests (DONE - 41 tests)
4. ⏭️ Continue with more service tests
5. ⏭️ Fix performance issues (in-memory filtering)
6. ⏭️ Extract versioning logic to base class
7. ⏭️ Add Zod validation to API routes

---

Last Updated: 2026-01-02
