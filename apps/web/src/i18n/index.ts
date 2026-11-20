import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import common from "./locales/en/common.json";
import errors from "./locales/en/errors.json";

export const SUPPORTED_LOCALES = ["en"] as const;

void i18next.use(initReactI18next).init({
  lng: "en",
  fallbackLng: "en",
  defaultNS: "common",
  ns: ["common", "errors"],
  resources: { en: { common, errors } },
  interpolation: { escapeValue: false },
});

export const i18n = i18next;
