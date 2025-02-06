export interface PriceData {
    price: number;
    token0PriceUsd: number;
    token1PriceUsd: number;
    totalFee: number;
    token0Address: string;
    token1Address: string;
    token0Symbol: string;
    token1Symbol: string;
    token0Decimals: number;
    token1Decimals: number;
    poolAddress: string;
    token0Reserve: number;
    token1Reserve: number;
}

export interface TokenPair {
    token0Symbol: string;
    token1Symbol: string;
}

export interface RouterMetadata {
    address: string;
    majorVersion: number;
    minorVersion: number;
    ptonMasterAddress: string;
    ptonVersion: string;
    ptonWalletAddress: string;
    routerType: string;
    poolCreationEnabled: boolean;
}

export interface SimulationResult {
    routerAddress: string;
    offerAddress: string;
    askAddress: string;
    offerUnits: string;
    minAskUnits: string;
    askUnits: string;
    routerMetadata?: RouterMetadata;
}

export interface ApiErrorResponse {
    error?: string;
    [key: string]: unknown;  // для других возможных полей
}