// Reproduces the independently reported defects A-E against whatever implementation is checked out (no model calls).
import { locatesEntry } from "../lib/review/checklist";
import { modelRoutingReasons } from "../lib/review/review";
import { findingClaim } from "./finding-key";
import { attribution } from "../lib/review/facts";
const S = (text: string) => ({ id: "S1", text, start: 0, end: text.length, page: 1 });
console.log("E never-entered/arrested-in-Detroit locates entry:", locatesEntry("He never entered the United States; agents arrested him in Detroit."));
console.log("E entered-2014/arrested-in-Detroit locates entry:", locatesEntry("He entered the United States in 2014 and was arrested in Detroit in 2017."));
console.log("E control 'entered illegally near Nogales' locates entry:", locatesEntry("He entered the United States illegally near Nogales, Arizona in 2014."));
const invalid = ["Entry date mismatch Narrative gives 2014; form entry.date 05/05/2011. entry.date"];
console.log("A kept reasons:", JSON.stringify(modelRoutingReasons(["Birth date conflict between passport and form", "Entry date conflict; identity cannot be determined", "Impact on charge determination: the selected citation is unsupported"], invalid, []).reasons));
const claim = (e: string) => findingClaim({ id: "C-1", title: "Possible citation mismatch", explanation: e, evidence: [] } as never);
console.log("B opposite removal claims share a key:", claim("The form reports no prior removal; the narrative documents a removal.") === claim("The form documents a removal; the narrative reports no prior removal."));
console.log("D 'Both subjects were interviewed; one subject said he entered in 2014' attribution:", attribution(S("Both subjects were interviewed; one subject said he entered in 2014."), "unclear"));
