import { Command } from 'commander';
import chalk from 'chalk';
import { listStoredInboxes } from '../store.js';

export const inboxesCommand = new Command('inboxes')
  .description('List all locally stored inboxes')
  .option('--json', 'Output as JSON')
  .action(async (options: { json?: boolean }) => {
    const inboxes = listStoredInboxes();

    if (options.json) {
      console.log(JSON.stringify(inboxes, null, 2));
      return;
    }

    if (inboxes.length === 0) {
      console.log();
      console.log(chalk.yellow('No inboxes found.'));
      console.log(chalk.gray('Run `aimailbox create` to create a new inbox.'));
      console.log();
      return;
    }

    console.log();
    console.log(chalk.bold(`Found ${inboxes.length} inbox(es):`));
    console.log();

    for (const inbox of inboxes) {
      console.log(`  ${chalk.cyan(inbox.email)}`);
    }

    console.log();
    console.log(chalk.gray('Use `aimailbox list <inbox>` to view messages.'));
    console.log();
  });
