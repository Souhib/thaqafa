// Guards the parsers that turn dataset-shaped refs ("Muslim 2963",
// "18:32-44") into clickable URLs and academic display strings. The
// dataset is hand-edited, so sloppy variants slip in — the tests
// pin the patterns we promise to handle.

import { describe, expect, it } from "vitest";
import {
  firstQuranKey,
  parseHadithRef,
  parseQuranRef,
  reorderRefsQuranFirst,
  splitRefs,
} from "./refs";

describe("parseQuranRef", () => {
  it("parses a single-ayah reference", () => {
    const got = parseQuranRef("5:3");
    expect(got).toMatchObject({
      surah: 5,
      surahName: "al-Māʾida",
      ayahRange: "3",
      url: "https://quran.com/5/3",
    });
    expect(got?.display).toContain("al-Māʾida");
  });

  it("parses a verse range", () => {
    const got = parseQuranRef("18:32-44");
    expect(got?.surah).toBe(18);
    expect(got?.surahName).toBe("al-Kahf");
    expect(got?.url).toBe("https://quran.com/18/32-44");
  });

  it("rejects out-of-range surah numbers", () => {
    expect(parseQuranRef("0:1")).toBeNull();
    expect(parseQuranRef("115:1")).toBeNull();
  });

  it("rejects non-numeric input", () => {
    expect(parseQuranRef("not a ref")).toBeNull();
    expect(parseQuranRef("Bukhari 220")).toBeNull();
    expect(parseQuranRef("")).toBeNull();
  });

  it("trims whitespace around the input", () => {
    expect(parseQuranRef("  2:158  ")?.surah).toBe(2);
  });
});

describe("parseHadithRef", () => {
  it("parses bare collection + number for Bukhārī", () => {
    const got = parseHadithRef("Bukhari 2004");
    expect(got).toMatchObject({
      collectionKey: "bukhari",
      number: "2004",
      url: "https://sunnah.com/bukhari:2004",
    });
    expect(got?.display).toBe("Bukhārī 2004");
  });

  it("parses 'Sahih Muslim NNN'", () => {
    const got = parseHadithRef("Sahih Muslim 2963");
    expect(got?.collectionKey).toBe("muslim");
    expect(got?.url).toBe("https://sunnah.com/muslim:2963");
  });

  it("parses Abu Dawud / Tirmidhi / Nasa'i variants", () => {
    expect(parseHadithRef("Abu Dawud 1522")?.collectionKey).toBe("abudawud");
    expect(parseHadithRef("Sunan Abi Dawud 4753")?.collectionKey).toBe("abudawud");
    expect(parseHadithRef("Tirmidhi 889")?.collectionKey).toBe("tirmidhi");
    expect(parseHadithRef("Jami at-Tirmidhi 3747")?.collectionKey).toBe("tirmidhi");
    expect(parseHadithRef("Nasa'i 1303")?.collectionKey).toBe("nasai");
    expect(parseHadithRef("Sunan an-Nasa'i 466")?.collectionKey).toBe("nasai");
  });

  it("rejects unknown collections", () => {
    expect(parseHadithRef("XYZ 123")).toBeNull();
    expect(parseHadithRef("Made up 999")).toBeNull();
  });

  it("rejects entries that don't end with a number", () => {
    expect(parseHadithRef("Bukhari")).toBeNull();
    expect(parseHadithRef("Bukhari abc")).toBeNull();
  });
});

describe("splitRefs", () => {
  it("splits comma-separated and trims", () => {
    expect(splitRefs("Bukhari 953, Bukhari 986, Muslim 889")).toEqual([
      "Bukhari 953",
      "Bukhari 986",
      "Muslim 889",
    ]);
  });

  it("returns [] for null/undefined/empty", () => {
    expect(splitRefs(null)).toEqual([]);
    expect(splitRefs(undefined)).toEqual([]);
    expect(splitRefs("")).toEqual([]);
    expect(splitRefs("   ")).toEqual([]);
  });
});

describe("reorderRefsQuranFirst", () => {
  it("moves a Qur'an piece in front of a hadith piece", () => {
    expect(reorderRefsQuranFirst("Sahih Muslim 2963; Qur'an 18:32-44")).toBe(
      "Qur'an 18:32-44; Sahih Muslim 2963",
    );
  });

  it("recognises bare surah:ayah as a Qur'an ref", () => {
    expect(reorderRefsQuranFirst("Bukhari 660; 2:255")).toBe("2:255; Bukhari 660");
  });

  it("preserves the original order when Qur'an is already first", () => {
    expect(reorderRefsQuranFirst("Qur'an 2:255; Bukhari 660")).toBe("Qur'an 2:255; Bukhari 660");
  });

  it("preserves order between non-Qur'an pieces", () => {
    expect(reorderRefsQuranFirst("al-Tabari, Tarikh; Ibn Kathir; Qur'an 2:255")).toBe(
      "Qur'an 2:255; al-Tabari, Tarikh; Ibn Kathir",
    );
  });

  it("matches French 'Coran' and 'Sourate' prefixes", () => {
    expect(reorderRefsQuranFirst("Bukhari 1; Coran 1:1")).toBe("Coran 1:1; Bukhari 1");
    expect(reorderRefsQuranFirst("Muslim 2; Sourate al-Baqara 2:255")).toBe(
      "Sourate al-Baqara 2:255; Muslim 2",
    );
  });

  it("leaves single-piece strings untouched", () => {
    expect(reorderRefsQuranFirst("Bukhari 1")).toBe("Bukhari 1");
    expect(reorderRefsQuranFirst("Qur'an 2:255")).toBe("Qur'an 2:255");
  });

  it("does not split on commas (multi-ayah refs stay intact)", () => {
    expect(reorderRefsQuranFirst("Qur'an 2:255, 3:97")).toBe("Qur'an 2:255, 3:97");
    expect(reorderRefsQuranFirst("Bukhari 660; Qur'an 2:255, 3:97")).toBe(
      "Qur'an 2:255, 3:97; Bukhari 660",
    );
  });

  it("returns empty for null / undefined / empty", () => {
    expect(reorderRefsQuranFirst(null)).toBe("");
    expect(reorderRefsQuranFirst(undefined)).toBe("");
    expect(reorderRefsQuranFirst("")).toBe("");
  });
});

describe("firstQuranKey", () => {
  it("extracts the surah:ayah from a labelled ref", () => {
    expect(firstQuranKey("Qur'an 31:13")).toBe("31:13");
  });

  it("returns the first key when multiple are listed", () => {
    expect(firstQuranKey("2:255, 3:97")).toBe("2:255");
  });

  it("collapses a range to its first ayah", () => {
    expect(firstQuranKey("Qur'an 18:32-44")).toBe("18:32");
  });

  it("rejects out-of-range surah numbers", () => {
    expect(firstQuranKey("200:1")).toBeNull();
  });

  it("returns null on null / empty input", () => {
    expect(firstQuranKey(null)).toBeNull();
    expect(firstQuranKey(undefined)).toBeNull();
    expect(firstQuranKey("")).toBeNull();
  });

  it("returns null when no surah:ayah pattern is present", () => {
    expect(firstQuranKey("Bukhari 660")).toBeNull();
  });
});
