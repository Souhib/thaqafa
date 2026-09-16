// TanStack Query hooks for the bookmarks endpoints.
//
// All three endpoints are gated behind the `Authorization: Bearer …` header
// stamped by the AuthProvider's request interceptor. The hooks themselves
// are agnostic — they don't read auth state, they just refuse to fire when
// `enabled` is false (callers pass `enabled: isAuthenticated`).

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { unwrap } from "@/api/errors";
import {
  createBookmarkApiV1BookmarksPost,
  deleteBookmarkApiV1BookmarksBookmarkIdDelete,
  listBookmarksApiV1BookmarksGet,
} from "@/api/generated/sdk.gen";
import type { BookmarkCreate, BookmarkList } from "@/api/generated/types.gen";

const BOOKMARKS_QUERY_KEY = ["bookmarks"] as const;

export function useBookmarksQuery(options: { enabled?: boolean } = {}) {
  return useQuery<BookmarkList>({
    queryKey: BOOKMARKS_QUERY_KEY,
    queryFn: async () => unwrap(await listBookmarksApiV1BookmarksGet()),
    enabled: options.enabled ?? true,
  });
}

export function useCreateBookmarkMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: BookmarkCreate) =>
      unwrap(await createBookmarkApiV1BookmarksPost({ body })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: BOOKMARKS_QUERY_KEY }),
  });
}

export function useDeleteBookmarkMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bookmarkId: string) => {
      const result = await deleteBookmarkApiV1BookmarksBookmarkIdDelete({
        path: { bookmark_id: bookmarkId },
      });
      if (result.error !== undefined) {
        // 204 returns empty body; we only throw when there's an explicit error.
        unwrap(result);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: BOOKMARKS_QUERY_KEY }),
  });
}
