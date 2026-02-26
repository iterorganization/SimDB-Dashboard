/// <reference types="vite/client" />
declare const __APP_VERSION__: string

interface String {
    toLabel(): string
    replaceAll(string, string): string
}

declare module '@vue/runtime-core' {
  export interface ComponentCustomProperties {
    __APP_VERSION__: string
  }
}
