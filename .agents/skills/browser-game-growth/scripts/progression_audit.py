#!/usr/bin/env python3
"""Basic, dependency-free audit for an illustrative cumulative-XP progression table.

Run: python progression_audit.py --config sample_progression.json

This estimates minimum whole sessions assuming fixed, uninterrupted earnings.
It is not a gameplay quality measurement or a retention predictor.
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path
from typing import Any


def nonnegative_number(value: Any) -> bool:
    return type(value) in (int, float) and math.isfinite(value) and value >= 0


def positive_number(value: Any) -> bool:
    return nonnegative_number(value) and value > 0


def positive_int(value: Any) -> bool:
    return type(value) is int and value > 0


def analyze(config: Any) -> tuple[list[str], list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []
    notes: list[str] = []

    if not isinstance(config, dict):
        return ["Config must be a JSON object."], warnings, notes

    estimates = config.get("session_estimates", {})
    if not isinstance(estimates, dict):
        errors.append("session_estimates must be an object.")
        estimates = {}

    xp_rate = estimates.get("xp_earned")
    currency_rate = estimates.get("currency_earned")
    if not positive_number(xp_rate):
        errors.append("session_estimates.xp_earned must be a positive finite number.")
        xp_rate = None
    if not positive_number(currency_rate):
        warnings.append("No positive session_estimates.currency_earned; cost estimates omitted.")
        currency_rate = None

    levels = config.get("levels")
    if not isinstance(levels, list) or not levels:
        return errors + ["levels must be a nonempty array."], warnings, notes

    level_thresholds: dict[int, float] = {}
    level_unlocks: dict[str, int] = {}
    prev_threshold = -1.0
    prev_level = 0
    for index, entry in enumerate(levels):
        location = f"levels[{index}]"
        if not isinstance(entry, dict):
            errors.append(f"{location} must be an object.")
            continue
        level = entry.get("level")
        threshold = entry.get("total_xp_required")
        if not positive_int(level):
            errors.append(f"{location}.level must be a positive integer.")
        else:
            if level != prev_level + 1:
                errors.append(f"{location}.level expected {prev_level + 1}, got {level} (levels must be consecutive).")
            if level in level_thresholds:
                errors.append(f"Duplicate level {level}.")
            prev_level = level
        if not nonnegative_number(threshold):
            errors.append(f"{location}.total_xp_required must be finite and nonnegative.")
        else:
            if index == 0 and threshold != 0:
                errors.append("First listed level must have total_xp_required = 0.")
            if index > 0 and threshold <= prev_threshold:
                errors.append(f"{location}.total_xp_required must increase strictly.")
            prev_threshold = threshold
            if positive_int(level):
                level_thresholds[level] = threshold
        unlocks = entry.get("unlock_ids", [])
        if not isinstance(unlocks, list):
            errors.append(f"{location}.unlock_ids must be a list of strings.")
            continue
        for uid in unlocks:
            if not isinstance(uid, str) or not uid.strip():
                errors.append(f"{location}: unlock ID must be a nonempty string.")
            elif uid in level_unlocks:
                errors.append(f"Unlock '{uid}' appears at levels {level_unlocks[uid]} and {level}.")
            elif positive_int(level):
                level_unlocks[uid] = level

    if xp_rate is not None:
        notes.append("Level timing (minimum estimated sessions; assumes fixed earnings and no other XP constraints):")
        for level, threshold in sorted(level_thresholds.items()):
            notes.append(f"  Level {level}: {threshold:g} cumulative XP; ~{math.ceil(threshold / xp_rate)} session(s)")

    meaningful = config.get("meaningful_unlock_ids", [])
    if not isinstance(meaningful, list):
        errors.append("meaningful_unlock_ids must be an array.")
        meaningful = []
    first_meaningful_sessions: int | None = None
    for uid in meaningful:
        if not isinstance(uid, str):
            errors.append("Each meaningful_unlock_ids entry must be a string.")
            continue
        if uid not in level_unlocks:
            errors.append(f"Meaningful unlock '{uid}' is not found in levels[].unlock_ids.")
            continue
        if xp_rate is not None:
            session_count = math.ceil(level_thresholds[level_unlocks[uid]] / xp_rate)
            if first_meaningful_sessions is None or session_count < first_meaningful_sessions:
                first_meaningful_sessions = session_count
    if not meaningful:
        warnings.append("No meaningful_unlock_ids defined; early progress cannot be assessed.")

    max_first = config.get("target_max_sessions_to_first_meaningful_unlock")
    if max_first is not None and not positive_int(max_first):
        errors.append("target_max_sessions_to_first_meaningful_unlock must be a positive integer.")
    elif positive_int(max_first) and first_meaningful_sessions is not None:
        if first_meaningful_sessions > max_first:
            warnings.append(
                f"First meaningful unlock estimated at session {first_meaningful_sessions}; "
                f"your stated target is session {max_first}."
            )
        else:
            notes.append(
                f"First meaningful unlock is estimated by session {first_meaningful_sessions} "
                f"(at or before configured target {max_first})."
            )

    upgrades = config.get("upgrades", [])
    if not isinstance(upgrades, list):
        errors.append("upgrades must be an array.")
        upgrades = []
    seen_upgrades: set[str] = set()
    for index, upgrade in enumerate(upgrades):
        location = f"upgrades[{index}]"
        if not isinstance(upgrade, dict):
            errors.append(f"{location} must be an object.")
            continue
        uid = upgrade.get("id")
        cost = upgrade.get("cost_currency")
        required = upgrade.get("requires_level")
        if not isinstance(uid, str) or not uid.strip():
            errors.append(f"{location}.id must be a nonempty string.")
        elif uid in seen_upgrades:
            errors.append(f"Duplicate upgrade ID '{uid}'.")
        else:
            seen_upgrades.add(uid)
        if not nonnegative_number(cost):
            errors.append(f"{location}.cost_currency must be finite and nonnegative.")
        if not positive_int(required) or required not in level_thresholds:
            errors.append(f"{location}.requires_level must match a listed level.")
        if (xp_rate is not None and currency_rate is not None
                and positive_int(required) and required in level_thresholds
                and nonnegative_number(cost)):
            xp_sessions = math.ceil(level_thresholds[required] / xp_rate)
            money_sessions = math.ceil(cost / currency_rate)
            notes.append(
                f"  Upgrade {uid}: earliest ~{max(xp_sessions, money_sessions)} session(s) "
                "assuming no other spending and independent XP/currency earning."
            )

    return errors, warnings, notes


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", required=True, type=Path, help="JSON progression snapshot to audit")
    args = parser.parse_args()
    try:
        config = json.loads(args.config.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(f"ERROR: cannot load configuration: {exc}", file=sys.stderr)
        return 2

    errors, warnings, notes = analyze(config)
    for line in notes:
        print(line)
    for line in warnings:
        print(f"WARNING: {line}")
    for line in errors:
        print(f"ERROR: {line}")
    if errors:
        print(f"FAIL: {len(errors)} error(s), {len(warnings)} warning(s).")
        return 1
    print(f"PASS: no structural errors; {len(warnings)} warning(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
