export function getContractABI(): any[] {
  return [
    {
      anonymous: false,
      inputs: [
        { indexed: true, internalType: 'uint256', name: 'infraId', type: 'uint256' },
        { indexed: false, internalType: 'uint256', name: 'healthScore', type: 'uint256' },
        { indexed: true, internalType: 'bytes32', name: 'sensorDataHash', type: 'bytes32' },
        { indexed: true, internalType: 'address', name: 'relayer', type: 'address' },
      ],
      name: 'HealthRecorded',
      type: 'event',
    },
    {
      anonymous: false,
      inputs: [
        { indexed: true, internalType: 'uint256', name: 'claimId', type: 'uint256' },
        { indexed: true, internalType: 'uint256', name: 'infraId', type: 'uint256' },
        { indexed: true, internalType: 'address', name: 'contractor', type: 'address' },
        { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' },
      ],
      name: 'MaintenanceClaimSubmitted',
      type: 'event',
    },
    {
      anonymous: false,
      inputs: [
        { indexed: true, internalType: 'uint256', name: 'claimId', type: 'uint256' },
        { indexed: true, internalType: 'uint256', name: 'infraId', type: 'uint256' },
        { indexed: false, internalType: 'string', name: 'reason', type: 'string' },
      ],
      name: 'PaymentFrozen',
      type: 'event',
    },
    {
      anonymous: false,
      inputs: [
        { indexed: true, internalType: 'uint256', name: 'claimId', type: 'uint256' },
        { indexed: true, internalType: 'uint256', name: 'infraId', type: 'uint256' },
        { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' },
      ],
      name: 'PaymentReleased',
      type: 'event',
    },
    {
      anonymous: false,
      inputs: [
        { indexed: true, internalType: 'address', name: 'contractor', type: 'address' },
        { indexed: false, internalType: 'string', name: 'name', type: 'string' },
        { indexed: false, internalType: 'uint256', name: 'stakedAmount', type: 'uint256' },
      ],
      name: 'ContractorRegistered',
      type: 'event',
    },
    {
      anonymous: false,
      inputs: [
        { indexed: true, internalType: 'address', name: 'contractor', type: 'address' },
        { indexed: false, internalType: 'uint256', name: 'slashedAmount', type: 'uint256' },
        { indexed: false, internalType: 'string', name: 'reason', type: 'string' },
      ],
      name: 'ContractorSlashed',
      type: 'event',
    },
    {
      anonymous: false,
      inputs: [
        { indexed: true, internalType: 'uint256', name: 'infraId', type: 'uint256' },
        { indexed: false, internalType: 'uint256', name: 'healthScore', type: 'uint256' },
      ],
      name: 'HealthThresholdExceeded',
      type: 'event',
    },
  ];
}
