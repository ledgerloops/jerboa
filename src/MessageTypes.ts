export type Message =
 | TransferMessage
 | ProbeMessage
 | NackMessage
 | ScoutMessage
 | ProposeMessage
 | CommitMessage;

export type TransferMessage = {
  amount: number,
};
export type ProbeMessage = {
  command: string,
  probeId: string,
  incarnation: number,
  debugInfo: {
    path: string[],
    backtracked: string[],
  },
};
export type NackMessage = {
  command: string,
  probeId: string,
  incarnation: number,
  debugInfo: {
    path: string[],
    backtracked: string[],
  },
};
export type ScoutMessage = {
  command: string,
  probeId: string,
  maxIncarnation: number,
  amount: number,
  debugInfo: {
    loop: string[],
  },
};
export type ProposeMessage = {
  command: string,
  probeId: string,
  maxIncarnation: number,
  amount: number,
  hash: string,
  debugInfo: {
    loop: string[],
  },
};
export type CommitMessage = {
  command: string,
  probeId: string,
  amount: number,
  preimage: string,
  debugInfo: {
    loop: string[],
  },
};
