"""CLI commands for AIMail."""

import json
import sys
from datetime import datetime
from typing import Optional

import click
from rich.console import Console
from rich.table import Table

from . import __version__
from .api import api, APIError
from .config import store_token, remove_token, list_stored_inboxes, parse_inbox_id

console = Console()
error_console = Console(stderr=True)


def format_date(timestamp: int) -> str:
    """Format a timestamp for display."""
    dt = datetime.fromtimestamp(timestamp / 1000)
    now = datetime.now()

    if dt.date() == now.date():
        return f"Today {dt.strftime('%H:%M')}"
    elif (now.date() - dt.date()).days == 1:
        return f"Yesterday {dt.strftime('%H:%M')}"
    else:
        return dt.strftime("%b %d %H:%M")


def truncate(text: str, max_length: int) -> str:
    """Truncate text to a maximum length."""
    if len(text) <= max_length:
        return text
    return text[:max_length - 3] + "..."


class RichHelpFormatter(click.HelpFormatter):
    """Custom formatter that preserves newlines."""
    def write_dl(self, rows, col_max=30, col_spacing=2):
        super().write_dl(rows, col_max, col_spacing)


class RichGroup(click.Group):
    """Custom group with better help formatting."""
    def format_help(self, ctx, formatter):
        super().format_help(ctx, formatter)

        # Add examples section
        formatter.write("\n")
        formatter.write("Examples:\n")
        formatter.write("  aimailbox create                    Create a new inbox\n")
        formatter.write("  aimailbox inboxes                   List all your inboxes\n")
        formatter.write("  aimailbox list <inbox>              List messages in inbox\n")
        formatter.write("  aimailbox read <inbox> 1            Read message #1\n")
        formatter.write("  aimailbox read <inbox> --latest     Read the latest message\n")
        formatter.write("  aimailbox read <inbox> --code-only  Get only the verification code\n")
        formatter.write("  aimailbox delete <inbox>            Delete an inbox\n")

        # Add quick start section
        formatter.write("\n")
        formatter.write("Quick Start:\n")
        formatter.write("  $ aimailbox create\n")
        formatter.write("  > Email: x7k2m@aimailbox.dev\n")
        formatter.write("  > Token: abc123...\n")
        formatter.write("\n")
        formatter.write("  $ aimailbox list x7k2m\n")
        formatter.write("  > 1. [Today 10:23] github.com | Verify your email [CODE]\n")
        formatter.write("\n")
        formatter.write("  $ aimailbox read x7k2m 1 --code-only\n")
        formatter.write("  > 847291\n")
        formatter.write("\n")
        formatter.write("Documentation: https://aimailbox.dev\n")


@click.group(cls=RichGroup)
@click.version_option(version=__version__, prog_name="aimailbox")
def main():
    """Permissionless inbox for AI agents. Receive emails without registration."""
    pass


@main.command()
@click.option("--json", "as_json", is_flag=True, help="Output as JSON")
def create(as_json: bool):
    """Create a new inbox.

    Creates a temporary inbox that can receive emails. Returns an email address
    and a secret token. The token is saved locally and required for all operations.
    """
    try:
        result = api.create_inbox()

        # Store token locally
        store_token(result["id"], result["token"])

        if as_json:
            click.echo(json.dumps({
                "id": result["id"],
                "email": result["email"],
                "token": result["token"],
            }, indent=2))
            return

        console.print()
        console.print("[green]✓ Inbox created successfully![/green]")
        console.print()
        console.print(f"  [bold]Email:[/bold]    [cyan]{result['email']}[/cyan]")
        console.print(f"  [bold]Inbox ID:[/bold] {result['id']}")
        console.print(f"  [bold]Token:[/bold]    [yellow]{result['token']}[/yellow]")
        console.print()
        console.print("[dim]Token has been saved locally. Keep it safe - it cannot be recovered![/dim]")
        console.print(f"[dim]Run [white]aimailbox list {result['id']}[/white] to check for new messages.[/dim]")
        console.print()

    except APIError as e:
        error_console.print(f"[red]Error creating inbox:[/red] {e}")
        sys.exit(1)


