#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/5d499d0c37817aa495326ea105a2792f4f934e1075914e9fc9d2dc19d41d5647/contract';
import startContract from '../../snapshots/5d499d0c37817aa495326ea105a2792f4f934e1075914e9fc9d2dc19d41d5647/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/6700ffc6543381b5e8577cd69aec74ab63219ddbf62a4ee956e57f88ce94c1c8/contract';
import endContract from '../../snapshots/6700ffc6543381b5e8577cd69aec74ab63219ddbf62a4ee956e57f88ce94c1c8/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'ConversationParticipant',
        column: col('lastReadAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
