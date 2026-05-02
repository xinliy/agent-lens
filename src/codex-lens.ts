#!/usr/bin/env node
import { runCli } from "./cli.js";
import { codexStartArgs } from "./shortcuts.js";

const result = await runCli(["start", ...codexStartArgs(process.argv.slice(2))]);
process.exitCode = result.exitCode;
