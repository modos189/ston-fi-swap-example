import express, { Request, Response } from 'express';
import { validatePriceRequest, validateSwapSimulation, validateSwapExecution } from './validators.js';
import { TokenPair } from '../types/index.js';

const router = express.Router();

// Price endpoint
router.get('/price/:token0Symbol/:token1Symbol',
    validatePriceRequest,
    async (req: Request, res: Response): Promise<void> => {
        try {
            const tokenPair: TokenPair = {
                token0Symbol: req.params.token0Symbol,
                token1Symbol: req.params.token1Symbol,
            };

            const priceData = await req.priceService.getPriceData(tokenPair);
            res.json(priceData);
        } catch (error) {
            if (error instanceof Error) {
                if (error.message.includes('не найден')) {
                    res.status(404).json({ error: error.message });
                } else {
                    res.status(500).json({ error: error.message });
                }
            } else {
                res.status(500).json({ error: 'Неизвестная ошибка при получении цены' });
            }
        }
    },
);

// Swap simulation endpoints
router.post('/swap/simulate/buy',
    validateSwapSimulation,
    async (req: Request, res: Response): Promise<void> => {
        try {
            const { tokenAddress, amount, slippageTolerance } = req.body;
            const simulation = await req.swapService.simulateBuySwap(tokenAddress, amount, slippageTolerance);
            res.json(simulation);
        } catch (error) {
            if (error instanceof Error) {
                res.status(500).json({ error: error.message });
            } else {
                res.status(500).json({ error: 'Неизвестная ошибка при симуляции покупки' });
            }
        }
    },
);

router.post('/swap/simulate/sell',
    validateSwapSimulation,
    async (req: Request, res: Response): Promise<void> => {
        try {
            const { tokenAddress, amount, slippageTolerance } = req.body;
            const simulation = await req.swapService.simulateSellSwap(tokenAddress, amount, slippageTolerance);
            res.json(simulation);
        } catch (error) {
            if (error instanceof Error) {
                res.status(500).json({ error: error.message });
            } else {
                res.status(500).json({ error: 'Неизвестная ошибка при симуляции продажи' });
            }
        }
    },
);

// Swap execution endpoints
router.post('/swap/execute',
    validateSwapExecution,
    async (req: Request, res: Response): Promise<void> => {
        try {
            const { simulation } = req.body;
            await req.swapService.executeSwap(simulation);
            res.json({ status: 'success' });
        } catch (error) {
            if (error instanceof Error) {
                res.status(500).json({ error: error.message });
            } else {
                res.status(500).json({ error: 'Неизвестная ошибка при выполнении покупки' });
            }
        }
    },
);

export default router;