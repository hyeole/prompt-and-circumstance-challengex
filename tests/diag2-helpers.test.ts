// Unit tests for the helpers added in improve/diag2-fixes-1 (crossing clauses, named states, unexecuted orders, agency
// titles). New wordings, not taken from any case.
import { test } from "node:test";
import assert from "node:assert/strict";
import { crossingClauses, crossingMode, namedStates, orderExplicitlyUnexecuted, isPriorRemoval, statesRemovalOrderOnly } from "../lib/review/facts";

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
