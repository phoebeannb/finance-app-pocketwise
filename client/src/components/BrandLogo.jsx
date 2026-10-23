import { useState } from "react";

const MAYA_DOMAIN = "maya.ph";
const BRANDS = {
  "BDO Unibank": "bdo.com.ph",
  BPI: "bpi.com.ph",
  Metrobank: "metrobank.com.ph",
  Landbank: "landbank.com",
  PNB: "pnb.com.ph",
  "Security Bank": "securitybank.com",
  UnionBank: "unionbankph.com",
  RCBC: "rcbc.com",
  "China Bank": "chinabank.ph",
  "EastWest Bank": "eastwestbanker.com",
  DBP: "dbp.ph",
  PSBank: "psbank.com.ph",
  AUB: "aub.com.ph",
  "Robinsons Bank": "robinsonsbank.com.ph",
  "Maybank Philippines": "maybank.com.ph",
  "HSBC Philippines": "hsbc.com.ph",
  "GoTyme Bank": "gotyme.com.ph",
  "Maya Bank": MAYA_DOMAIN,
  "Tonik Digital Bank": "tonikbank.com",
  "UNO Digital Bank": "uno.bank",
  "SeaBank Philippines": "seabank.ph",
  "CIMB Bank Philippines": "cimbbank.com.ph",
  "UnionDigital Bank": "uniondigitalbank.io",
  OFBank: "ofbank.com.ph",
  GCash: "gcash.com",
  "Maya (PayMaya)": MAYA_DOMAIN,
  ShopeePay: "shopeepay.com",
  GrabPay: "grab.com",
  "Coins.ph": "coins.ph",
  Netflix: "netflix.com",
  Spotify: "spotify.com",
  "YouTube Premium": "youtube.com",
  Disney: "disneyplus.com",
  "Disney+": "disneyplus.com",
  "HBO Max": "max.com",
  iCloud: "icloud.com",
  "Google One": "one.google.com",
  ChatGPT: "chatgpt.com",
  Adobe: "adobe.com",
  Canva: "canva.com",
  "Microsoft 365": "microsoft.com",
  "Amazon Prime": "primevideo.com",
  Viu: "viu.com",
};

const normalize = (value) => String(value || "").trim().toLowerCase();
const findBrand = (value) => {
  const exact = Object.keys(BRANDS).find((name) => normalize(name) === normalize(value));
  if (exact) return BRANDS[exact];
  const match = Object.keys(BRANDS).find((name) => normalize(value).includes(normalize(name)));
  return match ? BRANDS[match] : null;
};

export default function BrandLogo({ name, label, size = "md" }) {
  const [failed, setFailed] = useState(false);
  const brand = findBrand(name);
  const initials = String(label || name || "?").trim().split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const dimensions = size === "sm" ? "h-8 w-8" : "h-10 w-10";

  return (
    <span className={`flex ${dimensions} shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 text-xs font-bold text-slate-600`}>
      {brand && !failed ? (
        <img src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(brand)}&sz=64`} alt="" loading="lazy" referrerPolicy="no-referrer"
          onError={() => setFailed(true)} className="h-full w-full object-contain" />
      ) : initials}
    </span>
  );
}

export { findBrand };
