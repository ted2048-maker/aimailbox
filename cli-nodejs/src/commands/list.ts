import { Command } from 'commander';
import chalk from 'chalk';
import { api } from '../api.js';
import { formatDate, truncate } from '../utils/format.js';
import { parseInboxId } from '../utils/inbox.js';

export const listCommand = new Command('list')
  .description('List messages in an inbox')
  .argument('<inbox>', 'Inbox ID')
  .option('-l, --limit <number>', 'Number of messages to show (1-1000)', '20')
  .option('-t, --token <token>', 'Authentication token (uses stored token if not provided)')
  .option('--json', 'Output as JSON')
  .action(async (inboxInput: string, options: { limit: string; token?: string; json?: boolean }) => {
    try {
      const inbox = parseInboxId(inboxInput);
      const limit = parseInt(options.limit, 10);

      if (isNaN(limit) || limit < 1 || limit > 1000) {
        console.error(chalk.red('Invalid limit. Must be a number between 1 and 1000.'));
        process.exit(1);
      }

      const result = await api.listMessages(inbox, limit, 0, options.token);

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      if (result.messages.length === 0) {
        console.log();
        console.log(chalk.yellow('No messages yet.'));
        console.log(chalk.gray(`Inbox: ${inbox}@aimailbox.dev`));
        console.log();
        return;
      }

      console.log();
      console.log(chalk.bold(`Inbox: ${inbox}@aimailbox.dev`));
      console.log(chalk.gray(`${result.pagination.total} message(s)`));
      console.log();

      for (const msg of result.messages) {
        const codeIndicator = msg.hasCode ? chalk.green(' [CODE]') : '';
        const date = formatDate(msg.timestamp);
        const from = truncate(msg.from, 30);
        const subject = truncate(msg.subject, 40);

        console.log(
          `${chalk.bold(msg.index.toString().padStart(2, ' '))}. ` +
            `${chalk.gray(`[${date}]`)} ` +
            `${chalk.cyan(from)} | ` +
            `${subject}${codeIndicator}`
        );
      }

      if (result.pagination.hasMore) {
        console.log();
        console.log(
          chalk.gray(`Showing ${result.messages.length} of ${result.pagination.total} messages.`)
        );
        console.log(chalk.gray(`Use --limit to show more.`));
      }

      console.log();
    } catch (error) {
      console.error(
        chalk.red('Error listing messages:'),
        error instanceof Error ? error.message : error
      );
      process.exit(1);
    }
  });
