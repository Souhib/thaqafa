import { Link, createFileRoute, useSearch } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { ApiError, unwrap } from "@/api/errors";
import { confirmPasswordResetApiV1AuthPasswordResetConfirmPost } from "@/api/generated/sdk.gen";
import { EightPointStar, Eyebrow, FriezeRule } from "@/components/design";
import { PageShell } from "@/components/reader/PageShell";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/providers/LanguageProvider";

const inputClass =
  "w-full border border-rule bg-paper px-3.5 py-2.5 font-serif text-[16px] text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none focus:ring-0";
const labelTextClass = "font-mono text-[11px] uppercase tracking-[1.6px] text-ink-soft";

const MIN_PASSWORD_CHARS = 8;

interface ResetSearch {
  token?: string;
}

function pickResetErrorMessage(err: unknown, t: (k: string) => string): string {
  if (err instanceof ApiError) {
    if (err.errorCode === "InvalidPasswordResetTokenError")
      return t("auth.errors.invalid_reset_token");
    if (err.status === 422) return t("auth.errors.weak_password");
  }
  return t("auth.errors.generic");
}

function ResetPasswordPage() {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const search = useSearch({ from: "/reset-password" });
  const token = (search as ResetSearch).token ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!token) {
    return (
      <PageShell title={t("auth.reset_password_title")}>
        <div className="mx-auto flex max-w-[440px] flex-col items-center gap-4 pt-2 pb-12 text-center">
          <EightPointStar size={28} className="text-warn" strokeWidth={0.6} />
          <p
            dir={isRTL ? "rtl" : "ltr"}
            className={cn(
              "max-w-[380px] text-[15.5px] leading-[1.55] text-ink-soft text-pretty",
              isRTL ? "font-arabic" : "font-serif italic",
            )}
          >
            {t("auth.missing_token")}
          </p>
          <Link
            to="/forgot-password"
            className="font-mono text-[11.5px] uppercase tracking-[1.4px] text-accent underline decoration-accent/40 underline-offset-[5px] transition-colors hover:decoration-accent"
          >
            {t("auth.forgot_password")}
          </Link>
        </div>
      </PageShell>
    );
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (newPassword.length < MIN_PASSWORD_CHARS) {
      setError(t("auth.errors.weak_password"));
      return;
    }
    setSubmitting(true);
    try {
      const result = await confirmPasswordResetApiV1AuthPasswordResetConfirmPost({
        body: { token, newPassword },
      });
      if (result.error !== undefined) unwrap(result);
      setDone(true);
    } catch (err) {
      setError(pickResetErrorMessage(err, t));
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <PageShell title={t("auth.reset_password_done_title")}>
        <div className="mx-auto flex max-w-[440px] flex-col items-center gap-4 pt-2 pb-12 text-center">
          <EightPointStar size={28} className="text-accent" strokeWidth={0.6} />
          <Eyebrow color="accent" className="mt-3">
            · {t("auth.reset_password_done_title")} ·
          </Eyebrow>
          <h1
            dir={isRTL ? "rtl" : "ltr"}
            className={cn(
              "mt-3 text-[clamp(28px,3.4vw,40px)] font-medium leading-[1.05] text-ink text-balance",
              isRTL ? "font-arabic" : "font-serif tracking-[-1.2px]",
            )}
          >
            {t("auth.reset_password_done_title")}
          </h1>
          <p
            dir={isRTL ? "rtl" : "ltr"}
            className={cn(
              "max-w-[380px] text-[15.5px] leading-[1.55] text-ink-soft text-pretty",
              isRTL ? "font-arabic" : "font-serif italic",
            )}
          >
            {t("auth.reset_password_done_body")}
          </p>
          <FriezeRule rosetteOnly marginTop={20} marginBottom={4} />
          <Link
            to="/sign-in"
            className="cursor-pointer border border-ink bg-ink px-4 py-3 font-mono text-[11.5px] uppercase tracking-[2px] text-paper hover:opacity-90"
          >
            {t("auth.submit_sign_in")}
          </Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title={t("auth.reset_password_title")}>
      <div className="mx-auto flex max-w-[440px] flex-col items-center gap-1 pt-2 pb-12">
        <EightPointStar size={28} className="text-accent" strokeWidth={0.6} />
        <Eyebrow color="accent" className="mt-3">
          · {t("auth.reset_password_title")} ·
        </Eyebrow>
        <h1
          dir={isRTL ? "rtl" : "ltr"}
          className={cn(
            "mt-3 text-center text-[clamp(28px,3.4vw,40px)] font-medium leading-[1.05] text-ink text-balance",
            isRTL ? "font-arabic" : "font-serif tracking-[-1.2px]",
          )}
        >
          {t("auth.reset_password_title")}
        </h1>
        <p
          dir={isRTL ? "rtl" : "ltr"}
          className={cn(
            "mt-3 max-w-[380px] text-center text-[15.5px] leading-[1.5] text-ink-soft text-pretty",
            isRTL ? "font-arabic" : "font-serif italic",
          )}
        >
          {t("auth.reset_password_subtitle")}
        </p>

        <FriezeRule rosetteOnly marginTop={28} marginBottom={24} />

        <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="flex items-baseline justify-between gap-3">
              <span className={labelTextClass}>{t("auth.password")}</span>
              <span className="font-mono text-[10px] tracking-[1px] text-ink-faint">
                {t("auth.password_min_hint", { count: MIN_PASSWORD_CHARS })}
              </span>
            </span>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={MIN_PASSWORD_CHARS}
                autoFocus
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={cn(inputClass, isRTL ? "pl-12" : "pr-12")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? t("auth.hide_password") : t("auth.show_password")}
                className={cn(
                  "absolute inset-y-0 flex items-center px-3 font-mono text-[10.5px] uppercase tracking-[1.4px] text-ink-mute hover:text-ink",
                  isRTL ? "left-0" : "right-0",
                )}
              >
                {showPassword ? t("auth.hide") : t("auth.show")}
              </button>
            </div>
          </label>

          {error && (
            <p
              role="alert"
              dir={isRTL ? "rtl" : "ltr"}
              className={cn(
                "mt-1 border-l-2 border-warn ps-3 font-serif text-[14px] italic leading-[1.45] text-warn",
                isRTL && "border-l-0 border-r-2 ps-0 pe-3",
              )}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 cursor-pointer border border-ink bg-ink px-4 py-3 font-mono text-[11.5px] uppercase tracking-[2px] text-paper transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-50"
          >
            {submitting ? t("auth.submitting") : t("auth.reset_password_submit")}
          </button>
        </form>
      </div>
    </PageShell>
  );
}

export const Route = createFileRoute("/reset-password")({
  validateSearch: (search: Record<string, unknown>): ResetSearch => ({
    token: typeof search.token === "string" ? search.token : undefined,
  }),
  component: ResetPasswordPage,
});
