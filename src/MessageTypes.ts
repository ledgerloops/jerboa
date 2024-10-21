export type Message =
 | TransferMessage
 | ProbeMessage
 | NackMessage
 | ScoutMessage
 | ProposeMessage
 | CommitMessage;

export type TransferMessage = {
  command: string,
  amount: number,
};
export type ProbeMessage = {
  command: string,
  probeId: string,
  incarnation: number,
  debugInfo: {
    path: string[],
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
export function stringifyMessage(msg: Message): string {
  switch (msg.command) {
    case 'transfer': return `transfer ${(msg as TransferMessage).amount}`;
    case 'probe': return `probe ${(msg as ProbeMessage).probeId}:${(msg as ProbeMessage).incarnation} ${(msg as ProbeMessage).debugInfo.path.join(' ')}`;
    case 'nack': return `nack ${(msg as NackMessage).probeId}:${(msg as NackMessage).incarnation} ${(msg as NackMessage).debugInfo.path.join(' ')} / ${(msg as NackMessage).debugInfo.backtracked.join(' ')}`;
    case 'scout': return `scout ${(msg as ScoutMessage).probeId}:${(msg as ScoutMessage).maxIncarnation}-  ${(msg as ScoutMessage).amount} ${(msg as ScoutMessage).debugInfo.loop.join(' ')}`;
    case 'propose': return `propose ${(msg as ProposeMessage).probeId}:${(msg as ProposeMessage).maxIncarnation}-  ${(msg as ProposeMessage).amount} ${(msg as ProposeMessage).hash} ${(msg as ProposeMessage).debugInfo.loop.join(' ')}`;
    case 'commit': return `commit ${(msg as CommitMessage).probeId}:~-  ${(msg as CommitMessage).amount} ${(msg as CommitMessage).preimage} ${(msg as ProposeMessage).debugInfo.loop.join(' ')}`;
    default: return JSON.stringify(msg);
  }
}