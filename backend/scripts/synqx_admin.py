"""
SynqX Admin CLI
A feature-rich command-line interface to manage the SynqX application.
"""
import sys
import os
import getpass
from typing import Optional
from contextlib import contextmanager

import typer
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich import box
from sqlalchemy.orm import Session
from sqlalchemy import func

# Add the parent directory to sys.path to import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMember, WorkspaceRole
from app.core import security

# --- Typer App Setup ---
app = typer.Typer(
    name="synqx-admin",
    help="SynqX Admin CLI for managing users, workspaces, and system settings.",
    rich_markup_mode="rich",
)
users_app = typer.Typer(name="users", help="Manage users.")
workspaces_app = typer.Typer(name="workspaces", help="Manage workspaces.")
system_app = typer.Typer(name="system", help="System-wide commands.")

app.add_typer(users_app)
app.add_typer(workspaces_app)
app.add_typer(system_app)

# --- Rich Console ---
console = Console()

# --- Database Context ---
@contextmanager
def get_db_session():
    """Context manager for database sessions."""
    db: Optional[Session] = None
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console,
        transient=True
    ) as progress:
        task = progress.add_task("[cyan]Connecting to database...", total=None)
        try:
            db = SessionLocal()
            progress.update(task, completed=True, description="[green]✓ Connected to database")
            yield db
        except Exception as e:
            progress.update(task, description=f"[red]✗ Database connection failed: {e}")
            raise
        finally:
            if db:
                db.close()

# --- User Commands ---

@users_app.command("create", help="Create a new admin user.")
def create_user(
    email: str = typer.Option(..., "--email", "-e", prompt=True),
    full_name: str = typer.Option(..., "--name", "-n", prompt=True),
    is_superuser: bool = typer.Option(True, "--superuser/--no-superuser", prompt=True, help="Grant superuser privileges."),
):
    """Creates a new user and a personal workspace for them."""
    with get_db_session() as db:
        console.print("\n[bold cyan]✨ Creating New User...[/bold cyan]\n")

        # Check if user exists
        if db.query(User).filter(User.email == email).first():
            console.print(f"[red]✗ Error: User with email [bold]{email}[/bold] already exists.[/red]")
            raise typer.Exit(code=1)

        # Secure password input
        console.print("[green]Enter Password[/green] (input hidden)")
        password = getpass.getpass("→ ")
        console.print("[green]Confirm Password[/green] (input hidden)")
        password_confirm = getpass.getpass("→ ")

        if password != password_confirm:
            console.print("\n[red]✗ Error: Passwords do not match.[/red]")
            raise typer.Exit(code=1)

        with Progress(
            SpinnerColumn(), TextColumn("[progress.description]{task.description}"), console=console
        ) as progress:
            task = progress.add_task("[cyan]Processing...", total=None)
            try:
                # Create user
                hashed_password = security.get_password_hash(password)
                user = User(email=email, hashed_password=hashed_password, full_name=full_name, is_superuser=is_superuser)
                db.add(user)
                db.flush()

                # Create workspace
                progress.update(task, description="[cyan]Creating workspace...")
                workspace = Workspace(name=f"{full_name}'s Workspace", slug=f"personal-{user.id}", description="Default Personal Workspace")
                db.add(workspace)
                db.flush()

                # Add workspace member
                progress.update(task, description="[cyan]Assigning role...")
                member = WorkspaceMember(workspace_id=workspace.id, user_id=user.id, role=WorkspaceRole.ADMIN)
                db.add(member)

                # Set active workspace
                user.active_workspace_id = workspace.id
                db.commit()

                progress.update(task, description="[green]✓ User created successfully!")
                
                # Show summary
                summary = Table(title="[bold]User Creation Summary[/bold]", box=box.ROUNDED, show_header=False)
                summary.add_column(style="cyan")
                summary.add_column(style="white")
                summary.add_row("Email", email)
                summary.add_row("Full Name", full_name)
                summary.add_row("Superuser", "Yes" if is_superuser else "No")
                summary.add_row("Workspace", workspace.name)
                console.print(summary)

            except Exception as e:
                db.rollback()
                progress.update(task, description=f"[red]✗ Error: {e}")
                console.print(f"\n[red]Failed to create user: {e}[/red]")
                raise typer.Exit(code=1)

@users_app.command("list", help="List all users in the system.")
def list_users():
    """Displays all users in a table."""
    with get_db_session() as db:
        users = db.query(User).all()
        if not users:
            console.print("[yellow]No users found.[/yellow]")
            return

        table = Table(title="[bold]All System Users[/bold]", box=box.HEAVY_EDGE, show_lines=True)
        table.add_column("ID", style="cyan")
        table.add_column("Email", style="green")
        table.add_column("Full Name")
        table.add_column("Superuser", justify="center")
        table.add_column("Active", justify="center")

        for user in users:
            table.add_row(
                str(user.id),
                user.email,
                user.full_name or "N/A",
                "👑" if user.is_superuser else "",
                "✓" if user.is_active else "✗"
            )
        
        console.print(table)
        console.print(f"\n[dim]Total users: {len(users)}[/dim]")

