/**
 * Decorator that counts round trips to D1: one per `batch()` and one per statement executed
 * outside a batch. Used to enforce the "few calls per request" budget in tests.
 */
class CountingStatement implements D1PreparedStatement {
  constructor(
    readonly inner: D1PreparedStatement,
    private readonly hit: () => void,
  ) {}

  bind(...values: unknown[]): D1PreparedStatement {
    return new CountingStatement(this.inner.bind(...values), this.hit);
  }

  first<T = unknown>(colName: string): Promise<T | null>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  first<T>(colName?: string): Promise<T | null> {
    this.hit();
    return colName === undefined ? this.inner.first<T>() : this.inner.first<T>(colName);
  }

  run<T = Record<string, unknown>>(): Promise<D1Result<T>> {
    this.hit();
    return this.inner.run<T>();
  }

  all<T = Record<string, unknown>>(): Promise<D1Result<T>> {
    this.hit();
    return this.inner.all<T>();
  }

  raw<T = unknown[]>(options: { columnNames: true }): Promise<[string[], ...T[]]>;
  raw<T = unknown[]>(options?: { columnNames?: false }): Promise<T[]>;
  raw<T>(options?: { columnNames?: boolean }): Promise<T[] | [string[], ...T[]]> {
    this.hit();
    return options?.columnNames === true
      ? this.inner.raw<T>({ columnNames: true })
      : this.inner.raw<T>();
  }
}

function unwrap(statement: D1PreparedStatement): D1PreparedStatement {
  return statement instanceof CountingStatement ? statement.inner : statement;
}

export function countingD1(d1: D1Database): { d1: D1Database; calls(): number } {
  let count = 0;
  const hit = (): void => {
    count += 1;
  };

  const wrapped: D1Database = {
    prepare: (query) => new CountingStatement(d1.prepare(query), hit),
    batch: <T = unknown>(statements: D1PreparedStatement[]) => {
      hit();
      return d1.batch<T>(statements.map(unwrap));
    },
    exec: (query) => {
      hit();
      return d1.exec(query);
    },
    withSession: (constraintOrBookmark) => d1.withSession(constraintOrBookmark),
    dump: () => d1.dump(),
  };
  return { d1: wrapped, calls: () => count };
}
