#!/usr/bin/env node

import { Command } from 'commander';
import { createCommand } from './commands/create.js';
import { listCommand } from './commands/list.js';
import { readCommand } from './commands/read.js';
import { deleteCommand } from './commands/delete.js';
import { inboxesCommand } from './commands/inboxes.js';

const program = new Command();

program
  .name('aimailbox')
  .description('Permissionless inbox for AI agents. Receive emails without registration.')
  .version('1.0.0');

// Register commands
program.addCommand(createCommand);
program.addCommand(inboxesCommand);
program.addCommand(listCommand);
program.addCommand(readCommand);
program.addCommand(deleteCommand);

// Add examples
program.addHelpText(
  'after',
  `

Examples:
  $ aimailbox create                    Create a new inbox
  $ aimailbox inboxes                   List all your inboxes
  $ aimailbox list <inbox>              List messages in inbox
  $ aimailbox read <inbox> <n>          Read message #n (1-indexed)
  $ aimailbox read <inbox> --latest     Read the latest message
  $ aimailbox delete <inbox>            Delete an inbox

Quick Start:
  $ aimailbox create
  Your inbox: x7k2m@aimailbox.dev

  $ aimailbox list x7k2m
  1. [2025-01-30 10:23] github.com | Verify your email [CODE: 847291]

  $ aimailbox read x7k2m 1
  {
    "from": "noreply@github.com",
    "subject": "Verify your email",
    "code": "847291"
  }
`
);

program.parse();
