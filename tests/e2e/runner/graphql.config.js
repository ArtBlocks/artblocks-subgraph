module.exports = {
  overwrite: true,
  schema: process.env.SUBGRAPH_GRAPHQL_URL,
  documents: ['./__tests__/graphql/*.graphql'],
  generates: {
    'generated/graphql.ts': {
      plugins: ['typescript', 'typescript-operations', 'typescript-urql'],
      config: {
        maybeValue: 'T | null | undefined',
        scalars: {
          BigInt: 'string',
          BigDecimal: 'string',
          Bytes: 'string',
          timestamptz: 'string'
        },
        withHooks: false
      }
    }
  }
}
