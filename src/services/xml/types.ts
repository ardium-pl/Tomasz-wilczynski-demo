// Types generated based on the provided XML schema.
// This is a single file version.

type Flag = 'nie' | 'tak';
type Money = string; // decimal with two fraction digits
type Waluta = string; // 3-letter currency code, e.g. "EUR"
type Kurs = string;   // decimal with up to 9 fraction digits

type Ryczalt = 
  | '3.0%' | '5.5%' | '8.5%' | '10%' | '12%' | '14%' 
  | 'N'    | '2'     | '1';

type Dekret = 
  | 'sprz'   // sprzedaż towarów lub usług
  | 'utarg'  // utarg
  | 'przych' // pozostałe przychody
  | 'zakup'  // zakup towarów handlowych
  | 'koszt'  // koszty uboczne zakupu
  | 'wynagr' // wynagrodzenia
  | 'wydatek'// pozostałe wydatki
  | 'st'     // nabycie środka trwałego
  | 'BR';    // koszt działalności badawczo-rozwojowej

interface Pojazd {
  nr?: string;
  // If present, "odlicz" is fixed as "50"
  odlicz?: '50';
}

interface Suma {
  netto?: Money;
  VAT?: Money;
  $: {
    stawka: 'zw' | 'NP' | '0K' | '0R' | '0E' | '0F' | 'TAXI' | 'RR' | 'super' | 'obniz' | 'podst';
    ext?: 'art100' | 'BO';
  };
}

interface RejVAT {
  data?: string; // xs:date

  // Oznaczenia sprzedaży
  TypSprz?: ('FP' | 'WEW' | 'RO')[];
  ProcSprz?: (
    | 'SW' | 'EE' | 'TP' | 'TT_WNT' | 'TT_D' | 'MR_T' | 'MR_UZ'
    | 'I_42' | 'I_63' | 'B_SPV' | 'B_SPV_DOSTAWA' | 'B_MPV_PROWIZJA'
    | 'MPP' | 'WSTO_EE' | 'IED'
  )[];
  GTU?: (
    | '01' | '02' | '03' | '04' | '05' | '06'
    | '07' | '08' | '09' | '10' | '11' | '12'
    | '13'
  )[];
  SprzKor?: string; // xs:date
  ZD?: string;       // xs:gYearMonth

  // Oznaczenia zakupu
  TypZak?: ('MK' | 'WEW' | 'VAT_RR')[];
  ProcZak?: ('MPP' | 'IMP' | 'MR_T' | 'MR_UZ' | 'TP' | 'TT_WNT')[];
  pojazd?: Pojazd;

  skala?: string;    // xs:gYearMonth
  suma?: Suma[];

  $?: {
    odlicz?: 'nie' | 'paliwa' | 'pojazdy';
    do_ksiegi?: 'brutto';
    sprz?: 'op' | 'zw' | 'zw+op';
    nalezny?: 'WN' | 'IT' | 'IU' | 'DPN';
    art28b?: 'tak';
    art17ust1pkt?: '8' | '7lub8';
    pozastrukt?: 'tak';
    trojkat?: 'tak';
    marza?: string;
  };
}

interface Ksieguj {
  razem?: Money;
  procent?: '75' | '20';
  kwota?: Money;
  // Either data or opis_BR
  data?: string;    // xs:date - for ewidencja przychodów
  opis_BR?: string; // for PKPiR
  $?: {
    ryczalt?: Ryczalt;
  };
}

interface Zaplata {
  data?: string;  // xs:date
  kwota?: Money;  // >0
  waluta?: Waluta;
  kurs1?: Kurs;
  kurs2?: Kurs;   // required if waluta is present
  forma?: 'przelew' | 'gotówka' | 'kompensata';
}

interface Kontrahent {
  NIP?: string;   // up to 14 chars
  nazwa?: string;
  adres?: string;
  $?: {
    VAT?: Flag; // "tak" or "nie"
  };
}

interface Dokument {
  data: string;           // xs:date (required)
  data_walut?: string;    // xs:date
  waluta?: {
    waluta: Waluta;       // required if this block appears
    kurs: Kurs;           // exchange rate
  };
  data_wystawienia?: string; // xs:date
  termin?: string;           // xs:date
  numer?: string;
  KSeF?: string;            // matches the given pattern
  kontrahent?: Kontrahent;
  konto?: string;           // account number
  opis?: string;
  uwagi?: string;
  ksieguj?: Ksieguj;
  rejVAT?: RejVAT;
  zaplata?: Zaplata[];
  $?: {
    dekret?: Dekret;       // default="sprz"
  };
}

export interface Paczka {
  $?: {
    wersja?: '15';  // fixed
    ksiega?: Flag;  // "tak" or "nie"
    VAT?: Flag;     // "tak" or "nie"
    miesiac?: string; // xs:gYearMonth, e.g. "2021-01"
    KSeF?: 'demo' | 'prod'; // default="prod"
  };
  dokument: Dokument[]; // one or more documents
}