@main.command()
@click.option("--json", "as_json", is_flag=True, help="Output as JSON")
def inboxes(as_json: bool):
    """List all locally stored inboxes.

    Shows all inboxes that have been created on this machine.
    Tokens are stored locally in ~/.aimailbox/tokens.json.
    """
    stored = list_stored_inboxes()

    if as_json:
        click.echo(json.dumps(stored, indent=2))
        return

    if not stored:
        console.print()
        console.print("[yellow]No inboxes found.[/yellow]")
        console.print("[dim]Run `aimailbox create` to create a new inbox.[/dim]")
        console.print()
        return

    console.print()
    console.print(f"[bold]Found {len(stored)} inbox(es):[/bold]")
    console.print()

    for inbox in stored:
        console.print(f"  [cyan]{inbox['email']}[/cyan]")

    console.print()
    console.print("[dim]Use `aimailbox list <inbox>` to view messages.[/dim]")
    console.print()


@main.command("list")
@click.argument("inbox_input")
@click.option("-l", "--limit", default=20, type=click.IntRange(min=1, max=1000), help="Number of messages to show (1-1000)")
@click.option("-t", "--token", default=None, help="Authentication token")
@click.option("--json", "as_json", is_flag=True, help="Output as JSON")
def list_messages(inbox_input: str, limit: int, token: Optional[str], as_json: bool):
    """List messages in an inbox.

    INBOX can be either the ID (e.g., 'tuft9u') or full email (e.g., 'tuft9u@aimailbox.dev').
    Shows a summary of all messages including sender, subject, and whether
    a verification code was detected.
    """
    try:
        inbox = parse_inbox_id(inbox_input)
    except ValueError as e:
        error_console.print(f"[red]Invalid inbox:[/red] {e}")
        sys.exit(1)

    try:
        result = api.list_messages(inbox, limit=limit, token=token)

        if as_json:
            click.echo(json.dumps(result, indent=2))
            return

        messages = result.get("messages", [])
        pagination = result.get("pagination", {})

        if not messages:
            console.print()
            console.print("[yellow]No messages yet.[/yellow]")
            console.print(f"[dim]Inbox: {inbox}@aimailbox.dev[/dim]")
            console.print()
            return

        console.print()
        console.print(f"[bold]Inbox: {inbox}@aimailbox.dev[/bold]")
        console.print(f"[dim]{pagination.get('total', 0)} message(s)[/dim]")
        console.print()

        for msg in messages:
            code_indicator = " [green][CODE][/green]" if msg.get("hasCode") else ""
            date = format_date(msg["timestamp"])
            from_addr = truncate(msg["from"], 30)
            subject = truncate(msg["subject"], 40)

            console.print(
                f"[bold]{msg['index']:2d}.[/bold] "
                f"[dim][{date}][/dim] "
                f"[cyan]{from_addr}[/cyan] | "
                f"{subject}{code_indicator}"
            )

        if pagination.get("hasMore"):
            console.print()
            console.print(f"[dim]Showing {len(messages)} of {pagination['total']} messages.[/dim]")
            console.print("[dim]Use --limit to show more.[/dim]")

        console.print()

    except APIError as e:
        error_console.print(f"[red]Error listing messages:[/red] {e}")
        sys.exit(1)


