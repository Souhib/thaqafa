// Single source of truth for the "Sign in" / "Saves" header affordance.
//
// Drops into Masthead, DetailHeader, and PageShell so every page in the
// app gets the same auth-aware control without having three near-
// identical conditionals to keep in sync.
//
// Visually treated as a bordered chip rather than a plain ``thaqafa-link``
// so it doesn't blend with the editorial nav items (Recent / Sacred
// Days) — sign-in is an action, not a navigation entry, and the editor-
// chrome ought to read that distinction at a glance. Same border-chip
// vocabulary as the theme toggle, with the accent color signalling the
// action affordance; hover fills with accent for the call-to-action
// feel without being aggressive about it.
//
// Returns null while the auth state is still hydrating from localStorage,
// so we don't flash "Sign in" for a tenth of a second to a returning
// signed-in visitor.

import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/auth/AuthProvider";
import { cn } from "@/lib/utils";

interface Props {
  /** Optional extra classes — most callers leave this empty. */
  className?: string;
}

const chipBase =
  "inline-flex cursor-pointer items-center border bg-transparent px-3 py-1.5 font-mono text-[11px] uppercase tracking-[1.6px] transition-colors";

export function AccountLink({ className }: Props) {
  const { t } = useTranslation();
  const { isAuthenticated, isInitialised } = useAuth();

  if (!isInitialised) return null;

  if (isAuthenticated) {
    // Signed-in: muted ink chip — the user is already inside, so this is
    // a navigation back to their saves rather than a CTA.
    return (
      <Link
        to="/saves"
        className={cn(chipBase, "border-rule text-ink hover:border-ink", className)}
      >
        {t("auth.saves")}
      </Link>
    );
  }
  // Signed-out: accent-bordered chip with accent text. The hover fills it
  // for a subtle "join us" pull without raising the visual volume above
  // the editorial typography.
  return (
    <Link
      to="/sign-in"
      className={cn(
        chipBase,
        "border-accent text-accent hover:bg-accent hover:text-paper",
        className,
      )}
    >
      {t("auth.sign_in")}
    </Link>
  );
}
