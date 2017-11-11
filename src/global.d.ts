declare module 'uid' {
  interface Uid {
    (length: number): string;
  }

  const uid: Uid;
  export = uid;
} 