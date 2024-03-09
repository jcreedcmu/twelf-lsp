import { debug } from "./debug";
import { WasiSnapshotPreview1, args_get, args_sizes_get, clock_time_get, environ_sizes_get, fd_write } from "./wasi";
import * as fs from 'fs';

function getWasm(filepath: string): ArrayBuffer {
  return fs.readFileSync(filepath);
}

export enum Status {
  OK = 0,
  ABORT = 1,
}

export type ParseResult = { status: Status, output: string[] };

type TwelfExports = {
  memory: WebAssembly.Memory;
  twelf_open(argc: number, argv: number): void;
  allocate(size: number): number;
  execute(): Status;
  printParse(): Status;
};

type TwelfError = {
  range: { line1: number, col1: number, line2: number, col2: number },
  text: string,
}

type TwelfAction = never;

type TwelfDispatch = (action: TwelfAction) => void;

class TwelfService {
  exports: TwelfExports;

  constructor(
    public instance: WebAssembly.Instance,
    public dispatch: TwelfDispatch,
    public output: string[]
  ) {
    this.exports = instance.exports as TwelfExports;
  }

  clearOutput() {
    this.output.splice(0);
  }

  async exec(input: string) { }

  parse(input: string): ParseResult {
    const { memory, printParse, allocate } = this.exports;
    this.clearOutput();
    const data = new TextEncoder().encode(input);
    const length = data.length;
    const inputBuf = allocate(length);
    const buffer = new Uint8Array(
      memory.buffer,
      inputBuf,
      length,
    );
    buffer.set(data);
    const status = printParse();
    const output = [...this.output];
    return { status, output };
  }

}

export async function mkTwelfService(wasmLoc: string, dispatch: TwelfDispatch): Promise<TwelfService> {
  const twelfWasm = getWasm(wasmLoc);

  let mem: WebAssembly.Memory | undefined;
  const output: string[] = [];
  const argv: string[] = ['twelf'];
  const imports: { wasi_snapshot_preview1: WebAssembly.ModuleImports & WasiSnapshotPreview1 } = {
    wasi_snapshot_preview1: {
      args_get: (...args) => args_get(mem!, argv, ...args),
      args_sizes_get: (...args) => args_sizes_get(mem!, argv, ...args),
      clock_time_get: (...args) => clock_time_get(mem!, ...args),
      environ_sizes_get: (...args) => environ_sizes_get(mem!, ...args),
      environ_get: () => { debug('environ_get'); },
      proc_exit: () => { debug('proc_exit'); throw new Error("proc_exit called, probably shouldn't happen"); },
      fd_close: () => { debug('fd_close'); },
      fd_fdstat_get: () => { debug('fd_fdstat_get'); },
      fd_fdstat_set_flags: () => { debug('fd_fdstat_set_flags'); },
      fd_filestat_get: () => { debug('fd_filestat_get'); },
      fd_pread: () => { debug('fd_pread'); },
      fd_prestat_dir_name: () => { debug('fd_prestat_dir_name'); },
      fd_prestat_get: () => { debug('fd_prestat_get'); },
      fd_read: () => { debug('fd_read'); },
      fd_seek: () => { debug('fd_seek'); },
      fd_write: (...args) => { debug('fd_write'); return fd_write(mem!, output, ...args); },

      // Paths
      path_filestat_get: () => { debug('path_filestat_get'); },
      path_open: () => { debug('path_open'); },
    }
  };

  const source = await WebAssembly.instantiate(twelfWasm, imports);
  const exports = (source.instance.exports as TwelfExports);
  // give import implementations the ability to refer to memory
  mem = exports.memory;
  exports.twelf_open(0, 0);

  return new TwelfService(source.instance, dispatch, output);
}
