// utils/constants.ts

// Enum representing bounty statuses
export enum BountyStatusCode {
    Open = 0,
    Completed = 1,
    // Add more statuses here if needed
  }
  
  // Mapping from status codes to human-readable labels
  export const BountyStatusLabels: Record<BountyStatusCode, string> = {
    [BountyStatusCode.Open]: 'Open',
    [BountyStatusCode.Completed]: 'Completed',
    // Add more mappings here if needed
  };
  