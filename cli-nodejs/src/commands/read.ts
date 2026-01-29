import { Command } from 'commander';
import chalk from 'chalk';
import { api } from '../api.js';
import { formatDate } from '../utils/format.js';
import { parseInboxId } from '../utils/inbox.js';

export const readCommand = new Command('read')
  .description('Read a specific message')
  .argument('<inbox>', 'Inbox ID')
  .argument('[index]', 'Message index (1-indexed)')
  .option('--latest', 'Read the latest message')
  .option('-t, --token <token>', 'Authentication token (uses stored token if not provided)')
  .option('--json', 'Output as JSON')
  .option('--code-only', 'Only output the verification code')
  .action(
    async (
      inboxInput: string,
      index: string | undefined,
      options: { latest?: boolean; token?: string; json?: boolean; codeOnly?: boolean }
    ) => {
      try {
        const inbox = parseInboxId(inboxInput);

        // Validate index and --latest usage
        if (options.latest && index !== undefined) {
          console.error(chalk.red('Cannot use both INDEX and --latest. Choose one.'));
          process.exit(1);
        }

        const msgIndex = index !== undefined ? parseInt(index, 10) : 1;

        if (isNaN(msgIndex) || msgIndex < 1) {
          console.error(chalk.red('Invalid message index. INDEX must be >= 1.'));
          process.exit(1);
        }

        // Get message list to find msgId
        const listResult = await api.listMessages(inbox, 100, 0, options.token);

        if (listResult.messages.length === 0) {
          if (options.codeOnly) {
            // For --code-only, no messages means no code, exit with error for scripts
            process.exit(1);
          }
          console.log(chalk.yellow('No messages in this inbox.'));
          process.exit(0);
        }

        // Determine which message to read
        let targetMsg;
        if (options.latest) {
          targetMsg = listResult.messages[0];
        } else {
          const arrayIndex = msgIndex - 1;
          if (arrayIndex >= listResult.messages.length) {
            console.error(
              chalk.red(`Invalid message index. Valid range: 1-${listResult.messages.length}`)
            );
            process.exit(1);
          }
          targetMsg = listResult.messages[arrayIndex];
        }

        // Get full message content
        const message = await api.getMessage(inbox, targetMsg.id, options.token);

        // Code only output
        if (options.codeOnly) {
          if (message.code) {
            console.log(message.code.code);
          } else {
            console.error(chalk.yellow('No verification code found in this message.'));
            process.exit(1);
          }
          return;
        }

        // JSON output
        if (options.json) {
          console.log(
            JSON.stringify(
              {
                from: message.from,
                subject: message.subject,
                text: message.text,
                code: message.code?.code || null,
                receivedAt: message.receivedAt,
              },
              null,
              2
            )
          );
          return;
        }

        // Formatted output
        console.log();
        console.log(
          chalk.bold('From:    ') +
            message.from +
            (message.fromName ? ` (${message.fromName})` : '')
        );
        console.log(chalk.bold('To:      ') + message.to);
        console.log(chalk.bold('Subject: ') + message.subject);
        console.log(chalk.bold('Date:    ') + formatDate(new Date(message.receivedAt).getTime()));

        if (message.code) {
          console.log();
          console.log(
            chalk.green.bold('Verification Code: ') + chalk.green.bold(message.code.code)
          );
          console.log(
            chalk.gray(
              `   Type: ${message.code.type}, Confidence: ${(message.code.confidence * 100).toFixed(0)}%`
            )
          );
        }

        console.log();
        console.log(chalk.bold('Content:'));
        console.log(chalk.gray('-'.repeat(60)));
        console.log(message.text || chalk.gray('(no text content)'));
        console.log(chalk.gray('-'.repeat(60)));
        console.log();
      } catch (error) {
        console.error(
          chalk.red('Error reading message:'),
          error instanceof Error ? error.message : error
        );
        process.exit(1);
      }
    }
  );
