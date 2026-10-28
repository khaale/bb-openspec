import { test } from "node:test";
import assert from "node:assert/strict";
import { createI18n, resolveLocale } from "../src/i18n.ts";
import { ACTION, initialPrompt } from "../src/model.ts";
import { CATALOGS } from "../src/messages/index.ts";
import { en } from "../src/messages/en.ts";
import { pluginError, localizedError } from "../src/plugin-error.ts";

test("manual language wins, browser preferences are normalized and unsupported languages fall back to English", () => {
  assert.equal(resolveLocale("en", ["ru-RU"]), "en");
  assert.equal(resolveLocale("ru", ["en-US"]), "ru");
  assert.equal(resolveLocale("auto", ["ru-RU", "en"]), "ru");
  assert.equal(resolveLocale("auto", ["fr-FR", "RU_ru"]), "ru");
  assert.equal(resolveLocale("auto", ["fr-FR", "ja-JP"]), "en");
  assert.equal(resolveLocale(undefined, []), "en");
});

test("catalog keys and interpolation variables match, counts use Intl plurals and numbers", () => {
  for (const catalog of Object.values(CATALOGS)) {
    assert.deepEqual(Object.keys(catalog).sort(), Object.keys(en).sort());
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      const placeholders = (text: string) =>
        [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
      assert.deepEqual(placeholders(catalog[key]), placeholders(en[key]), key);
    }
  }
  const russian = createI18n("ru");
  const english = createI18n("en");
  assert.deepEqual([1, 2, 5, 21].map(russian.taskCount), [
    "1 задача",
    "2 задачи",
    "5 задач",
    "21 задача",
  ]);
  assert.deepEqual([1, 2].map(english.taskCount), ["1 task", "2 tasks"]);
  assert.equal(russian.specCount(3), "3 спецификации");
  assert.equal(
    english.t("progressLabel", { done: 1, total: 1234 }),
    "Task progress: 1 of 1,234",
  );
  assert.equal(russian.number(1234), new Intl.NumberFormat("ru").format(1234));
});

test("cached own errors translate on display while external errors stay unchanged", () => {
  const cached = pluginError("error.changeLimit", { limit: 200 }).message;
  assert.match(cached, /Up to 200 changes/);
  assert.equal(
    localizedError(cached, "ru"),
    "Поддерживается до 200 изменений в источнике.",
  );
  assert.equal(
    localizedError(cached, "en"),
    "Up to 200 changes per source are supported.",
  );
  assert.equal(
    localizedError(new Error("Machine offline"), "ru"),
    "Machine offline",
  );
  assert.equal(
    localizedError("bad [openspec:invalid]", "en"),
    "bad [openspec:invalid]",
  );
});

test("all launch templates stay English independently of UI locale and retain repository paths", () => {
  for (const action of Object.values(ACTION)) {
    const prompt = initialPrompt(action, "example", "/code");
    assert.doesNotMatch(prompt, /[А-Яа-яЁё]/);
    assert.match(prompt, /required language for artifacts/);
    assert.match(prompt, /\/code\/openspec\/changes\/example\//);
  }
  assert.ok(
    initialPrompt(ACTION.APPLY, "example", "/проекты/code").includes(
      "/проекты/code/openspec/changes/example/",
    ),
  );
});
