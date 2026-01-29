import { Command } from 'commander';
import chalk from 'chalk';
import { api } from '../api.js';
import { storeToken } from '../store.js';

export const createCommand = new Command('create')
  .description('Create a new inbox')
  .action(async () => {
    try {
      const result = await api.createInbox();

      // Store token locally
      storeToken(result.id, result.token);

      console.log();
      console.log(chalk.green('✓ Inbox created successfully!'));
      console.log();
      console.log(`  ${chalk.bold('Email:')}    ${chalk.cyan(result.email)}`);
      console.log(`  ${chalk.bold('Inbox ID:')} ${result.id}`);
      console.log(`  ${chalk.bold('Token:')}    ${chalk.yellow(result.token)}`);
      console.log();
      console.log(chalk.gray('Token has been saved locally. Keep it safe - it cannot be recovered!'));
      console.log(chalk.gray(`Run ${chalk.white(`aimailbox list ${result.id}`)} to check for new messages.`));
      console.log();
    } catch (error) {
      console.error(
        chalk.red('Error creating inbox:'),
        error instanceof Error ? error.message : error
      );
      process.exit(1);
    }
  });
