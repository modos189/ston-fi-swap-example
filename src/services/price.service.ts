import { StonApiClient } from '@ston-fi/api';
import { PriceData, TokenPair } from '../types/index.js';
import { argv } from 'process';

export class PriceService {
    private client: StonApiClient;

    constructor() {
        this.client = new StonApiClient({});
    }

    async getTokenAddressBySymbol(symbol: string): Promise<{
        address: string;
        decimals: number;
        priceUsd: number;
    }> {
        try {
            const assets = await this.client.getAssets();
            const asset = assets.find(a => a.symbol === symbol);

            if (!asset) {
                throw new Error(`Токен ${symbol} не найден`);
            }

            return {
                address: asset.contractAddress,
                decimals: asset.decimals,
                priceUsd: parseFloat(asset.dexPriceUsd || '0'),
            };
        } catch (error) {
            // eslint-disable-next-line no-undef
            console.error('Ошибка при получении адреса токена:', error);
            throw error;
        }
    }

    async getPriceData(tokenPair: TokenPair): Promise<PriceData> {
        try {
            // Получаем информацию о токенах
            const token0Info = await this.getTokenAddressBySymbol(tokenPair.token0Symbol);
            const token1Info = await this.getTokenAddressBySymbol(tokenPair.token1Symbol);

            // Получаем все пулы и фильтруем нужный
            const allPools = await this.client.getPools({ dexV2: true });

            const pool = allPools.find(p =>
                (p.token0Address === token0Info.address && p.token1Address === token1Info.address) ||
                (p.token0Address === token1Info.address && p.token1Address === token0Info.address),
            );

            if (!pool) {
                throw new Error(`Пул ${tokenPair.token0Symbol}/${tokenPair.token1Symbol} не найден`);
            }

            // Определяем reserve0 и reserve1 в зависимости от порядка токенов в пуле
            const isDirectOrder = pool.token0Address === token0Info.address;
            const token0Reserve = Number(isDirectOrder ? pool.reserve0 : pool.reserve1) / Math.pow(10, token0Info.decimals);
            const token1Reserve = Number(isDirectOrder ? pool.reserve1 : pool.reserve0) / Math.pow(10, token1Info.decimals);
            const currentPrice = token0Reserve / token1Reserve;

            const totalFee = (parseFloat(pool.lpFee) + parseFloat(pool.protocolFee)) / 100;

            return {
                price: currentPrice,
                token0PriceUsd: token0Info.priceUsd,
                token1PriceUsd: token1Info.priceUsd,
                totalFee,
                token0Address: token0Info.address,
                token1Address: token1Info.address,
                token0Symbol: tokenPair.token0Symbol,
                token1Symbol: tokenPair.token1Symbol,
                token0Decimals: token0Info.decimals,
                token1Decimals: token1Info.decimals,
                poolAddress: pool.address,
                token0Reserve,
                token1Reserve,
            };

        } catch (error) {
            // eslint-disable-next-line no-undef
            console.error('Ошибка при получении данных о ценах:', error);
            throw error;
        }
    }
}

// Тестовый запуск
const runTest = async (): Promise<void> => {
    const tokenPair: TokenPair = {
        token0Symbol: 'FPIBANK',
        token1Symbol: 'TON',
    };

    const priceService = new PriceService();
    try {
        const data = await priceService.getPriceData(tokenPair);
        const message = ''+
            '\nPrice Service Test Results:'+
            '------------------------'+
            `Price: ${data.price}`+
            `${data.token0Symbol} address: ${data.token0Address}`+
            `${data.token1Symbol} address: ${data.token1Address}`+
            `${data.token0Symbol} USD price: ${data.token0PriceUsd}`+
            `${data.token1Symbol} USD price: ${data.token1PriceUsd}`+
            `Total Fee: ${data.totalFee}%`+
            `Pool Address: ${data.poolAddress}`+
            `Reserves: ${data.token0Reserve} ${data.token0Symbol} / ${data.token1Reserve} ${data.token1Symbol}`;
        // eslint-disable-next-line no-undef
        console.log(message);
    } catch (error) {
        // eslint-disable-next-line no-undef
        console.error('Тестовый запуск завершился с ошибкой:', error);
        throw error;
    }
};

// Запускаем тест только если файл запущен напрямую
if (argv[1]?.endsWith('price.service.ts')) {
    (async (): Promise<void> => {
        try {
            await runTest();
        } catch (error) {
            // eslint-disable-next-line no-undef
            console.error('❌ Ошибка теста:', error);
            // eslint-disable-next-line no-undef
            process.exit(1);
        }
    })();
}