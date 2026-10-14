export const PH_BANK_GROUPS = [
  {
    group: "Banks",
    options: [
      "BDO Unibank", "BPI", "Metrobank", "Landbank", "PNB", "Security Bank", "UnionBank",
      "RCBC", "China Bank", "EastWest Bank", "DBP", "PSBank", "AUB", "Robinsons Bank",
      "Maybank Philippines", "HSBC Philippines",
    ],
  },
  {
    group: "Digital banks",
    options: [
      "GoTyme Bank", "Maya Bank", "Tonik Digital Bank", "UNO Digital Bank",
      "SeaBank Philippines", "CIMB Bank Philippines", "UnionDigital Bank", "OFBank",
    ],
  },
  {
    group: "E-wallets",
    options: ["GCash", "Maya (PayMaya)", "ShopeePay", "GrabPay", "Coins.ph"],
  },
  { group: "Other", options: ["Cash on hand", "Other bank"] },
];

// Card issuers = banks + digital banks only
export const CARD_ISSUERS = [...PH_BANK_GROUPS[0].options, ...PH_BANK_GROUPS[1].options];