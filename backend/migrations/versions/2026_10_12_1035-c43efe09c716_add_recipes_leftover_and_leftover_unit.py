"""Add recipes.leftover and leftover_unit

Revision ID: c43efe09c716
Revises: c985ca4e0aa5
Create Date: 2026-10-12 10:35:33.655062

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c43efe09c716'
down_revision: Union[str, Sequence[str], None] = 'c985ca4e0aa5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # leftover is nullable and leftover_unit has a server default, so the
    # previous image keeps working against the migrated table (its inserts
    # don't name these columns). Existing recipes get NULL and "".
    with op.batch_alter_table('recipes', schema=None) as batch_op:
        batch_op.add_column(sa.Column('leftover', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('leftover_unit', sa.Text(), server_default='', nullable=False))


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('recipes', schema=None) as batch_op:
        batch_op.drop_column('leftover_unit')
        batch_op.drop_column('leftover')
