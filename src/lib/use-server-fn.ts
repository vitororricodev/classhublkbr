// Shim local para substituir `useServerFn` do TanStack Start.
// Em modo SPA, server functions viraram funções client-side comuns,
// então `useServerFn(fn)` apenas retorna a própria `fn`.
export function useServerFn<T extends (...args: never[]) => unknown>(fn: T): T {
  return fn;
}
