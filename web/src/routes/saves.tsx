import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useBookmarksQuery, useDeleteBookmarkMutation } from "@/api/bookmarks";
import type { BookmarkOut } from "@/api/generated/types.gen";
import { useAuth } from "@/auth/AuthProvider";
import { VerifyBanner } from "@/components/auth/VerifyBanner";
import { EightPointStar, Eyebrow, FriezeRule } from "@/components/design";
import { PageShell } from "@/components/reader/PageShell";
import { Loading } from "@/components/ui/Loading";
import { cn } from "@/lib/utils";
import { type Language, pickLocalised, useLanguage } from "@/providers/LanguageProvider";

function targetTitle(b: BookmarkOut, lang: Language): string {
  return (
    pickLocalised(
      { en: b.targetTitle ?? null, fr: b.targetTitleFr ?? null, ar: b.targetTitleAr ?? null },
      lang,
    ) ?? b.targetSlug
  );
}

function detailHref(b: BookmarkOut): string {
  switch (b.targetKind) {
    case "event":
      return `/events/${b.targetSlug}`;
    case "lesson":
      return `/lessons/${b.targetSlug}`;
    case "observance":
      return `/observances/${b.targetSlug}`;
    case "person":
      return `/people/${b.targetSlug}`;
  }
}

function formatDate(iso: string, lang: Language): string {
  try {
    return new Intl.DateTimeFormat(lang, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

function SavesPage() {
  const { t } = useTranslation();
  const { lang, isRTL } = useLanguage();
  const { user, logout } = useAuth();
  const { data, isLoading } = useBookmarksQuery();
  const deleteMut = useDeleteBookmarkMutation();
  const [filter, setFilter] = useState("");

  const items = data?.items ?? [];

  const filtered = useMemo(() => {
    const needle = filter.trim().toLocaleLowerCase();
    if (!needle) return items;
    return items.filter((b) => targetTitle(b, lang).toLocaleLowerCase().includes(needle));
  }, [items, filter, lang]);

  return (
    <PageShell title={t("auth.saves")}>
      <div className="mx-auto max-w-[720px] pt-2 pb-12">
        <div className="flex flex-col items-center gap-1">
          <EightPointStar size={28} className="text-accent" strokeWidth={0.6} />
          <Eyebrow color="accent" className="mt-3">
            · {t("auth.saves")} ·
          </Eyebrow>
          <h1
            dir={isRTL ? "rtl" : "ltr"}
            className={cn(
              "mt-3 text-center text-[clamp(28px,3.4vw,40px)] font-medium leading-[1.05] text-ink text-balance",
              isRTL ? "font-arabic" : "font-serif tracking-[-1.2px]",
            )}
          >
            {t("auth.saves")}
          </h1>
          <p
            dir={isRTL ? "rtl" : "ltr"}
            className={cn(
              "mt-3 max-w-[420px] text-center text-[15px] leading-[1.5] text-ink-soft text-pretty",
              isRTL ? "font-arabic" : "font-serif italic",
            )}
          >
            {t("auth.saves_subtitle")}
          </p>
        </div>

        <FriezeRule rosetteOnly marginTop={28} marginBottom={24} />

        {user && !user.emailVerified && <VerifyBanner email={user.email} />}

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-rule-soft pb-3">
          {user && (
            <span className="font-mono text-[11px] uppercase tracking-[1.4px] text-ink-soft">
              {user.displayName ?? user.email}
            </span>
          )}
          <div className="flex items-center gap-2">
            <Link
              to="/account"
              className="cursor-pointer border border-rule bg-transparent px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[1.6px] text-ink-soft transition-colors hover:border-ink hover:text-ink"
            >
              {t("auth.account_title")}
            </Link>
            <button
              type="button"
              onClick={logout}
              className="cursor-pointer border border-rule bg-transparent px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[1.6px] text-ink-soft transition-colors hover:border-ink hover:text-ink"
            >
              {t("auth.sign_out")}
            </button>
          </div>
        </div>

        <input
          type="search"
          placeholder={t("auth.search_placeholder")}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="mb-7 w-full border border-rule bg-paper px-3.5 py-2.5 font-serif text-[15.5px] text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
        />

        {isLoading && <Loading />}

        {!isLoading && items.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-14">
            <p className="text-center font-serif italic text-ink-soft">{t("auth.saves_empty")}</p>
            <Link
              to="/"
              className="thaqafa-link border border-rule px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[1.6px] text-ink-soft hover:border-ink hover:text-ink"
            >
              {t("today")}
            </Link>
          </div>
        )}

        {!isLoading && items.length > 0 && filtered.length === 0 && (
          <p className="py-10 text-center font-serif italic text-ink-soft">
            {t("auth.saves_no_match")}
          </p>
        )}

        <ul className="flex flex-col">
          {filtered.map((b) => (
            <li
              key={b.id}
              className="flex items-start justify-between gap-4 border-b border-rule-soft py-4"
            >
              <Link to={detailHref(b)} className="thaqafa-link flex flex-1 flex-col gap-2">
                <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <Eyebrow color="accent" className="text-[10.5px]">
                    {t(`auth.saves_kind_${b.targetKind}`)}
                  </Eyebrow>
                  <span className="font-mono text-[10.5px] tracking-[1px] text-ink-faint">
                    · {formatDate(b.createdAt, lang)}
                  </span>
                </span>
                <span
                  dir={isRTL ? "rtl" : "ltr"}
                  className={cn(
                    "text-[18px] font-medium leading-[1.25] text-ink hover:underline text-balance",
                    isRTL ? "font-arabic" : "font-serif",
                  )}
                >
                  {targetTitle(b, lang)}
                </span>
              </Link>
              <button
                type="button"
                onClick={() => deleteMut.mutate(b.id)}
                disabled={deleteMut.isPending}
                aria-label={t("auth.remove")}
                className="mt-1 shrink-0 cursor-pointer border border-rule bg-transparent px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[1.6px] text-ink-soft transition-colors hover:border-warn hover:text-warn disabled:opacity-50"
              >
                {t("auth.remove")}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </PageShell>
  );
}

export const Route = createFileRoute("/saves")({
  component: SavesComponent,
});

function SavesComponent() {
  const { isAuthenticated, isInitialised } = useAuth();
  const navigate = useNavigate();
  // Anonymous visitors get redirected via an effect rather than a render-time
  // ``throw redirect()``: this is the auth-state-transition path during sign-out
  // and the throw can race with the unmount.
  useEffect(() => {
    if (isInitialised && !isAuthenticated) {
      void navigate({ to: "/sign-in", replace: true });
    }
  }, [isInitialised, isAuthenticated, navigate]);

  if (!isInitialised || !isAuthenticated) return null;
  return <SavesPage />;
}
