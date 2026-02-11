export enum ProposalStatus {
  Pending = 0,
  Active = 1,
  Defeated = 2,
  Succeeded = 3,
  Executed = 4,
}

export const ProposalStatusLabels: Record<ProposalStatus, string> = {
  [ProposalStatus.Pending]: 'Pending',
  [ProposalStatus.Active]: 'Active',
  [ProposalStatus.Defeated]: 'Defeated',
  [ProposalStatus.Succeeded]: 'Passed',
  [ProposalStatus.Executed]: 'Executed',
};