import 'express-serve-static-core';

declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      id: number;
      login: string;
      dom_id?: number | null;
    };
  }
}

export {};
