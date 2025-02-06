// @ts-ignore
import {internal, SenderArguments} from '@ton/ton';
import { TonClient, WalletContractV4, toNano } from '@ton/ton';
import { mnemonicToPrivateKey } from '@ton/crypto';
import { StonApiClient } from '@ston-fi/api';
import { dexFactory } from '@ston-fi/sdk';
import { env, argv } from 'process';
import { Buffer } from 'buffer';
import type { AxiosError } from 'axios';

import { ApiErrorResponse, SimulationResult } from '../types/index.js';
import { ENDPOINTS, TON_ADDRESS } from '../config/config.js';
import { config } from 'dotenv';

config();

export class SwapService {
    private readonly client: TonClient;
    private readonly stonApiClient: StonApiClient;
    private readonly keyPair: { publicKey: Buffer; secretKey: Buffer; };
    private readonly wallet: WalletContractV4;

    private constructor(
        client: TonClient,
        stonApiClient: StonApiClient,
        keyPair: { publicKey: Buffer; secretKey: Buffer; },
        wallet: WalletContractV4,
    ) {
        this.client = client;
        this.stonApiClient = stonApiClient;
        this.keyPair = keyPair;
        this.wallet = wallet;
    }

    // Фабричный метод для создания экземпляра
    public static async createSwapService(): Promise<SwapService> {
        // Проверяем наличие необходимых переменных окружения
        const apiKey = env.TON_CLIENT_API_KEY;
        if (!apiKey) {
            throw new Error('TON_CLIENT_API_KEY не найден в переменных окружения');
        }

        if (!env.MNEMONIC) {
            throw new Error('MNEMONIC не найден в переменных окружения');
        }

        // Создаем клиенты
        const client = new TonClient({
            endpoint: ENDPOINTS.MAINNET,
            apiKey: apiKey,
        });
        const stonApiClient = new StonApiClient({});

        // Инициализируем кошелек
        const mnemonics = env.MNEMONIC.split(' ');
        if (mnemonics.length !== 24) {
            throw new Error('Требуется 24 слова мнемоники');
        }

        const keyPair = await mnemonicToPrivateKey(mnemonics);
        if (!keyPair) {
            throw new Error('Не удалось создать KeyPair');
        }

        const wallet = WalletContractV4.create({
            workchain: 0,
            publicKey: keyPair.publicKey,
        });

        return new SwapService(client, stonApiClient, keyPair, wallet);
    }

    private static handleApiError(error: unknown): never {
        if (error instanceof Error && 'isAxiosError' in error) {
            const axiosError = error as AxiosError<ApiErrorResponse>;

            if (axiosError.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
                throw new Error('TON API Connection Error: превышено время ожидания');
            }
            if (axiosError.response) {
                throw new Error(`TON API Error ${axiosError.response.status}: ${
                    axiosError.response.data?.error || error.message
                }`);
            }
            if (axiosError.request) {
                throw new Error('TON API Connection Error: сервер недоступен');
            }
        }

        if (error instanceof Error) {
            throw new Error(`TON API Error: ${error.message}`);
        }

        throw new Error('Неизвестная ошибка TON API');
    }

    private async getSwapTxParams(simulation: SimulationResult, walletAddress: string, queryId: number): Promise<SenderArguments> {
        // Получаем или используем сохраненные метаданные роутера
        const routerMetadata = simulation.routerMetadata ||
            await this.stonApiClient.getRouter(simulation.routerAddress);
        if (!routerMetadata) {
            throw new Error(`Роутер ${simulation.routerAddress} не найден`);
        }

        const dexContracts = dexFactory(routerMetadata);
        const router = this.client.open(dexContracts.Router.create(routerMetadata.address));

        const sharedTxParams = {
            queryId,
            userWalletAddress: walletAddress,
            offerAmount: simulation.offerUnits,
            minAskAmount: simulation.minAskUnits,
        };

        // Определяем тип свопа и получаем соответствующие параметры
        if (simulation.askAddress !== TON_ADDRESS && simulation.offerAddress !== TON_ADDRESS) {
            return router.getSwapJettonToJettonTxParams({
                ...sharedTxParams,
                offerJettonAddress: simulation.offerAddress,
                askJettonAddress: simulation.askAddress,
            });
        }

        const proxyTon = dexContracts.pTON.create(routerMetadata.ptonMasterAddress);

        if (simulation.offerAddress === TON_ADDRESS) {
            return router.getSwapTonToJettonTxParams({
                ...sharedTxParams,
                proxyTon,
                askJettonAddress: simulation.askAddress,
            });
        } else {
            return router.getSwapJettonToTonTxParams({
                ...sharedTxParams,
                proxyTon,
                offerJettonAddress: simulation.offerAddress,
            });
        }
    }

