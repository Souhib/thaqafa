// "Save / Saved" toggle on detail pages.
//
// Hidden entirely when the visitor is anonymous — anonymous reading is
// the default, and a Sign-in CTA next to a reading would dilute the
// editorial focus. Signed-in users see the toggle and either save or
// remove the bookmark.
//
// The icon is the project's editorial mark (eight-point star): outline
// when not saved, filled when saved. Same vocabulary as the masthead
// rather than a generic ♡/♥ that renders inconsistently across fonts.

import { useTranslation } from "react-i18next";
import {
  useBookmarksQuery,
  useCreateBookmarkMutation,
  useDeleteBookmarkMutation,
} from "@/api/bookmarks";
import type { BookmarkOut } from "@/api/generated/types.gen";
import { useAuth } from "@/auth/AuthProvider";
import { cn } from "@/lib/utils";

interface Props {
  targetKind: "event" | "lesson" | "observance" | "person";
  targetSlug: string;
}

function SaveStar({ filled }: { filled: boolean }) {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
      <g stroke="currentColor" strokeWidth={filled ? 0 : 1.1} strokeLinejoin="round">
        <rect x="4" y="4" width="16" height="16" fill={filled ? "currentColor" : "none"} />
        <rect
          x="4"
          y="4"
          width="16"
          height="16"
          transform="rotate(45 12 12)"
          fill={filled ? "currentColor" : "none"}
        />
      </g>
    </svg>
  );
}

const buttonShell =
  "inline-flex cursor-pointer items-center gap-2 border bg-transparent px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[1.6px] transition-colors disabled:opacity-50";

export function SaveButton({ targetKind, targetSlug }: Props) {
  const { t } = useTranslation();
  const { isAuthenticated, isInitialised } = useAuth();
  const bookmarks = useBookmarksQuery({ enabled: isInitialised && isAuthenticated });
  const createMut = useCreateBookmarkMutation();
  const deleteMut = useDeleteBookmarkMutation();

  if (!isInitialised || !isAuthenticated) {
    return null;
  }

  const existing: BookmarkOut | undefined = bookmarks.data?.items.find(
    (b) => b.targetKind === targetKind && b.targetSlug === targetSlug,
  );

  const handleClick = () => {
    if (existing) {
      deleteMut.mutate(existing.id);
    } else {
      createMut.mutate({ targetKind, targetSlug });
    }
  };

  const busy = createMut.isPending || deleteMut.isPending;
  const saved = Boolean(existing);

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy || bookmarks.isLoading}
      aria-pressed={saved}
      aria-label={saved ? t("auth.saved") : t("auth.save")}
      className={cn(
        buttonShell,
        saved
          ? "border-accent text-accent"
          : "border-rule text-ink-soft hover:border-ink hover:text-ink",
      )}
    >
      <SaveStar filled={saved} />
      <span>{saved ? t("auth.saved") : t("auth.save")}</span>
    </button>
  );
}