@users_app.command("view", help="View details for a specific user.")
def view_user(email: str = typer.Argument(..., help="Email of the user to view.")):
    """Shows detailed information about a user and their workspace memberships."""
    with get_db_session() as db:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            console.print(f"[red]✗ User with email {email} not found.[/red]")
            raise typer.Exit(code=1)

        info = Table.grid(padding=(0, 2), expand=True)
        info.add_column(style="cyan", justify="right", width=20)
        info.add_column()
        info.add_row("ID:", str(user.id))
        info.add_row("Email:", user.email)
        info.add_row("Full Name:", user.full_name or "N/A")
        info.add_row("Superuser:", "👑 Yes" if user.is_superuser else "No")
        info.add_row("Active:", "✓ Yes" if user.is_active else "✗ No")
        info.add_row("Active Workspace ID:", str(user.active_workspace_id) if user.active_workspace_id else "N/A")
        
        console.print(Panel(info, title=f"[bold]User: {user.full_name}[/bold]", border_style="green", padding=1))
        
        memberships = db.query(WorkspaceMember).filter(WorkspaceMember.user_id == user.id).all()
        if memberships:
            ws_table = Table(title="[bold]Workspace Memberships[/bold]", box=box.MINIMAL, show_header=True)
            ws_table.add_column("Workspace", style="cyan")
            ws_table.add_column("Role", style="yellow")
            for member in memberships:
                ws_table.add_row(member.workspace.name, member.role.value)
            console.print(ws_table)

@users_app.command("update", help="Update a user's details.")
def update_user(email: str = typer.Argument(..., help="Email of the user to update.")):
    """Updates a user's full name or superuser status."""
    with get_db_session() as db:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            console.print(f"[red]✗ User with email {email} not found.[/red]")
            raise typer.Exit(code=1)
        
        console.print(f"\n[dim]Current details for [bold]{user.email}[/bold]: Name: {user.full_name}, Superuser: {user.is_superuser}\n")
        
        new_name = typer.prompt("New full name (press Enter to skip)", default=user.full_name, show_default=False)
        toggle_superuser = typer.confirm("Toggle superuser status?", default=False)
        
        try:
            if new_name != user.full_name:
                user.full_name = new_name
            if toggle_superuser:
                user.is_superuser = not user.is_superuser
            db.commit()
            console.print("\n[green]✓ User updated successfully![/green]")
        except Exception as e:
            db.rollback()
            console.print(f"\n[red]✗ Error updating user: {e}[/red]")
            raise typer.Exit(code=1)

@users_app.command("delete", help="Delete a user permanently.")
def delete_user(email: str = typer.Argument(..., help="Email of the user to delete."), force: bool = typer.Option(False, "--force", "-f", help="Force deletion without confirmation.")):
    """Permanently deletes a user from the database."""
    with get_db_session() as db:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            console.print(f"[red]✗ User with email {email} not found.[/red]")
            raise typer.Exit(code=1)

        if not force:
            console.print(f"\n[bold yellow]⚠ Warning:[/bold yellow] This will permanently delete user [bold]{user.full_name}[/bold] ({user.email}).")
            if not typer.confirm("Are you sure you want to proceed?"):
                console.print("[yellow]Deletion cancelled.[/yellow]")
                raise typer.Abort()
        try:
            db.delete(user)
            db.commit()
            console.print("\n[green]✓ User deleted successfully![/green]")
        except Exception as e:
            db.rollback()
            console.print(f"\n[red]✗ Error deleting user: {e}[/red]")
            raise typer.Exit(code=1)

# --- Workspace Commands ---

@workspaces_app.command("list", help="List all workspaces.")
def list_workspaces():
    """Displays all workspaces and their member counts."""
    with get_db_session() as db:
        workspaces = db.query(Workspace).all()
        if not workspaces:
            console.print("[yellow]No workspaces found.[/yellow]")
            return

        table = Table(title="[bold]All Workspaces[/bold]", box=box.HEAVY_EDGE, show_lines=True)
        table.add_column("ID", style="cyan")
        table.add_column("Name", style="green")
        table.add_column("Slug", style="white")
        table.add_column("Description")
        table.add_column("Members", justify="center")

        for ws in workspaces:
            member_count = db.query(func.count(WorkspaceMember.workspace_id)).filter(WorkspaceMember.workspace_id == ws.id).scalar()
            table.add_row(str(ws.id), ws.name, ws.slug, ws.description or "N/A", str(member_count))
        
        console.print(table)
        console.print(f"\n[dim]Total workspaces: {len(workspaces)}[/dim]")

# --- System Commands ---

@system_app.command("stats", help="Display system-wide statistics.")
def show_statistics():
    """Displays an overview of database statistics."""
    with get_db_session() as db:
        user_count = db.query(func.count(User.id)).scalar()
        superuser_count = db.query(func.count(User.id)).filter(User.is_superuser == True).scalar()
        workspace_count = db.query(func.count(Workspace.id)).scalar()

        stats = Table.grid(padding=(0, 4))
        stats.add_column(style="cyan", justify="right", width=20)
        stats.add_column(style="bold green", justify="left")
        stats.add_row("Total Users:", str(user_count))
        stats.add_row("Superusers:", str(superuser_count))
        stats.add_row("Total Workspaces:", str(workspace_count))
        
        console.print(Panel(stats, title="[bold]System Overview[/bold]", border_style="blue", padding=1))


if __name__ == "__main__":
    app()