@main.command()
@click.argument("inbox_input")
@click.argument("index", default=None, type=int, required=False)
@click.option("--latest", is_flag=True, help="Read the latest message")
@click.option("-t", "--token", default=None, help="Authentication token")
@click.option("--json", "as_json", is_flag=True, help="Output as JSON")
@click.option("--code-only", is_flag=True, help="Only output the verification code")
def read(inbox_input: str, index: Optional[int], latest: bool, token: Optional[str], as_json: bool, code_only: bool):
    """Read a specific message.

    INBOX can be either the ID (e.g., 'tuft9u') or full email (e.g., 'tuft9u@aimailbox.dev').
    INDEX is 1-based (first message is 1, not 0). Use --code-only to extract
    just the verification code, useful for automation and AI agents.
    """
    # Validate inbox input
    try:
        inbox = parse_inbox_id(inbox_input)
    except ValueError as e:
        error_console.print(f"[red]Invalid inbox:[/red] {e}")
        sys.exit(1)

    # Validate index and --latest usage
    if latest and index is not None:
        error_console.print("[red]Cannot use both INDEX and --latest. Choose one.[/red]")
        sys.exit(1)

    if not latest and index is None:
        index = 1  # Default to first message

    if index is not None and index < 1:
        error_console.print("[red]Invalid message index. INDEX must be >= 1.[/red]")
        sys.exit(1)

    try:
        # Get message list to find msgId
        list_result = api.list_messages(inbox, limit=100, token=token)
        messages = list_result.get("messages", [])

        if not messages:
            if code_only:
                # For --code-only, no messages means no code, exit with error for scripts
                sys.exit(1)
            console.print("[yellow]No messages in this inbox.[/yellow]")
            sys.exit(0)

        # Determine which message to read
        if latest:
            target_msg = messages[0]
        else:
            msg_index = index - 1
            if msg_index >= len(messages):
                error_console.print(f"[red]Invalid message index. Valid range: 1-{len(messages)}[/red]")
                sys.exit(1)
            target_msg = messages[msg_index]

        # Get full message content
        message = api.get_message(inbox, target_msg["id"], token=token)

        # Code only output
        if code_only:
            if message.get("code"):
                click.echo(message["code"]["code"])
            else:
                error_console.print("[yellow]No verification code found in this message.[/yellow]")
                sys.exit(1)
            return

        # JSON output
        if as_json:
            output = {
                "from": message["from"],
                "subject": message["subject"],
                "text": message["text"],
                "code": message["code"]["code"] if message.get("code") else None,
                "receivedAt": message["receivedAt"],
            }
            click.echo(json.dumps(output, indent=2))
            return

        # Formatted output
        console.print()
        from_name = f" ({message['fromName']})" if message.get("fromName") else ""
        console.print(f"[bold]From:[/bold]    {message['from']}{from_name}")
        console.print(f"[bold]To:[/bold]      {message['to']}")
        console.print(f"[bold]Subject:[/bold] {message['subject']}")

        received_dt = datetime.fromisoformat(message["receivedAt"].replace("Z", "+00:00"))
        console.print(f"[bold]Date:[/bold]    {format_date(int(received_dt.timestamp() * 1000))}")

        if message.get("code"):
            console.print()
            console.print(f"[green bold]Verification Code: {message['code']['code']}[/green bold]")
            confidence = message["code"]["confidence"] * 100
            console.print(f"[dim]   Type: {message['code']['type']}, Confidence: {confidence:.0f}%[/dim]")

        console.print()
        console.print("[bold]Content:[/bold]")
        console.print("[dim]" + "-" * 60 + "[/dim]")
        console.print(message.get("text") or "[dim](no text content)[/dim]")
        console.print("[dim]" + "-" * 60 + "[/dim]")
        console.print()

    except APIError as e:
        error_console.print(f"[red]Error reading message:[/red] {e}")
        sys.exit(1)


@main.command()
@click.argument("inbox_input")
@click.option("-f", "--force", is_flag=True, help="Skip confirmation")
@click.option("-t", "--token", default=None, help="Authentication token")
def delete(inbox_input: str, force: bool, token: Optional[str]):
    """Delete an inbox and all its messages.

    INBOX can be either the ID (e.g., 'tuft9u') or full email (e.g., 'tuft9u@aimailbox.dev').
    This action is irreversible. All messages will be permanently deleted.
    """
    try:
        inbox = parse_inbox_id(inbox_input)
    except ValueError as e:
        error_console.print(f"[red]Invalid inbox:[/red] {e}")
        sys.exit(1)

    try:
        # Confirm deletion
        if not force:
            if not click.confirm(f"Are you sure you want to delete inbox {inbox}? This cannot be undone"):
                console.print("[dim]Cancelled.[/dim]")
                return

        api.delete_inbox(inbox, token=token)

        # Remove stored token
        remove_token(inbox)

        console.print(f"[green]✓ Inbox {inbox} deleted successfully.[/green]")

    except APIError as e:
        error_console.print(f"[red]Error deleting inbox:[/red] {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
