#!/usr/bin/env python3
"""Unit checks for the audit script using stdlib unittest."""

import json
import unittest
from pathlib import Path

from progression_audit import analyze


class ProgressionAuditTests(unittest.TestCase):
    def setUp(self):
        self.config = json.loads((Path(__file__).parent / "sample_progression.json").read_text())

    def test_sample_config_passes(self):
        errors, warnings, notes = analyze(self.config)
        self.assertEqual([], errors)
        self.assertEqual([], warnings)
        self.assertTrue(any("First meaningful unlock" in message for message in notes))

    def test_duplicate_unlock_is_an_error(self):
        self.config["levels"][1]["unlock_ids"].append("basic_action")
        errors, _, _ = analyze(self.config)
        self.assertTrue(any("appears at levels" in message for message in errors))

    def test_decreasing_threshold_is_an_error(self):
        self.config["levels"][2]["total_xp_required"] = 30
        errors, _, _ = analyze(self.config)
        self.assertTrue(any("increase strictly" in message for message in errors))

    def test_slow_first_unlock_is_warned(self):
        self.config["session_estimates"]["xp_earned"] = 10
        errors, warnings, _ = analyze(self.config)
        self.assertFalse(errors)
        self.assertTrue(any("First meaningful unlock" in message for message in warnings))

    def test_bad_upgrade_cost_is_an_error(self):
        self.config["upgrades"][0]["cost_currency"] = -4
        errors, _, _ = analyze(self.config)
        self.assertTrue(any("cost_currency" in message for message in errors))


if __name__ == "__main__":
    unittest.main()
