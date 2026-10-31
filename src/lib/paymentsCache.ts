import { get, set } from 'idb-keyval';
import { PaymentRecord } from './payments';

const PAYMENTS_CACHE_KEY = 'srk_payments_persistent_cache_v2';
const PAYMENTS_BACKUP_LS_KEY = 'srk_payments_backup_v2';

export const BASELINE_PAYMENTS: PaymentRecord[] = [
  {
    "docId": "0CXcGNLMDC7Fy5MdR8U4",
    "orderId": "ORD-2026-4883924",
    "grandTotal": "₹37,196",
    "phases": [
      {
        "id": "oml6shccv",
        "sourceType": "Bank",
        "date": "2026-09-22",
        "title": "ADVANCE ",
        "status": "Received",
        "amount": "29800",
        "bankName": "PR",
        "utrNumber": "PR"
      },
      {
        "id": "bqsjnsy74",
        "title": "GST ADJUSTMENTS ",
        "status": "Received",
        "amount": "7396"
      },
      {
        "title": "mahendra ji",
        "id": "lwnekccq7",
        "status": "Received",
        "amount": "2000"
      }
    ],
    "advancePayment": "50% advance payment required at the time of order.",
    "installationCharges": "",
    "transportationCharges": "Rs. 2,000",
    "originalGst": "₹5,673.97 (18%)",
    "originalAmount": "₹31,522.03",
    "customer": "MANISH KUMAWAT"
  },
  {
    "docId": "1QnvUMeIuBBTf6LuhuFS",
    "grandTotal": "₹28,910",
    "installationCharges": "Extra as applicable",
    "orderId": "ORD-2026-3767392",
    "deliveryDate": "2026-10-15",
    "transportationCharges": "Extra as applicable",
    "advancePayment": "Rs. 15,000",
    "phases": [
      {
        "id": "unm8dkuth",
        "utrNumber": "GIVEN TO MAAM",
        "title": "ADVANCE",
        "sourceType": "Cash",
        "status": "Received",
        "amount": "15000",
        "date": "2026-10-12"
      },
      {
        "title": "10",
        "amount": "10",
        "status": "Received",
        "date": "2026-10-15",
        "id": "52ja4xmft",
        "bankName": "PR",
        "sourceType": "Cash"
      },
      {
        "utrNumber": "anshuman@srkmodular.com",
        "amount": "9500",
        "status": "Received",
        "date": "2026-10-25",
        "sourceType": "Cash",
        "title": "Dispatch day",
        "id": "kmnzcfyki"
      }
    ],
    "originalGst": "₹4,410 (18%)",
    "originalAmount": "₹24,500",
    "customer": "CHANDRA PAL MEENA"
  },
  {
    "docId": "5dTql77EKI6w6k30aA0r",
    "grandTotal": "₹55,460",
    "phases": [
      {
        "amount": "1",
        "status": "Received",
        "title": "f",
        "id": "1qk6g73mt"
      }
    ],
    "orderId": "ORD-2026-724",
    "originalGst": "₹8,460 (18%)",
    "transportationCharges": "extra as applicable",
    "advancePayment": "50% advance payment required at the time of order",
    "originalAmount": "₹47,000",
    "installationCharges": "extra as applicable",
    "customer": "NAHIM KHAN"
  },
  {
    "docId": "7kOOS9h5CdYGo5rmEfvX",
    "originalGst": "₹2,070 (18%)",
    "phases": [
      {
        "bankName": "PR",
        "id": "wov77lezt",
        "title": "ADVANCE ",
        "sourceType": "Bank",
        "amount": "10000",
        "status": "Received",
        "date": "2026-09-14"
      },
      {
        "amount": "3570",
        "status": "Received",
        "id": "ono9n2x2o",
        "sourceType": "Cash",
        "title": "ADJUST GST",
        "date": "2026-09-14"
      }
    ],
    "orderId": "ORD-2026-6682485",
    "advancePayment": "50% advance payment required at the time of order.",
    "installationCharges": "extra as applicable",
    "grandTotal": "₹13,570",
    "transportationCharges": "extra as applicable",
    "originalAmount": "₹11,500",
    "customer": "SHIKHA HEALTHCARE"
  },
  {
    "docId": "7xNymtfQwyqT028Nc650",
    "originalAmount": "₹97,300",
    "installationCharges": "Extra as applicable",
    "grandTotal": "₹1,14,814",
    "editReason": "",
    "advancePayment": "50% advance payment required at the time of order.",
    "phases": [
      {
        "sourceType": "Bank",
        "date": "2026-09-18",
        "status": "Received",
        "amount": "27000",
        "bankName": "SBI",
        "id": "656kzbspk",
        "title": "Adavance "
      },
      {
        "bankName": "SBI",
        "amount": "4860",
        "status": "Received",
        "sourceType": "Bank",
        "title": "DISPATCH DAY",
        "id": "sn6oum9z1",
        "date": "2026-09-02"
      },
      {
        "date": "2026-09-02",
        "status": "Received",
        "amount": "70300",
        "id": "fnaco4d5e",
        "title": "dispatch date ",
        "sourceType": "Cash"
      },
      {
        "date": "2026-09-08",
        "title": "Dispatch",
        "sourceType": "Bank",
        "status": "Received",
        "amount": "12,654",
        "utrNumber": "gst",
        "id": "z2y40gzl3"
      }
    ],
    "transportationCharges": "Extra as applicable",
    "originalGst": "₹17,514 (18%)",
    "orderId": "ORD-2026-878",
    "customer": "Ganpati Infa"
  },
  {
    "docId": "87rk0pC40vmwuvemFQv7",
    "transportationCharges": "extra as applicable",
    "installationCharges": "extra as applicable",
    "grandTotal": "₹15,340",
    "originalGst": "₹2,340 (18%)",
    "advancePayment": "50% advance payment required at the time of order",
    "orderId": "ORD-2026-3625520",
    "phases": [
      {
        "sourceType": "Bank",
        "id": "a895gabz9",
        "status": "Received",
        "amount": "15340",
        "bankName": "SBI",
        "title": "dispatch day "
      }
    ],
    "originalAmount": "₹13,000",
    "customer": "SIMRAT DESIGNS BY AMC PVT LTD INDIA"
  },
  {
    "docId": "BbhiGZSPaTuOVFVWCRHe",
    "phases": [
      {
        "date": "2026-08-22",
        "utrNumber": "123456789",
        "amount": "50000",
        "id": "de5gmlciw",
        "status": "Received",
        "title": "advbance"
      },
      {
        "status": "Received",
        "amount": "10000",
        "id": "u8e6g5erp",
        "date": "2026-08-22",
        "title": "1st dispatched"
      }
    ],
    "rateEditHistory": [
      {
        "timestamp": "2026-08-22T11:32:41.292Z",
        "reason": "no",
        "changes": [
          "Transportation: extra as applicable -> 1500",
          "Installation: extra as applicable -> 1000"
        ]
      }
    ],
    "originalGst": "₹24,165 (18%)",
    "editReason": "",
    "transportationCharges": "1500",
    "orderId": "ORD-2026-572",
    "originalAmount": "₹1,34,250",
    "installationCharges": "1000",
    "grandTotal": "₹1,58,415",
    "advancePayment": "50%",
    "customer": "Southern grand hotels pvt. ltd."
  },
  {
    "docId": "BuNrsGtN7ftNuyjNbgVY",
    "transportationCharges": "Rs. 2,000",
    "orderId": "ORD-2026-6248962",
    "phases": [
      {
        "utrNumber": "008062",
        "sourceType": "Cheque",
        "title": "ADVANCE ",
        "id": "wobednoay",
        "date": "2026-09-30",
        "amount": "53035",
        "status": "Received"
      },
      {
        "amount": "2000",
        "status": "Received",
        "date": "2026-09-30",
        "id": "reidh4thu",
        "title": "TRANSPORTATION "
      }
    ],
    "originalGst": "₹8,090.08 (18%)",
    "grandTotal": "₹53,035",
    "advancePayment": "50% advance payment required at the time of order",
    "originalAmount": "₹44,944.92",
    "installationCharges": "Extra as applicable",
    "customer": "monilek Hospital and research center"
  },
  {
    "docId": "F0GcBeR2GUDI37ko16K8",
    "originalGst": "₹2,21,974.56 (872651%)",
    "orderId": "ORD-2026-101",
    "phases": [
      {
        "sourceType": "Cash",
        "title": "Advance ",
        "utrNumber": "pr",
        "status": "Received",
        "amount": "169200",
        "id": "gkrc08bqs",
        "date": "2026-09-09"
      }
    ],
    "installationCharges": "Inclusive",
    "editReason": "",
    "originalAmount": "₹25.44",
    "grandTotal": "₹2,22,000",
    "advancePayment": "50% advance payment required at the time of order.",
    "transportationCharges": "Inclusive",
    "customer": "Srk Modular furniture co."
  },
  {
    "docId": "F2hPR3XNrvDJxOQ1GoRr",
    "originalGst": "₹29,180.44 (18%)",
    "phases": [
      {
        "title": "Advance ",
        "id": "pnv7am2sj",
        "bankName": "SBI",
        "sourceType": "Bank",
        "date": "2026-09-20",
        "status": "Received",
        "amount": "100000"
      },
      {
        "title": "REMAINING ",
        "sourceType": "Bank",
        "date": "2026-09-24",
        "status": "Received",
        "amount": "106044",
        "bankName": "SBI",
        "id": "p2tiop2ba"
      },
      {
        "title": "",
        "id": "gdfxuhjyu",
        "amount": "",
        "status": "Pending"
      }
    ],
    "orderId": "ORD-2026-012",
    "installationCharges": "Rs. 2,500",
    "advancePayment": "50% advance payment required at the time of order.",
    "transportationCharges": "Rs. 2,000",
    "grandTotal": "₹1,91,294",
    "originalAmount": "₹1,62,113.56",
    "customer": "Aryam Pvt Ltd"
  },
  {
    "docId": "HnQ8SBWDOlAxsxTVXDeF",
    "phases": [
      {
        "title": "Full payment ",
        "date": "2026-08-20",
        "bankName": "SBI",
        "status": "Received",
        "amount": "1750",
        "id": "6rpbhp388",
        "sourceType": "Cash"
      },
      {
        "date": "2026-09-05",
        "title": "gst",
        "id": "lg6cq3von",
        "status": "Received",
        "amount": "315"
      }
    ],
    "installationCharges": "Transportation, unloading, packing and installation charges extra as applicable.",
    "orderId": "ORD-2026-638",
    "originalGst": "₹315 (18%)",
    "transportationCharges": "Transportation, unloading, packing and installation charges extra as applicable.",
    "originalAmount": "₹1,750",
    "advancePayment": "50% advance payment required at the time of order.",
    "grandTotal": "₹2,065",
    "customer": "harsh ji"
  },
  {
    "docId": "IlR5aEqaef6O2B6QkwTh",
    "transportationCharges": "extra as applicable",
    "grandTotal": "₹45,135",
    "advancePayment": "50% advance payment required at the time of order.",
    "originalGst": "₹6,885 (18%)",
    "installationCharges": "extra as applicable",
    "originalAmount": "₹38,250",
    "orderId": "ORD-2026-093",
    "phases": [
      {
        "id": "c4qgsjmml",
        "date": "2026-08-22",
        "sourceType": "Bank",
        "status": "Received",
        "amount": "10000",
        "bankName": "SBI",
        "title": "Advance "
      },
      {
        "status": "Received",
        "amount": "35135",
        "sourceType": "Bank",
        "title": "Final Dispatched ",
        "id": "uyh3rbzin",
        "bankName": "SBI",
        "date": "2026-08-25"
      }
    ],
    "customer": "DIGITAL WEBSITE"
  },
  {
    "docId": "J5582pHGeoiXJKNbX2cK",
    "grandTotal": "₹2,87,861",
    "installationCharges": "Transportation, unloading, packing and installation charges extra as applicable.",
    "advancePayment": "50% advance payment required at the time of order.",
    "orderId": "ORD-2026-118",
    "originalGst": "₹43,911 (18%)",
    "originalAmount": "₹2,43,950",
    "transportationCharges": "Transportation, unloading, packing and installation charges extra as applicable.",
    "phases": [
      {
        "amount": "50000",
        "status": "Received",
        "title": "Advance ",
        "date": "2026-08-29",
        "sourceType": "Bank",
        "id": "b2a41jujo",
        "bankName": "SBI"
      },
      {
        "bankName": "SBI",
        "amount": "71975",
        "status": "Received",
        "date": "2026-08-31",
        "id": "b0h4lrh3h",
        "sourceType": "Bank",
        "title": "Advance "
      },
      {
        "bankName": "SBI",
        "sourceType": "Bank",
        "id": "0kebve0ec",
        "title": "Dispatch day",
        "date": "2026-09-05",
        "status": "Received",
        "amount": "31955"
      },
      {
        "bankName": "SBI",
        "sourceType": "Bank",
        "amount": "133931",
        "status": "Received",
        "id": "7ycspnzm5",
        "title": "Dispatch day",
        "date": "2026-09-05"
      }
    ],
    "customer": "Afcons Infrastructure Limited"
  },
  {
    "docId": "KiPFimtL6078yIRtp6b9",
    "phases": [
      {
        "id": "t5m8h047s",
        "amount": "10000",
        "status": "Received",
        "title": "aaa"
      }
    ],
    "advancePayment": "50% advance payment required at the time of order.",
    "transportationCharges": "Transportation, unloading, packing and installation charges extra as applicable.",
    "installationCharges": "Transportation, unloading, packing and installation charges extra as applicable.",
    "originalAmount": "₹16,400",
    "originalGst": "₹2,952 (18%)",
    "orderId": "ORD-2026-550",
    "grandTotal": "₹19,352",
    "customer": "TBR Industries Pvt. Ltd"
  },
  {
    "docId": "LNNFo6WLNOt22N7qnaBg",
    "grandTotal": "₹17,464",
    "phases": [
      {
        "title": "ADVANCE AJDUSTED IN IRST ORDER",
        "id": "0uahyo14j",
        "status": "Received",
        "amount": "15064",
        "date": "2026-09-11",
        "sourceType": "Cash"
      }
    ],
    "originalGst": "₹2,664 (18%)",
    "advancePayment": "50% advance payment required at the time of order.",
    "installationCharges": "installation charges extra as applicable.",
    "originalAmount": "₹14,800",
    "orderId": "ORD-2026-788",
    "transportationCharges": "Transportation, unloading, packing charges extra as applicable.",
    "customer": "KIHAA FOODS AND HOSPITALITY PRIVATE LIMITED"
  },
  {
    "docId": "MFNoyuV6vQo3jwgQAhJ4",
    "originalGst": "₹11,383.17 (18%)",
    "transportationCharges": "extra as applicable",
    "originalAmount": "₹63,239.83",
    "orderId": "ORD-2026-008",
    "phases": [
      {
        "amount": "30000",
        "status": "Received",
        "date": "2026-09-25",
        "sourceType": "Bank",
        "bankName": "SBI",
        "title": "Advance ",
        "id": "bmef1sfsh"
      },
      {
        "sourceType": "Bank",
        "status": "Received",
        "bankName": "Union",
        "amount": "45000",
        "id": "47w1u048t",
        "title": "remaning payment "
      }
    ],
    "advancePayment": "50% advance payment required at the time of order.",
    "grandTotal": "₹74,623",
    "installationCharges": "extra as applicable",
    "customer": "Remotus Services LLP"
  },
  {
    "docId": "MdqXDOX8ALDGimiANyEZ",
    "originalGst": "₹20,169 (18%)",
    "originalAmount": "₹1,12,050",
    "phases": [
      {
        "amount": "28500",
        "status": "Received",
        "date": "2026-09-01",
        "title": "Advance ",
        "bankName": "SBI",
        "sourceType": "Bank",
        "id": "fifwygajh"
      },
      {
        "date": "2026-09-08",
        "status": "Received",
        "amount": "5130",
        "bankName": "SBI",
        "sourceType": "Bank",
        "utrNumber": "gst",
        "id": "mei7ohoi4",
        "title": "Dispatch date"
      },
      {
        "id": "s6wl4d23m",
        "status": "Received",
        "amount": "19000",
        "bankName": "PR",
        "sourceType": "Bank",
        "date": "2026-09-08",
        "title": "Dispatch date"
      },
      {
        "date": "2026-09-08",
        "status": "Received",
        "amount": "25000",
        "sourceType": "Bank",
        "bankName": "PR",
        "title": "Dispatch date",
        "id": "9inj4eshc"
      },
      {
        "sourceType": "Bank",
        "date": "2026-09-08",
        "id": "z1siiprxx",
        "bankName": "PR",
        "status": "Received",
        "amount": "20000",
        "title": "Dispatch date"
      },
      {
        "status": "Received",
        "amount": "19550",
        "id": "0yv2a83nc",
        "sourceType": "Bank",
        "title": "Dispatch date ",
        "date": "2026-09-08",
        "utrNumber": "",
        "bankName": "PR"
      },
      {
        "date": "2026-09-08",
        "title": "gst ",
        "status": "Received",
        "amount": "15,039",
        "id": "g7a4x2j6g"
      }
    ],
    "orderId": "ORD-2026-650",
    "advancePayment": "50% advance payment required at the time of order.",
    "installationCharges": "extra as applicable",
    "transportationCharges": "extra as applicable",
    "grandTotal": "₹1,32,219",
    "customer": "Ganpati Infa"
  },
  {
    "docId": "MtYc8eSOU6IGx5B4QCBz",
    "installationCharges": "Transportation, unloading, packing and installation charges extra as applicable.",
    "originalAmount": "₹12,711.86",
    "grandTotal": "₹15,000",
    "originalGst": "₹2,288.14 (18%)",
    "transportationCharges": "Transportation, unloading, packing and installation charges extra as applicable.",
    "advancePayment": "50% advance payment required at the time of order.",
    "phases": [
      {
        "title": "advance",
        "sourceType": "Bank",
        "date": "2026-09-09",
        "id": "g1c0fgao5",
        "amount": "2100",
        "status": "Received",
        "bankName": "PR"
      },
      {
        "utrNumber": "PR",
        "title": "remaning ",
        "sourceType": "Cash",
        "id": "2fhpvmi64",
        "status": "Received",
        "amount": "12900",
        "date": "2026-09-13"
      }
    ],
    "orderId": "ORD-2026-618",
    "customer": "Subh Aangan"
  },
  {
    "docId": "NX93VRs8tBULhYVBLFGB",
    "installationCharges": "Transportation, unloading, packing and installation charges extra as applicable.",
    "originalAmount": "₹3,000",
    "grandTotal": "₹3,540",
    "advancePayment": "50% advance payment required at the time of order.",
    "phases": [
      {
        "bankName": "PR",
        "id": "0fcxt6dk8",
        "title": "readt to dispatch",
        "status": "Received",
        "amount": "3540",
        "sourceType": "Bank"
      }
    ],
    "transportationCharges": "Transportation, unloading, packing and installation charges extra as applicable.",
    "originalGst": "₹540 (18%)",
    "orderId": "ORD-2026-127",
    "customer": "Srk Modular furniture co."
  },
  {
    "docId": "OtVv9A5hCmZZ3t7YPpCN",
    "transportationCharges": "Extra as applicable",
    "installationCharges": "Extra as applicable",
    "grandTotal": "₹1,25,316",
    "advancePayment": "50% advance payment required at the time of order",
    "originalGst": "₹19,116 (18%)",
    "phases": [
      {
        "id": "zrukpgcfp",
        "title": "CASH ADJUSTED ",
        "date": "2026-09-30",
        "amount": "800",
        "status": "Received"
      },
      {
        "title": "ADVANCE",
        "bankName": "PR",
        "status": "Received",
        "amount": "30000",
        "id": "wj493cqn7",
        "date": "2026-09-28",
        "sourceType": "Bank"
      },
      {
        "title": "ADVANCE ",
        "bankName": "PR",
        "id": "4w3dmzzyp",
        "date": "2026-09-28",
        "status": "Received",
        "amount": "20000",
        "sourceType": "Bank"
      },
      {
        "date": "2026-09-29",
        "bankName": "PR",
        "id": "onjn7xxw5",
        "sourceType": "Bank",
        "status": "Received",
        "amount": "25400",
        "title": "ADVANCE"
      },
      {
        "id": "ewm4lp09m",
        "bankName": "PR",
        "amount": "30000",
        "status": "Received",
        "title": "ADVANCE",
        "sourceType": "Bank",
        "date": "2026-09-29"
      },
      {
        "id": "0a4j37sdz",
        "title": "GST ADJUSTMENT",
        "date": "2026-09-30",
        "status": "Received",
        "amount": "19116"
      }
    ],
    "originalAmount": "₹1,06,200",
    "orderId": "ORD-2026-9502384",
    "customer": "Ganpati Infra"
  },
  {
    "docId": "PFhGvhih8HsyJoH9FcBj",
    "advancePayment": "50% advance payment required at the time of order.",
    "phases": [
      {
        "amount": "12000",
        "status": "Received",
        "id": "vsd5yenko",
        "date": "2026-08-20",
        "title": "Advance ",
        "sourceType": "Cheque"
      },
      {
        "sourceType": "Cheque",
        "amount": "12780",
        "status": "Received",
        "title": "AFTER DISPATCH ",
        "id": "0nc5j86ya",
        "date": "2026-09-10"
      },
      {
        "id": "ltem0frin",
        "amount": "",
        "title": "",
        "status": "Pending"
      },
      {
        "status": "Pending",
        "amount": "",
        "id": "azfkcqrz3",
        "title": ""
      }
    ],
    "originalGst": "₹3,780 (18%)",
    "grandTotal": "₹24,780",
    "originalAmount": "₹21,000",
    "transportationCharges": "Transportation, unloading, packing and installation charges extra as applicable.",
    "orderId": "ORD-2026-636",
    "installationCharges": "Transportation, unloading, packing and installation charges extra as applicable.",
    "customer": "RAGHUDEEP EYE HOSPITAL"
  },
  {
    "docId": "QybNLYJgrtxmI7azzk2R",
    "deliveryDate": "2026-10-27",
    "installationCharges": "extra as applicable",
    "transportationCharges": "extra as applicable",
    "originalGst": "₹7,128 (18%)",
    "orderId": "ORD-2026-7247180",
    "phases": [
      {
        "sourceType": "Cash",
        "date": "2026-10-27",
        "title": "Advance",
        "id": "sz7auzxz8",
        "amount": "10000",
        "status": "Received"
      }
    ],
    "originalAmount": "₹39,600",
    "grandTotal": "₹46,728",
    "advancePayment": "50% advance payment required at the time of order",
    "customer": "NAHIM KHAN"
  },
  {
    "docId": "S54MiZn5jLyvA07Pxji7",
    "originalAmount": "₹18,800",
    "originalGst": "₹3,384 (18%)",
    "phases": [
      {
        "status": "Received",
        "amount": "1000",
        "date": "2026-09-12",
        "title": "Advance ",
        "id": "qh5gibaph",
        "bankName": "SBI",
        "sourceType": "Bank"
      },
      {
        "sourceType": "Bank",
        "bankName": "SBI",
        "id": "mh88gcl8e",
        "title": "Remaning payment ",
        "date": "2026-09-24",
        "amount": "21184",
        "status": "Received"
      }
    ],
    "advancePayment": "50% advance payment required at the time of order.",
    "orderId": "ORD-2026-1457577",
    "grandTotal": "₹22,184",
    "transportationCharges": "extra as applicable",
    "installationCharges": "extra as applicable",
    "customer": "Shanti & Sons"
  },
  {
    "docId": "SONiqh1jSKMX3sXb7GEY",
    "advancePayment": "Rs. 1,000 (Note: 50% also mentioned in T&C)",
    "phases": [
      {
        "title": "mm",
        "date": "2026-08-28",
        "amount": "2500",
        "id": "6tb1lqq0n",
        "status": "Received"
      }
    ],
    "originalGst": "₹5,074.63 (18%)",
    "grandTotal": "₹33,267",
    "originalAmount": "₹28,192.37",
    "editReason": "",
    "transportationCharges": "Rs. 1,5000",
    "rateEditHistory": [
      {
        "reason": "for ",
        "changes": [
          "Transportation: Rs. 1,500 -> Rs. 1,5000"
        ],
        "timestamp": "2026-08-21T08:04:06.361Z"
      }
    ],
    "orderId": "ORD-2026-319",
    "installationCharges": "Rs. 1,500",
    "customer": "RATHORE JWELLERS"
  },
  {
    "docId": "StL55nyab4Ja4vmxIfhr",
    "transportationCharges": "Transportation, unloading, packing and installation charges extra as applicable.",
    "advancePayment": "50% advance payment required at the time of order.",
    "phases": [
      {
        "bankName": "SBI",
        "date": "2026-09-01",
        "id": "3d2yhf6uo",
        "title": "Advance ",
        "status": "Received",
        "amount": "100000",
        "sourceType": "Bank"
      },
      {
        "sourceType": "Bank",
        "amount": "100000",
        "status": "Received",
        "title": "Mid Order",
        "bankName": "SBI",
        "date": "2026-09-14",
        "id": "95wic7lra"
      },
      {
        "sourceType": "Bank",
        "utrNumber": "SEP/14, SEP/16",
        "date": "2026-09-25",
        "amount": "118010",
        "status": "Received",
        "title": "Dispatch day",
        "bankName": "SBI",
        "id": "em4j0xw3j"
      },
      {
        "title": "FLIP BOX PAYMENT",
        "status": "Received",
        "amount": "4130",
        "bankName": "SBI",
        "id": "nnl6ctwk1",
        "date": "2026-09-25",
        "sourceType": "Bank"
      },
      {
        "status": "Pending",
        "amount": "",
        "id": "sqhv6s7zi",
        "title": ""
      }
    ],
    "originalGst": "₹48,510 (18%)",
    "originalAmount": "₹2,69,500",
    "grandTotal": "₹3,18,010",
    "orderId": "ORD-2026-293",
    "installationCharges": "Transportation, unloading, packing and installation charges extra as applicable.",
    "customer": "EMERALD ENTERPRISES"
  },
  {
    "docId": "Ugdexx348kkGqQQG4lk5",
    "grandTotal": "₹23,010",
    "installationCharges": "extra as applicable",
    "transportationCharges": "extra as applicable",
    "orderId": "ORD-2026-344",
    "originalGst": "₹3,510 (18%)",
    "advancePayment": "50% advance payment required at the time of order.",
    "phases": [
      {
        "id": "65ln8kola",
        "amount": "23010",
        "status": "Received",
        "date": "2026-09-01",
        "title": "final payment ",
        "bankName": "SBI",
        "sourceType": "Bank"
      }
    ],
    "originalAmount": "₹19,500",
    "customer": "SIMRAT DESIGNS BY AMC PVT LTD INDIA"
  },
  {
    "docId": "V5EWZ63jpydq0MhOTVHa",
    "phases": [
      {
        "bankName": "SBI",
        "date": "2026-09-24",
        "id": "3lasry566",
        "sourceType": "Bank",
        "status": "Received",
        "amount": "14750",
        "title": "final payment"
      }
    ],
    "originalGst": "₹2,250 (18%)",
    "grandTotal": "₹14,750",
    "advancePayment": "50% advance payment required at the time of order",
    "orderId": "ORD-2026-7774001",
    "installationCharges": "extra as applicable",
    "transportationCharges": "extra as applicable",
    "originalAmount": "₹12,500",
    "customer": "Aryam Pvt Ltd"
  },
  {
    "docId": "Ve0NOhYdVvnX4VcN3sfA",
    "advancePayment": "50% advance payment required at the time of order.",
    "phases": [
      {
        "id": "9j63w0fnw",
        "date": "2026-09-01",
        "title": "Advance ",
        "sourceType": "Bank",
        "status": "Received",
        "amount": "15000",
        "bankName": "SBI"
      },
      {
        "amount": "10842",
        "status": "Received",
        "title": "Dispatch date ",
        "bankName": "SBI",
        "id": "a5xmmtq4f",
        "sourceType": "Bank",
        "date": "2026-09-06"
      }
    ],
    "grandTotal": "₹25,842",
    "originalAmount": "₹21,900",
    "originalGst": "₹3,942 (18%)",
    "orderId": "ORD-2026-110",
    "installationCharges": "Transportation, unloading, packing and installation charges extra as applicable.",
    "transportationCharges": "Transportation, unloading, packing and installation charges extra as applicable.",
    "customer": "Netgleam Consulting Pvt Ltd"
  },
  {
    "docId": "Vyfr78BNgKuBr04JYjsX",
    "grandTotal": "₹1,12,926",
    "transportationCharges": "Extra as applicable",
    "orderId": "ORD-2026-7912816",
    "installationCharges": "Extra as applicable",
    "phases": [
      {
        "title": "ADAVANCE ",
        "status": "Received",
        "amount": "32000",
        "sourceType": "Bank",
        "date": "2026-09-23",
        "bankName": "SBI",
        "id": "1cpncwx14"
      },
      {
        "bankName": "SBI",
        "date": "2026-09-29",
        "title": "ADVANCE",
        "id": "cfqknozj8",
        "amount": "5760",
        "status": "Received",
        "sourceType": "Bank"
      },
      {
        "date": "2026-09-26",
        "id": "xr9r9qcnx",
        "sourceType": "Bank",
        "bankName": "SBI",
        "title": "ADVANCE ",
        "amount": "24500",
        "status": "Received"
      },
      {
        "sourceType": "Bank",
        "date": "2026-09-29",
        "id": "s24096h2b",
        "title": "ADVANCE",
        "bankName": "SBI",
        "amount": "4410",
        "status": "Received"
      },
      {
        "bankName": "PR",
        "id": "1cfj80t4o",
        "title": "ADVANCE",
        "status": "Received",
        "amount": "39200",
        "sourceType": "Bank",
        "date": "2026-09-28"
      },
      {
        "title": "GST ADJUSTMENT",
        "status": "Received",
        "amount": "7056",
        "date": "2026-09-30",
        "id": "vnew0u2e0"
      }
    ],
    "advancePayment": "50% advance payment required at the time of order.",
    "originalGst": "₹17,226 (18%)",
    "originalAmount": "₹95,700",
    "customer": "Ganpati Infra"
  },
  {
    "docId": "WjB1Q3s6OO60ZKCOGxVy",
    "orderId": "ORD-2026-054",
    "advancePayment": "Rs. 25,000",
    "phases": [
      {
        "sourceType": "Bank",
        "bankName": "SBI",
        "title": "Advance ",
        "date": "2026-08-17",
        "id": "t7w7xjmwv",
        "amount": "15000",
        "status": "Received"
      },
      {
        "id": "9yoi1gno6",
        "amount": "10000",
        "status": "Received",
        "title": "Advance ",
        "bankName": "SBI",
        "sourceType": "Bank",
        "date": "2026-08-17"
      },
      {
        "date": "2026-08-18",
        "title": "Dispatch day ",
        "id": "3ff2ynivy",
        "status": "Received",
        "amount": "5250",
        "sourceType": "Bank",
        "bankName": "SBI"
      },
      {
        "utrNumber": "",
        "id": "mcq8am3e9",
        "date": "2026-08-18",
        "sourceType": "Cash",
        "status": "Received",
        "amount": "1000",
        "title": "Transportation Charges"
      }
    ],
    "originalGst": "₹5,417.54 (18%)",
    "installationCharges": "",
    "originalAmount": "₹30,097.46",
    "transportationCharges": "Rs. 1,000",
    "grandTotal": "₹35,515",
    "customer": "V biolife science"
  },
  {
    "docId": "X1m2wQNJp0BMzzpCjEsQ",
    "orderId": "ORD-2026-7247180",
    "originalAmount": "₹39,600",
    "transportationCharges": "extra as applicable",
    "advancePayment": "50% advance payment required at the time of order",
    "phases": [
      {
        "sourceType": "Cash",
        "id": "pk6eq66",
        "amount": "10000",
        "status": "Received",
        "date": "2026-10-22",
        "title": "Advance Payment (50% advance payment required at the time of order)"
      },
      {
        "title": "Balance Before Dispatch",
        "id": "moox0z6",
        "status": "Pending",
        "amount": "Balance Amount"
      }
    ],
    "grandTotal": "₹46,728",
    "originalGst": "₹7,128 (18%)",
    "deliveryDate": "2026-10-27",
    "installationCharges": "extra as applicable",
    "customer": "NAHIM KHAN"
  },
  {
    "docId": "XOuwM8QPpkVlO8QN3Avj",
    "originalAmount": "₹1,02,400",
    "installationCharges": "Transportation, unloading, packing and installation charges extra as applicable.",
    "advancePayment": "50% advance payment required at the time of order.",
    "orderId": "ORD-2026-7995224",
    "grandTotal": "₹1,20,832",
    "deliveryDate": "2026-10-20",
    "originalGst": "₹18,432 (18%)",
    "transportationCharges": "Transportation, unloading, packing and installation charges extra as applicable.",
    "phases": [
      {
        "title": "advance",
        "date": "2026-09-29",
        "status": "Received",
        "amount": "50000",
        "bankName": "SBI",
        "id": "upc99ecmf",
        "sourceType": "Bank"
      },
      {
        "title": "Complete order",
        "sourceType": "Bank",
        "id": "lghi9mahi",
        "bankName": "SBI",
        "date": "2026-10-21",
        "amount": "70832",
        "status": "Received"
      }
    ],
    "customer": "Uday waldorf school"
  },
  {
    "docId": "YNp5rnA94V53giKEVhpm",
    "transportationCharges": "extra as applicable",
    "grandTotal": "₹1,82,546",
    "originalGst": "₹27,846 (18%)",
    "orderId": "ORD-2026-0412906",
    "installationCharges": "extra as applicable",
    "advancePayment": "50% advance payment required at the time of order",
    "originalAmount": "₹1,54,700",
    "phases": [
      {
        "sourceType": "Bank",
        "utrNumber": "048081202708",
        "id": "27j4d4lfq",
        "status": "Received",
        "amount": "50000",
        "bankName": "SBI",
        "title": "Advance",
        "date": "2026-10-13"
      },
      {
        "id": "ynknd0u3t",
        "amount": "82546",
        "status": "Received",
        "sourceType": "Bank",
        "bankName": "SBI",
        "title": "dispatch day",
        "date": "2026-10-24"
      },
      {
        "id": "q4wzpsrxj",
        "status": "Received",
        "amount": "50000",
        "date": "2026-10-24",
        "title": "Dispatch day",
        "sourceType": "Bank",
        "bankName": "SBI"
      }
    ],
    "deliveryDate": "2026-10-23",
    "customer": "CLOTHIQ SOLUTIONS PVT LTD"
  },
  {
    "docId": "YYAobInoCSTow7xqO7Et",
    "orderId": "ORD-2026-842",
    "rateEditHistory": [
      {
        "timestamp": "2026-08-26T06:54:45.871Z",
        "reason": "Simple correction",
        "changes": [
          "Subtotal: ₹8.15 -> 60,250",
          "GST: ₹71,086.85 (872651%) -> 10,845"
        ]
      }
    ],
    "originalGst": "10,845",
    "grandTotal": "₹71,095",
    "installationCharges": "extra as applicable",
    "editReason": "",
    "phases": [
      {
        "status": "Received",
        "amount": "35000",
        "bankName": "SBI",
        "date": "2026-08-25",
        "title": "Advance Payment",
        "id": "bla8o79el",
        "sourceType": "Bank"
      },
      {
        "status": "Received",
        "amount": "36095",
        "bankName": "SBI",
        "date": "2026-09-18",
        "title": "BEFORE DISPATCHED",
        "id": "gqvyrjif7",
        "sourceType": "Bank"
      },
      {
        "id": "kikif3qn0",
        "title": "",
        "amount": "",
        "status": "Pending"
      }
    ],
    "advancePayment": "50% advance payment required at the time of order.",
    "transportationCharges": "extra as applicable",
    "originalAmount": "60,250",
    "customer": "Uday waldorf school"
  },
  {
    "docId": "Ylb55kMc9C0zrHuxabFd",
    "grandTotal": "₹66,990",
    "advancePayment": "50% advance payment required at the time of order.",
    "phases": [
      {
        "amount": "48000",
        "status": "Received",
        "title": "After dispatch (pr)",
        "id": "p7h2twmd9",
        "date": "2026-09-07",
        "sourceType": "Cash"
      },
      {
        "amount": "18880",
        "status": "Received",
        "title": "after dispatch ",
        "sourceType": "Bank",
        "bankName": "SBI",
        "id": "6lhwk37vs",
        "date": "2026-09-09"
      },
      {
        "amount": "1610",
        "status": "Received",
        "id": "8syzn0tjc",
        "date": "2026-09-10",
        "title": "done adjust"
      }
    ],
    "originalAmount": "₹7.71",
    "originalGst": "₹66,982.29 (868931%)",
    "orderId": "ORD-2026-930",
    "transportationCharges": "Rs. 1,500",
    "installationCharges": "",
    "customer": "KIHAA FOODS AND HOSPITALITY PRIVATE LIMITED"
  },
  {
    "docId": "a22GU7pRiMDgBAiSID4J",
    "phases": [
      {
        "sourceType": "Bank",
        "id": "bktbhm2cy",
        "amount": "15340",
        "status": "Received",
        "date": "2026-09-03",
        "title": "Dispatch date ",
        "bankName": "SBI"
      }
    ],
    "grandTotal": "₹15,340",
    "orderId": "ORD-2026-037",
    "transportationCharges": "Transportation, unloading, packing and installation charges extra as applicable.",
    "advancePayment": "50% advance payment required at the time of order.",
    "installationCharges": "Transportation, unloading, packing and installation charges extra as applicable.",
    "originalAmount": "₹13,000",
    "originalGst": "₹2,340 (18%)",
    "customer": "SIMRAT DESIGNS BY AMC PVT LTD INDIA"
  },
  {
    "docId": "asrICqjmBfoFjNrCMTS3",
    "advancePayment": "50% advance payment required at the time of order.",
    "grandTotal": "₹1,78,770",
    "orderId": "ORD-2026-905",
    "phases": [
      {
        "id": "pbsj15fa7",
        "bankName": "SBI",
        "amount": "49900",
        "status": "Received",
        "date": "2026-09-24",
        "title": "Advance ",
        "sourceType": "Bank"
      },
      {
        "date": "2026-09-24",
        "title": "Advance ",
        "status": "Received",
        "amount": "29000",
        "bankName": "SBI",
        "sourceType": "Bank",
        "id": "was8xqo40"
      },
      {
        "bankName": "SBI",
        "title": "Advance ",
        "id": "g0lyxbqlh",
        "amount": "100",
        "status": "Received",
        "sourceType": "Bank",
        "date": "2026-09-24"
      },
      {
        "date": "2026-09-18",
        "id": "jz86wtun8",
        "amount": "81500",
        "status": "Received",
        "sourceType": "Cash",
        "utrNumber": "PR",
        "title": "BEFORE DELIVERY"
      },
      {
        "title": "After Intallastion ",
        "utrNumber": "TAKE Chand ",
        "id": "ajg7om8az",
        "date": "2026-10-13",
        "amount": "3000",
        "status": "Received",
        "sourceType": "Cash"
      },
      {
        "title": "GST Settle ",
        "amount": "15270",
        "status": "Received",
        "id": "30yu2yz9l"
      }
    ],
    "installationCharges": "extra as applicable",
    "originalAmount": "₹1,51,500",
    "transportationCharges": "extra as applicable",
    "originalGst": "₹27,270 (18%)",
    "customer": "Abhishek ji tambi"
  },
  {
    "docId": "bVo6OfsPtyZkguHqT7Xu",
    "originalAmount": "₹77,121.19",
    "transportationCharges": "extra as applicable",
    "grandTotal": "₹91,003",
    "originalGst": "₹13,881.81 (18%)",
    "phases": [
      {
        "id": "9qo9cddfe",
        "status": "Received",
        "amount": "50000",
        "date": "2026-09-19",
        "title": "ADVANCE ",
        "sourceType": "Bank",
        "bankName": "SBI"
      },
      {
        "bankName": "SBI",
        "sourceType": "Bank",
        "date": "2026-09-19",
        "title": "ADVANCE ",
        "id": "pn9ymraa8",
        "status": "Received",
        "amount": "41003"
      }
    ],
    "advancePayment": "50% advance payment required at the time of order.",
    "orderId": "ORD-2026-6744061",
    "installationCharges": "extra as applicable",
    "customer": "PAANDER INFRA SOLUTION PVT LTD"
  },
  {
    "docId": "cxJ5GQoFMkAMO5v6wb0w",
    "phases": [
      {
        "id": "bmkn61ywu",
        "amount": "50000",
        "status": "Received",
        "sourceType": "Bank",
        "title": "Advance ",
        "date": "2026-08-05",
        "bankName": "SBI"
      },
      {
        "bankName": "SBI",
        "status": "Received",
        "amount": "43180",
        "title": "Final Dispatched ",
        "date": "2026-08-19",
        "sourceType": "Bank",
        "id": "4wbheedxt"
      },
      {
        "date": "2026-08-19",
        "sourceType": "Bank",
        "amount": "3500",
        "status": "Received",
        "bankName": "SBI",
        "id": "56dv80fnw",
        "title": "Logistics"
      }
    ],
    "installationCharges": "",
    "orderId": "ORD-2026-074",
    "grandTotal": "₹93,180",
    "originalGst": "₹14,213.9 (18%)",
    "advancePayment": "50% advance payment required at the time of order.",
    "transportationCharges": "Rs. 3,500",
    "originalAmount": "₹78,966.1",
    "customer": "Kadellabs pvt limited"
  },
  {
    "docId": "dV9vIIFymIWzrb2S5Y5m",
    "grandTotal": "₹28,792",
    "installationCharges": "extra as applicable",
    "orderId": "ORD-2026-0796745",
    "advancePayment": "Rs. 24,400",
    "originalGst": "₹4,392 (18%)",
    "originalAmount": "₹24,400",
    "phases": [
      {
        "sourceType": "Cash",
        "title": "Advance ",
        "id": "js22kjdwh",
        "status": "Received",
        "amount": "24400",
        "date": "2026-10-09",
        "utrNumber": "Bhawna Maam"
      },
      {
        "date": "2026-10-09",
        "status": "Received",
        "amount": "4392",
        "title": "Gst Adjustment",
        "id": "qg3tle6zw"
      }
    ],
    "transportationCharges": "extra as applicable",
    "customer": "ANKIT JAYSWAL"
  },
  {
    "docId": "emn07XxS2IV4r1wyzCBB",
    "orderId": "ORD-2026-661",
    "originalGst": "₹24,120 (18%)",
    "phases": [
      {
        "date": "2026-08-12",
        "title": "Advance ",
        "status": "Received",
        "amount": "67000",
        "sourceType": "Cheque",
        "id": "ntudrirqd"
      },
      {
        "sourceType": "Cheque",
        "id": "0m0nqmox5",
        "amount": "91120",
        "status": "Received",
        "title": "Dispatch day",
        "date": "2026-09-03"
      }
    ],
    "originalAmount": "₹1,34,000",
    "transportationCharges": "extra as applicable",
    "grandTotal": "₹1,58,120",
    "advancePayment": "50% advance payment required at the time of order.",
    "installationCharges": "included",
    "customer": "Southern grand hotels pvt. ltd."
  },
  {
    "docId": "emzqCjH9xezzwAtqYwfS",
    "phases": [
      {
        "id": "c3ttbncht",
        "bankName": "SBI",
        "sourceType": "Bank",
        "title": "Advance ",
        "date": "2026-08-26",
        "amount": "20000",
        "status": "Received"
      },
      {
        "amount": "21064",
        "status": "Received",
        "bankName": "SBI",
        "title": "Advance",
        "sourceType": "Bank",
        "date": "2026-08-31",
        "id": "lgnxevddm"
      }
    ],
    "transportationCharges": "extra as applicable",
    "rateEditHistory": [
      {
        "changes": [
          "Advance Payment: 50% -> 0"
        ],
        "reason": "re asuume",
        "timestamp": "2026-08-31T12:03:24.059Z"
      }
    ],
    "originalGst": "₹6,264 (18%)",
    "editReason": "",
    "installationCharges": "extra as applicable",
    "orderId": "ORD-2026-639",
    "advancePayment": "0",
    "grandTotal": "₹41,064",
    "originalAmount": "₹34,800",
    "customer": "SIMRAT DESIGNS BY AMC PVT LTD INDIA"
  },
  {
    "docId": "fPxto3NhP1eNwAiGCYuB",
    "transportationCharges": "Rs. 5,500",
    "originalAmount": "₹49,421.19",
    "phases": [
      {
        "bankName": "SBI",
        "sourceType": "Bank",
        "status": "Received",
        "amount": "29158",
        "id": "oflgmjbib",
        "date": "2026-09-17",
        "title": "Advance "
      },
      {
        "date": "2026-10-02",
        "bankName": "SBI",
        "id": "6mn8ndnss",
        "sourceType": "Bank",
        "title": "Disptach ",
        "status": "Received",
        "amount": "29159"
      },
      {
        "title": "trans adjust",
        "status": "Received",
        "id": "vxy9jz3xk",
        "amount": "5500"
      }
    ],
    "originalGst": "₹8,895.81 (18%)",
    "orderId": "ORD-2026-934",
    "grandTotal": "₹58,317",
    "advancePayment": "50% advance payment required at the time of order.",
    "installationCharges": "",
    "customer": "Shri Bhagwandas todi college"
  },
  {
    "docId": "gjoJAZczrDpPpHVqPh5b",
    "grandTotal": "₹63,770",
    "advancePayment": "Rs. 10,000",
    "transportationCharges": "Rs. 1,500",
    "deliveryDate": "2026-10-20",
    "originalAmount": "₹54,042.37",
    "originalGst": "₹9,727.63 (18%)",
    "phases": [
      {
        "amount": "10000",
        "status": "Received",
        "sourceType": "Cash",
        "title": "Advance",
        "id": "dpopcpvo0",
        "date": "2026-10-27"
      },
      {
        "id": "wc88qz4sl",
        "date": "2026-10-23",
        "bankName": "PNB",
        "title": "dispatch date",
        "sourceType": "Bank",
        "amount": "26000",
        "status": "Received"
      },
      {
        "amount": "17700",
        "status": "Received",
        "date": "2026-10-24",
        "sourceType": "Bank",
        "id": "cstvwuum3",
        "title": "Dispatch date",
        "bankName": "SBI"
      },
      {
        "status": "Received",
        "amount": "3590",
        "title": "transportation adjustment",
        "id": "5pciz4y6j",
        "sourceType": "Cash",
        "date": "2026-10-24"
      }
    ],
    "installationCharges": "Rs. 1,500",
    "orderId": "ORD-2026-4470109",
    "customer": "FEB TELE INDIA"
  },
  {
    "docId": "gltGAB5jWzPRhljWJnsm",
    "phases": [
      {
        "bankName": "SBI",
        "title": "Advance ",
        "sourceType": "Bank",
        "status": "Received",
        "amount": "45000",
        "id": "z5b7t9efq",
        "date": "2026-08-13"
      },
      {
        "sourceType": "Bank",
        "title": "Advance ",
        "bankName": "SBI",
        "status": "Received",
        "amount": "25000",
        "date": "2026-08-13",
        "id": "yiyz4ypyh"
      },
      {
        "sourceType": "Bank",
        "amount": "29000",
        "status": "Received",
        "title": "Advance ",
        "bankName": "SBI",
        "id": "g6f8627np",
        "date": "2026-08-14"
      },
      {
        "id": "blz9wsvxx",
        "bankName": "SBI",
        "sourceType": "Bank",
        "title": "Advance ",
        "date": "2026-08-18",
        "amount": "60000",
        "status": "Received"
      },
      {
        "amount": "88505",
        "status": "Received",
        "id": "pn6fcg9om",
        "title": "Dispatch day",
        "bankName": "SBI",
        "sourceType": "Bank",
        "date": "2026-09-02"
      }
    ],
    "orderId": "ORD-2026-148",
    "originalGst": "₹37,755 (18%)",
    "grandTotal": "₹2,47,505",
    "installationCharges": "extra as applicable",
    "originalAmount": "₹2,09,750",
    "transportationCharges": "extra as applicable",
    "advancePayment": "50% advance payment required at the time of order.",
    "customer": "CHANDRATAAL ENTERPRISES"
  },
  {
    "docId": "j08vVNqYsttoHhUc1m1R",
    "rateEditHistory": [
      {
        "timestamp": "2026-08-31T10:21:12.244Z",
        "changes": [
          "GST: ₹9,124.93 (18%) -> 8820"
        ],
        "reason": "without gst payments "
      },
      {
        "timestamp": "2026-08-31T10:23:49.116Z",
        "changes": [
          "GST: 8820 -> 9124"
        ],
        "reason": "re calculation"
      }
    ],
    "advancePayment": "50% advance payment required at the time of order.",
    "installationCharges": "",
    "orderId": "ORD-2026-675",
    "originalAmount": "₹50,694.07",
    "transportationCharges": "Rs. 2,000",
    "grandTotal": "₹59,819",
    "originalGst": "9124",
    "phases": [
      {
        "bankName": "PR",
        "date": "2026-08-22",
        "amount": "49000",
        "status": "Received",
        "sourceType": "Bank",
        "title": "Full Payment ",
        "id": "3db7xe4qg"
      },
      {
        "id": "zrv83glue",
        "date": "2026-08-24",
        "title": "Logistics ",
        "status": "Received",
        "amount": "2000"
      },
      {
        "date": "2026-08-23",
        "title": "Discount Credited",
        "status": "Received",
        "amount": "3751",
        "id": "gaexw8arr"
      },
      {
        "id": "7ycqknz4b",
        "title": "GST ADJUSTMENT ",
        "status": "Received",
        "amount": "7068"
      }
    ],
    "editReason": "",
    "customer": "MANISH KUMAWAT"
  },
  {
    "docId": "jfaGxU5wqYUQjvEqaWiJ",
    "orderId": "ORD-2026-4844550",
    "originalGst": "₹1,76,270.34 (18%)",
    "grandTotal": "₹11,55,550",
    "phases": [
      {
        "id": "eg1yf3pl7",
        "date": "2026-09-22",
        "sourceType": "Cheque",
        "bankName": "SBI",
        "title": "Advance",
        "amount": "300000",
        "status": "Received"
      }
    ],
    "transportationCharges": "extra as applicable",
    "originalAmount": "₹9,79,279.66",
    "installationCharges": "extra as applicable",
    "advancePayment": "50% advance payment required at the time of order",
    "customer": "Dr. Sunil Beniwal"
  },
  {
    "docId": "jqrG3FQhXF3Imhu0o0BA",
    "phases": [
      {
        "bankName": "SBI",
        "date": "2026-10-22",
        "title": "advance ",
        "amount": "40000",
        "status": "Received",
        "sourceType": "Bank",
        "id": "4kytjjf0s"
      },
      {
        "date": "2026-11-06",
        "sourceType": "Bank",
        "status": "Received",
        "amount": "47398",
        "bankName": "SBI",
        "id": "0i1drnpum",
        "title": "Disptach payment "
      },
      {
        "title": "Settle (discount )",
        "id": "5izdnvd0m",
        "status": "Received",
        "amount": "3500"
      }
    ],
    "transportationCharges": "Rs. 1,500",
    "originalGst": "₹13,331.9 (18%)",
    "installationCharges": "Rs. 2,000",
    "advancePayment": "50% advance payment required at the time of order.",
    "orderId": "ORD-2026-0106457",
    "grandTotal": "₹87,398",
    "originalAmount": "₹74,066.1",
    "customer": "Kohinoor Lifts Pvt. Ltd"
  },
  {
    "docId": "l6T3rSw8bmPrrMZGBXO7",
    "advancePayment": "",
    "phases": [
      {
        "title": "50% Advance Payment",
        "utrNumber": "BKIDY26295236087",
        "date": "2026-10-22",
        "bankName": "SBI",
        "status": "Received",
        "amount": "8965",
        "sourceType": "Bank",
        "id": "qi9fb1i"
      },
      {
        "id": "tji8zsy",
        "status": "Pending",
        "amount": "50%",
        "title": "50% Balance Before Dispatch"
      },
      {
        "title": "",
        "amount": "",
        "status": "Pending",
        "id": "ne3uahrye"
      }
    ],
    "orderId": "ORD-2026-5376329",
    "originalAmount": "₹15,194.92",
    "grandTotal": "₹17,930",
    "installationCharges": "",
    "deliveryDate": "2026-10-28",
    "originalGst": "₹2,735.08 (18%)",
    "transportationCharges": "2,000",
    "customer": "Bhartiya Skill Development University"
  },
  {
    "docId": "lC5oKUWKMS8X8EVbvaWN",
    "orderId": "ORD-2026-6200679",
    "customer": "Gosimplify pvt ltd",
    "grandTotal": "₹2,45,906",
    "originalAmount": "₹2,08,394.92",
    "originalGst": "₹37,511.08 (18%)",
    "installationCharges": "Extra as applicable (2 FLOOR)",
    "transportationCharges": "Rs. 2,000",
    "advancePayment": "50% advance payment required at the time of order",
    "deliveryDate": "2026-10-28",
    "aliases": [
      "ORD-2026-6200679",
      "ORD-2026-3585537",
      "XyVmjpl11I20adRDys53",
      "lC5oKUWKMS8X8EVbvaWN",
      "Gosimplify pvt ltd",
      "Rekha Sharma"
    ],
    "phases": [
      {
        "bankName": "SBI",
        "date": "2026-10-07",
        "title": "Advance 1",
        "status": "Received",
        "amount": "90000",
        "sourceType": "Bank",
        "id": "tje09drws"
      },
      {
        "sourceType": "Bank",
        "date": "2026-10-09",
        "status": "Received",
        "amount": "10000",
        "title": "Advance 2",
        "id": "h0twfic7w",
        "bankName": "SBI"
      },
      {
        "id": "disp_90906",
        "title": "Dispatch / Part Payment",
        "amount": "90906",
        "status": "Received",
        "sourceType": "Bank",
        "bankName": "SBI",
        "date": "2026-10-15"
      },
      {
        "id": "bal_55000",
        "title": "Remaining Balance",
        "amount": "55000",
        "status": "Pending",
        "date": "2026-10-28"
      }
    ]
  },
  {
    "docId": "mOdB59JuwTHiOTGmxnpJ",
    "orderId": "ORD-2026-9711196",
    "originalGst": "₹5,940 (18%)",
    "installationCharges": "Transportation, unloading, packing and installation charges extra as applicable.",
    "grandTotal": "₹38,940",
    "advancePayment": "50% advance payment required at the time of order.",
    "originalAmount": "₹33,000",
    "phases": [
      {
        "sourceType": "Cash",
        "id": "ywj25dml6",
        "title": "FULLY PAID",
        "date": "2026-10-12",
        "amount": "33000",
        "status": "Received"
      },
      {
        "status": "Received",
        "amount": "5940",
        "id": "sdlnwe0at",
        "date": "2026-10-13",
        "title": "GST ADJUSTMENT"
      }
    ],
    "transportationCharges": "Transportation, unloading, packing and installation charges extra as applicable.",
    "customer": "MANISH SHARMA"
  },
  {
    "docId": "meFgiXCKvnKSwLAwOWow",
    "advancePayment": "Rs. 10,000",
    "deliveryDate": "2026-10-26",
    "installationCharges": "extra as applicable",
    "originalAmount": "₹19,000",
    "transportationCharges": "extra as applicable",
    "orderId": "ORD-2026-2833872",
    "phases": [
      {
        "bankName": "PR",
        "title": "ADVANCE",
        "date": "2026-10-11",
        "amount": "10000",
        "status": "Received",
        "id": "ahybqgu38",
        "sourceType": "Bank"
      },
      {
        "sourceType": "Cash",
        "amount": "9000",
        "status": "Received",
        "title": "Dispatch day",
        "date": "2026-10-26",
        "id": "2k53yp1x2"
      }
    ],
    "originalGst": "₹3,420 (18%)",
    "grandTotal": "₹22,420",
    "customer": "MADAN LAL SHARMA"
  },
  {
    "docId": "nJDiSAZ5CbLHAXOVsDRK",
    "originalAmount": "₹3,650",
    "phases": [
      {
        "title": "",
        "id": "mgqu3odup",
        "status": "Pending",
        "amount": ""
      }
    ],
    "deliveryDate": "2026-10-15",
    "advancePayment": "50% advance payment required at the time of order.",
    "installationCharges": "extra as applicable",
    "orderId": "ORD-2026-605",
    "originalGst": "₹657 (18%)",
    "transportationCharges": "extra as applicable",
    "grandTotal": "₹4,307",
    "customer": "Abhishek Ji Mumbai"
  },
  {
    "docId": "pCeMvD9TOnJO9Yi01h5P",
    "originalGst": "₹5,074.63 (18%)",
    "editReason": "",
    "orderId": "ORD-2026-298",
    "grandTotal": "₹33,267",
    "transportationCharges": "Rs. 1,500",
    "advancePayment": "Rs. 1,000 (50% advance payment required at the time of order)",
    "installationCharges": "Rs. 1,500",
    "originalAmount": "₹28,192.37",
    "phases": [
      {
        "amount": "10000",
        "status": "Received",
        "date": "2026-08-20",
        "id": "7bvoqwft2",
        "title": "first dispatched"
      },
      {
        "id": "tiua77naq",
        "title": "partital payment ",
        "date": "2026-08-20",
        "amount": "2000",
        "status": "Received"
      }
    ],
    "customer": "RATHORE JWELLERS"
  },
  {
    "docId": "tqCpGXuqBk0UVMDG7BU7",
    "transportationCharges": "Transportation, unloading, packing and installation charges extra as applicable.",
    "advancePayment": "50% advance payment required at the time of order.",
    "originalAmount": "₹3,79,650",
    "phases": [
      {
        "bankName": "SBI",
        "sourceType": "Bank",
        "date": "2026-09-08",
        "id": "i2jkot7ig",
        "title": "Advance ",
        "amount": "50000",
        "status": "Received"
      },
      {
        "date": "2026-08-27",
        "sourceType": "Bank",
        "bankName": "SBI",
        "title": "advance",
        "id": "wehi0btwi",
        "status": "Received",
        "amount": "100000"
      },
      {
        "bankName": "SBI",
        "date": "2026-09-08",
        "amount": "200000",
        "status": "Received",
        "id": "wpwtzd17e",
        "sourceType": "Bank",
        "title": "dispatch day"
      },
      {
        "amount": "50000",
        "status": "Received",
        "title": "advance ",
        "sourceType": "Bank",
        "id": "lkl06whu9",
        "date": "2026-10-19"
      }
    ],
    "orderId": "ORD-2026-042",
    "originalGst": "₹68,337 (18%)",
    "installationCharges": "Transportation, unloading, packing and installation charges extra as applicable.",
    "grandTotal": "₹4,47,987",
    "customer": "Akhil Agarwal"
  },
  {
    "docId": "vNWKG7pU8W1sTnnBz4El",
    "originalAmount": "₹5,500",
    "phases": [
      {
        "status": "Received",
        "amount": "1000",
        "id": "gh05cx388",
        "title": "advance",
        "sourceType": "Bank",
        "date": "2026-09-12",
        "bankName": "SBI"
      }
    ],
    "advancePayment": "50%",
    "installationCharges": "Extra as applicable",
    "orderId": "ORD-2026-6568403",
    "originalGst": "₹990 (18%)",
    "transportationCharges": "Extra as applicable",
    "grandTotal": "₹6,490",
    "customer": "TERRANOVA FOODS PVT LTD"
  },
  {
    "docId": "wg9x9eTwcluZlawdHSrI",
    "originalAmount": "₹16,400",
    "transportationCharges": "extra as applicable",
    "orderId": "ORD-2026-6578305",
    "originalGst": "₹2,952 (18%)",
    "installationCharges": "extra as applicable",
    "grandTotal": "₹19,352",
    "advancePayment": "50% advance payment required at the time of order.",
    "phases": [
      {
        "id": "3c0749j9u",
        "date": "2026-09-15",
        "title": "ADVANCE",
        "bankName": "SBI",
        "amount": "4000",
        "status": "Received",
        "sourceType": "Bank"
      }
    ],
    "customer": "TBR Industries Pvt. Ltd"
  },
  {
    "docId": "xJcsSW4su0NNE0AckCeh",
    "originalGst": "₹50,134.58 (18%)",
    "orderId": "ORD-2026-4809459",
    "customer": "subhas sir",
    "aliases": [
      "ORD-2026-4809459",
      "ORD-2026-3285735",
      "hVM3ohG3hwlJX7sSphTu",
      "ord_3285735"
    ],
    "installationCharges": "Rs. 16,000",
    "grandTotal": "₹3,28,660",
    "originalAmount": "₹2,78,525.42",
    "phases": [
      {
        "bankName": "SBI",
        "sourceType": "Bank",
        "date": "2026-09-11",
        "id": "681wced7o",
        "title": "ADVANCE",
        "amount": "59000",
        "status": "Received"
      },
      {
        "date": "2026-09-20",
        "id": "k6gn58rq0",
        "utrNumber": "pr",
        "title": "advance ",
        "sourceType": "Cash",
        "status": "Received",
        "amount": "84500"
      },
      {
        "id": "5e871mf83",
        "status": "Received",
        "amount": "50000",
        "bankName": "PR",
        "title": "Dispatch Date",
        "sourceType": "Bank",
        "date": "2026-10-14"
      },
      {
        "title": "Dispatch Date",
        "bankName": "PR",
        "sourceType": "Bank",
        "id": "no7dc0nn5",
        "amount": "50000",
        "status": "Received",
        "date": "2026-10-14"
      },
      {
        "date": "2026-10-15",
        "status": "Received",
        "amount": "25000",
        "utrNumber": "ma'am",
        "title": "Dispatch day",
        "sourceType": "Cash",
        "id": "3gq657qvo"
      },
      {
        "amount": "12500",
        "status": "Received",
        "title": "Dispatch day",
        "sourceType": "Cash",
        "date": "2026-10-23",
        "id": "34ik5ghde"
      }
    ],
    "transportationCharges": "Rs. 3,500",
    "advancePayment": "50% advance payment required at the time of order.",
    "deliveryDate": "2026-10-15"
  },
  {
    "docId": "pay_subhas_alias_3285735",
    "originalGst": "₹50,134.58 (18%)",
    "orderId": "ORD-2026-3285735",
    "customer": "subhas sir",
    "aliases": [
      "ORD-2026-4809459",
      "ORD-2026-3285735",
      "hVM3ohG3hwlJX7sSphTu",
      "ord_3285735"
    ],
    "installationCharges": "Rs. 16,000",
    "grandTotal": "₹3,28,660",
    "originalAmount": "₹2,78,525.42",
    "phases": [
      {
        "bankName": "SBI",
        "sourceType": "Bank",
        "date": "2026-09-11",
        "id": "681wced7o",
        "title": "ADVANCE",
        "amount": "59000",
        "status": "Received"
      },
      {
        "date": "2026-09-20",
        "id": "k6gn58rq0",
        "utrNumber": "pr",
        "title": "advance ",
        "sourceType": "Cash",
        "status": "Received",
        "amount": "84500"
      },
      {
        "id": "5e871mf83",
        "status": "Received",
        "amount": "50000",
        "bankName": "PR",
        "title": "Dispatch Date",
        "sourceType": "Bank",
        "date": "2026-10-14"
      },
      {
        "title": "Dispatch Date",
        "bankName": "PR",
        "sourceType": "Bank",
        "id": "no7dc0nn5",
        "amount": "50000",
        "status": "Received",
        "date": "2026-10-14"
      },
      {
        "date": "2026-10-15",
        "status": "Received",
        "amount": "25000",
        "utrNumber": "ma'am",
        "title": "Dispatch day",
        "sourceType": "Cash",
        "id": "3gq657qvo"
      },
      {
        "amount": "12500",
        "status": "Received",
        "title": "Dispatch day",
        "sourceType": "Cash",
        "date": "2026-10-23",
        "id": "34ik5ghde"
      }
    ],
    "transportationCharges": "Rs. 3,500",
    "advancePayment": "50% advance payment required at the time of order.",
    "deliveryDate": "2026-10-15"
  },
  {
    "docId": "xqqOhHekRyeNP11prmVX",
    "originalGst": "₹35,508.97 (18%)",
    "transportationCharges": "Rs. 6,500",
    "deliveryDate": "2026-10-19",
    "advancePayment": "Rs. 60,000",
    "originalAmount": "₹1,97,272.03",
    "phases": [
      {
        "date": "2026-09-23",
        "status": "Received",
        "amount": "60000",
        "sourceType": "Cash",
        "id": "an1cfaw66",
        "title": "Advance ",
        "utrNumber": "PR"
      },
      {
        "date": "2026-10-16",
        "title": "Mid order",
        "id": "ahatl59x5",
        "sourceType": "Cash",
        "amount": "40000",
        "status": "Received",
        "utrNumber": "maam"
      }
    ],
    "installationCharges": "Rs. 4,500",
    "orderId": "ORD-2026-7288846",
    "grandTotal": "₹2,32,781",
    "customer": "KRISHA business process"
  }
];

export async function getCachedPayments(): Promise<PaymentRecord[]> {
  try {
    const val = await get(PAYMENTS_CACHE_KEY);
    if (val && Array.isArray(val) && val.length > 0) {
      return val;
    }
  } catch (e) {
    console.warn("IndexedDB read error for payments cache:", e);
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const backup = localStorage.getItem(PAYMENTS_BACKUP_LS_KEY);
      if (backup) {
        const parsed = JSON.parse(backup);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
  }

  return BASELINE_PAYMENTS;
}

export async function setCachedPayments(payments: PaymentRecord[]): Promise<void> {
  try {
    await set(PAYMENTS_CACHE_KEY, payments);
  } catch (e) {
    console.warn("IndexedDB write error for payments cache:", e);
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(PAYMENTS_BACKUP_LS_KEY, JSON.stringify(payments));
    } catch (e) {}
  }
}
