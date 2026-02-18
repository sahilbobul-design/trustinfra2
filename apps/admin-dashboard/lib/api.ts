import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000/api';
const RELAYER_BASE_URL = process.env.NEXT_PUBLIC_RELAYER_URL || 'http://localhost:5001/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const relayerClient = axios.create({
  baseURL: RELAYER_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============ Infrastructure APIs ============

export const getInfrastructures = async (owner?: string) => {
  const response = await apiClient.get('/infrastructure', {
    params: { owner, limit: 100 },
  });
  return response.data;
};

export const getInfrastructureDetails = async (id: string) => {
  const response = await apiClient.get(`/infrastructure/${id}`);
  return response.data;
};

export const registerInfrastructure = async (data: {
  location: string;
  description?: string;
  coordinates?: { latitude: number; longitude: number };
}) => {
  const response = await apiClient.post('/infrastructure', {
    chainId: 1,
    ownerAddress: '', // Will be set from context
    ...data,
  });
  return response.data;
};

// ============ Health Record APIs ============

export const getHealthRecords = async (infraId: number) => {
  const response = await apiClient.get(`/health-records/${infraId}`);
  return response.data;
};

export const getLatestHealthRecord = async (infraId: number) => {
  const response = await apiClient.get(`/health-records/${infraId}/latest`);
  return response.data;
};

export const getHealthTrends = async (infraId?: number, days: number = 30) => {
  const response = await apiClient.get('/analytics/health-trends', {
    params: { infraId, days },
  });
  return response.data;
};

// ============ Payment APIs ============

export const getContractorClaims = async (contractorAddress: string) => {
  const response = await apiClient.get(`/payments/claims/${contractorAddress}`);
  return response.data;
};

export const submitMaintenanceClaim = async (data: {
  infraId: number;
  claimAmount: string;
  description: string;
  ipfsHash?: string;
}) => {
  const response = await apiClient.post('/payments/claim', {
    contractorAddress: '', // Will be set from context
    ...data,
  });
  return response.data;
};

export const verifyClaim = async (claimId: string, approved: boolean) => {
  const response = await apiClient.patch(`/payments/claim/${claimId}/verify`, {
    approved,
  });
  return response.data;
};

export const releasePayment = async (claimId: string) => {
  const response = await apiClient.patch(`/payments/claim/${claimId}/release`);
  return response.data;
};

// ============ Contractor APIs ============

export const getContractorProfile = async (address: string) => {
  const response = await apiClient.get(`/contractor/${address}`);
  return response.data;
};

export const registerContractor = async (data: {
  name: string;
  walletAddress: string;
  stakeAmount: string;
}) => {
  const response = await apiClient.post('/contractor/register', data);
  return response.data;
};

export const addStake = async (walletAddress: string, amount: string) => {
  const response = await apiClient.post(`/contractor/${walletAddress}/stake`, {
    amount,
  });
  return response.data;
};

// ============ Analytics APIs ============

export const getContractorPerformance = async () => {
  const response = await apiClient.get('/analytics/performance');
  return response.data;
};

export const getInfrastructureStats = async () => {
  const response = await apiClient.get('/analytics/stats');
  return response.data;
};

export const getGasUsageAnalytics = async () => {
  const response = await apiClient.get('/analytics/gas');
  return response.data;
};

export const getComplianceMetrics = async () => {
  const response = await apiClient.get('/analytics/compliance');
  return response.data;
};

// ============ Relayer APIs ============

export const estimateGas = async (to: string, data: string, value?: string) => {
  const response = await relayerClient.post('/transactions/estimate', {
    to,
    data,
    value,
  });
  return response.data;
};

export const getGasPrice = async () => {
  const response = await relayerClient.get('/gas/price');
  return response.data;
};

export const getRelayerStats = async () => {
  const response = await relayerClient.get('/gas/relayer-stats');
  return response.data;
};

export const getTransactionReceipt = async (txHash: string) => {
  const response = await relayerClient.get(`/transactions/${txHash}`);
  return response.data;
};

export const relayTransaction = async (to: string, data: string, value?: string) => {
  const response = await relayerClient.post('/transactions/relay', {
    to,
    data,
    value,
  });
  return response.data;
};
