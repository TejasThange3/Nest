import io from 'socket.io-client';
export type TypedSocket = ReturnType<typeof io>;

export const createSocket = (uri: string) => {
  return io(uri);
};
