// Probe of the visa-chronology predicates on short texts (offline). Prints each control with the expected and actual result.
// Usage: npx tsx --conditions=react-server scripts/probe-visa-controls.ts
import { visaChronologyConflicts } from "../lib/review/facts";
import { splitSentences } from "../lib/text";
const probes: [string, string, boolean][] = [
  ["R1 possession only, illegal entry (review control 1)", "He entered the United States illegally in 2015 while carrying an old B2 visa. That visa expired in 2012.", false],
  ["R2 renewal denied (review control 2)", "He entered the United States in 2015 as a B2 visa holder. That visa expired in 2012 and was never renewed.", true],
  ["possession only, no manner stated", "He entered the United States in 2015 carrying an old B2 visa. That visa expired in 2012.", false],
  ["illegal entry 'with' a visa in his bag", "He entered the United States illegally in 2015 with an old B2 visa in his bag. That visa expired in 2012.", false],
  ["PAIR possession 'with … in his bag', no 'illegally' (review control)", "He entered the United States in 2015 with an old B2 visa in his bag. That visa expired in 2012.", false],
  ["PAIR 'with a B2 visa', no 'illegally' (use or possession: ambiguous)", "He entered the United States in 2015 with a B2 visa. That visa expired in 2012.", false],
  ["PAIR 'with a B2 visa', illegally", "He entered the United States illegally in 2015 with a B2 visa. That visa expired in 2012.", false],
  ["PAIR 'carrying', illegally", "He entered the United States illegally in 2015 carrying an old B2 visa. That visa expired in 2012.", false],
  ["'on <date> with a visa' is not 'on a visa'", "Subject stated that he entered the United States at San Ysidro, California on 06/10/2016 with a B1/B2 visa. That visa expired on 01/15/2014.", false],
  ["use: 'on a B2 visa'", "He entered the United States in 2015 on a B2 visa. That visa expired in 2012.", true],
  ["use: 'on a B2 visa', illegally (pair)", "He entered the United States illegally in 2015 on a B2 visa. That visa expired in 2012.", false],
  ["use: 'admitted with a B2 visa'", "He entered the United States in 2015 and was admitted with a B2 visa. That visa expired in 2012.", true],
  ["presented the visa for admission", "He entered the United States at San Ysidro in 2015, presenting a B2 visa to the officer. That visa expired in 2012.", true],
  ["KNOWN GAP (out of scope): 'was admitted to' is not an entry verb, so no entry clause is found", "He was admitted to the United States in 2015 as a B2 visitor visa holder. That visa expired in 2012.", false],
  ["admission described with an entry verb", "He entered the United States in 2015 and was admitted as a B2 visitor visa holder. That visa expired in 2012.", true],
  ["used the visa", "He entered the United States in 2015 using a B2 visa. That visa expired in 2012.", true],
  ["replacement denied", "He entered the United States in 2015 as a B2 visa holder. That visa expired in 2012; it was not replaced.", true],
  ["renewal unrelated (passport)", "He entered the United States in 2015 as a B2 visa holder after renewing his passport. That visa expired in 2012.", true],
  ["extension unrelated (lease)", "He entered the United States in 2015 as a B2 visa holder. That visa expired in 2012, and his lease was extended.", true],
  ["affirmative renewal", "He entered the United States in 2015 as a B2 visa holder. That visa expired in 2012 and was renewed in 2014.", false],
  ["affirmative new visa", "He entered the United States in 2015 as a B2 visa holder. That visa expired in 2012; he obtained a new B2 visa in 2014.", false],
  ["affirmative revalidation", "He re-entered the United States in 2015 as a B2 visa holder under automatic visa revalidation. That visa expired in 2012.", false],
  ["affirmative status extension", "He entered the United States in 2015 as a B2 visa holder. That visa expired in 2012, but his status was extended through 2016.", false],
];
let fails = 0;
for (const [why, text, want] of probes) { const got = visaChronologyConflicts(splitSentences(text)).length > 0; if (got !== want) fails++; console.log(`${got === want ? "ok  " : "FAIL"} want=${want} got=${got}  ${why}`); }
console.log(`${fails} not as expected`);
