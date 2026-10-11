"""Add recipes.last_made_on

Revision ID: c985ca4e0aa5
Revises: 55fca9a725ba
Create Date: 2026-10-11 15:52:16.518622

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c985ca4e0aa5'
down_revision: Union[str, Sequence[str], None] = '55fca9a725ba'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Nullable, so the previous image keeps working against the migrated table.
    with op.batch_alter_table('recipes', schema=None) as batch_op:
        batch_op.add_column(sa.Column('last_made_on', sa.Date(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('recipes', schema=None) as batch_op:
        batch_op.drop_column('last_made_on')