    async simulateBuySwap(tokenAddress: string, amount: number, slippageTolerance: number = 0.01): Promise<SimulationResult> {
        const simulation = await this.stonApiClient.simulateSwap({
            offerAddress: TON_ADDRESS,
            askAddress: tokenAddress,
            offerUnits: toNano(amount.toString()).toString(),
            slippageTolerance: slippageTolerance.toString(),
            dexV2: true,
        }).catch(SwapService.handleApiError);

        const routerMetadata = await this.stonApiClient.getRouter(simulation.routerAddress)
            .catch(SwapService.handleApiError);

        if (!routerMetadata) {
            throw new Error('Не удалось получить метаданные роутера');
        }

        return { ...simulation, routerMetadata };
    }

    async simulateSellSwap(tokenAddress: string, amount: number, slippageTolerance: number = 0.01): Promise<SimulationResult> {
        const simulation = await this.stonApiClient.simulateSwap({
            offerAddress: tokenAddress,
            askAddress: TON_ADDRESS,
            offerUnits: toNano(amount.toString()).toString(),
            slippageTolerance: slippageTolerance.toString(),
            dexV2: true,
        }).catch(SwapService.handleApiError);

        const routerMetadata = await this.stonApiClient.getRouter(simulation.routerAddress)
            .catch(SwapService.handleApiError);

        if (!routerMetadata) {
            throw new Error('Не удалось получить метаданные роутера');
        }

        return { ...simulation, routerMetadata };
    }

    async executeSwap(simulation: SimulationResult): Promise<void> {
        if (!this.wallet || !this.keyPair) {
            throw new Error('Кошелек не инициализирован корректно');
        }

        // Определяем тип операции на основе адресов
        const isBuyOperation = simulation.offerAddress === TON_ADDRESS;

        // Проверяем баланс только для покупки (когда отдаем TON)
        if (isBuyOperation) {
            const balance = await this.client.getBalance(this.wallet.address);
            if (balance === 0n) {
                throw new Error('Кошелек пуст. Пополните баланс');
            }
        }

        // Получение параметров транзакции
        const queryId = Date.now();
        const txParams = await this.getSwapTxParams(
            simulation,
            this.wallet.address.toString(),
            queryId,
        );

        // Отправка транзакции
        const contract = this.client.open(this.wallet);
        await contract.sendTransfer({
            seqno: await contract.getSeqno(),
            secretKey: this.keyPair.secretKey,
            messages: [
                internal({
                    to: txParams.to,
                    value: txParams.value,
                    body: txParams.body,
                }),
            ],
        }).catch(SwapService.handleApiError);
    }

    getWalletAddress(): string {
        return this.wallet.address.toString();
    }
}

// Тестовый запуск
const runTest = async (): Promise<void> => {
    try {
        const swapService = await SwapService.createSwapService();
        const FPIBANK = 'EQD0KpcRMh-sKO2z5-vOjgvFjTT58tO-2Nmvxqg5ocFQFtWz';

        // eslint-disable-next-line no-undef
        console.log('🎉 Инициализировано с адресом:', swapService.getWalletAddress());

        // Тест покупки jetton
        // eslint-disable-next-line no-undef
        console.log('\n📈 Тестируем TON -> jetton своп');
        const buySimulation = await swapService.simulateBuySwap(FPIBANK, 0.1, 0.01);
        await swapService.executeSwap(buySimulation);

        // Тест продажи jetton
        // eslint-disable-next-line no-undef
        console.log('\n📉 Тестируем jetton -> TON своп');
        const sellSimulation = await swapService.simulateSellSwap(FPIBANK, 100.0, 0.01);
        await swapService.executeSwap(sellSimulation);
    } catch (error) {
        // eslint-disable-next-line no-undef
        console.error('❌ Ошибка теста:', error);
    }
};

// Запускаем тест только если файл запущен напрямую
if (argv[1]?.endsWith('swap.service.ts')) {
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