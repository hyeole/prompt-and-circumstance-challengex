// Unit tests for the helpers added in improve/diag2-fixes-1 (crossing clauses, named states, unexecuted orders, agency
// titles). New wordings, not taken from any case.
import { test } from "node:test";
import assert from "node:assert/strict";
import { affirmedCrossing, crossingClauses, crossingMode, namedStates, orderExplicitlyUnexecuted, isPriorRemoval, statesRemovalOrderOnly } from "../lib/review/facts";

test("crossing clauses: the crossing is separated from approach travel and later transport", () => {
  assert.deepEqual(crossingClauses("He travelled through Mexico by bus and that he waded across the Rio Grande near Hidalgo at night."), ["he waded across the Rio Grande near Hidalgo at night."]);
  assert.equal(crossingClauses("He crossed the border on foot near Lukeville, and a driver took him to Phoenix.").length, 1);
  assert.equal(crossingMode("He crossed the border on foot near Lukeville, and a driver drove him to Phoenix."), "foot");
  assert.equal(crossingMode("He was driven across the Lincoln-Juarez bridge hidden in the trunk of a car."), "vehicle");
  assert.deepEqual(crossingClauses("He has no document allowing him to enter or remain in the United States."), [], "an infinitive is not a crossing");
  assert.deepEqual(crossingClauses("He crossed into Mexico at Tecun Uman in 2019."), [], "entry into another country");
  assert.deepEqual(crossingClauses("He stated that after crossing, he was taken by car to San Antonio, Texas."), [], "transport after the crossing (C001)");
  assert.equal(crossingMode("Once across the river, he was driven to Houston, Texas."), undefined);
});
test("named states: full names and postal abbreviations after a comma; 'Mexico' and lower-case words are not states", () => {
  assert.deepEqual([...namedStates("west of Columbus, New Mexico")], ["New Mexico"]);
  assert.deepEqual([...namedStates("near Nogales, AZ")], ["Arizona"]);
  assert.deepEqual([...namedStates("He entered Mexico in 2019")], []);
  assert.deepEqual([...namedStates("he went in or out of the area")], []);
  assert.deepEqual([...namedStates("2 mile(s) E of NAC")], []);
});
test("explicitly unexecuted orders are distinguished from unknown execution", () => {
  for (const t of ["The order was never executed: he was released on supervision.", "The removal order has not been executed.", "It was never carried out."])
    assert.equal(orderExplicitlyUnexecuted(t), true, t);
  for (const t of ["It is unknown whether the order was executed.", "Records do not show whether the order was executed.", "No record of the order's execution was located.", "The order was executed on 05/02/2016."])
    assert.equal(orderExplicitlyUnexecuted(t), false, t);
});
test("agency titles are not removal events; real removals near them still are", () => {
  assert.equal(isPriorRemoval("Deportation Officer [X] encountered the subject at the ICE office."), false);
  assert.equal(isPriorRemoval("Officers from Enforcement and Removal Operations interviewed the subject."), false);
  assert.equal(isPriorRemoval("Deportation Officer [X] confirmed that the subject was removed to Mexico on 05/02/2016."), true);
  assert.equal(statesRemovalOrderOnly("An immigration judge ordered the subject removed in 2015."), true);
});
test("crossing polarity (helper): only affirmed, actual crossings are crossing clauses", () => {
  for (const t of ["The subject never crossed the border in a truck.", "The subject denied crossing the border in a truck.", "He has not entered the United States since 2019 by any means.",
    "If he had crossed the border in a truck, he would have paid more.", "He planned to cross the border in a truck.", "He tried to cross the border in a truck but was turned back.",
    "The subject denied crossing the border near Columbus, New Mexico."])
    assert.deepEqual(crossingClauses(t), [], t);
  assert.equal(crossingMode("The subject did not cross the border in a truck but walked across near Sasabe, Arizona."), "foot");
  assert.deepEqual([...namedStates(crossingClauses("The subject did not cross near Columbus, New Mexico, but crossed near Sasabe, Arizona.").join(" "))], ["Arizona"]);
  assert.equal(crossingMode("He admitted that he crossed the border in the back of a truck."), "vehicle");
  assert.equal(crossingMode("He has never been inspected and crossed the river on foot near Hidalgo, Texas."), "foot", "negation of something else does not cancel the crossing");
});
test("crossing polarity, event-scoped (helper): contracted, curly and fronted negations; denials; scope ends at the conjunction", () => {
  for (const t of ["The subject didn't cross the border in a truck.", "The subject didn’t cross the border in a truck.", "He hasn't crossed the border in a truck.",
    "At no point did the subject cross the border in a truck.", "At no time did he cross near Columbus, New Mexico.", "Never did he cross the border in a truck.",
    "Not once did he cross the border in a truck.", "The subject did not, at any point, cross the border in a truck.", "He denied that he had ever crossed the border in a truck."])
    assert.deepEqual(crossingClauses(t), [], t);
  // A negated unrelated action does not reach the crossing
  for (const t of ["He did not apply for a visa and crossed the border in a truck near Nogales, Arizona.", "He didn't have papers, so he crossed the border in a truck near Nogales, Arizona.",
    "He has never been inspected but crossed the border in a truck near Nogales, Arizona."])
    assert.equal(crossingMode(t), "vehicle", t);
  // Only the denied phrase is set aside; the affirmed one is read
  assert.equal(crossingMode("The subject didn’t cross the border in a truck but walked across the border near Sasabe, Arizona."), "foot");
  assert.equal(affirmedCrossing("He didn't cross in a truck").trim(), "");
  assert.equal(affirmedCrossing("He crossed in a truck"), "He crossed in a truck");
});
