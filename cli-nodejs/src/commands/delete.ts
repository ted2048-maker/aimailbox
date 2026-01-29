import { Command } from 'commander';
import chalk from 'chalk';
import readline from 'readline';
import { api } from '../api.js';
import { removeToken } from '../store.js';
import { parseInboxId } from '../utils/inbox.js';

export const deleteCommand = new Command('delete')
  .description('Delete an inbox and all its messages')
  .argument('<inbox>', 'Inbox ID')
  .option('-f, --force', 'Skip confirmation')
  .option('-t, --token <token>', 'Authentication token (uses stored token if not provided)')
  .action(async (inboxInput: string, options: { force?: boolean; token?: string }) => {
    try {
      const inbox = parseInboxId(inboxInput);

      // Confirm deletion
      if (!options.force) {
        const confirmed = await confirm(
          `Are you sure you want to delete inbox ${chalk.cyan(inbox)}? This cannot be undone.`
        );

        if (!confirmed) {
          console.log(chalk.gray('Cancelled.'));
          return;
        }
      }

      await api.deleteInbox(inbox, options.token);

      // Remove stored token
      removeToken(inbox);

      console.log(chalk.green(`✓ Inbox ${inbox} deleted successfully.`));
    } catch (error) {
      console.error(
        chalk.red('Error deleting inbox:'),
        error instanceof Error ? error.message : error
      );
      process.exit(1);
    }
  });

function confirm(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${message} (y/N) `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}
