import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useEventQuery } from "@/api/events";
import { SaveButton } from "@/components/bookmark/SaveButton";
import { formatGregorianDDMMYYYY, formatGregorianLong } from "@/lib/dates";
import {
  FriezeRule,
  VerificationChip,
  isVerificationKind,
  type VerificationKind,
} from "@/components/design";
import { DisputedDateAnnotation } from "@/components/disputed/DisputedDateAnnotation";
import { DisputedDrawer } from "@/components/disputed/DisputedDrawer";
import { BackToTodayCTA } from "@/components/reader/BackToTodayCTA";
import { DetailHeader } from "@/components/reader/DetailHeader";
import { Footer } from "@/components/reader/Footer";
import { Loading } from "@/components/ui/Loading";
import { NotFound } from "@/components/ui/NotFound";
import { trackDisputeOpened, trackEventView } from "@/lib/analytics";
import { pickLocalised, pickLocalisedList, useLanguage } from "@/providers/LanguageProvider";
import { cn } from "@/lib/utils";

function EventDetailPage() {
  const { slug } = Route.useParams();
  const { t } = useTranslation();
  const { lang } = useLanguage();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const query = useEventQuery(slug);

  // Analytics — fire once per slug, not on every language switch.
  useEffect(() => {
    trackEventView(slug);
  }, [slug]);

  useEffect(() => {
    if (query.data) {
      const title = pickLocalised(
        { en: query.data.title, fr: query.data.titleFr, ar: query.data.titleAr },
        lang,
      );
      document.title = `${title} · Thaqafa`;
    }
  }, [query.data, lang]);

  const openDispute = () => {
    trackDisputeOpened(slug);
    setDrawerOpen(true);
  };

  return (
    <div className="min-h-full w-full bg-paper font-serif text-ink">
      <DetailHeader eyebrow={`· ${t("event_detail")} · ${slug} ·`} />

      <main className="mx-auto max-w-[960px] px-[clamp(24px,4vw,56px)] pt-11 pb-[60px]">
        {query.isPending && <Loading labelKey="loading_event" />}
        {query.isError && <NotFound message={`${t("no_event_with_slug")} "${slug}"`} />}
        {query.data && (
          <article>
            <div className="mb-4 flex flex-wrap items-center gap-3.5">
              <span className="font-mono text-[12px] uppercase tracking-[2px] text-accent">
                {t("event_label")} · {query.data.era ? t(query.data.era, query.data.era) : ""}
              </span>
              <div className="h-[0.5px] min-w-3 flex-1 bg-rule" />
              {(() => {
                const kind: VerificationKind = isVerificationKind(query.data.verificationStatus)
                  ? query.data.verificationStatus
                  : "unverified";
                return <VerificationChip kind={kind} label={t(kind)} />;
              })()}
            </div>

            <h1
              dir={lang === "ar" ? "rtl" : "ltr"}
              className={cn(
                "mt-2.5 text-[clamp(32px,4vw,48px)] font-medium leading-[0.98] text-ink text-balance",
                lang === "ar" ? "font-arabic" : "font-serif tracking-[-1.6px]",
              )}
            >
              {pickLocalised(
                { en: query.data.title, fr: query.data.titleFr, ar: query.data.titleAr },
                lang,
              )}
            </h1>
            {query.data.titleAr && (
              <div className="mt-4 text-right font-arabic text-[32px] text-ink-soft" dir="rtl">
                {query.data.titleAr}
              </div>
            )}

            <div className="mt-[28px] mb-3 flex flex-wrap items-baseline gap-[18px]">
              {query.data.hijri &&
                (query.data.disputed ? (
                  <DisputedDateAnnotation value={query.data.hijri} onClick={openDispute} />
                ) : (
                  <span className="font-serif text-[18px] italic text-ink">{query.data.hijri}</span>
                ))}
              {query.data.gregorian && (
                <>
                  {query.data.disputed && !query.data.hijri ? (
                    <DisputedDateAnnotation
                      value={`· ${formatGregorianLong(query.data.gregorian, lang)}`}
                      onClick={openDispute}
                      tone="soft"
                    />
                  ) : (
                    <span className="font-serif text-[16px] italic text-ink-soft">
                      · {formatGregorianLong(query.data.gregorian, lang)}
                    </span>
                  )}
                  <span className="font-mono text-[13px] tracking-[0.8px] text-ink-mute">
                    · {formatGregorianDDMMYYYY(query.data.gregorian)} ·
                  </span>
                </>
              )}
              <span className="ms-auto">
                <SaveButton targetKind="event" targetSlug={slug} />
              </span>
            </div>

            <FriezeRule label={t("introduction")} marginTop={0} marginBottom={14} />
            <p
              dir={lang === "ar" ? "rtl" : "ltr"}
              className={cn(
                "mt-0 text-[20px] leading-[1.4] text-ink-soft text-pretty",
                lang === "ar" ? "font-arabic leading-[1.6]" : "font-serif italic tracking-[-0.2px]",
              )}
            >
              {pickLocalised(
                { en: query.data.summary, fr: query.data.summaryFr, ar: query.data.summaryAr },
                lang,
              )}
            </p>

            {query.data.imageUrl && (
              <figure className="mt-9 border-y border-rule py-5">
                <img
                  src={query.data.imageUrl}
                  alt={
                    pickLocalised(
                      { en: query.data.title, fr: query.data.titleFr, ar: query.data.titleAr },
                      lang,
                    ) ?? ""
                  }
                  className="block h-[320px] w-full object-cover"
                />
              </figure>
            )}

            {(() => {
              const localisedBody = pickLocalisedList(
                {
                  en: query.data.body ?? [],
                  fr: query.data.bodyFr ?? null,
                  ar: query.data.bodyAr ?? null,
                },
                lang,
              );
              return localisedBody.length > 0 ? (
                <>
                  <FriezeRule label={t("the_reading")} marginTop={36} marginBottom={20} />
                  {localisedBody.map((p, i) => (
                    <p
                      key={i}
                      dir={lang === "ar" ? "rtl" : "ltr"}
                      className={cn(
                        "text-[16px] text-ink-soft text-pretty",
                        lang === "ar" ? "font-arabic leading-[1.9]" : "font-serif leading-[1.65]",
                        i === 0 ? "mt-0" : "mt-[18px]",
                      )}
                    >
                      {p}
                    </p>
                  ))}
                </>
              ) : null;
            })()}

            {(query.data.people ?? []).length > 0 && (
              <>
                <FriezeRule label={t("people")} marginTop={36} marginBottom={20} />
                {(query.data.people ?? []).map((p) => (
                  <div key={p.id} className="border-b border-rule-soft py-2.5">
                    <div
                      className={cn(
                        "text-[17px] font-medium leading-[1.2] text-ink",
                        lang === "ar" && p.nameAr ? "font-arabic" : "font-serif",
                      )}
                    >
                      {pickLocalised({ en: p.name, fr: p.nameFr, ar: p.nameAr }, lang)}
                    </div>
                    {p.role && (
                      <div className="mt-1 font-mono text-[12px] tracking-[0.5px] text-ink-mute">
                        {p.role}
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}

            {(query.data.sources ?? []).length > 0 && (
              <>
                <FriezeRule label={t("sources")} marginTop={36} marginBottom={20} />
                {(query.data.sources ?? []).map((s, i) => {
                  const inner = (
                    <>
                      <div
                        className={cn(
                          "font-serif text-[16px] font-medium leading-[1.25] text-ink",
                          s.kind === "classical" ? "italic" : "",
                        )}
                      >
                        {s.label}
                      </div>
                      <div className="mt-1 font-mono text-[12px] uppercase tracking-[0.6px] text-ink-mute">
                        {t(s.kind, s.kind)} {s.verify ? `· ${t("verify")}` : ""}
                      </div>
                    </>
                  );
                  return (
                    <div key={i} className="border-b border-rule-soft py-2.5">
                      {s.verify ? (
                        <a
                          className="thaqafa-link"
                          href={s.verify}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {inner}
                        </a>
                      ) : (
                        inner
                      )}
                    </div>
                  );
                })}
              </>
            )}

            <FriezeRule marginTop={40} marginBottom={10} rosetteOnly />
            <div className="text-center font-mono text-[11.5px] uppercase tracking-[2px] text-ink-mute">
              {t("end_of_entry")}
            </div>
            <BackToTodayCTA />
          </article>
        )}
      </main>

      <Footer />

      {drawerOpen && query.data && (
        <DisputedDrawer event={query.data} onClose={() => setDrawerOpen(false)} />
      )}
    </div>
  );
}

export const Route = createFileRoute("/events/$slug")({
  component: EventDetailPage,
});
