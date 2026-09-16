import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useDatasetMeta } from "@/api/datasetMeta";

// Vite injects this from package.json at build time — see vite.config.ts.
const VERSION = import.meta.env.VITE_APP_VERSION ?? "dev";
const TOTAL_GREGORIAN_DAYS = 366;
const LEGAL_LANGS = new Set(["en", "fr", "ar"]);

/**
 * Resolve the legal-page URL with the current locale as a ``?lang=`` query
 * param. The page itself is one static HTML file with all three languages
 * embedded — its boot script picks the section to show.
 */
function legalHref(kind: "privacy" | "terms", lang: string): string {
  const code = lang.slice(0, 2).toLowerCase();
  if (code === "en" || !LEGAL_LANGS.has(code)) return `/${kind}.html`;
  return `/${kind}.html?lang=${code}`;
}

export function Footer() {
  const { t, i18n } = useTranslation();
  const { data: meta } = useDatasetMeta();

  const fmt = new Intl.NumberFormat(i18n.language === "ar" ? "ar" : i18n.language || "en");
  const stat = meta
    ? [
        t("dataset_depth_events", {
          count: meta.eventCount,
          formatted: fmt.format(meta.eventCount),
        }),
        t("dataset_depth_sacred_days", { count: meta.observanceCount }),
        t("dataset_depth_days_covered", {
          covered: fmt.format(meta.daysWithHeadline),
          total: fmt.format(TOTAL_GREGORIAN_DAYS),
        }),
      ].join(" · ")
    : null;

  // Three balanced cells on desktop (stats / byline / about+tagline+version);
  // stacks centered on mobile.
  return (
    <footer className="border-t border-rule px-[clamp(20px,4vw,56px)] py-5 font-mono text-[12px] uppercase tracking-[1.2px] text-ink-mute">
      <div className="flex flex-col items-center gap-2 text-center sm:grid sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:gap-6 sm:text-start">
        {/* Left — dataset stats */}
        <span className="text-ink-soft sm:justify-self-start">{stat ?? " "}</span>

        {/* Centre — created-by byline */}
        <span className="text-ink-mute sm:justify-self-center">
          {t("curated_by")}{" "}
          <Link
            to="/about"
            className="text-ink underline decoration-rule underline-offset-[3px] hover:text-accent hover:decoration-accent"
          >
            Souhib Trabelsi
          </Link>
        </span>

        {/* Right — about · privacy · terms · version */}
        <span className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 sm:justify-self-end">
          <Link to="/about" className="thaqafa-link">
            {t("about.nav_label")}
          </Link>
          <span aria-hidden="true">·</span>
          <a href={legalHref("privacy", i18n.language)} className="thaqafa-link">
            {t("legal.privacy")}
          </a>
          <span aria-hidden="true">·</span>
          <a href={legalHref("terms", i18n.language)} className="thaqafa-link">
            {t("legal.terms")}
          </a>
          <span aria-hidden="true">·</span>
          <span>
            {VERSION} · 1447 ah {t("build_label")}
          </span>
        </span>
      </div>
    </footer>
  );
}
