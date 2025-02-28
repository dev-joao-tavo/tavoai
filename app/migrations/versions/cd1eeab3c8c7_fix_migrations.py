"""Fix migrations

Revision ID: cd1eeab3c8c7
Revises: 
Create Date: 2025-02-26 09:54:54.668528

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision: str = 'cd1eeab3c8c7'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = inspect(conn)
    columns = inspector.get_columns('users')
    column_names = [col['name'] for col in columns]

    # Step 1: Add the column as nullable (if it doesn't already exist)
    if 'password_hash' not in column_names:
        op.add_column('users', sa.Column('password_hash', sa.String(), nullable=True))

        # Step 2: Populate the column with a default value for existing rows
        # Replace 'default_password_hash' with a valid default value or a hashed password
        op.execute("UPDATE users SET password_hash = 'default_password_hash' WHERE password_hash IS NULL")

        # Step 3: Alter the column to be non-nullable
        op.alter_column('users', 'password_hash', nullable=False)

    # Step 4: Drop the old 'password' column (if it exists)
    if 'password' in column_names:
        op.drop_column('users', 'password')


def downgrade() -> None:
    conn = op.get_bind()
    inspector = inspect(conn)
    columns = inspector.get_columns('users')
    column_names = [col['name'] for col in columns]

    # Step 1: Add the old 'password' column back (if it doesn't exist)
    if 'password' not in column_names:
        op.add_column('users', sa.Column('password', sa.VARCHAR(), autoincrement=False, nullable=False))

    # Step 2: Drop the 'password_hash' column (if it exists)
    if 'password_hash' in column_names:
        op.drop_column('users', 'password_hash')