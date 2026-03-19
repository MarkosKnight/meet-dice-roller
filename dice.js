/**
 * dice.js - Shared dice roll engine
 * Supports expressions like: 1d20, 2d6+3, 4d4-1
 */

function parseDiceExpr(expr) {
  const cleaned = expr.replace(/\s/g, '').toLowerCase();
  const match = cleaned.match(/^(\d+)d(\d+)([+-]\d+)?$/);
  if (!match) return null;
  const count = parseInt(match[1], 10);
  const sides = parseInt(match[2], 10);
  const modifier = match[3] ? parseInt(match[3], 10) : 0;
  if (count < 1 || count > 100) return null;
  if (sides < 2 || sides > 1000) return null;
  return { count, sides, modifier, raw: cleaned };
}

function rollDice(parsed) {
  const rolls = [];
  for (let i = 0; i < parsed.count; i++) {
    rolls.push(1 + Math.floor(Math.random() * parsed.sides));
  }
  const subtotal = rolls.reduce((a, b) => a + b, 0);
  const total = subtotal + parsed.modifier;
  const modStr = parsed.modifier > 0
    ? '+' + parsed.modifier
    : parsed.modifier < 0
      ? '' + parsed.modifier
      : '';
  return { rolls, subtotal, modifier: parsed.modifier, total,
    expr: parsed.count + 'd' + parsed.sides + modStr };
}

function formatRollDetail(result) {
  const rollStr = result.rolls.join(', ');
  if (result.modifier === 0) {
    return result.rolls.length > 1 ? '[' + rollStr + ']' : '';
  }
  const modStr = result.modifier > 0 ? '+' + result.modifier : '' + result.modifier;
  return '[' + rollStr + '] ' + modStr;
}

function formatTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
